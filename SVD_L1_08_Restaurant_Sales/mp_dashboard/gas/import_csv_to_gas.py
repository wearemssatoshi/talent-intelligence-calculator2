#!/usr/bin/env python3
"""
MP CSV → GAS Import Script (v3 — F/B完全分解版)
================================================
全チャネルのFood/Drink分解を含む完全版。
各店舗CSVからフラットデータ行を抽出し、GAS APIにPOSTする。

Usage:
  python3 import_csv_to_gas.py --url YOUR_GAS_DEPLOY_URL
  python3 import_csv_to_gas.py --url YOUR_GAS_DEPLOY_URL --store MOIWA_JW
  python3 import_csv_to_gas.py --url YOUR_GAS_DEPLOY_URL --setup
  python3 import_csv_to_gas.py --url YOUR_GAS_DEPLOY_URL --dry-run
"""

import csv
import json
import sys
import os
import urllib.request
import urllib.error

# ── パス設定 ──
CSV_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'csv_output')

# ── 安全なint変換 ──
def i(row, key):
    val = row.get(key, '')
    if val == '' or val is None:
        return 0
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return 0

# ══════════════════════════════════════════════════════
# 店舗別シート定義 — F/B完全分解版
# ヘッダー順序はCode.gsのSTORE_SHEETSと完全一致させること
# ══════════════════════════════════════════════════════
STORE_SHEETS = {
    # MOIWA_JW: date|L_Food|L_Drink|L人数|D_Food|D_Drink|D人数|TO_Food|TO_Drink|席料|南京錠|花束|物販_食品|物販_アパレル
    'MOIWA_JW': {
        'csv_file': 'JW_daily.csv',
        'mapper': lambda r: [
            r.get('date', ''),
            i(r, 'l_food'), i(r, 'l_drink'), i(r, 'l_count'),
            i(r, 'd_food'), i(r, 'd_drink'), i(r, 'd_count'),
            i(r, 'to_food'), i(r, 'to_drink'),
            i(r, 'seat_fee'),
            i(r, 'lock_fee'),
            i(r, 'flower'),
            i(r, 'curry'),   # 物販_食品: もーりすカレー
            0,                # 物販_アパレル: なし
        ]
    },
    # TVTOWER_GA: date|L_Food|L_Drink|L人数|D_Food|D_Drink|D人数|TO_Food|TO_Drink|宴会_Food|宴会_Drink|宴会人数|室料|展望台|物販_食品|物販_アパレル
    'TVTOWER_GA': {
        'csv_file': 'GA_daily.csv',
        'mapper': lambda r: [
            r.get('date', ''),
            i(r, 'l_food'), i(r, 'l_drink'), i(r, 'l_count'),
            i(r, 'd_food'), i(r, 'd_drink'), i(r, 'd_count'),
            i(r, 'to_food'), i(r, 'to_drink'),
            i(r, 'bq_food'), i(r, 'bq_drink'), i(r, 'bq_count'),
            i(r, 'room_fee'),
            0,                # 展望台（CSVに列なし）
            0, 0,             # 物販
        ]
    },
    # TVTOWER_BG: date|Food|Drink|Tent|人数|物販_食品|物販_アパレル
    'TVTOWER_BG': {
        'csv_file': 'GA_daily.csv',
        'mapper': lambda r: [
            r.get('date', ''),
            i(r, 'bg_food'),
            i(r, 'bg_drink'),
            i(r, 'bg_tent'),
            i(r, 'bg_count'),
            0,                # 物販_食品
            i(r, 'bg_goods'), # 物販_アパレル: Tシャツ等
        ],
        'filter': lambda r: i(r, 'bg_total') > 0
    },
    # OKURAYAMA_NP: date|L_Food|L_Drink|L人数|D_Food|D_Drink|D人数|室料|花束|Event_Food|Event_Drink|Event人数|物販_食品|物販_アパレル
    'OKURAYAMA_NP': {
        'csv_file': 'NP_daily.csv',
        'mapper': lambda r: [
            r.get('date', ''),
            i(r, 'l_food'), i(r, 'l_drink'), i(r, 'l_count'),
            i(r, 'd_food'), i(r, 'd_drink'), i(r, 'd_count'),
            i(r, 'l_room_fee') + i(r, 'd_room_fee') + i(r, 'event_room_fee'),  # 室料まとめ
            i(r, 'l_flower') + i(r, 'd_flower') + i(r, 'event_flower'),         # 花束まとめ
            i(r, 'event_food'), i(r, 'event_drink'), i(r, 'event_count'),
            0, 0,             # 物販
        ]
    },
    # OKURAYAMA_Ce: date|Food|Drink|人数|物販_食品|物販_アパレル
    'OKURAYAMA_Ce': {
        'csv_file': 'Ce_daily.csv',
        'mapper': lambda r: [
            r.get('date', ''),
            i(r, 'food'),
            i(r, 'drink'),
            i(r, 'count'),
            0,                # 物販_食品
            i(r, 'goods'),    # 物販_アパレル
        ]
    },
    # OKURAYAMA_RP: date|Food|Drink|人数|物販_食品|物販_アパレル
    'OKURAYAMA_RP': {
        'csv_file': 'RP_daily.csv',
        'mapper': lambda r: [
            r.get('date', ''),
            i(r, 'food'),
            i(r, 'drink'),
            i(r, 'count'),
            0,                # 物販_食品
            i(r, 'goods'),    # 物販_アパレル
        ]
    },
    # AKARENGA_BQ: date|L_Food|L_Drink|L人数|AT_Food|AT_Drink|AT人数|D_Food|D_Drink|D人数|席料|物販_食品|物販_アパレル
    'AKARENGA_BQ': {
        'csv_file': 'BQ_daily.csv',
        'mapper': lambda r: [
            r.get('date', ''),
            i(r, 'l_food'), i(r, 'l_drink'), i(r, 'l_count'),
            i(r, 'at_food'), i(r, 'at_drink'), i(r, 'at_count'),
            i(r, 'd_food'), i(r, 'd_drink'), i(r, 'd_count'),
            i(r, 'seat_fee'),
            0, 0,             # 物販
        ]
    },
    # AKARENGA_RYB: date|Food|Drink|人数|物販_食品|物販_アパレル
    'AKARENGA_RYB': {
        'csv_file': 'BQ_daily.csv',
        'mapper': lambda r: [
            r.get('date', ''),
            i(r, 'ryb_food'),
            i(r, 'ryb_drink'),
            i(r, 'ryb_count'),
            0, 0,             # 物販
        ],
        'filter': lambda r: i(r, 'ryb_total') > 0
    },
}


