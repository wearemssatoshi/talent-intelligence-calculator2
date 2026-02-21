#!/usr/bin/env python3
"""
R8 Momentum Peaks Point — 拠点別算出（GA/BG分離版）
=====================================================
GA日別CSVからBGチャネルを除外し、テレビ塔レストラン単体のMPを正確に算出。
BQはRYBチャネル含みだが、RYBはレストラン営業の一部なのでそのまま含む。

正規化: 各拠点内で売上・客数を1.00-5.00にノーマライズ（拠点内の月間変動を捉える）
"""

import csv
import json
import calendar
from collections import defaultdict
import os

CSV_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "csv_output")

# ============================================================================
# 定数
# ============================================================================
SEASONAL_INDEX = {
    "MOIWAYAMA": {4: 1.00, 5: 3.00, 6: 4.00, 7: 5.00, 8: 5.00, 9: 5.00, 10: 5.00, 11: 3.00, 12: 5.00, 1: 2.00, 2: 3.00, 3: 3.00},
    "OKURAYAMA": {4: 2.00, 5: 3.00, 6: 4.00, 7: 5.00, 8: 5.00, 9: 5.00, 10: 5.00, 11: 3.00, 12: 5.00, 1: 2.00, 2: 3.00, 3: 3.00},
    "TV_TOWER":  {4: 2.00, 5: 3.00, 6: 4.00, 7: 5.00, 8: 5.00, 9: 5.00, 10: 5.00, 11: 3.00, 12: 5.00, 1: 2.00, 2: 3.00, 3: 3.00},
    "AKARENGA":  {4: 2.00, 5: 3.00, 6: 4.00, 7: 5.00, 8: 5.00, 9: 5.00, 10: 5.00, 11: 3.00, 12: 5.00, 1: 2.00, 2: 3.00, 3: 3.00},
}

VISITOR_INDEX = {
    "MOIWAYAMA": {4: 1.00, 5: 3.50, 6: 4.00, 7: 4.50, 8: 4.50, 9: 5.00, 10: 5.00, 11: 3.00, 12: 4.50, 1: 2.00, 2: 3.00, 3: 2.50},
    "OKURAYAMA": {4: 2.00, 5: 3.50, 6: 3.50, 7: 4.00, 8: 5.00, 9: 4.50, 10: 4.00, 11: 2.50, 12: 3.50, 1: 2.00, 2: 3.00, 3: 2.50},
    "TV_TOWER":  {4: 2.00, 5: 3.50, 6: 4.00, 7: 5.00, 8: 5.00, 9: 4.50, 10: 4.00, 11: 3.00, 12: 4.50, 1: 2.00, 2: 3.50, 3: 2.50},
    "AKARENGA":  {4: 2.50, 5: 3.50, 6: 4.00, 7: 5.00, 8: 5.00, 9: 4.50, 10: 4.00, 11: 3.00, 12: 4.50, 1: 2.00, 2: 3.00, 3: 2.50},
}

WEEKDAY_POINTS = {"月": 2.0, "火": 2.0, "水": 2.0, "木": 3.0, "金": 4.0, "土": 5.0, "日": 4.0}

def calc_weekday_index(year, month):
    jp = ["月", "火", "水", "木", "金", "土", "日"]
    d = calendar.monthrange(year, month)[1]
    return sum(WEEKDAY_POINTS[jp[calendar.weekday(year, month, i)]] for i in range(1, d+1)) / d

R8_WD = {}
for m in range(4, 13): R8_WD[m] = calc_weekday_index(2026, m)
for m in range(1, 4):  R8_WD[m] = calc_weekday_index(2027, m)

FISCAL = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]

BASE_NAMES = {
    "MOIWAYAMA": "🏔️ 藻岩山 — THE JEWELS",
    "OKURAYAMA": "⛷️ 大倉山 — NP + Ce + RP",
    "TV_TOWER":  "🗼 テレビ塔 — THE GARDEN（レストラン営業）",
    "AKARENGA":  "🧱 赤れんがテラス — LA BRIQUE + RYB",
}

