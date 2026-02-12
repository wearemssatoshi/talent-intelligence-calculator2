#!/usr/bin/env python3
"""
SVD Sales Data Parser — BQ（赤れんが）専用
==========================================
赤れんがの売上日報Excel（.xlsx）を読み込み、
MP（Momentum Peaks）互換の統一JSONに変換する。

BQ固有チャネル: LUNCH / Afternoon Tea / DINNER / RYB（ルスツ羊蹄ぶた）

Usage:
    python parse_bq_sales.py <input.xlsx> [--output output.json] [--tax-excluded]
"""

import sys
import json
import os
import argparse
import datetime
import math

import pandas as pd

TAX_RATE_EAT_IN = 0.10

def tax_ex(sales):
    if sales <= 0: return 0
    return math.floor(sales / (1 + TAX_RATE_EAT_IN))

def safe_int(val):
    try:
        if pd.isna(val): return 0
    except: pass
    if val is None: return 0
    try: return int(val)
    except: return 0

def safe_float(val):
    try:
        if pd.isna(val): return 0.0
    except: pass
    if val is None: return 0.0
    try: return round(float(val), 2)
    except: return 0.0


def detect_channels(df):
    """ヘッダー行2(iloc[2])からBQ固有のチャネル開始列を動的検出
    
    BQの列構造（SATから確認済み）:
    - LUNCH: 件数, 人数, 料理売上, 料理単価, 飲料売上, 飲料単価, 合計(税込), 客単価
    - Afternoon Tea: 同上
    - DINNER: 人数, 料理売上, 料理単価, 飲料売上, 飲料単価, 合計(税込), 客単価 ← 件数なし！
    - レストランTOTAL: 人数, 料理売上, 飲料売上, 売上, 客単価
    - ルスツ羊蹄ぶた: 件数, 人数, 料理売上, 料理単価, 飲料売上, 飲料単価, 合計, 客単価
    - レストラン営業終了後トータル: 客数, 料理, 飲料, 席料, 食品物販, 花束, 預り金, 売上合計
    """
    channels = {}
    
    for k in range(df.shape[1]):
        h2 = str(df.iloc[2, k]).strip() if pd.notna(df.iloc[2, k]) else ''
        
        # 最初のLUNCH（右側はCol66付近に重複あり→最初のみ取る）
        if 'LUNCH' in h2 and h2 == 'LUNCH' and 'lunch' not in channels:
            channels['lunch'] = k
        
        if 'Afternoon Tea' in h2 and 'at' not in channels:
            channels['at'] = k
        
        # DINNERは最初の出現のみ
        if 'DINNER' in h2 and 'dinner' not in channels:
            channels['dinner'] = k
        
        if 'レストランTOTAL' in h2 and 'rest_total' not in channels:
            channels['rest_total'] = k
        
        if 'ルスツ羊蹄ぶた' in h2 and 'ryb' not in channels:
            channels['ryb'] = k
        
        if 'レストラン営業終了後トータル' in h2 and 'final' not in channels:
            channels['final'] = k
    
    return channels


def find_total_row(df):
    """合計行を探す"""
    for i in range(len(df)):
        for j in range(min(5, df.shape[1])):
            val = df.iloc[i, j]
            if isinstance(val, str) and val.strip() == '合計':
                return i
    return -1


