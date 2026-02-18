#!/usr/bin/env python3
"""
MP CSV → GAS Import Script
===========================
CSVデータをGAS APIにPOSTしてGoogle Sheetsにインポートする。

Usage:
  python3 import_csv_to_gas.py --url YOUR_GAS_DEPLOY_URL

対象CSV: JW, NP, Ce, RP, GA, BQ (csv_output/ 配下)
"""

import csv
import json
import sys
import os
import urllib.request
import urllib.error

# ── CSV → channel mapping ──
CSV_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'csv_output')

STORE_CHANNEL_MAP = {
    'JW': {
        'channels_builder': lambda r: {
            'LUNCH': {'count': i(r,'l_count'), 'food': i(r,'l_food'), 'drink': i(r,'l_drink'), 'sales': i(r,'l_total')},
            'DINNER': {'count': i(r,'d_count'), 'food': i(r,'d_food'), 'drink': i(r,'d_drink'), 'sales': i(r,'d_total')},
            'TAKEOUT': {'sales': i(r,'to_total')},
            'MISC': {'seat_fee': i(r,'seat_fee'), 'lock_fee': i(r,'lock_fee'), 'flower': i(r,'flower'), 'curry': i(r,'curry')}
        },
        'count_builder': lambda r: i(r,'l_count') + i(r,'d_count'),
        'sales_builder': lambda r: i(r,'grand_total')
    },
    'GA': {
        'channels_builder': lambda r: {
            'LUNCH': {'count': i(r,'l_count'), 'food': i(r,'l_food'), 'drink': i(r,'l_drink'), 'sales': i(r,'l_total')},
            'DINNER': {'count': i(r,'d_count'), 'food': i(r,'d_food'), 'drink': i(r,'d_drink'), 'sales': i(r,'d_total')},
            'TAKEOUT': {'sales': i(r,'to_total')},
            'BANQUET': {'count': i(r,'bq_count'), 'sales': i(r,'bq_total')},
            'BG': {'count': i(r,'bg_count'), 'sales': i(r,'bg_total')},
            'MISC': {'room_fee': i(r,'room_fee')}
        },
        'count_builder': lambda r: i(r,'l_count') + i(r,'d_count') + i(r,'bq_count') + i(r,'bg_count'),
        'sales_builder': lambda r: i(r,'grand_total')
    },
    'NP': {
        'channels_builder': lambda r: {
            'LUNCH': {'count': i(r,'l_count'), 'food': i(r,'l_food'), 'drink': i(r,'l_drink'), 'sales': i(r,'l_total')},
            'DINNER': {'count': i(r,'d_count'), 'food': i(r,'d_food'), 'drink': i(r,'d_drink'), 'sales': i(r,'d_total')},
            'EVENT': {'count': i(r,'event_count'), 'food': i(r,'event_food'), 'drink': i(r,'event_drink'),
                      'room_fee': i(r,'event_room_fee'), 'flower': i(r,'event_flower'), 'sales': i(r,'event_total')},
            'MISC': {'l_room_fee': i(r,'l_room_fee'), 'l_flower': i(r,'l_flower'), 'd_room_fee': i(r,'d_room_fee'), 'd_flower': i(r,'d_flower')}
        },
        'count_builder': lambda r: i(r,'l_count') + i(r,'d_count') + i(r,'event_count'),
        'sales_builder': lambda r: i(r,'grand_total')
    },
    'BQ': {
        'channels_builder': lambda r: {
            'LUNCH': {'count': i(r,'l_count'), 'food': i(r,'l_food'), 'drink': i(r,'l_drink'), 'sales': i(r,'l_total')},
            'AFTERNOON': {'count': i(r,'at_count'), 'food': i(r,'at_food'), 'drink': i(r,'at_drink'), 'sales': i(r,'at_total')},
            'DINNER': {'count': i(r,'d_count'), 'food': i(r,'d_food'), 'drink': i(r,'d_drink'), 'sales': i(r,'d_total')},
            'RYB': {'count': i(r,'ryb_count'), 'food': i(r,'ryb_food'), 'drink': i(r,'ryb_drink'), 'sales': i(r,'ryb_total')},
            'MISC': {'seat_fee': i(r,'seat_fee'), 'flower': i(r,'flower')}
        },
        'count_builder': lambda r: i(r,'l_count') + i(r,'at_count') + i(r,'d_count') + i(r,'ryb_count'),
        'sales_builder': lambda r: i(r,'grand_total')
    },
    'Ce': {
        'channels_builder': lambda r: {
            'ALL': {'count': i(r,'count'), 'food': i(r,'food'), 'drink': i(r,'drink'), 'goods': i(r,'goods'), 'sales': i(r,'total')}
        },
        'count_builder': lambda r: i(r,'count'),
        'sales_builder': lambda r: i(r,'total')
    },
    'RP': {
        'channels_builder': lambda r: {
            'ALL': {'count': i(r,'count'), 'food': i(r,'food'), 'drink': i(r,'drink'), 'goods': i(r,'goods'), 'sales': i(r,'total')}
        },
        'count_builder': lambda r: i(r,'count'),
        'sales_builder': lambda r: i(r,'total')
    },
    'RYB': {
        'channels_builder': lambda r: {
            'ALL': {'sales': i(r,'actual_sales'), 'count': i(r,'actual_count')}
        },
        'count_builder': lambda r: i(r,'actual_count'),
        'sales_builder': lambda r: i(r,'actual_sales')
    }
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


def load_csv(store_id):
    """Load CSV and convert to GAS-compatible records"""
    # Store-specific CSV filename overrides
    CSV_FILENAME_MAP = {
        'RYB': 'RYB_mp_daily.csv',
    }
    csv_filename = CSV_FILENAME_MAP.get(store_id, f'{store_id}_daily.csv')
    csv_path = os.path.join(CSV_DIR, csv_filename)
    if not os.path.exists(csv_path):
        print(f'  ⚠ {csv_path} not found, skipping')
        return []

    mapping = STORE_CHANNEL_MAP.get(store_id)
    if not mapping:
        print(f'  ⚠ No mapping for {store_id}, skipping')
        return []

    records = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            date = row.get('date', '').strip()
            if not date:
                continue
            try:
                channels = mapping['channels_builder'](row)
                record = {
                    'date': date,
                    'store_id': store_id,
                    'actual_sales': mapping['sales_builder'](row),
                    'actual_count': mapping['count_builder'](row),
                    'channels': channels
                }
                records.append(record)
            except Exception as e:
                print(f'  ⚠ Error processing {store_id} {date}: {e}')

    return records


def post_to_gas(url, records, store_id, batch_size=500):
    """POST records to GAS in batches"""
    total = len(records)
    imported = 0

    for start in range(0, total, batch_size):
        batch = records[start:start + batch_size]
        payload = json.dumps({
            'action': 'import',
            'records': batch,
            'user': 'CSV_IMPORT'
        }).encode('utf-8')

        req = urllib.request.Request(
            url,
            data=payload,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                result = json.loads(resp.read().decode())
                if result.get('status') == 'ok':
                    imported += result.get('imported', 0)
                    print(f'  ✅ {store_id}: batch {start+1}-{start+len(batch)} → {result.get("imported")} rows')
                else:
                    print(f'  ❌ {store_id}: batch error: {result.get("message")}')
        except Exception as e:
            print(f'  ❌ {store_id}: network error: {e}')

    return imported


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Import MP CSV data to GAS')
    parser.add_argument('--url', required=True, help='GAS deploy URL')
    parser.add_argument('--store', help='Specific store to import (e.g., JW)')
    parser.add_argument('--dry-run', action='store_true', help='Just count, do not POST')
    args = parser.parse_args()

    stores = [args.store] if args.store else ['JW', 'NP', 'GA', 'BQ', 'Ce', 'RP', 'RYB']
    grand_total = 0

    print('═' * 50)
    print('MOMENTUM PEAKS — CSV → GAS Import')
    print('═' * 50)

    for sid in stores:
        print(f'\n📂 Loading {sid}_daily.csv ...')
        records = load_csv(sid)
        print(f'   Found {len(records)} records')
        grand_total += len(records)

        if args.dry_run:
            print(f'   [DRY RUN] Would import {len(records)} records')
            continue

        if records:
            post_to_gas(args.url, records, sid)

    print(f'\n{"═" * 50}')
    print(f'Total: {grand_total} records across {len(stores)} stores')
    print('═' * 50)


if __name__ == '__main__':
    main()
