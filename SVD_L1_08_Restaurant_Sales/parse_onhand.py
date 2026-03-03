#!/usr/bin/env python3
"""
parse_onhand.py — TableCheck CSV → OnHand クリーンデータ
個人情報を全て除去し、MP予測に必要なカラムのみを抽出する。
各店舗フォルダ内の最新CSVのみを処理（過去CSVは履歴として保持）。

Usage:
    python3 parse_onhand.py on_hand/NP/reservation_*.csv  (単一ファイル指定)
    python3 parse_onhand.py on_hand/NP/  (店舗フォルダ → 最新CSVのみ)
    python3 parse_onhand.py on_hand/     (全店舗 → 各店舗の最新CSVのみ)
"""

import csv
import os
import sys
import re
import json
from pathlib import Path
from datetime import datetime

# --- 設定 ---
# ホワイトリスト: これらのカラムのみ抽出する（個人情報は一切含まない）
WHITELIST_COLUMNS = {
    '開始日': 'date',
    '開始時刻': 'time',
    '人数:大人': 'count_adult',
    '人数:シニア': 'count_senior',
    '人数:子供': 'count_child',
    '人数:幼児': 'count_infant',
    '注文合計金額': 'amount',
    'ステータス': 'tc_status',
    '席タイプの希望': 'seat_type',
    '席のカテゴリ': 'seat_category',
    '注文': 'order',
    '用途': 'purpose',
    '予約ID': 'reservation_id',
}

# 店舗名 → store_id マッピング
STORE_MAP = {
    'ヌーベルプース大倉山': 'NP',
    'THE JEWELS': 'JW',
    'ザ ジュエルズ': 'JW',
    'ザ ガーデン サッポロ': 'GA',
    'THE GARDEN SAPPORO': 'GA',
    'THE GARDEN SAPPORO HOKKAIDO GRILLE': 'GA',
    'ラ・ブリック': 'BQ',
    'LA BRIQUE SAPPORO Akarenga Terrace': 'BQ',
    'セレステ': 'Ce',
    'カフェルポ': 'RP',
    'ルスツ羊蹄とんかつテラス': 'RYB',
}

# ステータスマッピング (TableCheck → MP OnHand)
STATUS_MAP = {
    '確認': '確定',
    '確定': '確定',
    '来店': '確定',
    '完了': '実績化',
    'キャンセル': 'キャンセル',
    'ノーショー': 'キャンセル',
}

# 団体判定の閾値
GROUP_THRESHOLD = 7

# フロント表示用ハイライト閾値（この人数以上をTHE BRIDGEにメモ表示）
HIGHLIGHT_THRESHOLD = 20

# 店舗別定休日設定
# weekday: 0=月, 1=火, 2=水, 3=木, 4=金, 5=土, 6=日
STORE_HOLIDAYS = {
    'NP': {
        'months': [12, 1, 2, 3],           # 12〜3月
        'closed_days': [1, 2],              # 火曜・水曜
    },
    # JWは定休日なし（平日ランチなしはチャネルレベルの話）
}


def is_holiday(store, date_str):
    """店舗の定休日かどうかを判定"""
    if store not in STORE_HOLIDAYS:
        return False
    config = STORE_HOLIDAYS[store]
    try:
        dt = datetime.strptime(date_str, '%Y-%m-%d')
        if dt.month in config['months'] and dt.weekday() in config['closed_days']:
            return True
    except ValueError:
        pass
    return False


def extract_course_name(order_text):
    """注文テキストからコース名だけを抽出（個人情報なし）"""
    if not order_text:
        return ''
    # 「N × コース名」のパターンを抽出
    courses = re.findall(r'\d+\s*×\s*(.+?)(?:,|$)', order_text)
    if courses:
        return ' / '.join(c.strip() for c in courses)
    return ''


def classify_type(row):
    """予約タイプを判定: 宴会 / 団体 / 貸切 / 通常"""
    seat_type = row.get('seat_type', '')
    seat_cat = row.get('seat_category', '')
    purpose = row.get('purpose', '')
    total_count = sum(int(row.get(k, 0) or 0) for k in ['count_adult', 'count_senior', 'count_child'])

    # 貸切判定
    if '貸切' in seat_type or '貸切' in purpose or '貸切' in seat_cat:
        return '貸切'

    # 宴会判定（個室 + 大人数、または用途が宴会系）
    if '宴会' in purpose or '忘年会' in purpose or '新年会' in purpose or '歓送迎会' in purpose:
        return '宴会'

    # 団体判定
    if total_count >= GROUP_THRESHOLD:
        return '団体'

    return '通常'


