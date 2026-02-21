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
    "RYB": "AKARENGA_daily.csv",
}

# Store → channel column mapping for sales CSV
STORE_CHANNELS = {
    "JW": {
        "LUNCH":   {"sales": "l_total", "count": "l_count", "food": "l_food", "drink": "l_drink"},
        "DINNER":  {"sales": "d_total", "count": "d_count", "food": "d_food", "drink": "d_drink"},
        "TAKEOUT": {"sales": "to_total", "count": None},
        "wolt":    {"sales": "wolt", "count": None},
        "uber":    {"sales": "uber", "count": None},
        "席料":    {"sales": "seat_fee", "count": None},
        "南京錠":  {"sales": "lock_fee", "count": None},
        "花束":    {"sales": "flower", "count": None},
        "カレー":  {"sales": "curry", "count": None}, 
    },
    "NP": {
        "LUNCH":   {"sales": "l_total", "count": "l_count", "food": "l_food", "drink": "l_drink"},
        "DINNER":  {"sales": "d_total", "count": "d_count", "food": "d_food", "drink": "d_drink"},
        "EVENT":   {"sales": "w_total", "count": "w_count", "food": "w_food", "drink": "w_drink", "room": "w_room", "flower": "w_flower"},
        "席料":    {"sales": "seat_fee", "count": None},
        "花束":    {"sales": "flower", "count": None},
        # grand_total をチャネル合算の代わりに使用（w_total と goods の重複防止）
        "_grand_total": "grand_total",
        # 8%軽減税率のCSV列名（物販）— チャネルからは外したが税率計算用に必要
        "_tax_8pct_fields": ["goods"],
    },
    "Ce": {
        "CAFE":  {"sales": "total", "count": "count", "food": "food", "drink": "drink"},
        "GOODS": {"sales": "goods", "count": None},
    },
    "RP": {
        "CAFE":  {"sales": "total", "count": "count", "food": "food", "drink": "drink"},
        "GOODS": {"sales": "goods", "count": None},
    },
    "GA": {
        "LUNCH":      {"sales": "l_total", "count": "l_count", "food": "l_food", "drink": "l_drink"},
        "DINNER":     {"sales": "d_total", "count": "d_count", "food": "d_food", "drink": "d_drink"},
        "TAKEOUT":    {"sales": "to_total", "count": None},
        "AFTERNOON":  {"sales": "at_sales", "count": None},
        "BANQUET":    {"sales": "bq_total", "count": "bq_count", "food": "bq_food", "drink": "bq_drink"},
        "室料":       {"sales": "room_fee", "count": None},
        "展望台":     {"sales": "ticket", "count": None},
        "席料":       {"sales": "seat_fee", "count": None},
        "南京錠":     {"sales": "lock_fee", "count": None},
        "その他":     {"sales": "other", "count": None},
    },
    "BG": {
        "FOOD":  {"sales": "bg_food", "count": None},
        "DRINK": {"sales": "bg_drink", "count": None},
        "TENT":  {"sales": "bg_tent", "count": None},
        "GOODS": {"sales": "bg_goods", "count": None},
    },
    "BQ": {
        "LUNCH":  {"sales": "l_total", "count": "l_count", "food": "l_food", "drink": "l_drink"},
        "AT":     {"sales": "at_total", "count": "at_count", "food": "at_food", "drink": "at_drink"},
        "DINNER": {"sales": "d_total", "count": "d_count", "food": "d_food", "drink": "d_drink"},
        "席料":   {"sales": "seat_fee", "count": None},
    },
    "RYB": {
        "LUNCH": {"sales": "ryb_total", "count": "ryb_count", "food": "ryb_food", "drink": "ryb_drink"},
    },
}

