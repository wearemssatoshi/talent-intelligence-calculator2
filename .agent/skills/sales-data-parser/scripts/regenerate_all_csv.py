#!/usr/bin/env python3
"""
SVD CSV再生成パイプライン — regenerate_all_csv.py
==================================================
全拠点の売上日報Excel（.xlsx）をパースし、
正確なチャネル別CSV + 全拠点統合CSVを生成する。

Usage:
    python regenerate_all_csv.py [--output-dir OUTPUT_DIR]
"""

import sys
import os
import csv
import json
import datetime
import argparse

# パーサーのディレクトリをパスに追加
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

from parse_sales_xlsx import parse_xlsx
from parse_bq_sales import parse_bq_xlsx

# ========== 設定 ==========
SALES_DIR = '/Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales'

STORE_CONFIGS = {
    'GA': {
        'parser': 'ga',
        'base': 'TV_TOWER',
        'files': [f'TV_TOWER/TV{y}/TV{y}_{q}.xlsx' for y in range(2023, 2026) for q in ['1Q', '2Q', '3Q', '4Q']],
        'csv_columns': [
            'date', 'weekday',
            'l_count', 'l_food', 'l_drink', 'l_total', 'l_avg',
            'd_count', 'd_food', 'd_drink', 'd_total', 'd_avg',
            'to_count', 'to_food', 'to_drink', 'to_total', 'to_avg',
            'bq_count', 'bq_food', 'bq_drink', 'bq_total', 'bq_avg',
            'bg_count', 'bg_food', 'bg_drink', 'bg_tent', 'bg_goods', 'bg_total', 'bg_avg',
            'room_fee', 'ticket', 'grand_total'
        ],
    },
    'JW': {
        'parser': 'ga',
        'base': 'Mt.MOIWA',
        'files': [f'Mt.MOIWA/MW{y}/MW{y}_{q}.xlsx' for y in range(2023, 2026) for q in ['1Q', '2Q', '3Q', '4Q']],
        'csv_columns': [
            'date', 'weekday',
            'l_count', 'l_food', 'l_drink', 'l_total', 'l_avg',
            'd_count', 'd_food', 'd_drink', 'd_total', 'd_avg',
            'to_count', 'to_food', 'to_drink', 'to_total', 'to_avg',
            'bq_count', 'bq_food', 'bq_drink', 'bq_total', 'bq_avg',
            'bg_count', 'bg_food', 'bg_drink', 'bg_total', 'bg_avg',
            'seat_fee', 'lock_fee', 'flower', 'morris_curry', 'grand_total'
        ],
    },
    'BQ': {
        'parser': 'bq',
        'base': 'Akarenga',
        'files': [f'Akarenga/AK{y}/AK{y}_{q}.xlsx' for y in range(2025, 2026) for q in ['1Q', '2Q', '3Q', '4Q']],
        'csv_columns': [
            'date', 'weekday',
            'l_kensu', 'l_count', 'l_food', 'l_drink', 'l_total', 'l_avg',
            'at_kensu', 'at_count', 'at_total',
            'd_count', 'd_food', 'd_drink', 'd_total', 'd_avg',
            'ryb_kensu', 'ryb_count', 'ryb_food', 'ryb_drink', 'ryb_total', 'ryb_avg',
            'seat_fee', 'flower', 'grand_total'
        ],
    },
}

WEEKDAY_JA = ['月', '火', '水', '木', '金', '土', '日']


