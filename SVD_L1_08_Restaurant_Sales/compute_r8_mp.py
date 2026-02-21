#!/usr/bin/env python3
"""
R8 Momentum Peaks Point Calculator
===================================
R7までの実績データを基に、R8年度（令和8年度）の月別・拠点別 Momentum Peaks Point を算出する。

計算ロジック (2-Layer Integration):
  Layer 1 (定数): KF① = (① 季節指数 + ② 曜日指数 + ③ 来場者指数) / 3
  Layer 2 (実績): KF② = 月別売上実績平均を1-5にノーマライズ
                   KF③ = 月別来客数実績平均を1-5にノーマライズ
  最終: MP Point = (KF① + KF② + KF③) / 3
"""

import csv
import json
from collections import defaultdict
import os

CSV_DIR = os.path.join(os.path.dirname(__file__), "csv_output")

# ==============================================================================
# ① 月別季節指数（拠点別）
# ==============================================================================
# 藻岩山 (MOIWAYAMA) - JW
SEASONAL_INDEX_MOIWAYAMA = {
    4: 1.00, 5: 3.00, 6: 4.00, 7: 5.00, 8: 5.00, 9: 5.00,
   10: 5.00, 11: 3.00, 12: 5.00, 1: 2.00, 2: 3.00, 3: 3.00,
}

# 大倉山 (OKURAYAMA) - NP, Ce, RP
SEASONAL_INDEX_OKURAYAMA = {
    4: 2.00, 5: 3.00, 6: 4.00, 7: 5.00, 8: 5.00, 9: 5.00,
   10: 5.00, 11: 3.00, 12: 5.00, 1: 2.00, 2: 3.00, 3: 3.00,
}

# テレビ塔 (TV_TOWER) - GA, BG
SEASONAL_INDEX_TV_TOWER = {
    4: 2.00, 5: 3.00, 6: 4.00, 7: 5.00, 8: 5.00, 9: 5.00,
   10: 5.00, 11: 3.00, 12: 5.00, 1: 2.00, 2: 3.00, 3: 3.00,
}

# 赤れんがテラス (AKARENGA) - BQ, RYB
SEASONAL_INDEX_AKARENGA = {
    4: 2.00, 5: 3.00, 6: 4.00, 7: 5.00, 8: 5.00, 9: 5.00,
   10: 5.00, 11: 3.00, 12: 5.00, 1: 2.00, 2: 3.00, 3: 3.00,
}

# ==============================================================================
# ② 月別曜日指数（各月の曜日構成に基づく加重平均）
# ==============================================================================
WEEKDAY_POINTS = {"月": 2.0, "火": 2.0, "水": 2.0, "木": 3.0, "金": 4.0, "土": 5.0, "日": 4.0}

def calc_monthly_weekday_index(year, month):
    """指定年月の曜日構成に基づく月別曜日指数を計算"""
    import calendar
    weekday_jp = ["月", "火", "水", "木", "金", "土", "日"]
    days_in_month = calendar.monthrange(year, month)[1]
    total = 0
    for day in range(1, days_in_month + 1):
        wd = calendar.weekday(year, month, day)
        total += WEEKDAY_POINTS[weekday_jp[wd]]
    return total / days_in_month

# R8年度 (2026年4月～2027年3月) の月別曜日指数を事前計算
R8_WEEKDAY_INDEX = {}
for m in [4, 5, 6, 7, 8, 9, 10, 11, 12]:
    R8_WEEKDAY_INDEX[m] = calc_monthly_weekday_index(2026, m)
for m in [1, 2, 3]:
    R8_WEEKDAY_INDEX[m] = calc_monthly_weekday_index(2027, m)

# ==============================================================================
# ③ 月別来場者指数（拠点別・過去実績に基づく）
# Moiwayama: R5=782,481 / R6=939,038 / R7=790,880 (from KI)
# ==============================================================================
# 主要拠点の月別来場者データ（正規化用）
# 来場者指数は、拠点の月別来場者の相対的な繁閑を反映
# 最繁忙月=5.00、最閑散月=1.00として線形ノーマライズ

# 藻岩山の月別来場者パターン（日平均来場者数ベースの相対値）
VISITOR_INDEX_MOIWAYAMA = {
    4: 1.00,  # 運休期間
    5: 3.50,  # GW需要
    6: 4.00,  # 初夏・新緑
    7: 4.50,  # 夏期
    8: 4.50,  # 夏期
    9: 5.00,  # オータムフェスト最盛
   10: 5.00,  # 紅葉最盛
   11: 3.00,  # 端境期
   12: 4.50,  # クリスマス
    1: 2.00,  # 冬季閑散
    2: 3.00,  # 雪まつり
    3: 2.50,  # 端境期
}

VISITOR_INDEX_OKURAYAMA = {
    4: 2.00,  # リフト運休期
    5: 3.50,  # GW
    6: 3.50,  # 初夏
    7: 4.00,  # 夏期
    8: 5.00,  # 夏休みピーク
    9: 4.50,  # オータムフェスト
   10: 4.00,  # 紅葉
   11: 2.50,  # 端境期
   12: 3.50,  # 冬期
    1: 2.00,  # 冬季閑散
    2: 3.00,  # 雪まつり観光
    3: 2.50,  # 端境期
}