def parse_bq_sheet(df, channels):
    """1シート分のBQデータをパース"""
    total_row = find_total_row(df)
    
    daily = []
    for i in range(4, len(df)):
        date_val = df.iloc[i, 1]
        if not isinstance(date_val, (datetime.datetime, pd.Timestamp)):
            continue
        
        row = {
            "date": date_val.strftime('%Y-%m-%d'),
            "weekday": date_val.weekday(),
            "channels": {}
        }
        
        # LUNCH: +0=件数, +1=人数, +2=料理売上, +4=飲料売上, +6=合計, +7=客単価
        if 'lunch' in channels:
            c = channels['lunch']
            row["channels"]["lunch"] = {
                "kensu": safe_int(df.iloc[i, c]),
                "pax": safe_int(df.iloc[i, c+1]),
                "food_sales": safe_int(df.iloc[i, c+2]),
                "bev_sales": safe_int(df.iloc[i, c+4]),
                "sales": safe_int(df.iloc[i, c+6]),
                "avg_spend": safe_float(df.iloc[i, c+7])
            }
        
        # AT: +0=件数, +1=人数, +6=合計
        if 'at' in channels:
            c = channels['at']
            row["channels"]["afternoon_tea"] = {
                "kensu": safe_int(df.iloc[i, c]),
                "pax": safe_int(df.iloc[i, c+1]),
                "sales": safe_int(df.iloc[i, c+6]),
            }
        
        # DINNER: +0=人数, +1=料理売上, +3=飲料売上, +5=合計, +6=客単価（件数なし！）
        if 'dinner' in channels:
            c = channels['dinner']
            row["channels"]["dinner"] = {
                "pax": safe_int(df.iloc[i, c]),
                "food_sales": safe_int(df.iloc[i, c+1]),
                "bev_sales": safe_int(df.iloc[i, c+3]),
                "sales": safe_int(df.iloc[i, c+5]),
                "avg_spend": safe_float(df.iloc[i, c+6])
            }
        
        # RestTotal: +0=人数, +3=売上
        if 'rest_total' in channels:
            c = channels['rest_total']
            row["channels"]["rest_total"] = {
                "pax": safe_int(df.iloc[i, c]),
                "sales": safe_int(df.iloc[i, c+3]),
            }
        
        # RYB: +0=件数, +1=人数, +2=料理売上, +4=飲料売上, +6=合計, +7=客単価
        if 'ryb' in channels:
            c = channels['ryb']
            row["channels"]["ryb"] = {
                "kensu": safe_int(df.iloc[i, c]),
                "pax": safe_int(df.iloc[i, c+1]),
                "food_sales": safe_int(df.iloc[i, c+2]),
                "bev_sales": safe_int(df.iloc[i, c+4]),
                "sales": safe_int(df.iloc[i, c+6]),
                "avg_spend": safe_float(df.iloc[i, c+7])
            }
        
        # FinalTotal: +0=客数, +1=料理, +2=飲料, +3=席料, +4=物販, +5=花束, +6=預り金, +7=売上合計
        if 'final' in channels:
            c = channels['final']
            row["channels"]["final_total"] = {
                "pax": safe_int(df.iloc[i, c]),
                "food": safe_int(df.iloc[i, c+1]),
                "bev": safe_int(df.iloc[i, c+2]),
                "seat_fee": safe_int(df.iloc[i, c+3]),
                "retail": safe_int(df.iloc[i, c+4]),
                "flowers": safe_int(df.iloc[i, c+5]),
                "deposit": safe_int(df.iloc[i, c+6]),
                "grand_total": safe_int(df.iloc[i, c+7]),
            }
        
        daily.append(row)
    
    # 月次サマリー（日別集計から計算）
    summary = {"channels": {}}
    for ch_key in ["lunch", "afternoon_tea", "dinner", "ryb", "rest_total", "final_total"]:
        if ch_key == "final_total":
            gt = sum(d["channels"].get(ch_key, {}).get("grand_total", 0) for d in daily)
            seat = sum(d["channels"].get(ch_key, {}).get("seat_fee", 0) for d in daily)
            retail = sum(d["channels"].get(ch_key, {}).get("retail", 0) for d in daily)
            flowers = sum(d["channels"].get(ch_key, {}).get("flowers", 0) for d in daily)
            summary["channels"][ch_key] = {
                "grand_total": gt, "seat_fee": seat, "retail": retail, "flowers": flowers
            }
        else:
            pax = sum(d["channels"].get(ch_key, {}).get("pax", 0) for d in daily)
            sales = sum(d["channels"].get(ch_key, {}).get("sales", 0) for d in daily)
            summary["channels"][ch_key] = {"pax": pax, "sales": sales}
            if ch_key in ["lunch", "ryb"]:
                kensu = sum(d["channels"].get(ch_key, {}).get("kensu", 0) for d in daily)
                summary["channels"][ch_key]["kensu"] = kensu
    
    return daily, summary


