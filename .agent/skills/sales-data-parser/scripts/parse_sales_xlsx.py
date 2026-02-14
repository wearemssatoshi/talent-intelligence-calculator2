#!/usr/bin/env python3
"""
SVD Sales Data Parser — parse_sales_xlsx.py
=============================================
SVDレストランの売上日報Excel（.xlsx）を読み込み、
MP（Momentum Peaks）互換の統一JSONに変換する。

Usage:
    python parse_sales_xlsx.py <input.xlsx> [--output output.json] [--store-id GA] [--base TV_TOWER] [--tax-excluded]

Examples:
    python parse_sales_xlsx.py TV2023_3Q.xlsx
    python parse_sales_xlsx.py TV2023_3Q.xlsx --output ga_2023_3q.json --store-id GA --base TV_TOWER
    python parse_sales_xlsx.py TV2025_1Q.xlsx --tax-excluded  # 税抜き出力
"""

import sys
import json
import os
import argparse
import datetime
import math

# ========== 税率定数 ==========
# イートイン（LUNCH/DINNER/宴会/BG）: 消費税10%
# テイクアウト（T/O）: 軽減税率8%
TAX_RATE_EAT_IN = 0.10
TAX_RATE_TAKEOUT = 0.08

def tax_exclude_sales(sales, rate):
    """税込売上 → 税抜き売上に変換（端数切り捨て）"""
    if sales <= 0:
        return 0
    return math.floor(sales / (1 + rate))

def apply_tax_exclusion(result):
    """パース結果全体の売上値を税抜きに変換
    
    チャネルごとに適用税率が異なる:
    - lunch, dinner, ld_total, banquet, beer_garden: 10%
    - takeout: 8%（軽減税率）
    - all_channels: 各チャネルの税抜き合算で再計算
    """
    eat_in_channels = ['lunch', 'dinner', 'banquet', 'beer_garden']
    
    # 月次サマリーの変換
    for ms in result.get('monthly_summary', []):
        ch = ms['channels']
        tax_ex_total = 0
        
        for key in eat_in_channels:
            if key in ch and 'sales' in ch[key]:
                ch[key]['sales'] = tax_exclude_sales(ch[key]['sales'], TAX_RATE_EAT_IN)
                tax_ex_total += ch[key]['sales']
        
        if 'takeout' in ch and 'sales' in ch['takeout']:
            ch['takeout']['sales'] = tax_exclude_sales(ch['takeout']['sales'], TAX_RATE_TAKEOUT)
            tax_ex_total += ch['takeout']['sales']
        
        # L+D合計を再計算
        if 'ld_total' in ch:
            ch['ld_total']['sales'] = ch['lunch']['sales'] + ch['dinner']['sales']
        
        # 全CH売上を税抜き各チャネル合算で再計算
        if 'all_channels' in ch:
            ch['all_channels']['sales'] = tax_ex_total
        
        # avg_spendも変換
        for key in eat_in_channels + ['takeout']:
            rate = TAX_RATE_TAKEOUT if key == 'takeout' else TAX_RATE_EAT_IN
            if key in ch and 'avg_spend' in ch[key]:
                ch[key]['avg_spend'] = round(ch[key]['avg_spend'] / (1 + rate), 1)
    
    # 日別データの変換
    for day in result.get('daily_data', []):
        ch = day['channels']
        for key in eat_in_channels:
            if key in ch and 'sales' in ch[key]:
                ch[key]['sales'] = tax_exclude_sales(ch[key]['sales'], TAX_RATE_EAT_IN)
        if 'takeout' in ch and 'sales' in ch['takeout']:
            ch['takeout']['sales'] = tax_exclude_sales(ch['takeout']['sales'], TAX_RATE_TAKEOUT)
    
    # メタデータに税モード記録
    result['metadata']['tax_mode'] = 'excluded'
    result['metadata']['tax_rates'] = {
        'eat_in': TAX_RATE_EAT_IN,
        'takeout': TAX_RATE_TAKEOUT
    }
    
    return result

def safe_int(val):
    """安全にint変換。NaN/None/非数値は0を返す"""
    try:
        import pandas as pd
        if pd.isna(val):
            return 0
    except:
        pass
    if val is None:
        return 0
    try:
        return int(val)
    except (ValueError, TypeError):
        return 0

def safe_float(val):
    """安全にfloat変換"""
    try:
        import pandas as pd
        if pd.isna(val):
            return 0.0
    except:
        pass
    if val is None:
        return 0.0
    try:
        return round(float(val), 2)
    except (ValueError, TypeError):
        return 0.0