VISITOR_INDEX_TV_TOWER = {
    4: 2.00,  # 春の端境期
    5: 3.50,  # GW
    6: 4.00,  # よさこい・神宮祭
    7: 5.00,  # BG最盛+PMF+花火
    8: 5.00,  # 夏休み最盛
    9: 4.50,  # オータムフェスト
   10: 4.00,  # 秋
   11: 3.00,  # 端境期
   12: 4.50,  # クリスマス
    1: 2.00,  # 冬季
    2: 3.50,  # 雪まつり
    3: 2.50,  # 端境期
}

VISITOR_INDEX_AKARENGA = {
    4: 2.50,  # オフィス街に安定需要
    5: 3.50,  # GW
    6: 4.00,  # 初夏
    7: 5.00,  # 夏期最盛
    8: 5.00,  # 夏期最盛
    9: 4.50,  # オータムフェスト
   10: 4.00,  # 秋
   11: 3.00,  # 端境期
   12: 4.50,  # 忘年会シーズン
    1: 2.00,  # 冬季
    2: 3.00,  # 雪まつり
    3: 2.50,  # 端境期
}

# ==============================================================================
# 店舗別データ構造
# ==============================================================================
STORE_CONFIG = {
    "JW":  {"base": "MOIWAYAMA", "name": "THE JEWELS",        "seasonal": SEASONAL_INDEX_MOIWAYAMA,  "visitor": VISITOR_INDEX_MOIWAYAMA},
    "NP":  {"base": "OKURAYAMA", "name": "ヌーベルプース大倉山",  "seasonal": SEASONAL_INDEX_OKURAYAMA,  "visitor": VISITOR_INDEX_OKURAYAMA},
    "Ce":  {"base": "OKURAYAMA", "name": "セレステ",            "seasonal": SEASONAL_INDEX_OKURAYAMA,  "visitor": VISITOR_INDEX_OKURAYAMA},
    "RP":  {"base": "OKURAYAMA", "name": "ルポ",               "seasonal": SEASONAL_INDEX_OKURAYAMA,  "visitor": VISITOR_INDEX_OKURAYAMA},
    "GA":  {"base": "TV_TOWER",  "name": "ザ ガーデン",         "seasonal": SEASONAL_INDEX_TV_TOWER,   "visitor": VISITOR_INDEX_TV_TOWER},
    "BG":  {"base": "TV_TOWER",  "name": "ビアガーデン",        "seasonal": SEASONAL_INDEX_TV_TOWER,   "visitor": VISITOR_INDEX_TV_TOWER},
    "BQ":  {"base": "AKARENGA",  "name": "ラ ブリック",         "seasonal": SEASONAL_INDEX_AKARENGA,   "visitor": VISITOR_INDEX_AKARENGA},
    "RYB": {"base": "AKARENGA",  "name": "ルスツ羊蹄とんかつテラス", "seasonal": SEASONAL_INDEX_AKARENGA, "visitor": VISITOR_INDEX_AKARENGA},
}

# ==============================================================================
# 実績データの読み込みと集計
# ==============================================================================
def load_monthly_data(csv_path):
    """svd_all_stores_monthly.csv から月別データを読み込む"""
    store_data = defaultdict(lambda: defaultdict(list))  # store -> month -> [(sales, count)]
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            store = row["store"]
            ym = row["month"]
            yr, mn = ym.split("-")
            month = int(mn)
            total_sales = int(row["total_sales"])
            total_count = int(row["total_count"])
            # ゼロデータ（営業していない月）を除外
            if total_sales > 0:
                store_data[store][month].append({
                    "year_month": ym,
                    "sales": total_sales,
                    "count": total_count,
                    "days": int(row["days"]),
                })
    return store_data


def normalize_to_scale(value, min_val, max_val, scale_min=1.0, scale_max=5.0):
    """値を1.0-5.0スケールに正規化"""
    if max_val == min_val:
        return (scale_min + scale_max) / 2
    normalized = (value - min_val) / (max_val - min_val) * (scale_max - scale_min) + scale_min
    return max(scale_min, min(scale_max, normalized))