# 8%軽減税率チャネル（物販=食品持ち帰り等）
TAX_8PCT_CHANNELS = {"物販", "GOODS", "カレー"}


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
    """売上CSVを日付→チャネル別売上のdictとして読み込み。
    Returns: (channels_dict, gt_map, tax_8pct_raw)
      channels_dict: {date: {ch_name: {sales, count, ...}}}
      gt_map: {date: grand_total} (_grand_totalが定義されている場合)
      tax_8pct_raw: {date: 8%税込売上合計} (_tax_8pct_fieldsが定義されている場合)
    """
    csv_file = STORE_CSV_MAP.get(store_id)
    if not csv_file:
        return {}, {}, {}
    
    csv_path = os.path.join(CSV_DIR, csv_file)
    if not os.path.exists(csv_path):
        print(f"  ⚠️  Sales CSV not found: {csv_path}")
        return {}, {}, {}
    
    channels_def = STORE_CHANNELS.get(store_id, {})
    gt_col_name = channels_def.get("_grand_total")  # e.g. "grand_total"
    tax_8pct_fields = channels_def.get("_tax_8pct_fields", [])  # e.g. ["goods"]
    result = {}
    gt_map = {}
    tax_8pct_raw = {}
    
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames
        for row in reader:
            d = row["date"]
            channels = {}
            for ch_name, ch_cols in channels_def.items():
                if ch_name.startswith("_"):  # skip meta keys like _grand_total
                    continue
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
                    ch_data = {"sales": sales, "count": count}
                    # Add food/drink if defined and present
                    food_col = ch_cols.get("food")
                    drink_col = ch_cols.get("drink")
                    if food_col and food_col in headers:
                        try:
                            food_val = int(row.get(food_col, 0) or 0)
                            if food_val > 0:
                                ch_data["food"] = food_val
                        except ValueError:
                            pass
                    if drink_col and drink_col in headers:
                        try:
                            drink_val = int(row.get(drink_col, 0) or 0)
                            if drink_val > 0:
                                ch_data["drink"] = drink_val
                        except ValueError:
                            pass
                    channels[ch_name] = ch_data
            
            result[d] = channels
            
            # grand_total マップ
            if gt_col_name and gt_col_name in headers:
                try:
                    gt_val = int(row.get(gt_col_name, 0) or 0)
                    if gt_val > 0:
                        gt_map[d] = gt_val
                except ValueError:
                    pass
            
            # 8%軽減税率フィールド マップ
            if tax_8pct_fields:
                t8_sum = 0
                for col_name in tax_8pct_fields:
                    if col_name in headers:
                        try:
                            t8_sum += int(row.get(col_name, 0) or 0)
                        except ValueError:
                            pass
                if t8_sum > 0:
                    tax_8pct_raw[d] = t8_sum
    
    return result, gt_map, tax_8pct_raw


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


# ── BG拡張データ読み込み ──