def find_all_channel_columns(df):
    """全チャネル（T/O・宴会・BG）のセクション列位置を動的に特定
    
    L/D（列3-18）は全年度で固定。T/O以降はヘッダー行2のセクション名から動的検出。
    
    対応パターン:
    - A (2023.04): BGなし、T/O=EAT-IN/T.O
    - B (2023.05): BGあり・テント無
    - C (2023.06〜2024.06): BGあり・テント有
    - D (2024.07〜2025.03): BG物販列追加
    - E (2025.04〜): T/O→「アフターランチ・T/O」改名＋ﾃｨｰ実績列追加、宴会+1、BG+1
    """
    import pandas as pd
    
    cols = {
        'to_pax': -1, 'to_total': -1,
        'bq_pax': -1, 'bq_total': -1,
        'bg_pax': -1, 'bg_total': -1,
    }
    
    for k in range(df.shape[1]):
        h2 = str(df.iloc[2, k]).strip() if pd.notna(df.iloc[2, k]) else ''
        
        # T/O セクション: "EAT-IN" or "T/O" or "T.O" or "アフターランチ"
        if ('T/O' in h2 or 'T.O' in h2 or 'アフターランチ' in h2 or 'EAT-IN' in h2) and cols['to_pax'] < 0:
            # セクション内で人数合計と合計を探す
            for m in range(k, min(k + 10, df.shape[1])):
                h3 = str(df.iloc[3, m]).strip() if pd.notna(df.iloc[3, m]) else ''
                if h3 == '人数合計':
                    cols['to_pax'] = m
                elif h3 == '合計':
                    cols['to_total'] = m
                    break
        
        # 宴会セクション: "宴会"
        if '宴会' in h2 and cols['bq_pax'] < 0:
            for m in range(k, min(k + 10, df.shape[1])):
                h3 = str(df.iloc[3, m]).strip() if pd.notna(df.iloc[3, m]) else ''
                if h3 == '人数合計':
                    cols['bq_pax'] = m
                elif h3 == '合計':
                    cols['bq_total'] = m
                    break
        
        # BG セクション: "ビアガーデン"
        if 'ビアガーデン' in h2 and cols['bg_pax'] < 0:
            for m in range(k, min(k + 12, df.shape[1])):
                h3 = str(df.iloc[3, m]).strip() if pd.notna(df.iloc[3, m]) else ''
                if h3 == '人数合計':
                    cols['bg_pax'] = m
                elif h3 == '合計':
                    cols['bg_total'] = m
                    break
    
    return cols

def find_total_section_columns(df):
    """TOTAL集計セクションの列位置を動的に特定
    
    対応パターン:
    - パターンA (2023.04): BGなし → 「レストラン＋T/O＋宴会場TOTAL」から検出
    - パターンB (2023.05): BGあり・テント無 → BG後のTOTALから検出
    - パターンC (2023.06〜2024.06): BGあり・テント有 → BG後のTOTALから検出
    - パターンD (2024.07〜2025.03): BG物販列追加 → BG後のTOTALから検出
    - パターンE (2025.04〜): T/Oリネーム＋全体+1ズレ → BG後のTOTALから検出
    """
    import pandas as pd
    total_pax_col = -1
    total_sales_col = -1
    
    # まずBGの有無を確認
    has_bg = False
    for k in range(df.shape[1]):
        h2 = str(df.iloc[2, k]).strip() if pd.notna(df.iloc[2, k]) else ''
        if 'ビアガーデン' in h2:
            has_bg = True
            break
    
    # TOTALセクションを探す
    for k in range(df.shape[1]):
        h2 = str(df.iloc[2, k]).strip() if pd.notna(df.iloc[2, k]) else ''
        
        # パターンA: BGなし → 宴会の後に直接TOTALがある
        if not has_bg and ('TOTAL' in h2 or 'レストラン＋' in h2) and 'レストランTOTAL売上' not in h2:
            for m in range(k, min(k + 8, df.shape[1])):
                h3 = str(df.iloc[3, m]).strip() if pd.notna(df.iloc[3, m]) else ''
                if h3 == '人数':
                    total_pax_col = m
                elif '売上' in h3 and '料理' not in h3 and '飲料' not in h3:
                    total_sales_col = m
            break
        
        # パターンB/C/D/E: BGあり → BG後方のTOTALセクション
        if has_bg and k > 40 and ('TOTAL' in h2) and h2 != 'レストランTOTAL売上（税込）':
            for m in range(k, min(k + 8, df.shape[1])):
                h3 = str(df.iloc[3, m]).strip() if pd.notna(df.iloc[3, m]) else ''
                if h3 == '人数':
                    total_pax_col = m
                elif h3 == '売上':
                    total_sales_col = m
            break
    
    # フォールバック: パターンAで「売上合計」がヘッダー行3にある場合
    if total_sales_col < 0 and not has_bg:
        for k in range(df.shape[1]):
            h3 = str(df.iloc[3, k]).strip() if pd.notna(df.iloc[3, k]) else ''
            if '売上合計' in h3:
                total_sales_col = k
                break
    
    return total_pax_col, total_sales_col

