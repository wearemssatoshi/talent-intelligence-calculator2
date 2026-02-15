#!/usr/bin/env python3
"""
generate_mp_json.py — MP CSV → mp_data.json 変換スクリプト

全7店舗のMP CSVと売上CSV、configを統合して
ダッシュボード用のJSONファイルを生成する。

Usage:
    python3 generate_mp_json.py
"""

import csv
import json
import os
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_DIR = os.path.join(SCRIPT_DIR, "..", "csv_output")
ENGINE_DIR = os.path.join(SCRIPT_DIR, "..", "mp_engine")
OUTPUT_PATH = os.path.join(SCRIPT_DIR, "mp_data.json")

# Store → CSV file mapping
STORE_CSV_MAP = {
    "JW": "JW_daily.csv",
    "NP": "OKURAYAMA_NP_daily.csv",
    "Ce": "OKURAYAMA_Ce_daily.csv",
    "RP": "OKURAYAMA_RP_daily.csv",
    "GA": "TV_TOWER_daily.csv",
    "BG": "TV_TOWER_daily.csv",
    "BQ": "AKARENGA_daily.csv",
}

# Store → channel column mapping for sales CSV
STORE_CHANNELS = {
    "JW": {
        "LUNCH":   {"sales": "l_total", "count": "l_count"},
        "DINNER":  {"sales": "d_total", "count": "d_count"},
        "TAKEOUT": {"sales": "to_total", "count": None},
        "wolt":    {"sales": "wolt_sales", "count": None},
        "Uber":    {"sales": "uber_sales", "count": None},
        "席料":    {"sales": "seat_fee", "count": None},
        "花束":    {"sales": "flower", "count": None},
    },
    "NP": {
        "LUNCH":   {"sales": "l_total", "count": "l_count"},
        "DINNER":  {"sales": "d_total", "count": "d_count"},
        "TAKEOUT": {"sales": "to_total", "count": None},
        "宴会":    {"sales": "bq_total", "count": "bq_count"},
        "席料":    {"sales": "seat_fee", "count": None},
        "花束":    {"sales": "flower", "count": None},
    },
    "Ce": {
        "ALL": {"sales": "total", "count": "count"},
    },
    "RP": {
        "ALL": {"sales": "total", "count": "count"},
    },
    "GA": {
        "LUNCH":      {"sales": "l_total", "count": "l_count"},
        "DINNER":     {"sales": "d_total", "count": "d_count"},
        "TAKEOUT":    {"sales": "to_total", "count": None},
        "AT":         {"sales": "at_sales", "count": None},
        "宴会":       {"sales": "bq_total", "count": "bq_count"},
        "BEERGARDEN": {"sales": "bg_total", "count": "bg_count"},
        "室料":       {"sales": "room_fee", "count": None},
        "席料":       {"sales": "seat_fee", "count": None},
        "展望台":     {"sales": "ticket", "count": None},
        "南京錠":     {"sales": "lock_fee", "count": None},
        "花束":       {"sales": "flower", "count": None},
    },
    "BG": {
        "FOOD":  {"sales": "bg_food", "count": None},
        "DRINK": {"sales": "bg_drink", "count": None},
        "TENT":  {"sales": "bg_tent", "count": None},
        "GOODS": {"sales": "bg_goods", "count": None},
    },
    "BQ": {
        "LUNCH":  {"sales": "l_total", "count": "l_count"},
        "AT":     {"sales": "at_sales", "count": "at_count"},
        "DINNER": {"sales": "d_total", "count": "d_count"},
        "RYB":    {"sales": "ryb_total", "count": "ryb_count"},
        "wolt":   {"sales": "wolt_sales", "count": None},
        "Uber":   {"sales": "uber_sales", "count": None},
        "席料":   {"sales": "seat_fee", "count": None},
        "花束":   {"sales": "flower", "count": None},
    },
}