# ============================================================================
# GA日別CSVからBG除外の月次集計を作る
# ============================================================================
def load_ga_daily_without_bg():
    """GA日別CSVからBG売上/客数を除外した月別集計を返す"""
    path = os.path.join(CSV_DIR, "GA_daily.csv")
    monthly = defaultdict(lambda: defaultdict(lambda: {"sales": 0, "count": 0, "days": 0}))
    
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            date = row["date"]
            yr, mn, _ = date.split("-")
            ym = f"{yr}-{mn}"
            month = int(mn)
            
            # GA売上 = L + D + TO + BQ(宴会) + room_fee — BG除外
            l_total = int(row.get("l_total", 0) or 0)
            d_total = int(row.get("d_total", 0) or 0)
            to_total = int(row.get("to_total", 0) or 0)
            bq_total = int(row.get("bq_total", 0) or 0)
            room_fee = int(row.get("room_fee", 0) or 0)
            
            # BG除外の売上
            ga_sales = l_total + d_total + to_total + bq_total + room_fee
            
            # 客数 = L + D（BG客数を除外）
            l_count = int(row.get("l_count", 0) or 0)
            d_count = int(row.get("d_count", 0) or 0)
            ga_count = l_count + d_count
            
            if ga_sales > 0:
                monthly[ym][month]["sales"] += ga_sales
                monthly[ym][month]["count"] += ga_count
                monthly[ym][month]["days"] += 1
    
    # 月別に年ごとの合計をリスト化
    result = defaultdict(list)
    for ym in sorted(monthly.keys()):
        for month, data in monthly[ym].items():
            if data["sales"] > 0:
                result[month].append({
                    "year_month": ym,
                    "sales": data["sales"],
                    "count": data["count"],
                })
    return result


def load_monthly_csv(csv_path, target_stores):
    """svd_all_stores_monthly.csv から特定店舗の月別データを読み込む"""
    store_data = defaultdict(lambda: defaultdict(list))
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            store = row["store"]
            if store not in target_stores:
                continue
            month = int(row["month"].split("-")[1])
            total_sales = int(row["total_sales"])
            total_count = int(row["total_count"])
            if total_sales > 0:
                store_data[store][month].append({
                    "year_month": row["month"],
                    "sales": total_sales,
                    "count": total_count,
                })
    return store_data


def aggregate_stores(store_data, store_ids):
    """複数店舖を月別合算"""
    result = defaultdict(list)
    # 年月ごとに店舗を合算
    ym_data = defaultdict(lambda: defaultdict(lambda: {"sales": 0, "count": 0}))
    for sid in store_ids:
        for month, entries in store_data.get(sid, {}).items():
            for e in entries:
                ym_data[e["year_month"]][month]["sales"] += e["sales"]
                ym_data[e["year_month"]][month]["count"] += e["count"]
    
    for ym in sorted(ym_data.keys()):
        for month, d in ym_data[ym].items():
            if d["sales"] > 0:
                result[month].append({
                    "year_month": ym,
                    "sales": d["sales"],
                    "count": d["count"],
                })
    return result


def normalize(val, mn, mx):
    if mx == mn: return 3.0
    return max(1.0, min(5.0, (val - mn) / (mx - mn) * 4.0 + 1.0))


def get_status(mp):
    if mp >= 4.00: return "🔥 HYPER"
    elif mp >= 3.00: return "⚡ HIGH"
    elif mp >= 2.00: return "🌤️ STD"
    else: return "🧊 STABLE"


def calc_base_mp(base_id, monthly_by_month):
    """拠点内正規化でMPポイントを算出"""
    # 月別平均を計算
    monthly_avgs = {}
    for m in FISCAL:
        entries = monthly_by_month.get(m, [])
        if entries:
            avg_s = sum(e["sales"] for e in entries) / len(entries)
            avg_c = sum(e["count"] for e in entries) / len(entries)
            monthly_avgs[m] = {"sales": avg_s, "count": avg_c, "years": len(entries),
                               "year_months": [e["year_month"] for e in entries]}
    
    if not monthly_avgs:
        return [{"month": m, "mp_point": 0, "note": "データなし"} for m in FISCAL]
    
    # 拠点内正規化レンジ
    s_vals = [d["sales"] for d in monthly_avgs.values()]
    c_vals = [d["count"] for d in monthly_avgs.values()]
    s_min, s_max = min(s_vals), max(s_vals)
    c_min, c_max = min(c_vals), max(c_vals)
    
    results = []
    for m in FISCAL:
        seasonal = SEASONAL_INDEX[base_id][m]
        weekday = R8_WD[m]
        visitor = VISITOR_INDEX[base_id][m]
        kf1 = round((seasonal + weekday + visitor) / 3, 2)
        
        if m in monthly_avgs:
            d = monthly_avgs[m]
            kf2 = round(normalize(d["sales"], s_min, s_max), 2)
            kf3 = round(normalize(d["count"], c_min, c_max), 2)
            mp = round((kf1 + kf2 + kf3) / 3, 2)
            results.append({
                "month": m, "seasonal": seasonal, "weekday": round(weekday, 2),
                "visitor": visitor, "kf1": kf1,
                "avg_sales": round(d["sales"]), "kf2": kf2,
                "avg_count": round(d["count"]), "kf3": kf3,
                "mp_point": mp, "years_used": d["years"],
                "year_months": d["year_months"],
            })
        else:
            mp = round((kf1 + 1.0 + 1.0) / 3, 2)
            results.append({
                "month": m, "seasonal": seasonal, "weekday": round(weekday, 2),
                "visitor": visitor, "kf1": kf1,
                "avg_sales": 0, "kf2": 1.00, "avg_count": 0, "kf3": 1.00,
                "mp_point": mp, "years_used": 0, "year_months": [],
                "note": "実績データなし",
            })
    return results