def find_total_row(df):
    """合計行のインデックスを特定"""
    for i in range(len(df)):
        for j in range(min(5, df.shape[1])):
            val = df.iloc[i, j]
            if isinstance(val, str) and val.strip() == '合計':
                return i
    return -1

def parse_sheet(df, ch_cols):
    """1シート分の日別データと合計行を解析
    
    Args:
        df: DataFrameシート
        ch_cols: find_all_channel_columns() の戻り値
    """
    import pandas as pd

    total_row = find_total_row(df)
    if total_row < 0:
        return [], None

    daily = []
    for i in range(4, len(df)):
        date_val = df.iloc[i, 1]
        if not isinstance(date_val, (datetime.datetime, pd.Timestamp)):
            continue

        bg_pax = safe_int(df.iloc[i, ch_cols['bg_pax']]) if ch_cols['bg_pax'] > 0 else 0
        bg_sales = safe_int(df.iloc[i, ch_cols['bg_total']]) if ch_cols['bg_total'] > 0 else 0
        to_pax = safe_int(df.iloc[i, ch_cols['to_pax']]) if ch_cols['to_pax'] > 0 else 0
        to_sales = safe_int(df.iloc[i, ch_cols['to_total']]) if ch_cols['to_total'] > 0 else 0
        bq_pax = safe_int(df.iloc[i, ch_cols['bq_pax']]) if ch_cols['bq_pax'] > 0 else 0
        bq_sales = safe_int(df.iloc[i, ch_cols['bq_total']]) if ch_cols['bq_total'] > 0 else 0

        row = {
            "date": date_val.strftime('%Y-%m-%d'),
            "weekday": date_val.weekday(),
            "channels": {
                "lunch": {
                    "pax": safe_int(df.iloc[i, 4]),
                    "sales": safe_int(df.iloc[i, 9])
                },
                "dinner": {
                    "pax": safe_int(df.iloc[i, 12]),
                    "sales": safe_int(df.iloc[i, 17])
                },
                "takeout": {
                    "pax": to_pax,
                    "sales": to_sales
                },
                "banquet": {
                    "pax": bq_pax,
                    "sales": bq_sales
                },
                "beer_garden": {
                    "pax": bg_pax,
                    "sales": bg_sales
                }
            }
        }
        daily.append(row)

    # 合計行
    i = total_row
    bg_pax_total = safe_int(df.iloc[i, ch_cols['bg_pax']]) if ch_cols['bg_pax'] > 0 else 0
    bg_sales_total = safe_int(df.iloc[i, ch_cols['bg_total']]) if ch_cols['bg_total'] > 0 else 0
    to_pax_total = safe_int(df.iloc[i, ch_cols['to_pax']]) if ch_cols['to_pax'] > 0 else 0
    to_sales_total = safe_int(df.iloc[i, ch_cols['to_total']]) if ch_cols['to_total'] > 0 else 0
    bq_pax_total = safe_int(df.iloc[i, ch_cols['bq_pax']]) if ch_cols['bq_pax'] > 0 else 0
    bq_sales_total = safe_int(df.iloc[i, ch_cols['bq_total']]) if ch_cols['bq_total'] > 0 else 0
    
    # TOTAL売上列を動的に検出
    _, total_sales_col = find_total_section_columns(df)
    all_ch_sales = safe_int(df.iloc[i, total_sales_col]) if total_sales_col > 0 else 0

    summary = {
        "channels": {
            "lunch": {
                "pax": safe_int(df.iloc[i, 4]),
                "sales": safe_int(df.iloc[i, 9]),
                "avg_spend": safe_float(df.iloc[i, 10])
            },
            "dinner": {
                "pax": safe_int(df.iloc[i, 12]),
                "sales": safe_int(df.iloc[i, 17]),
                "avg_spend": safe_float(df.iloc[i, 18])
            },
            "ld_total": {
                "pax": safe_int(df.iloc[i, 19]),
                "sales": safe_int(df.iloc[i, 22])
            },
            "takeout": {
                "pax": to_pax_total,
                "sales": to_sales_total
            },
            "banquet": {
                "pax": bq_pax_total,
                "sales": bq_sales_total
            },
            "beer_garden": {
                "pax": bg_pax_total,
                "sales": bg_sales_total
            },
            "all_channels": {
                "sales": all_ch_sales
            }
        }
    }

    return daily, summary

