#!/usr/bin/env python3
"""
MP CSV → Google Sheets 直接投入スクリプト (v2)
==============================================
店舗ごとにシートを作成し、チャネル別ヘッダー+フラットデータ行を書き込む。

Usage:
  python3 import_to_sheets.py

対象: JW, GA, BG, NP, Ce, RP, BQ, RYB (csv_output/ 配下)
認証: Service Account or OAuth (gspread + google-auth)
"""

import csv
import os
import sys

try:
    import gspread
    from google.oauth2.service_account import Credentials
except ImportError:
    print("必要なライブラリをインストールしてください:")
    print("  pip3 install gspread google-auth")
    sys.exit(1)

# ── パス設定 ──
CSV_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'csv_output')
SPREADSHEET_NAME = 'MP_DailySales'

# ── 認証情報のパス（Service Account JSON） ──
CREDS_PATHS = [
    os.path.expanduser('~/dotfiles/SVD_L1_08_Restaurant_Sales/mp_dashboard/gas/credentials.json'),
    os.path.expanduser('~/.config/gspread/service_account.json'),
    os.path.expanduser('~/credentials.json'),
]

# ── 店舗別シート定義 ──
# シート名: ヘッダー列の定義
STORE_SHEETS = {
    'MOIWA_JW': {
        'csv_file': 'JW_daily.csv',
        'headers': ['date', 'L売上', 'L人数', 'D売上', 'D人数', 'T.O', '席料', '南京錠', '花束', '物販_食品', '物販_アパレル'],
        'mapper': lambda r: [
            r.get('date', ''),
            i(r, 'l_total'), i(r, 'l_count'),
            i(r, 'd_total'), i(r, 'd_count'),
            i(r, 'to_total'),
            i(r, 'seat_fee'),
            i(r, 'lock_fee'),
            i(r, 'flower'),
            i(r, 'curry'),  # カレー → 物販_食品
            0,  # 物販_アパレル（現在なし）
        ]
    },
    'TVTOWER_GA': {
        'csv_file': 'GA_daily.csv',
        'headers': ['date', 'L売上', 'L人数', 'D売上', 'D人数', 'ATW売上', 'ATW人数', '宴会売上', '宴会人数', '室料', '展望台', '物販_食品', '物販_アパレル'],
        'mapper': lambda r: [
            r.get('date', ''),
            i(r, 'l_total'), i(r, 'l_count'),
            i(r, 'd_total'), i(r, 'd_count'),
            i(r, 'atw_total'), i(r, 'atw_count'),
            i(r, 'bq_total'), i(r, 'bq_count'),
            i(r, 'room_fee'),
            i(r, 'ticket'),
            0,  # 物販_食品（現在なし）
            0,  # 物販_アパレル（現在なし）
        ]
    },
    'TVTOWER_BG': {
        'csv_file': 'GA_daily.csv',  # BGデータはGA_daily.csvのbg_*列にある
        'headers': ['date', 'Food', 'Drink', 'Tent', '人数', '物販_食品', '物販_アパレル'],
        'mapper': lambda r: [
            r.get('date', ''),
            i(r, 'bg_food'),
            i(r, 'bg_drink'),
            i(r, 'bg_tent'),
            i(r, 'bg_count'),
            0,  # 物販_食品（将来用）
            i(r, 'bg_goods'),  # Tシャツ → 物販_アパレル
        ],
        'filter': lambda r: i(r, 'bg_total') > 0  # BG稼働日のみ
    },
    'OKURAYAMA_NP': {
        'csv_file': 'NP_daily.csv',
        'headers': ['date', 'L売上', 'L人数', 'D売上', 'D人数', '室料', '花束', 'Event売上', 'Event人数', '物販_食品', '物販_アパレル'],
        'mapper': lambda r: [
            r.get('date', ''),
            i(r, 'l_total'), i(r, 'l_count'),
            i(r, 'd_total'), i(r, 'd_count'),
            i(r, 'l_room_fee') + i(r, 'd_room_fee'),  # L室料+D室料 → 室料
            i(r, 'l_flower') + i(r, 'd_flower'),       # L花束+D花束 → 花束
            i(r, 'event_total'), i(r, 'event_count'),
            0,  # 物販_食品（現在なし）
            0,  # 物販_アパレル（現在なし）
        ]
    },
    'OKURAYAMA_Ce': {
        'csv_file': 'Ce_daily.csv',
        'headers': ['date', '料理', '飲料', '人数', '物販_食品', '物販_アパレル'],
        'mapper': lambda r: [
            r.get('date', ''),
            i(r, 'food'),
            i(r, 'drink'),
            i(r, 'count'),
            0,  # 物販_食品（将来: goodsの食品分）
            i(r, 'goods'),  # 暫定: goodsをアパレルへ
        ]
    },
    'OKURAYAMA_RP': {
        'csv_file': 'RP_daily.csv',
        'headers': ['date', '料理', '飲料', '人数', '物販_食品', '物販_アパレル'],
        'mapper': lambda r: [
            r.get('date', ''),
            i(r, 'food'),
            i(r, 'drink'),
            i(r, 'count'),
            0,  # 物販_食品（将来: goodsの食品分）
            i(r, 'goods'),  # 暫定: goodsをアパレルへ
        ]
    },
    'AKARENGA_BQ': {
        'csv_file': 'BQ_daily.csv',
        'headers': ['date', 'L売上', 'L人数', 'AT売上', 'AT人数', 'D売上', 'D人数', '席料', '物販_食品', '物販_アパレル'],
        'mapper': lambda r: [
            r.get('date', ''),
            i(r, 'l_total'), i(r, 'l_count'),
            i(r, 'at_total'), i(r, 'at_count'),
            i(r, 'd_total'), i(r, 'd_count'),
            i(r, 'seat_fee'),
            0,  # 物販_食品（現在なし）
            0,  # 物販_アパレル（現在なし）
        ]
    },
    'AKARENGA_RYB': {
        'csv_file': 'BQ_daily.csv',  # RYBデータはBQ_daily.csvのryb_*列にある
        'headers': ['date', 'Food', 'Drink', '人数', '物販_食品', '物販_アパレル'],
        'mapper': lambda r: [
            r.get('date', ''),
            i(r, 'ryb_food'),
            i(r, 'ryb_drink'),
            i(r, 'ryb_count'),
            0,  # 物販_食品（現在なし）
            0,  # 物販_アパレル（現在なし）
        ],
        'filter': lambda r: i(r, 'ryb_total') > 0  # RYB稼働日のみ
    },
}