def parse_tablecheck_csv(filepath):
    """TableCheck CSVを読み込み、クリーンなOnHandデータに変換"""
    records = []

    with open(filepath, 'r', encoding='utf-8') as f:
        # 1行目が「予約」だけの場合はスキップ
        first_line = f.readline().strip()
        if first_line != '予約':
            f.seek(0)  # 戻す

        reader = csv.DictReader(f)

        for row in reader:
            # ホワイトリストのカラムのみ抽出
            clean = {}
            for tc_col, mp_col in WHITELIST_COLUMNS.items():
                clean[mp_col] = row.get(tc_col, '').strip()

            # 店舗IDの解決
            store_name = row.get('店舗', '').strip()
            clean['store'] = STORE_MAP.get(store_name, '')

            # 合計人数
            total = sum(int(clean.get(k, 0) or 0) for k in ['count_adult', 'count_senior', 'count_child'])
            clean['count'] = total

            # ステータス変換
            clean['status'] = STATUS_MAP.get(clean.get('tc_status', ''), clean.get('tc_status', ''))

            # 金額を数値に
            try:
                clean['amount'] = int(float(clean.get('amount', 0) or 0))
            except (ValueError, TypeError):
                clean['amount'] = 0

            # タイプ判定
            clean['type'] = classify_type(clean)

            # コース名抽出（注文テキストから個人情報を含まない部分のみ）
            clean['course'] = extract_course_name(clean.get('order', ''))

            # GA宴会場分離: 「テレビ塔宴会コース」はレストランではなく宴会場
            if clean.get('store') == 'GA' and 'テレビ塔宴会コース' in clean.get('order', ''):
                clean['store'] = 'GA_宴会'
                clean['type'] = '宴会'

            # 不要フィールドを除去
            for k in ['tc_status', 'seat_type', 'seat_category', 'order', 'purpose',
                       'count_adult', 'count_senior', 'count_child', 'count_infant']:
                clean.pop(k, None)

            records.append(clean)

    return records


def filter_onhand(records, min_date=None):
    """OnHand対象をフィルタ: 確定 + 団体以上 + 未来日"""
    today = datetime.now().strftime('%Y-%m-%d')
    filtered = []
    for r in records:
        # キャンセルは除外
        if r['status'] == 'キャンセル':
            continue
        # 通常予約はOnHandに不要
        if r['type'] == '通常':
            continue
        # 過去日は実績化
        if r['date'] < today:
            r['status'] = '実績化'
        filtered.append(r)
    return filtered


def aggregate_daily_summary(all_records):
    """全予約（バラ含む）を日別×店舗別に集計 → 予約充足率の計算用"""
    today = datetime.now().strftime('%Y-%m-%d')
    daily = {}  # key: (date, store)

    for r in all_records:
        if r['status'] == 'キャンセル':
            continue
        if not r.get('date') or not r.get('store'):
            continue
        # 過去日はスキップ
        if r['date'] < today:
            continue

        key = (r['date'], r['store'])
        if key not in daily:
            daily[key] = {
                'date': r['date'],
                'store': r['store'],
                'bara_reservations': 0,
                'bara_guests': 0,
                'bara_amount': 0,
                'onhand_reservations': 0,
                'onhand_guests': 0,
                'onhand_amount': 0,
            }

        d = daily[key]
        count = r.get('count', 0) or 0
        amount = r.get('amount', 0) or 0

        if r['type'] == '通常':
            d['bara_reservations'] += 1
            d['bara_guests'] += count
            d['bara_amount'] += amount
        else:
            d['onhand_reservations'] += 1
            d['onhand_guests'] += count
            d['onhand_amount'] += amount

    # 合計を計算
    result = []
    for key, d in sorted(daily.items()):
        d['total_reservations'] = d['bara_reservations'] + d['onhand_reservations']
        d['total_guests'] = d['bara_guests'] + d['onhand_guests']
        d['total_amount'] = d['bara_amount'] + d['onhand_amount']
        result.append(d)

    return result


def get_latest_csv_per_store(base_dir):
    """各店舗フォルダ内の最新CSVのみを返す"""
    base = Path(base_dir)
    latest_files = []

    # 店舗サブフォルダを探索
    store_dirs = [d for d in base.iterdir() if d.is_dir() and d.name != 'on_hand_output']

    if not store_dirs:
        # サブフォルダがない = 直接店舗フォルダを指定された場合
        csvs = sorted(base.glob('*.csv'), key=lambda f: f.stat().st_mtime)
        if csvs:
            latest_files.append(csvs[-1])  # 最新のみ
            if len(csvs) > 1:
                print(f"   📁 {base.name}/: {len(csvs)}ファイル → 最新 '{csvs[-1].name}' を使用")
        return latest_files

    for store_dir in sorted(store_dirs):
        csvs = sorted(store_dir.glob('*.csv'), key=lambda f: f.stat().st_mtime)
        if csvs:
            latest = csvs[-1]
            latest_files.append(latest)
            if len(csvs) > 1:
                print(f"   📁 {store_dir.name}/: {len(csvs)}ファイル → 最新 '{latest.name}' を使用")
            else:
                print(f"   📁 {store_dir.name}/: '{latest.name}'")
        else:
            print(f"   📁 {store_dir.name}/: CSVなし（スキップ）")

    return latest_files