def validate_data(daily, summary, month_label):
    """日別合算と合計行の突き合わせ検証
    
    Note: Excel合計行はSUM数式＋調整（招待券差引、割引等）が含まれるため
    日別合算とは正確に一致しない。差異率5%以内をPASS、超をWARNとする。
    """
    checks = []

    channels_to_check = ['lunch', 'dinner', 'takeout', 'banquet', 'beer_garden']
    for ch in channels_to_check:
        daily_sum = sum(d["channels"][ch]["sales"] for d in daily)
        total_val = summary["channels"][ch]["sales"]
        diff = abs(daily_sum - total_val)
        pct = (diff / total_val * 100) if total_val > 0 else 0

        if diff <= 1:
            checks.append({
                "check": f"{month_label}_{ch}_sales_match",
                "result": "PASS",
                "detail": f"完全一致 ¥{total_val:,}"
            })
        elif pct <= 5.0:
            checks.append({
                "check": f"{month_label}_{ch}_sales_match",
                "result": "PASS",
                "detail": f"差異{diff:,}円({pct:.1f}%) 日別={daily_sum:,} 合計行={total_val:,}"
            })
        else:
            checks.append({
                "check": f"{month_label}_{ch}_sales_match",
                "result": "WARN",
                "detail": f"差異{diff:,}円({pct:.1f}%) 日別={daily_sum:,} 合計行={total_val:,}"
            })

    # L+D整合性（合計行同士の比較なので厳密チェック）
    l_sales = summary["channels"]["lunch"]["sales"]
    d_sales = summary["channels"]["dinner"]["sales"]
    ld_sales = summary["channels"]["ld_total"]["sales"]
    ld_diff = abs((l_sales + d_sales) - ld_sales)
    if ld_diff <= 1:
        checks.append({
            "check": f"{month_label}_ld_consistency",
            "result": "PASS",
            "detail": f"L({l_sales:,})+D({d_sales:,})={l_sales+d_sales:,} = L+D合計({ld_sales:,})"
        })
    else:
        # L+Dの差異はExcelの招待券・展望台チケット分の可能性あり
        pct = (ld_diff / ld_sales * 100) if ld_sales > 0 else 0
        result = "PASS" if pct <= 1.0 else "WARN"
        checks.append({
            "check": f"{month_label}_ld_consistency",
            "result": result,
            "detail": f"差異{ld_diff:,}円({pct:.2f}%) ※招待券等の調整分"
        })

    return checks

def parse_xlsx(file_path, store_id='GA', base='TV_TOWER'):
    """メインパーサー"""
    import pandas as pd

    if not os.path.exists(file_path):
        return {"error": f"File not found: {file_path}"}

    xls = pd.ExcelFile(file_path)
    filename = os.path.basename(file_path)

    # ファイル名から年度・四半期を推定
    fiscal_year = ''
    quarter = ''
    for part in filename.replace('.xlsx', '').split('_'):
        if part.isdigit() and len(part) == 4:
            fiscal_year = part
        if part.upper().endswith('Q'):
            quarter = part.upper()

    all_daily = []
    all_monthly = []
    all_checks = []

    for sheet in xls.sheet_names:
        df = pd.read_excel(file_path, sheet_name=sheet, header=None)

        # 店舗名をヘッダーから取得
        store_name_cell = df.iloc[2, 1] if pd.notna(df.iloc[2, 1]) else store_id
        store_name = str(store_name_cell).strip()

        # 全チャネル列を動的に判定
        ch_cols = find_all_channel_columns(df)

        # パース
        daily, summary = parse_sheet(df, ch_cols)
        if not daily or summary is None:
            continue

        # 月ラベル（シート名から）― 全角数字を半角に正規化
        zenkaku = '０１２３４５６７８９'
        hankaku = '0123456789'
        label = sheet
        for z, h in zip(zenkaku, hankaku):
            label = label.replace(z, h)
        month_label = label.replace('.', '-')
        if len(month_label.split('-')) == 2:
            y, m = month_label.split('-')
            month_label = f"{y}-{m.zfill(2)}"

        summary["month"] = month_label
        all_monthly.append(summary)
        all_daily.extend(daily)

        # 検証
        checks = validate_data(daily, summary, month_label)
        all_checks.extend(checks)

    # 全体検証ステータス
    has_fail = any(c["result"] == "FAIL" for c in all_checks)
    has_warn = any(c["result"] == "WARN" for c in all_checks)
    overall = "FAIL" if has_fail else ("WARN" if has_warn else "PASS")

    result = {
        "metadata": {
            "store_id": store_id,
            "store_name": store_name if 'store_name' in dir() else store_id,
            "base": base,
            "fiscal_year": fiscal_year,
            "quarter": quarter,
            "source_file": filename,
            "parsed_at": datetime.datetime.now().isoformat(),
            "sheets": xls.sheet_names,
            "total_days": len(all_daily),
            "total_months": len(all_monthly)
        },
        "monthly_summary": [
            {"month": ms["month"], "channels": ms["channels"]}
            for ms in all_monthly
        ],
        "daily_data": all_daily,
        "validation": {
            "status": overall,
            "checks": all_checks
        }
    }

    return result