def ga_row_from_daily(d):
    """GA/JWパーサーのdaily_data 1件からCSV行を生成"""
    ch = d.get('channels', {})
    l = ch.get('lunch', {})
    di = ch.get('dinner', {})
    to = ch.get('takeout', {})
    bq = ch.get('banquet', {})
    bg = ch.get('beer_garden', {})

    weekday_idx = d.get('weekday', 0)
    weekday_ja = WEEKDAY_JA[weekday_idx] if 0 <= weekday_idx < 7 else ''

    return {
        'date': d['date'],
        'weekday': weekday_ja,
        'l_count': l.get('pax', 0),
        'l_food': l.get('food_sales', 0),
        'l_drink': l.get('bev_sales', 0),
        'l_total': l.get('sales', 0),
        'l_avg': round(l.get('avg_spend', 0)) if l.get('avg_spend') else 0,
        'd_count': di.get('pax', 0),
        'd_food': di.get('food_sales', 0),
        'd_drink': di.get('bev_sales', 0),
        'd_total': di.get('sales', 0),
        'd_avg': round(di.get('avg_spend', 0)) if di.get('avg_spend') else 0,
        'to_count': to.get('pax', 0),
        'to_food': to.get('food_sales', 0),
        'to_drink': to.get('bev_sales', 0),
        'to_total': to.get('sales', 0),
        'to_avg': round(to.get('avg_spend', 0)) if to.get('avg_spend') else 0,
        'bq_count': bq.get('pax', 0),
        'bq_food': bq.get('food_sales', 0),
        'bq_drink': bq.get('bev_sales', 0),
        'bq_total': bq.get('sales', 0),
        'bq_avg': round(bq.get('avg_spend', 0)) if bq.get('avg_spend') else 0,
        'bg_count': bg.get('pax', 0),
        'bg_food': bg.get('food_sales', 0),
        'bg_drink': bg.get('bev_sales', 0),
        'bg_tent': bg.get('tent', 0),
        'bg_goods': bg.get('goods', 0),
        'bg_total': bg.get('sales', 0),
        'bg_avg': round(bg.get('avg_spend', 0)) if bg.get('avg_spend') else 0,
        'room_fee': 0,
        'ticket': 0,
        'grand_total': 0,  # TODO: all_channels sales from summary
    }


def bq_row_from_daily(d):
    """BQパーサーのdaily_data 1件からCSV行を生成"""
    ch = d.get('channels', {})
    l = ch.get('lunch', {})
    at = ch.get('afternoon_tea', {})
    di = ch.get('dinner', {})
    ryb = ch.get('ryb', {})
    ft = ch.get('final_total', {})

    weekday_idx = d.get('weekday', 0)
    weekday_ja = WEEKDAY_JA[weekday_idx] if 0 <= weekday_idx < 7 else ''

    return {
        'date': d['date'],
        'weekday': weekday_ja,
        'l_kensu': l.get('kensu', 0),
        'l_count': l.get('pax', 0),
        'l_food': l.get('food_sales', 0),
        'l_drink': l.get('bev_sales', 0),
        'l_total': l.get('sales', 0),
        'l_avg': round(l.get('avg_spend', 0)) if l.get('avg_spend') else 0,
        'at_kensu': at.get('kensu', 0),
        'at_count': at.get('pax', 0),
        'at_total': at.get('sales', 0),
        'd_count': di.get('pax', 0),
        'd_food': di.get('food_sales', 0),
        'd_drink': di.get('bev_sales', 0),
        'd_total': di.get('sales', 0),
        'd_avg': round(di.get('avg_spend', 0)) if di.get('avg_spend') else 0,
        'ryb_kensu': ryb.get('kensu', 0),
        'ryb_count': ryb.get('pax', 0),
        'ryb_food': ryb.get('food_sales', 0),
        'ryb_drink': ryb.get('bev_sales', 0),
        'ryb_total': ryb.get('sales', 0),
        'ryb_avg': round(ryb.get('avg_spend', 0)) if ryb.get('avg_spend') else 0,
        'seat_fee': ft.get('seat_fee', 0),
        'flower': ft.get('flowers', 0),
        'grand_total': ft.get('grand_total', 0),
    }