def i(row, key):
    """Safe int extraction"""
    val = row.get(key, '')
    if val == '' or val is None:
        return 0
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return 0


def find_credentials():
    """認証情報ファイルを探す"""
    for p in CREDS_PATHS:
        if os.path.exists(p):
            return p
    return None


def connect_spreadsheet():
    """Google Sheetsに接続"""
    creds_path = find_credentials()
    if not creds_path:
        print("❌ 認証情報(credentials.json)が見つかりません。")
        print("以下のいずれかに配置してください:")
        for p in CREDS_PATHS:
            print(f"  - {p}")
        sys.exit(1)

    print(f"🔑 認証: {creds_path}")
    scopes = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]
    creds = Credentials.from_service_account_file(creds_path, scopes=scopes)
    gc = gspread.authorize(creds)

    try:
        ss = gc.open(SPREADSHEET_NAME)
        print(f"📊 スプレッドシート: {ss.title} ({ss.url})")
    except gspread.SpreadsheetNotFound:
        print(f"❌ '{SPREADSHEET_NAME}' が見つかりません。Service Accountに共有してください。")
        sys.exit(1)

    return ss


def process_store(ss, sheet_name, config):
    """1店舗分のデータを処理してシートに書き込む"""
    csv_path = os.path.join(CSV_DIR, config['csv_file'])
    if not os.path.exists(csv_path):
        print(f"  ⚠ {csv_path} が見つかりません。スキップ。")
        return 0

    # CSVデータ読み込み
    records = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if not row.get('date', '').strip():
                continue
            # フィルター適用（BG/RYBは稼働日のみ）
            if 'filter' in config and not config['filter'](row):
                continue
            try:
                mapped = config['mapper'](row)
                records.append(mapped)
            except Exception as e:
                print(f"  ⚠ マッピングエラー ({row.get('date', '?')}): {e}")

    if not records:
        print(f"  ⚠ データなし。スキップ。")
        return 0

    # 日付順にソート
    records.sort(key=lambda r: r[0])

    # シート取得 or 新規作成
    try:
        ws = ss.worksheet(sheet_name)
        print(f"  📋 既存シート '{sheet_name}' をクリア")
        ws.clear()
    except gspread.WorksheetNotFound:
        ws = ss.add_worksheet(title=sheet_name, rows=len(records) + 10, cols=len(config['headers']))
        print(f"  📋 新規シート '{sheet_name}' を作成")

    # ヘッダー + データを一括書き込み
    all_data = [config['headers']] + records
    ws.update(range_name='A1', values=all_data)

    # ヘッダー行を太字+フリーズ
    ws.format('1:1', {'textFormat': {'bold': True}})
    ws.freeze(rows=1)

    print(f"  ✅ {len(records)} 行を書き込み完了")
    return len(records)


def main():
    import argparse
    parser = argparse.ArgumentParser(description='MP CSV → Google Sheets 直接投入')
    parser.add_argument('--store', help='特定店舗のみ (例: MOIWA_JW)')
    parser.add_argument('--dry-run', action='store_true', help='接続テストのみ')
    args = parser.parse_args()

    print('═' * 60)
    print('MOMENTUM PEAKS — CSV → Google Sheets 直接投入 v2')
    print('═' * 60)

    ss = connect_spreadsheet()
    grand_total = 0

    stores = {args.store: STORE_SHEETS[args.store]} if args.store else STORE_SHEETS

    for sheet_name, config in stores.items():
        print(f'\n📂 {sheet_name} ({config["csv_file"]}) ...')

        if args.dry_run:
            csv_path = os.path.join(CSV_DIR, config['csv_file'])
            if os.path.exists(csv_path):
                with open(csv_path, 'r', encoding='utf-8') as f:
                    count = sum(1 for _ in csv.DictReader(f))
                print(f'  [DRY RUN] {count} 行のデータあり')
            else:
                print(f'  [DRY RUN] CSVなし')
            continue

        count = process_store(ss, sheet_name, config)
        grand_total += count

    print(f'\n{"═" * 60}')
    print(f'合計: {grand_total} 行 / {len(stores)} シート')
    print('═' * 60)


if __name__ == '__main__':
    main()