def print_summary(result):
    """結果のサマリーを表示"""
    meta = result["metadata"]
    tax_label = '税抜き' if meta.get('tax_mode') == 'excluded' else '税込'
    print(f"\n{'='*60}")
    print(f"  SVD Sales Data Parser — {meta['store_id']} ({meta['base']}) [{tax_label}]")
    print(f"  {meta['source_file']} | {meta['total_months']}ヶ月 / {meta['total_days']}日分")
    print(f"{'='*60}")

    for ms in result["monthly_summary"]:
        ch = ms["channels"]
        print(f"\n  ── {ms['month']} ──")
        print(f"    ランチ  : {ch['lunch']['pax']:>5}人 / ¥{ch['lunch']['sales']:>12,}")
        print(f"    ディナー: {ch['dinner']['pax']:>5}人 / ¥{ch['dinner']['sales']:>12,}")
        print(f"    L+D     : {ch['ld_total']['pax']:>5}人 / ¥{ch['ld_total']['sales']:>12,}")
        if ch['takeout']['sales'] > 0:
            print(f"    T/O     : {ch['takeout']['pax']:>5}人 / ¥{ch['takeout']['sales']:>12,}")
        if ch['banquet']['sales'] > 0:
            print(f"    宴会    : {ch['banquet']['pax']:>5}人 / ¥{ch['banquet']['sales']:>12,}")
        if ch['beer_garden']['sales'] > 0:
            print(f"    BG      : {ch['beer_garden']['pax']:>5}人 / ¥{ch['beer_garden']['sales']:>12,}")
        print(f"    全CH    :        ¥{ch['all_channels']['sales']:>12,}")

    # 検証結果
    v = result["validation"]
    print(f"\n  検証: {v['status']}")
    fails = [c for c in v["checks"] if c["result"] != "PASS"]
    if fails:
        for f in fails:
            print(f"    ❌ {f['check']}: {f['detail']}")
    else:
        print(f"    ✅ 全{len(v['checks'])}項目 PASS")
    print()

def main():
    parser = argparse.ArgumentParser(description='SVD Sales Data Parser')
    parser.add_argument('input', help='入力Excelファイル (.xlsx)')
    parser.add_argument('--output', '-o', help='出力JSONファイルパス')
    parser.add_argument('--store-id', default='GA', help='店舗ID (default: GA)')
    parser.add_argument('--base', default='TV_TOWER', help='拠点名 (default: TV_TOWER)')
    parser.add_argument('--quiet', '-q', action='store_true', help='サマリー表示を抑制')
    parser.add_argument('--tax-excluded', action='store_true', 
                       help='税抜き出力（L/D/宴会/BG=10%, T/O=8%軽減税率）')

    args = parser.parse_args()

    result = parse_xlsx(args.input, store_id=args.store_id, base=args.base)

    # 税抜き変換
    if args.tax_excluded and 'error' not in result:
        result = apply_tax_exclusion(result)
    else:
        result['metadata']['tax_mode'] = 'included'

    if "error" in result:
        print(f"エラー: {result['error']}", file=sys.stderr)
        sys.exit(1)

    if not args.quiet:
        print_summary(result)

    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"  💾 JSON出力: {args.output}")
    else:
        # デフォルト出力先
        base_name = os.path.splitext(os.path.basename(args.input))[0]
        out_path = f"{base_name}_parsed.json"
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"  💾 JSON出力: {out_path}")

if __name__ == '__main__':
    main()