def load_config():
    """restaurant_config.json を読み込み"""
    cfg_path = os.path.join(ENGINE_DIR, "restaurant_config.json")
    with open(cfg_path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_indices():
    """mp_indices.json を読み込み"""
    idx_path = os.path.join(ENGINE_DIR, "mp_indices.json")
    with open(idx_path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_sales_data(store_id):
    """売上CSVを日付→チャネル別売上のdictとして読み込み"""
    csv_file = STORE_CSV_MAP.get(store_id)
    if not csv_file:
        return {}
    
    csv_path = os.path.join(CSV_DIR, csv_file)
    if not os.path.exists(csv_path):
        print(f"  ⚠️  Sales CSV not found: {csv_path}")
        return {}
    
    channels_def = STORE_CHANNELS.get(store_id, {})
    result = {}
    
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames
        for row in reader:
            d = row["date"]
            channels = {}
            for ch_name, ch_cols in channels_def.items():
                sales_col = ch_cols["sales"]
                count_col = ch_cols.get("count")
                
                sales = 0
                count = 0
                if sales_col and sales_col in headers:
                    try:
                        sales = int(row.get(sales_col, 0) or 0)
                    except ValueError:
                        pass
                if count_col and count_col in headers:
                    try:
                        count = int(row.get(count_col, 0) or 0)
                    except ValueError:
                        pass
                
                if sales > 0 or count > 0:
                    channels[ch_name] = {"sales": sales, "count": count}
            
            result[d] = channels
    
    return result


def load_mp_data(store_id):
    """MP CSVを読み込み"""
    mp_path = os.path.join(CSV_DIR, f"{store_id}_mp_daily.csv")
    if not os.path.exists(mp_path):
        print(f"  ⚠️  MP CSV not found: {mp_path}")
        return []
    
    records = []
    with open(mp_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append({
                "date": row["date"],
                "weekday": row["weekday"],
                "sekki": row["sekki"],
                "rank": int(row["rank"]),
                "season": row["season"],
                "kf1": float(row["kf1"]),
                "kf2": float(row["kf2"]),
                "kf3": float(row["kf3"]),
                "mp_point": float(row["mp_point"]),
                "monthly_idx": float(row["monthly_idx"]),
                "weekday_idx": float(row["weekday_idx"]),
                "sekki_idx": float(row["sekki_idx"]),
                "weekly_idx": float(row["weekly_idx"]),
                "daily_idx": float(row["daily_idx"]),
                "layers_used": int(row["layers_used"]),
                "actual_sales": int(row["actual_sales"]),
                "actual_count": int(row["actual_count"]),
            })
    
    return records


def build_config_section(config, indices):
    """configセクションの構築"""
    bases = []
    for base in config["bases"]:
        stores = []
        for store in base["stores"]:
            stores.append({
                "id": store["id"],
                "name": store["name"],
            })
        bases.append({
            "id": base["id"],
            "name": base["name"],
            "stores": stores,
        })
    
    # 節気レベル
    sekki_levels = {}
    for sname, sdata in indices.get("sekki_24_levels", {}).get("levels", {}).items():
        sekki_levels[sname] = {
            "rank": sdata["rank"],
            "season": sdata["season"],
            "pt": sdata["season_pt"],
        }
    
    # 人員倍率テーブル
    staffing_multiplier = {
        "1.0-2.0": 0.7,
        "2.0-3.0": 1.0,
        "3.0-4.0": 1.3,
        "4.0-5.0": 1.6,
    }
    
    return {
        "bases": bases,
        "sekki_levels": sekki_levels,
        "staffing_multiplier": staffing_multiplier,
        "weekday_index": indices.get("weekday_index", {}),
    }


def main():
    print("=" * 60)
    print("MOMENTUM PEAKS — JSON Generator")
    print("=" * 60)
    
    config = load_config()
    indices = load_indices()
    
    all_store_ids = []
    for base in config["bases"]:
        for store in base["stores"]:
            all_store_ids.append(store["id"])
    
    print(f"\n対象店舗: {all_store_ids}")
    
    # 全店舗データを構築
    stores_data = {}
    total_records = 0
    
    for store_id in all_store_ids:
        print(f"\n🔄 {store_id}...")
        
        # MP データ
        mp_records = load_mp_data(store_id)
        if not mp_records:
            print(f"  ❌ No MP data for {store_id}")
            continue
        
        # 売上チャネルデータ
        sales_data = load_sales_data(store_id)
        
        # マージ
        merged = []
        for rec in mp_records:
            d = rec["date"]
            channels = sales_data.get(d, {})
            rec["channels"] = channels
            merged.append(rec)
        
        active = sum(1 for r in merged if r["actual_sales"] > 0)
        ch_count = sum(1 for r in merged if r["channels"])
        
        stores_data[store_id] = merged
        total_records += len(merged)
        print(f"  ✅ {store_id}: {len(merged)} days (active={active}, ch_data={ch_count})")
    
    # JSON構築
    output = {
        "meta": {
            "generated": datetime.now().isoformat(),
            "version": "2.0",
            "stores": list(stores_data.keys()),
            "total_records": total_records,
        },
        "config": build_config_section(config, indices),
        "stores": stores_data,
    }
    
    # 出力
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, separators=(",", ":"))
    
    file_size = os.path.getsize(OUTPUT_PATH)
    print(f"\n{'=' * 60}")
    print(f"✅ Generated: {OUTPUT_PATH}")
    print(f"   Size: {file_size:,} bytes ({file_size / 1024 / 1024:.1f} MB)")
    print(f"   Stores: {len(stores_data)}")
    print(f"   Records: {total_records:,}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