def parse_bq_xlsx(file_path, tax_excluded=False):
    """メインパーサー"""
    if not os.path.exists(file_path):
        return {"error": f"File not found: {file_path}"}
    
    xls = pd.ExcelFile(file_path)
    filename = os.path.basename(file_path)
    
    all_daily = []
    all_monthly = []
    
    for sheet in xls.sheet_names:
        df = pd.read_excel(file_path, sheet_name=sheet, header=None)
        
        # チャネル動的検出
        channels = detect_channels(df)
        
        # パース
        daily, summary = parse_bq_sheet(df, channels)
        if not daily:
            continue
        
        # 月ラベル
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
        summary["detected_channels"] = {k: v for k, v in channels.items()}
        all_monthly.append(summary)
        all_daily.extend(daily)
    
    result = {
        "metadata": {
            "store_id": "BQ",
            "store_name": "赤れんが",
            "base": "AKARENGA",
            "source_file": filename,
            "parsed_at": datetime.datetime.now().isoformat(),
            "sheets": xls.sheet_names,
            "total_days": len(all_daily),
            "total_months": len(all_monthly),
            "tax_mode": "excluded" if tax_excluded else "included"
        },
        "monthly_summary": all_monthly,
        "daily_data": all_daily,
    }
    
    return result


def print_summary(result):
    """結果サマリー表示"""
    meta = result["metadata"]
    tax_excluded = meta.get("tax_mode") == "excluded"
    tx = tax_ex if tax_excluded else lambda x: x
    label = "税抜" if tax_excluded else "税込"
    
    print(f"\n{'='*70}")
    print(f"  BQ（赤れんが）売上データ [{label}]")
    print(f"  {meta['source_file']} | {meta['total_months']}ヶ月 / {meta['total_days']}日分")
    print(f"{'='*70}")
    
    for ms in result["monthly_summary"]:
        ch = ms["channels"]
        print(f"\n  ── {ms['month']} ──")
        
        if "lunch" in ch and ch["lunch"]["pax"] > 0:
            s = tx(ch["lunch"]["sales"])
            print(f"    ランチ  : {ch['lunch'].get('kensu',0):>5}件 {ch['lunch']['pax']:>5}人 ¥{s:>10,}")
        
        if "afternoon_tea" in ch and ch["afternoon_tea"]["pax"] > 0:
            s = tx(ch["afternoon_tea"]["sales"])
            print(f"    AT      : {ch['afternoon_tea']['pax']:>11}人 ¥{s:>10,}")
        
        if "dinner" in ch and ch["dinner"]["pax"] > 0:
            s = tx(ch["dinner"]["sales"])
            print(f"    ディナー: {ch['dinner']['pax']:>11}人 ¥{s:>10,}")
        
        if "rest_total" in ch and ch["rest_total"]["sales"] > 0:
            s = tx(ch["rest_total"]["sales"])
            print(f"    Rest計  : {ch['rest_total']['pax']:>11}人 ¥{s:>10,}")
        
        if "ryb" in ch and ch["ryb"]["pax"] > 0:
            s = tx(ch["ryb"]["sales"])
            print(f"    RYB     : {ch['ryb'].get('kensu',0):>5}件 {ch['ryb']['pax']:>5}人 ¥{s:>10,}")
        
        if "final_total" in ch and ch["final_total"]["grand_total"] > 0:
            gt = tx(ch["final_total"]["grand_total"])
            print(f"    GT(Rest): ¥{gt:>10,}")
        
        # 全体合計 = Rest売上 + RYB売上
        rest_s = tx(ch.get("rest_total", {}).get("sales", 0))
        ryb_s = tx(ch.get("ryb", {}).get("sales", 0))
        print(f"    ■全体   : ¥{rest_s + ryb_s:>10,} ({(rest_s+ryb_s)/10000:.0f}万)")
    
    print()


def main():
    parser = argparse.ArgumentParser(description='BQ Sales Data Parser')
    parser.add_argument('input', help='入力Excelファイル (.xlsx)')
    parser.add_argument('--output', '-o', help='出力JSONファイルパス')
    parser.add_argument('--tax-excluded', action='store_true', help='税抜出力')
    parser.add_argument('--quiet', '-q', action='store_true')
    
    args = parser.parse_args()
    result = parse_bq_xlsx(args.input, tax_excluded=args.tax_excluded)
    
    if "error" in result:
        print(f"エラー: {result['error']}", file=sys.stderr)
        sys.exit(1)
    
    if not args.quiet:
        print_summary(result)
    
    if args.output:
        out_path = args.output
    else:
        base_name = os.path.splitext(os.path.basename(args.input))[0]
        out_path = f"{base_name}_parsed.json"
    
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"  💾 JSON出力: {out_path}")


if __name__ == '__main__':
    main()