def load_csv(sheet_name, config):
    """CSVからフラットデータ行を生成"""
    csv_path = os.path.join(CSV_DIR, config['csv_file'])
    if not os.path.exists(csv_path):
        print(f'  ⚠ {csv_path} が見つかりません')
        return []

    records = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if not row.get('date', '').strip():
                continue
            if 'filter' in config and not config['filter'](row):
                continue
            try:
                mapped = config['mapper'](row)
                records.append(mapped)
            except Exception as e:
                print(f'  ⚠ マッピングエラー ({row.get("date", "?")}): {e}')

    records.sort(key=lambda r: r[0])
    return records


def post_to_gas(url, action, payload):
    """GAS APIにPOST"""
    payload['action'] = action
    data = json.dumps(payload).encode('utf-8')

    req = urllib.request.Request(
        url,
        data=data,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )

    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            result = json.loads(resp.read().decode())
            return result
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ''
        print(f'  ❌ HTTP {e.code}: {body[:200]}')
        return {'status': 'error', 'message': f'HTTP {e.code}'}
    except Exception as e:
        print(f'  ❌ ネットワークエラー: {e}')
        return {'status': 'error', 'message': str(e)}


def main():
    import argparse
    parser = argparse.ArgumentParser(description='MP CSV → GAS Import v3')
    parser.add_argument('--url', required=True, help='GAS deploy URL')
    parser.add_argument('--store', help='特定シートのみ (例: MOIWA_JW)')
    parser.add_argument('--setup', action='store_true', help='シート初期作成のみ')
    parser.add_argument('--dry-run', action='store_true', help='データ数の確認のみ')
    args = parser.parse_args()

    print('═' * 60)
    print('MOMENTUM PEAKS — CSV → GAS Import v3 (F/B完全分解版)')
    print(f'Target: {args.url[:60]}...')
    print('═' * 60)

    if args.setup:
        print('\n📋 シート初期作成中...')
        result = post_to_gas(args.url, 'setupSheets', {})
        if result.get('status') == 'ok':
            print(f'  ✅ 作成済みシート: {result.get("created", [])}')
            print(f'  📊 合計 {result.get("total_sheets", 0)} シート')
        else:
            print(f'  ❌ エラー: {result.get("message")}')
        return

    stores = {args.store: STORE_SHEETS[args.store]} if args.store else STORE_SHEETS
    grand_total = 0

    for sheet_name, config in stores.items():
        print(f'\n📂 {sheet_name} ({config["csv_file"]}) ...')
        rows = load_csv(sheet_name, config)
        print(f'   {len(rows)} 行をロード')

        if not rows:
            continue

        if args.dry_run:
            # サンプル行表示
            sample = rows[0]
            print(f'   [DRY RUN] {len(rows)} 行を投入予定')
            print(f'   サンプル: {sample[:5]}...')
            grand_total += len(rows)
            continue

        BATCH_SIZE = 500
        for start in range(0, len(rows), BATCH_SIZE):
            batch = rows[start:start + BATCH_SIZE]
            print(f'   📤 バッチ {start+1}-{start+len(batch)} / {len(rows)} ...')
            result = post_to_gas(args.url, 'import', {
                'sheet': sheet_name,
                'rows': batch,
                'user': 'CSV_IMPORT_v3'
            })
            if result.get('status') == 'ok':
                imported = result.get('imported', 0)
                grand_total += imported
                print(f'   ✅ {imported} 行を書き込み')
            else:
                print(f'   ❌ エラー: {result.get("message")}')
                break

    print(f'\n{"═" * 60}')
    print(f'合計: {grand_total} 行 / {len(stores)} シート')
    print('═' * 60)


if __name__ == '__main__':
    main()