def okurayama_row_from_json(d):
    """OKURAYAMA_daily.json 1件からNP/Ce/RP各CSVデータを生成"""
    np_row = {
        'date': d['date'],
        'weekday': d.get('weekday', ''),
        'l_count': d.get('np_l_count', 0) or 0,
        'l_food': d.get('np_l_food', 0) or 0,
        'l_drink': d.get('np_l_drink', 0) or 0,
        'l_total': d.get('np_l_total', 0) or 0,
        'l_avg': round(d.get('np_l_avg', 0) or 0),
        'l_room_fee': d.get('np_l_room_fee', 0) or 0,
        'l_flower': d.get('np_l_flower', 0) or 0,
        'd_count': d.get('np_d_count', 0) or 0,
        'd_food': d.get('np_d_food', 0) or 0,
        'd_drink': d.get('np_d_drink', 0) or 0,
        'd_total': d.get('np_d_total', 0) or 0,
        'd_avg': round(d.get('np_d_avg', 0) or 0),
        'd_room_fee': d.get('np_d_room_fee', 0) or 0,
        'd_flower': d.get('np_d_flower', 0) or 0,
        'event_count': d.get('np_event_count', 0) or 0,
        'event_food': d.get('np_event_food', 0) or 0,
        'event_drink': d.get('np_event_drink', 0) or 0,
        'event_room_fee': d.get('np_event_room_fee', 0) or 0,
        'event_flower': d.get('np_event_flower', 0) or 0,
        'event_total': d.get('np_event_total', 0) or 0,
        'event_avg': round(d.get('np_event_avg', 0) or 0),
        'grand_total': d.get('np_grand_total', 0) or 0,
    }
    ce_row = {
        'date': d['date'],
        'weekday': d.get('weekday', ''),
        'count': d.get('ce_count', 0) or 0,
        'food': d.get('ce_food', 0) or 0,
        'drink': d.get('ce_drink', 0) or 0,
        'goods': d.get('ce_goods', 0) or 0,
        'total': d.get('ce_total', 0) or 0,
        'avg': round(d.get('ce_avg', 0) or 0),
    }
    rp_row = {
        'date': d['date'],
        'weekday': d.get('weekday', ''),
        'count': d.get('rp_count', 0) or 0,
        'food': d.get('rp_food', 0) or 0,
        'drink': d.get('rp_drink', 0) or 0,
        'goods': d.get('rp_goods', 0) or 0,
        'total': d.get('rp_total', 0) or 0,
        'avg': round(d.get('rp_avg', 0) or 0),
    }
    return np_row, ce_row, rp_row


def generate_all_stores_csv(store_data, output_dir):
    """全拠点統合CSV（daily + monthly）を生成"""
    # Daily
    daily_rows = []
    for store_id, rows in store_data.items():
        for row in rows:
            # 統一カラム: store, date, l_count, l_sales, l_avg, d_count, d_sales, d_avg, 
            # to_count, to_sales, bq_count(宴会), bq_sales, bg_count, bg_sales, ryb_count, ryb_sales, total_count, total_sales
            l_count = row.get('l_count', row.get('count', 0))
            l_sales = row.get('l_total', row.get('total', 0))
            l_avg = row.get('l_avg', row.get('avg', 0))
            d_count = row.get('d_count', 0)
            d_sales = row.get('d_total', 0)
            d_avg = row.get('d_avg', 0)
            to_count = row.get('to_count', 0)
            to_sales = row.get('to_total', 0)
            bq_count = row.get('bq_count', 0)
            bq_sales = row.get('bq_total', 0)
            bg_count = row.get('bg_count', 0)
            bg_sales = row.get('bg_total', 0)
            at_count = row.get('at_count', 0)
            at_sales = row.get('at_total', 0)
            ryb_count = row.get('ryb_count', 0)
            ryb_sales = row.get('ryb_total', 0)
            event_count = row.get('event_count', 0)
            event_sales = row.get('event_total', 0)

            total_count = l_count + d_count + to_count + bq_count + bg_count + at_count + ryb_count + event_count
            total_sales = l_sales + d_sales + to_sales + bq_sales + bg_sales + at_sales + ryb_sales + event_sales

            daily_rows.append({
                'store': store_id,
                'date': row['date'],
                'l_count': l_count, 'l_sales': l_sales, 'l_avg': l_avg,
                'd_count': d_count, 'd_sales': d_sales, 'd_avg': d_avg,
                'to_count': to_count, 'to_sales': to_sales,
                'bq_count': bq_count, 'bq_sales': bq_sales,
                'bg_count': bg_count, 'bg_sales': bg_sales,
                'at_count': at_count, 'at_sales': at_sales,
                'ryb_count': ryb_count, 'ryb_sales': ryb_sales,
                'event_count': event_count, 'event_sales': event_sales,
                'total_count': total_count, 'total_sales': total_sales,
            })

    daily_path = os.path.join(output_dir, 'svd_all_stores_daily.csv')
    daily_cols = ['store', 'date', 'l_count', 'l_sales', 'l_avg', 'd_count', 'd_sales', 'd_avg',
                  'to_count', 'to_sales', 'bq_count', 'bq_sales', 'bg_count', 'bg_sales',
                  'at_count', 'at_sales', 'ryb_count', 'ryb_sales', 'event_count', 'event_sales',
                  'total_count', 'total_sales']
    with open(daily_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=daily_cols)
        writer.writeheader()
        writer.writerows(sorted(daily_rows, key=lambda r: (r['store'], r['date'])))
    print(f"  ✅ {daily_path} ({len(daily_rows):,} rows)")

    # Monthly
    from collections import defaultdict
    monthly = defaultdict(lambda: defaultdict(int))
    for r in daily_rows:
        key = (r['store'], r['date'][:7])
        for col in daily_cols[2:]:
            monthly[key][col] += r[col]
        monthly[key]['days'] = monthly[key].get('days', 0) + 1

    monthly_rows = []
    for (store, month), vals in sorted(monthly.items()):
        row = {'store': store, 'month': month, 'days': vals.pop('days', 0)}
        # Calc averages
        tc = vals.get('total_count', 0)
        ts = vals.get('total_sales', 0)
        row.update(vals)
        row['total_avg'] = round(ts / tc) if tc > 0 else 0
        lc = vals.get('l_count', 0)
        ls = vals.get('l_sales', 0)
        row['l_avg'] = round(ls / lc) if lc > 0 else 0
        dc = vals.get('d_count', 0)
        ds = vals.get('d_sales', 0)
        row['d_avg'] = round(ds / dc) if dc > 0 else 0
        monthly_rows.append(row)

    monthly_path = os.path.join(output_dir, 'svd_all_stores_monthly.csv')
    monthly_cols = ['store', 'month', 'days',
                    'l_count', 'l_sales', 'l_avg', 'd_count', 'd_sales', 'd_avg',
                    'to_count', 'to_sales', 'bq_count', 'bq_sales',
                    'bg_count', 'bg_sales', 'at_count', 'at_sales',
                    'ryb_count', 'ryb_sales', 'event_count', 'event_sales',
                    'total_count', 'total_sales', 'total_avg']
    with open(monthly_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=monthly_cols)
        writer.writeheader()
        writer.writerows(monthly_rows)
    print(f"  ✅ {monthly_path} ({len(monthly_rows):,} rows)")