def load_bg_weather():
    """天候CSV → {date: {temp_low, temp_high, temp_avg, weather_desc, weather_score}}"""
    path = os.path.join(CSV_DIR, "BG_weather_daily.csv")
    if not os.path.exists(path):
        return {}
    data = {}
    with open(path, "r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            d = row["date"]
            data[d] = {
                "tl": float(row["temp_low"]) if row["temp_low"] else None,
                "th": float(row["temp_high"]) if row["temp_high"] else None,
                "ta": float(row["temp_avg"]) if row["temp_avg"] else None,
                "wd": row["weather_desc"] if row["weather_desc"] and "※" not in row["weather_desc"] else "",
                "ws": int(row["weather_score"]) if row["weather_score"] else None,
            }
    return data


def load_bg_labor():
    """労務CSV → {date: {surfins, forking, timee, total, productivity}}"""
    path = os.path.join(CSV_DIR, "BG_labor_daily.csv")
    if not os.path.exists(path):
        return {}
    data = {}
    with open(path, "r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            d = row["date"]
            data[d] = {
                "sf": float(row["surfins_hours"]),
                "fk": float(row["forking_hours"]),
                "tm": float(row["timee_hours"]),
                "tt": float(row["total_hours"]),
                "sp": int(row["sales_per_hour"]) if row["sales_per_hour"] else 0,
            }
    return data


def load_bg_hourly():
    """時間帯別CSV → {date: [h12, h13, ..., h21]}"""
    path = os.path.join(CSV_DIR, "BG_hourly.csv")
    if not os.path.exists(path):
        return {}
    data = {}
    with open(path, "r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            d = row["date"]
            data[d] = [int(row[f"h{h}"]) for h in range(12, 22)]
    return data


def load_bg_plan():
    """プランCSV → [{month, ...}]"""
    path = os.path.join(CSV_DIR, "BG_plan_monthly.csv")
    if not os.path.exists(path):
        return []
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            rows.append({
                "month": row["month"],
                "customers": int(row["total_customers"]),
                "p5500": int(row["plan_5500"]),
                "p6600": int(row["plan_6600"]),
                "p8800": int(row["plan_8800"]),
                "ticket": int(row["ticket"]),
                "plan_total": int(row["plan_total"]),
                "plan_rate": row["plan_total_rate"],
                "alacarte": int(row["alacarte"]),
            })
    return rows


def load_bg_reservation():
    """予約CSV → [{month, ...}]"""
    path = os.path.join(CSV_DIR, "BG_reservation_monthly.csv")
    if not os.path.exists(path):
        return []
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            rows.append({
                "month": row["month"],
                "groups": int(row["total_groups"]),
                "tc": int(row["tc_groups"]),
                "phone": int(row["phone_groups"]),
                "passage": int(row["passage_groups"]),
                "web_rate": row["web_reservation_rate"],
            })
    return rows


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
        sales_data, gt_sales_map, tax_8pct_raw = load_sales_data(store_id)
        
        # マージ
        merged = []
        
        # grand_total列名を取得（チャネル定義に _grand_total がある場合）
        ch_def = STORE_CHANNELS.get(store_id, {})
        gt_col = ch_def.get("_grand_total")
        
        # 8%税率フィールド取得
        tax_8pct_fields = ch_def.get("_tax_8pct_fields", [])  # CSV列名リスト
        
        for rec in mp_records:
            d = rec["date"]
            channels = sales_data.get(d, {})
            rec["channels"] = channels
            
            # grand_total が定義されている店舗はそれを信頼源にする（二重カウント防止）
            if gt_col and d in gt_sales_map:
                gt_val = gt_sales_map[d]
                if gt_val > 0:
                    rec["actual_sales"] = gt_val
            elif channels:
                # grand_total がない店舗は従来どおりチャネル合算
                ch_sales = sum(ch.get("sales", 0) for ch in channels.values())
                ch_count = sum(ch.get("count", 0) for ch in channels.values())
                if ch_sales > rec.get("actual_sales", 0):
                    rec["actual_sales"] = ch_sales
                if ch_count > rec.get("actual_count", 0):
                    rec["actual_count"] = ch_count
            
            # ── 8%軽減税率分の税込売上を算出 ──
            sales_8pct = 0
            # 方法1: _tax_8pct_fields から直接CSV値を取得（NP等）
            if tax_8pct_fields and d in tax_8pct_raw:
                sales_8pct = tax_8pct_raw[d]
            else:
                # 方法2: チャネル名で判定（GOODS, 物販, カレー等）
                for ch_name, ch_data in channels.items():
                    if ch_name in TAX_8PCT_CHANNELS:
                        sales_8pct += ch_data.get("sales", 0)
            
            if sales_8pct > 0:
                rec["sales_8pct"] = sales_8pct
            
            merged.append(rec)
        
        active = sum(1 for r in merged if r["actual_sales"] > 0)
        ch_count = sum(1 for r in merged if r["channels"])
        s8_total = sum(r.get("sales_8pct", 0) for r in merged)
        
        # ── BG拡張データの統合 ──
        bg_meta = None
        if store_id == "BG":
            bg_weather = load_bg_weather()
            bg_labor = load_bg_labor()
            bg_hourly = load_bg_hourly()
            for rec in merged:
                d = rec["date"]
                if d in bg_weather:
                    rec["weather"] = bg_weather[d]
                if d in bg_labor:
                    rec["labor"] = bg_labor[d]
                if d in bg_hourly:
                    rec["hourly"] = bg_hourly[d]
            bg_meta = {
                "plan": load_bg_plan(),
                "reservation": load_bg_reservation(),
                "weather_days": len(bg_weather),
                "labor_days": len(bg_labor),
                "hourly_days": len(bg_hourly),
            }
            print(f"  🌤️  BG weather: {len(bg_weather)} days, labor: {len(bg_labor)}, hourly: {len(bg_hourly)}")
        
        stores_data[store_id] = merged
        total_records += len(merged)
        if s8_total > 0:
            print(f"  ✅ {store_id}: {len(merged)} days (active={active}, ch_data={ch_count}, 8%税=¥{s8_total:,})")
        else:
            print(f"  ✅ {store_id}: {len(merged)} days (active={active}, ch_data={ch_count})")

    
    # JSON構築
    output = {
        "meta": {
            "generated": datetime.now().isoformat(),
            "version": "2.1",
            "stores": list(stores_data.keys()),
            "total_records": total_records,
        },
        "config": build_config_section(config, indices),
        "stores": stores_data,
    }
    # BG_metaはstoresとは別のトップレベルキーに格納（stores配列を汚染しない）
    if bg_meta:
        output["bg_meta"] = bg_meta
    
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