def compute_r8_mp():
    csv_path = os.path.join(CSV_DIR, "svd_all_stores_monthly.csv")
    store_data = load_monthly_data(csv_path)
    
    results = {}
    fiscal_months = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
    
    for store_id, config in STORE_CONFIG.items():
        monthly_results = []
        data = store_data.get(store_id, {})
        
        # 全月のデータから正規化の基準を計算
        all_monthly_sales = []
        all_monthly_counts = []
        for m in fiscal_months:
            entries = data.get(m, [])
            if entries:
                avg_sales = sum(e["sales"] for e in entries) / len(entries)
                avg_count = sum(e["count"] for e in entries) / len(entries)
                all_monthly_sales.append(avg_sales)
                all_monthly_counts.append(avg_count)
        
        if not all_monthly_sales:
            # データなし
            for m in fiscal_months:
                monthly_results.append({
                    "month": m,
                    "kf1": 0,
                    "kf2": 0,
                    "kf3": 0,
                    "mp_point": 0,
                    "note": "実績データなし",
                })
            results[store_id] = monthly_results
            continue
        
        sales_min = min(all_monthly_sales)
        sales_max = max(all_monthly_sales)
        count_min = min(all_monthly_counts)
        count_max = max(all_monthly_counts)
        
        for m in fiscal_months:
            # Layer 1: 定数
            seasonal = config["seasonal"][m]
            weekday = R8_WEEKDAY_INDEX[m]
            visitor = config["visitor"][m]
            kf1 = round((seasonal + weekday + visitor) / 3, 2)
            
            # Layer 2: 実績
            entries = data.get(m, [])
            if entries:
                avg_sales = sum(e["sales"] for e in entries) / len(entries)
                avg_count = sum(e["count"] for e in entries) / len(entries)
                kf2 = round(normalize_to_scale(avg_sales, sales_min, sales_max), 2)
                kf3 = round(normalize_to_scale(avg_count, count_min, count_max), 2)
                years_used = len(entries)
                year_months = [e["year_month"] for e in entries]
            else:
                kf2 = 1.00
                kf3 = 1.00
                years_used = 0
                year_months = []
            
            mp_point = round((kf1 + kf2 + kf3) / 3, 2)
            
            monthly_results.append({
                "month": m,
                "seasonal": seasonal,
                "weekday": round(weekday, 2),
                "visitor": visitor,
                "kf1": kf1,
                "avg_sales": round(avg_sales, 0) if entries else 0,
                "kf2": kf2,
                "avg_count": round(avg_count, 0) if entries else 0,
                "kf3": kf3,
                "mp_point": mp_point,
                "years_used": years_used,
                "year_months": year_months,
            })
        
        results[store_id] = monthly_results
    
    return results


def get_status(mp_point):
    if mp_point >= 4.00:
        return "🔥 HYPER-INTENSITY"
    elif mp_point >= 3.00:
        return "⚡ HIGH-HEAT"
    elif mp_point >= 2.00:
        return "🌤️ STANDARD-FLOW"
    else:
        return "🧊 STABLE-FLOW"


def print_results(results):
    fiscal_months = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
    month_names = {4: "4月", 5: "5月", 6: "6月", 7: "7月", 8: "8月", 9: "9月",
                   10: "10月", 11: "11月", 12: "12月", 1: "1月", 2: "2月", 3: "3月"}
    
    for store_id, config in STORE_CONFIG.items():
        store_name = config["name"]
        base_name = config["base"]
        data = results[store_id]
        
        print(f"\n{'='*80}")
        print(f"  {store_id} — {store_name}（拠点: {base_name}）")
        print(f"{'='*80}")
        print(f"{'月':>4} | {'①季節':>5} | {'②曜日':>5} | {'③来場':>5} | {'KF①':>5} | {'平均売上':>12} | {'KF②':>5} | {'平均客数':>8} | {'KF③':>5} | {'MP Point':>8} | ステータス")
        print(f"{'—'*4} | {'—'*5} | {'—'*5} | {'—'*5} | {'—'*5} | {'—'*12} | {'—'*5} | {'—'*8} | {'—'*5} | {'—'*8} | {'—'*20}")
        
        for entry in data:
            m = entry["month"]
            if "note" in entry:
                print(f"{month_names[m]:>4} | {'—':>5} | {'—':>5} | {'—':>5} | {'—':>5} | {'—':>12} | {'—':>5} | {'—':>8} | {'—':>5} | {'—':>8} | {entry['note']}")
            else:
                status = get_status(entry["mp_point"])
                sales_str = f"¥{entry['avg_sales']:,.0f}" if entry['avg_sales'] > 0 else "—"
                count_str = f"{entry['avg_count']:,.0f}" if entry['avg_count'] > 0 else "—"
                print(f"{month_names[m]:>4} | {entry['seasonal']:>5.2f} | {entry['weekday']:>5.2f} | {entry['visitor']:>5.2f} | {entry['kf1']:>5.2f} | {sales_str:>12} | {entry['kf2']:>5.2f} | {count_str:>8} | {entry['kf3']:>5.2f} | {entry['mp_point']:>8.2f} | {status}")
        
        # 年間平均
        valid_entries = [e for e in data if "note" not in e and e["mp_point"] > 0]
        if valid_entries:
            avg_mp = sum(e["mp_point"] for e in valid_entries) / len(valid_entries)
            print(f"{'—'*4} | {'—'*5} | {'—'*5} | {'—'*5} | {'—'*5} | {'—'*12} | {'—'*5} | {'—'*8} | {'—'*5} | {'—'*8} | {'—'*20}")
            print(f"{'年平均':>4} | {'':>5} | {'':>5} | {'':>5} | {'':>5} | {'':>12} | {'':>5} | {'':>8} | {'':>5} | {avg_mp:>8.2f} | {get_status(avg_mp)}")


if __name__ == "__main__":
    results = compute_r8_mp()
    print_results(results)
    
    # JSON出力も
    output_path = os.path.join(CSV_DIR, "r8_mp_forecast.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\n\nJSON出力: {output_path}")
