#!/usr/bin/env python3
"""
KF① 多層インデックス算出スクリプト
売上CSVから以下を統計的に算出し、mp_indices.json を更新する:
  - sekki_index:  24節気別の繁忙度 (1.00-5.00)  拠点別
  - weekly_index: ISO週番号別の繁忙度 (1.00-5.00) 拠点別
  - daily_index:  祝日/特別日の繁忙度定義
"""

import csv
import json
import os
import sys
from datetime import date, datetime, timedelta
from collections import defaultdict

# ── Paths ──
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), "csv_output")
INDICES_PATH = os.path.join(SCRIPT_DIR, "mp_indices.json")
CONFIG_PATH = os.path.join(SCRIPT_DIR, "restaurant_config.json")

# ── Import sekki engine for date→sekki mapping ──
sys.path.insert(0, SCRIPT_DIR)
from sekki import get_sekki, SEKKI_BOUNDARIES, WEEKDAY_JA


def load_config():
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def load_indices():
    with open(INDICES_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def load_csv_sales(csv_path, grand_total_col="grand_total"):
    """CSVを読み込み、日付→売上のdictを返す"""
    records = []
    if not os.path.exists(csv_path):
        return records
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                d = row["date"]
                sales = int(float(row.get(grand_total_col, 0) or 0))
                if sales > 0:
                    records.append({"date": d, "sales": sales})
            except (ValueError, KeyError):
                continue
    return records


def min_max_normalize(values, low=1.00, high=5.00):
    """min-max正規化 → low-high"""
    if not values:
        return []
    mn = min(values)
    mx = max(values)
    if mx == mn:
        mid = (low + high) / 2
        return [round(mid, 2) for _ in values]
    return [round(low + (v - mn) / (mx - mn) * (high - low), 2) for v in values]


def compute_sekki_index(records):
    """
    売上データから24節気別の平均売上を算出し、1.00-5.00に正規化
    Returns: {"白露": 4.85, "立秋": 4.62, ...}
    """
    sekki_sales = defaultdict(list)  # セッキ名 → [sales, sales, ...]

    for rec in records:
        d = datetime.strptime(rec["date"], "%Y-%m-%d").date()
        try:
            sekki_name, _, _, _ = get_sekki(d)
            sekki_sales[sekki_name].append(rec["sales"])
        except ValueError:
            continue

    # 各節気の平均売上を算出
    sekki_avg = {}
    for name, sales_list in sekki_sales.items():
        sekki_avg[name] = sum(sales_list) / len(sales_list)

    # 全24節気をカバー（データがない節気は最低値に）
    all_sekki = [
        "小寒", "大寒", "立春", "雨水", "啓蟄", "春分",
        "清明", "穀雨", "立夏", "小満", "芒種", "夏至",
        "小暑", "大暑", "立秋", "処暑", "白露", "秋分",
        "寒露", "霜降", "立冬", "小雪", "大雪", "冬至"
    ]

    avg_values = [sekki_avg.get(s, 0) for s in all_sekki]
    normalized = min_max_normalize(avg_values)

    result = {}
    for i, name in enumerate(all_sekki):
        result[name] = normalized[i]

    return result


def compute_weekly_index(records):
    """
    売上データからISO週番号別の平均売上を算出し、1.00-5.00に正規化
    Returns: {"1": 2.35, "2": 2.48, ..., "52": 3.12}
    """
    weekly_sales = defaultdict(list)

    for rec in records:
        d = datetime.strptime(rec["date"], "%Y-%m-%d").date()
        iso_week = d.isocalendar()[1]
        # ISO週53は52に統合
        if iso_week > 52:
            iso_week = 52
        weekly_sales[iso_week].append(rec["sales"])

    # 各週の平均売上
    weekly_avg = {}
    for week, sales_list in weekly_sales.items():
        weekly_avg[week] = sum(sales_list) / len(sales_list)

    # 52週をカバー
    avg_values = [weekly_avg.get(w, 0) for w in range(1, 53)]
    normalized = min_max_normalize(avg_values)

    result = {}
    for i, w in enumerate(range(1, 53)):
        result[str(w)] = normalized[i]

    return result


def compute_daily_index():
    """
    祝日・特別日の定義（静的データ + 汎用パターン）
    Returns: dict of special day definitions
    """
    # 日本の祝日パターン（日付固定のもの）
    fixed_holidays = {
        "01-01": {"name": "元日", "pt": 4.50},
        "01-02": {"name": "正月2日", "pt": 4.00},
        "01-03": {"name": "正月3日", "pt": 4.00},
        "02-11": {"name": "建国記念の日", "pt": 3.50},
        "02-23": {"name": "天皇誕生日", "pt": 3.50},
        "03-21": {"name": "春分の日(前後)", "pt": 3.00},
        "04-29": {"name": "昭和の日", "pt": 4.00},
        "04-30": {"name": "GW中日", "pt": 4.50},
        "05-01": {"name": "GW中日", "pt": 4.50},
        "05-02": {"name": "GW中日", "pt": 4.50},
        "05-03": {"name": "憲法記念日", "pt": 5.00},
        "05-04": {"name": "みどりの日", "pt": 5.00},
        "05-05": {"name": "こどもの日", "pt": 5.00},
        "05-06": {"name": "GW振替", "pt": 4.50},
        "07-20": {"name": "海の日(前後)", "pt": 3.50},
        "08-11": {"name": "山の日", "pt": 4.00},
        "08-12": {"name": "お盆前", "pt": 4.50},
        "08-13": {"name": "お盆", "pt": 5.00},
        "08-14": {"name": "お盆", "pt": 5.00},
        "08-15": {"name": "お盆", "pt": 5.00},
        "08-16": {"name": "お盆明け", "pt": 4.00},
        "09-15": {"name": "敬老の日(前後)", "pt": 3.50},
        "09-23": {"name": "秋分の日(前後)", "pt": 3.50},
        "10-14": {"name": "スポーツの日(前後)", "pt": 3.50},
        "11-03": {"name": "文化の日", "pt": 3.50},
        "11-23": {"name": "勤労感謝の日", "pt": 3.50},
        "12-23": {"name": "クリスマスイブ前日", "pt": 4.00},
        "12-24": {"name": "クリスマスイブ", "pt": 5.00},
        "12-25": {"name": "クリスマス", "pt": 5.00},
        "12-29": {"name": "年末", "pt": 3.50},
        "12-30": {"name": "年末", "pt": 4.00},
        "12-31": {"name": "大晦日", "pt": 4.50},
    }

    # 札幌特有イベント
    sapporo_events = {
        "02-04": {"name": "雪まつり(前後)", "pt": 4.50},
        "02-05": {"name": "雪まつり", "pt": 5.00},
        "02-06": {"name": "雪まつり", "pt": 5.00},
        "02-07": {"name": "雪まつり", "pt": 5.00},
        "02-08": {"name": "雪まつり", "pt": 5.00},
        "02-09": {"name": "雪まつり", "pt": 5.00},
        "02-10": {"name": "雪まつり", "pt": 5.00},
        "02-11": {"name": "雪まつり(最終日)", "pt": 4.50},
        "06-14": {"name": "北海道神宮例祭(前後)", "pt": 4.00},
        "06-15": {"name": "北海道神宮例祭", "pt": 4.50},
        "06-16": {"name": "北海道神宮例祭", "pt": 4.50},
        "09-06": {"name": "オータムフェスト(前後)", "pt": 4.50},
        "09-07": {"name": "オータムフェスト", "pt": 5.00},
        "09-28": {"name": "オータムフェスト(最終)", "pt": 4.50},
        "11-22": {"name": "ホワイトイルミ開始(前後)", "pt": 3.50},
    }

    # 連休パターン（曜日依存 — 動的判定用）
    holiday_patterns = {
        "golden_week": {"name": "GW", "months": [4, 5], "days": list(range(29, 32)) + list(range(1, 7)), "pt": 4.50},
        "obon": {"name": "お盆", "months": [8], "days": list(range(11, 17)), "pt": 4.50},
        "yearend": {"name": "年末年始", "months": [12, 1], "days": list(range(28, 32)) + list(range(1, 4)), "pt": 4.00},
    }

    return {
        "fixed_holidays": fixed_holidays,
        "sapporo_events": sapporo_events,
        "holiday_patterns": holiday_patterns,
    }


def get_base_store_mapping(config):
    """拠点ID → {store_ids, csv_files, grand_total_cols}"""
    mapping = {}
    for base in config["bases"]:
        base_id = base["id"]
        stores = []
        for store in base["stores"]:
            csv_path = os.path.join(CSV_DIR, store["csv_file"])
            gt_col = store.get("grand_total_col", "grand_total")
            # Exclude channels if specified
            exclude = store.get("exclude_channels_from_kf", [])
            stores.append({
                "id": store["id"],
                "csv_file": csv_path,
                "gt_col": gt_col,
                "exclude": exclude,
            })
        mapping[base_id] = stores
    return mapping


def compute_base_aggregated_sales(stores_info):
    """
    拠点内の全店舗の売上を統合
    (ただし、BEERGARDENのような除外チャネルは考慮しない — grand_totalを使用)
    Returns: [{date, sales}, ...]
    """
    date_sales = defaultdict(int)

    for store in stores_info:
        records = load_csv_sales(store["csv_file"], store["gt_col"])
        for rec in records:
            date_sales[rec["date"]] += rec["sales"]

    return [{"date": d, "sales": s} for d, s in sorted(date_sales.items()) if s > 0]


def main():
    print("=" * 70)
    print("KF① 多層インデックス算出エンジン")
    print("=" * 70)

    config = load_config()
    indices = load_indices()
    base_mapping = get_base_store_mapping(config)

    # ── 1. 節気別インデックス（拠点ごと）──
    print("\n🌸 節気別インデックス算出...")
    sekki_indices = {}
    for base_id, stores in base_mapping.items():
        records = compute_base_aggregated_sales(stores)
        sekki_idx = compute_sekki_index(records)
        sekki_indices[base_id] = sekki_idx
        print(f"  ✅ {base_id}: {len(records)}日分 → 24節気にマッピング")

        # TOP 5 / BOTTOM 5
        sorted_sekki = sorted(sekki_idx.items(), key=lambda x: x[1], reverse=True)
        print(f"     TOP: {', '.join(f'{s}={v:.2f}' for s, v in sorted_sekki[:3])}")
        print(f"     LOW: {', '.join(f'{s}={v:.2f}' for s, v in sorted_sekki[-3:])}")

    # ── 2. 週別インデックス（拠点ごと）──
    print("\n📅 週別インデックス算出...")
    weekly_indices = {}
    for base_id, stores in base_mapping.items():
        records = compute_base_aggregated_sales(stores)
        weekly_idx = compute_weekly_index(records)
        weekly_indices[base_id] = weekly_idx
        print(f"  ✅ {base_id}: 52週にマッピング")

        # TOP 3 / BOTTOM 3
        sorted_weekly = sorted(weekly_idx.items(), key=lambda x: x[1], reverse=True)
        print(f"     TOP: {', '.join(f'W{w}={v:.2f}' for w, v in sorted_weekly[:3])}")
        print(f"     LOW: {', '.join(f'W{w}={v:.2f}' for w, v in sorted_weekly[-3:])}")

    # ── 3. 日別インデックス ──
    print("\n🎌 日別インデックス定義...")
    daily_index = compute_daily_index()
    print(f"  ✅ 固定祝日: {len(daily_index['fixed_holidays'])}件")
    print(f"  ✅ 札幌イベント: {len(daily_index['sapporo_events'])}件")
    print(f"  ✅ 連休パターン: {len(daily_index['holiday_patterns'])}件")

    # ── 4. mp_indices.json に書き込み ──
    print("\n💾 mp_indices.json 更新中...")

    # 拠点ごとに sekki_index と weekly_index を追加
    for base_id in base_mapping:
        if base_id in indices["bases"]:
            indices["bases"][base_id]["sekki_index"] = sekki_indices[base_id]
            indices["bases"][base_id]["weekly_index"] = weekly_indices[base_id]

    # daily_index をトップレベルに追加
    indices["daily_index"] = daily_index

    # sekki_24_levels のシーズン帯は維持（参照用）
    # ただし season_pt を均等配分に更新
    levels = indices["sekki_24_levels"]["levels"]
    sorted_levels = sorted(levels.items(), key=lambda x: x[1]["rank"])
    step = 4.00 / 23  # 5.00 → 1.00 を23ステップ
    for i, (name, info) in enumerate(sorted_levels):
        new_pt = round(5.00 - i * step, 2)
        levels[name]["season_pt"] = new_pt

    # メタ更新
    indices["_meta"]["last_updated"] = datetime.now().strftime("%Y-%m-%d")
    indices["_meta"]["description"] = "Momentum Peaks 拠点定指数 — 5層環境定数（月別/曜日別/節気別/週別/日別）"

    with open(INDICES_PATH, "w", encoding="utf-8") as f:
        json.dump(indices, f, ensure_ascii=False, indent=4)

    print("  ✅ mp_indices.json 更新完了")

    # ── サマリー出力 ──
    print("\n" + "=" * 70)
    print("✅ 多層インデックス算出完了")
    print("=" * 70)
    print(f"  拠点数: {len(base_mapping)}")
    print(f"  節気別: 24区分 × {len(base_mapping)}拠点")
    print(f"  週別:   52区分 × {len(base_mapping)}拠点")
    print(f"  日別:   {len(daily_index['fixed_holidays']) + len(daily_index['sapporo_events'])}特別日")
    print()

    # シーズン帯サマリー
    print("📊 シーズン帯 (リファレンス):")
    for name, info in sorted_levels:
        print(f"  #{info['rank']:>2} {name} → {info['season']:>12} {info['season_pt']:.2f}")


if __name__ == "__main__":
    main()