def print_base(base_id, data):
    name = BASE_NAMES[base_id]
    print(f"\n{'='*105}")
    print(f"  {name}")
    print(f"{'='*105}")
    print(f"{'月':>4} | {'①季節':>5} | {'②曜日':>5} | {'③来場':>5} | {'KF①':>5} | {'平均売上':>14} | {'KF②':>5} | {'平均客数':>8} | {'KF③':>5} | {'MP':>5} | ステータス")
    print(f"{'—'*4} | {'—'*5} | {'—'*5} | {'—'*5} | {'—'*5} | {'—'*14} | {'—'*5} | {'—'*8} | {'—'*5} | {'—'*5} | {'—'*12}")
    
    mn = {4:"4月",5:"5月",6:"6月",7:"7月",8:"8月",9:"9月",10:"10月",11:"11月",12:"12月",1:"1月",2:"2月",3:"3月"}
    for e in data:
        st = get_status(e["mp_point"])
        s = f"¥{e['avg_sales']:>12,}" if e['avg_sales'] > 0 else f"{'—':>13}"
        c = f"{e['avg_count']:>7,}" if e['avg_count'] > 0 else f"{'—':>7}"
        n = f"  ※{e['note']}" if "note" in e else ""
        print(f"{mn[e['month']]:>4} | {e['seasonal']:>5.2f} | {e['weekday']:>5.2f} | {e['visitor']:>5.2f} | {e['kf1']:>5.2f} | {s} | {e['kf2']:>5.2f} | {c} | {e['kf3']:>5.2f} | {e['mp_point']:>5.2f} | {st}{n}")
    
    valid = [e for e in data if e["mp_point"] > 0]
    if valid:
        avg = sum(e["mp_point"] for e in valid) / len(valid)
        print(f"{'—'*4} | {'—'*5} | {'—'*5} | {'—'*5} | {'—'*5} | {'—'*14} | {'—'*5} | {'—'*8} | {'—'*5} | {'—'*5} | {'—'*12}")
        print(f"{'年平均':>4} | {'':>5} | {'':>5} | {'':>5} | {'':>5} | {'':>14} | {'':>5} | {'':>8} | {'':>5} | {avg:>5.2f} | {get_status(avg)}")


def main():
    csv_path = os.path.join(CSV_DIR, "svd_all_stores_monthly.csv")
    
    # --- 藻岩山 = JW ---
    store_data = load_monthly_csv(csv_path, ["JW"])
    moiwa = calc_base_mp("MOIWAYAMA", store_data.get("JW", {}))
    print_base("MOIWAYAMA", moiwa)
    
    # --- 大倉山 = NP + Ce + RP ---
    store_data = load_monthly_csv(csv_path, ["NP", "Ce", "RP"])
    okura_agg = aggregate_stores(store_data, ["NP", "Ce", "RP"])
    okura = calc_base_mp("OKURAYAMA", okura_agg)
    print_base("OKURAYAMA", okura)
    
    # --- テレビ塔 = GA（BG除外！）---
    ga_no_bg = load_ga_daily_without_bg()
    tv = calc_base_mp("TV_TOWER", ga_no_bg)
    print_base("TV_TOWER", tv)
    
    # --- 赤れんが = BQ（RYB込み） ---
    store_data = load_monthly_csv(csv_path, ["BQ"])
    akarenga = calc_base_mp("AKARENGA", store_data.get("BQ", {}))
    print_base("AKARENGA", akarenga)
    
    # サマリー
    print(f"\n\n{'='*60}")
    print(f"  R8 拠点別MP サマリー")
    print(f"{'='*60}")
    all_results = {
        "MOIWAYAMA": moiwa, "OKURAYAMA": okura,
        "TV_TOWER": tv, "AKARENGA": akarenga,
    }
    for bid in ["MOIWAYAMA", "OKURAYAMA", "TV_TOWER", "AKARENGA"]:
        d = all_results[bid]
        valid = [e for e in d if e["mp_point"] > 0]
        avg = sum(e["mp_point"] for e in valid) / len(valid) if valid else 0
        print(f"  {BASE_NAMES[bid]:40} | 年平均 {avg:.2f} {get_status(avg)}")
    
    # JSON出力
    output = os.path.join(CSV_DIR, "r8_mp_base_forecast.json")
    with open(output, "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2, default=str)
    print(f"\nJSON: {output}")


if __name__ == "__main__":
    main()