def main():
    if len(sys.argv) < 2:
        print(f"Usage: python3 {sys.argv[0]} <csv_file_or_directory>")
        sys.exit(1)

    target = Path(sys.argv[1])
    csv_files = []

    if target.is_file():
        csv_files = [target]
    elif target.is_dir():
        print(f"🔍 最新CSVを検索中: {target}")
        csv_files = get_latest_csv_per_store(target)
    else:
        print(f"Error: {target} not found")
        sys.exit(1)

    if not csv_files:
        print("⚠️ 処理対象のCSVファイルが見つかりませんでした。")
        sys.exit(0)

    all_records = []
    all_records_full = []

    for csv_file in csv_files:
        print(f"📄 Processing: {csv_file.name}")
        records = parse_tablecheck_csv(csv_file)
        all_records_full.extend(records)
        filtered = filter_onhand(records)
        all_records.extend(filtered)
        print(f"   全{len(records)}件 → OnHand対象: {len(filtered)}件")

    # 出力
    output_dir = Path(__file__).parent / 'on_hand_output'
    output_dir.mkdir(exist_ok=True)

    fieldnames = ['date', 'time', 'store', 'type', 'count', 'amount', 'status', 'course', 'reservation_id']

    # OnHand CSV（クリーンデータ）
    output_csv = output_dir / 'onhand_clean.csv'
    with open(output_csv, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in all_records:
            writer.writerow({k: r.get(k, '') for k in fieldnames})

    # OnHand JSON（GAS API投入用）
    output_json = output_dir / 'onhand_clean.json'
    json_data = [{k: r.get(k, '') for k in fieldnames} for r in all_records]
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(json_data, f, ensure_ascii=False, indent=2)

    # ハイライト JSON（THE BRIDGE表示用 — 大人数案件のみ）
    highlights = [
        {k: r.get(k, '') for k in fieldnames}
        for r in all_records
        if r.get('count', 0) >= HIGHLIGHT_THRESHOLD and r.get('status') == '確定'
    ]
    highlights.sort(key=lambda x: x['date'])
    output_highlights = output_dir / 'onhand_highlights.json'
    with open(output_highlights, 'w', encoding='utf-8') as f:
        json.dump(highlights, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 出力完了:")
    print(f"   CSV:  {output_csv} ({len(all_records)}件)")
    print(f"   JSON: {output_json}")
    print(f"   🔴 ハイライト: {output_highlights} ({len(highlights)}件, {HIGHLIGHT_THRESHOLD}名以上)")

    # 日別サマリー（バラ予約 + OnHand 統合）
    daily_summary = aggregate_daily_summary(all_records_full)
    output_daily = output_dir / 'reservation_daily_summary.json'
    with open(output_daily, 'w', encoding='utf-8') as f:
        json.dump(daily_summary, f, ensure_ascii=False, indent=2)
    print(f"   📅 日別サマリー: {output_daily} ({len(daily_summary)}日分)")

    # サマリー
    print(f"\n📊 サマリー:")
    print(f"   入力全件: {len(all_records_full)}")
    print(f"   OnHand対象: {len(all_records)}")
    bara_total = sum(1 for r in all_records_full if r['type'] == '通常' and r['status'] != 'キャンセル')
    print(f"   バラ予約: {bara_total}件")
    by_type = {}
    for r in all_records:
        t = r['type']
        by_type[t] = by_type.get(t, 0) + 1
    for t, c in sorted(by_type.items()):
        print(f"   - {t}: {c}件")
    by_status = {}
    for r in all_records:
        s = r['status']
        by_status[s] = by_status.get(s, 0) + 1
    for s, c in sorted(by_status.items()):
        print(f"   - [{s}]: {c}件")

    total_amount = sum(r.get('amount', 0) for r in all_records if r['status'] == '確定')
    print(f"   確定済み合計金額: ¥{total_amount:,.0f}")

    # ハイライト表示
    if highlights:
        print(f"\n🔴 THE BRIDGE ハイライト（{HIGHLIGHT_THRESHOLD}名以上）:")
        for h in highlights:
            print(f"   {h['date']} {h['store']} {h['type']} {h['count']}名 ¥{h['amount']:,} {h['course']}")

    # 日別予約進捗（当月表示）
    today = datetime.now().strftime('%Y-%m-%d')
    upcoming = [d for d in daily_summary if d['date'] >= today and d['date'] <= (datetime.now().replace(day=28)).strftime('%Y-%m-%d')]
    if upcoming:
        print(f"\n📅 予約進捗（当月）:")
        print(f"   {'日付':>10} {'店舗':>6} {'バラ':>4} {'バラ客':>6} {'OH':>3} {'OH客':>4} {'合計客':>6} {'合計金額':>10} {'備考'}")
        print(f"   {'─'*10} {'─'*6} {'─'*4} {'─'*6} {'─'*3} {'─'*4} {'─'*6} {'─'*10} {'─'*6}")
        for d in upcoming:
            note = ''
            if is_holiday(d['store'], d['date']):
                note = '🔴定休' if d['total_reservations'] == 0 else '⚠臨時営業'
            print(f"   {d['date']:>10} {d['store']:>6} {d['bara_reservations']:>4} {d['bara_guests']:>6} {d['onhand_reservations']:>3} {d['onhand_guests']:>4} {d['total_guests']:>6} ¥{d['total_amount']:>9,} {note}")


if __name__ == '__main__':
    main()