def main():
    parser = argparse.ArgumentParser(description='SVD CSV再生成パイプライン')
    parser.add_argument('--output-dir', default=os.path.join(SALES_DIR, 'csv_output'))
    args = parser.parse_args()

    output_dir = args.output_dir
    os.makedirs(output_dir, exist_ok=True)

    all_store_data = {}

    # ========== GA ==========
    print("\n=== GA (ザ ガーデン サッポロ) ===")
    ga_rows = []
    for y in range(2023, 2026):
        for q in ['1Q', '2Q', '3Q', '4Q']:
            f = os.path.join(SALES_DIR, f'TV_TOWER/TV{y}/TV{y}_{q}.xlsx')
            if not os.path.exists(f):
                continue
            try:
                result = parse_xlsx(f, store_id='GA', base='TV_TOWER')
                for d in result.get('daily_data', []):
                    ga_rows.append(ga_row_from_daily(d))
            except Exception as e:
                print(f"  ⚠️ {os.path.basename(f)}: {e}")

    ga_csv = os.path.join(output_dir, 'GA_daily.csv')
    ga_cols = STORE_CONFIGS['GA']['csv_columns']
    with open(ga_csv, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=ga_cols, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(ga_rows)
    print(f"  ✅ GA_daily.csv ({len(ga_rows):,} rows)")
    all_store_data['GA'] = ga_rows

    # ========== JW ==========
    print("\n=== JW (The Jewels) ===")
    jw_rows = []
    for y in range(2023, 2026):
        for q in ['1Q', '2Q', '3Q', '4Q']:
            f = os.path.join(SALES_DIR, f'Mt.MOIWA/MW{y}/MW{y}_{q}.xlsx')
            if not os.path.exists(f):
                continue
            try:
                result = parse_xlsx(f, store_id='JW', base='Mt.MOIWA')
                for d in result.get('daily_data', []):
                    jw_rows.append(ga_row_from_daily(d))
            except Exception as e:
                print(f"  ⚠️ {os.path.basename(f)}: {e}")

    jw_csv = os.path.join(output_dir, 'JW_daily.csv')
    jw_cols = STORE_CONFIGS['JW']['csv_columns']
    with open(jw_csv, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=jw_cols, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(jw_rows)
    print(f"  ✅ JW_daily.csv ({len(jw_rows):,} rows)")
    all_store_data['JW'] = jw_rows

    # ========== BQ ==========
    print("\n=== BQ (赤れんがテラス) ===")
    bq_rows = []
    for y in range(2025, 2026):
        for q in ['1Q', '2Q', '3Q', '4Q']:
            f = os.path.join(SALES_DIR, f'Akarenga/AK{y}/AK{y}_{q}.xlsx')
            if not os.path.exists(f):
                continue
            try:
                result = parse_bq_xlsx(f)
                for d in result.get('daily_data', []):
                    bq_rows.append(bq_row_from_daily(d))
            except Exception as e:
                print(f"  ⚠️ {os.path.basename(f)}: {e}")

    bq_csv = os.path.join(output_dir, 'BQ_daily.csv')
    bq_cols = STORE_CONFIGS['BQ']['csv_columns']
    with open(bq_csv, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=bq_cols, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(bq_rows)
    print(f"  ✅ BQ_daily.csv ({len(bq_rows):,} rows)")
    all_store_data['BQ'] = bq_rows

    # ========== NP / Ce / RP (from OKURAYAMA JSON) ==========
    print("\n=== 大倉山 (NP / Ce / RP) ===")
    ok_json = os.path.join(SALES_DIR, 'csv_output', 'OKURAYAMA_daily.json')
    np_rows, ce_rows, rp_rows = [], [], []
    with open(ok_json, 'r', encoding='utf-8') as f:
        ok_data = json.load(f)
    for d in ok_data:
        np, ce, rp = okurayama_row_from_json(d)
        np_rows.append(np)
        ce_rows.append(ce)
        rp_rows.append(rp)

    # NP
    np_csv = os.path.join(output_dir, 'NP_daily.csv')
    np_cols = list(np_rows[0].keys())
    with open(np_csv, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=np_cols)
        writer.writeheader()
        writer.writerows(np_rows)
    print(f"  ✅ NP_daily.csv ({len(np_rows):,} rows)")

    # Ce
    ce_csv = os.path.join(output_dir, 'Ce_daily.csv')
    ce_cols = list(ce_rows[0].keys())
    with open(ce_csv, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=ce_cols)
        writer.writeheader()
        writer.writerows(ce_rows)
    print(f"  ✅ Ce_daily.csv ({len(ce_rows):,} rows)")

    # RP
    rp_csv = os.path.join(output_dir, 'RP_daily.csv')
    rp_cols = list(rp_rows[0].keys())
    with open(rp_csv, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=rp_cols)
        writer.writeheader()
        writer.writerows(rp_rows)
    print(f"  ✅ RP_daily.csv ({len(rp_rows):,} rows)")

    all_store_data['NP'] = np_rows
    all_store_data['Ce'] = ce_rows
    all_store_data['RP'] = rp_rows

    # ========== 全拠点統合CSV ==========
    print("\n=== 全拠点統合CSV ===")
    generate_all_stores_csv(all_store_data, output_dir)

    # ========== R7 サマリー ==========
    print("\n" + "=" * 60)
    print("R7 来客数サマリー（2025-04 〜 2026-03）")
    print("=" * 60)

    for store_id in ['GA', 'JW', 'BQ', 'NP', 'Ce', 'RP']:
        rows = all_store_data.get(store_id, [])
        r7 = [r for r in rows if r['date'] >= '2025-04-01' and r['date'] <= '2026-03-31']

        if store_id in ['Ce', 'RP']:
            total = sum(r.get('count', 0) for r in r7)
        elif store_id == 'NP':
            total = sum(r.get('l_count', 0) + r.get('d_count', 0) + r.get('event_count', 0) for r in r7)
        elif store_id == 'BQ':
            total = sum(r.get('l_count', 0) + r.get('at_count', 0) + r.get('d_count', 0) + r.get('ryb_count', 0) for r in r7)
        else:  # GA, JW
            total = sum(r.get('l_count', 0) + r.get('d_count', 0) + r.get('to_count', 0) + r.get('bq_count', 0) + r.get('bg_count', 0) for r in r7)

        print(f"  {store_id}: {total:,}人 ({len(r7)}日)")

    print(f"\n完了: {datetime.datetime.now().isoformat()}")


if __name__ == '__main__':
    main()
