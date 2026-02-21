#!/usr/bin/env python3
"""
R8 Momentum Peaks — 正規版エンジン v1.0

設計原則:
  単一データソース = バックエンドの日別CSV（*_daily.csv）
  月次集計は計算時にオンザフライで積み上げる
  中間CSVには依存しない

Usage:
  python3 compute_r8_mp_correct.py
"""

import csv
import calendar
import json
import sys
from collections import defaultdict
from pathlib import Path

# ============================================================
# 設定
# ============================================================
CSV_DIR = Path(__file__).parent / "csv_output"
OUTPUT_JSON = CSV_DIR / "r8_mp_correct.json"

# 拠点構成
BASE_CONFIG = {
    "MOIWAYAMA": {
        "label": "🏔️ 藻岩山",
        "stores": ["JW"],
        "seasonal": {4:1, 5:3, 6:4, 7:5, 8:5, 9:5, 10:5, 11:3, 12:5, 1:2, 2:3, 3:3},
        "visitor":  {4:1, 5:3.5, 6:4, 7:4.5, 8:4.5, 9:5, 10:5, 11:3, 12:4.5, 1:2, 2:3, 3:2.5},
    },
    "OKURAYAMA": {
        "label": "⛷️ 大倉山",
        "stores": ["NP", "Ce", "RP"],
        "seasonal": {4:2, 5:3, 6:4, 7:5, 8:5, 9:5, 10:5, 11:3, 12:5, 1:2, 2:3, 3:3},
        "visitor":  {4:2, 5:3.5, 6:3.5, 7:4, 8:4, 9:4.5, 10:4, 11:2.5, 12:3.5, 1:2, 2:3, 3:2.5},
    },
    "TV_TOWER": {
        "label": "🗼 テレビ塔",
        "stores": ["GA"],  # BGは別途ブースト計算
        "seasonal": {4:2, 5:3, 6:4, 7:5, 8:5, 9:5, 10:5, 11:3, 12:5, 1:2, 2:3, 3:3},
        "visitor":  {4:2, 5:3.5, 6:4, 7:5, 8:5, 9:4.5, 10:4, 11:3, 12:4.5, 1:2, 2:3.5, 3:2.5},
    },
    "AKARENGA": {
        "label": "🧱 赤れんが",
        "stores": ["BQ"],  # RYBはBQ内に含まれる
        "seasonal": {4:2, 5:3, 6:4, 7:5, 8:5, 9:5, 10:5, 11:3, 12:5, 1:2, 2:3, 3:3},
        "visitor":  {4:2.5, 5:3.5, 6:4, 7:5, 8:5, 9:4.5, 10:4, 11:3, 12:4.5, 1:2, 2:3, 3:2.5},
    },
}

# R8曜日指数
WEEKDAY_PTS = {"月":2, "火":2, "水":2, "木":3, "金":4, "土":5, "日":4}
JP_DAYS = ["月", "火", "水", "木", "金", "土", "日"]


# ============================================================
# ユーティリティ
# ============================================================
def calc_weekday_index(year, month):
    """R8の月別曜日指数"""
    days_in_month = calendar.monthrange(year, month)[1]
    total = sum(WEEKDAY_PTS[JP_DAYS[calendar.weekday(year, month, d)]]
                for d in range(1, days_in_month + 1))
    return round(total / days_in_month, 2)


def normalize(value, min_val, max_val, scale_min=1.0, scale_max=5.0):
    """1.00〜5.00 に正規化"""
    if max_val == min_val:
        return (scale_min + scale_max) / 2
    n = (value - min_val) / (max_val - min_val) * (scale_max - scale_min) + scale_min
    return round(max(scale_min, min(scale_max, n)), 2)


# ============================================================
# データロード: 日別CSVから直接月別集計
# ============================================================
def load_daily_to_monthly(store_id):
    """
    バックエンドの日別CSVを読み込み、月次に積み上げる。
    これが唯一のデータソース。中間CSVには依存しない。
    """
    monthly = defaultdict(lambda: {"sales": 0, "count": 0, "days": 0})

    if store_id == "JW":
        path = CSV_DIR / "JW_daily.csv"
        with open(path) as f:
            for row in csv.DictReader(f):
                ym = row["date"][:7]
                gt = int(row.get("grand_total", 0) or 0)
                lc = int(row.get("l_count", 0) or 0)
                dc = int(row.get("d_count", 0) or 0)
                if gt > 0:
                    monthly[ym]["sales"] += gt
                    monthly[ym]["count"] += lc + dc
                    monthly[ym]["days"] += 1

    elif store_id == "GA":
        # GA: レストラン営業のみ（BG除外）
        path = CSV_DIR / "GA_daily.csv"
        with open(path) as f:
            for row in csv.DictReader(f):
                ym = row["date"][:7]
                l_total = int(row.get("l_total", 0) or 0)
                d_total = int(row.get("d_total", 0) or 0)
                to_total = int(row.get("to_total", 0) or 0)
                bq_total = int(row.get("bq_total", 0) or 0)
                room_fee = int(row.get("room_fee", 0) or 0)
                lc = int(row.get("l_count", 0) or 0)
                dc = int(row.get("d_count", 0) or 0)
                # BG除外: bg_total, bg_count は含めない
                ga_sales = l_total + d_total + to_total + bq_total + room_fee
                ga_count = lc + dc
                if ga_sales > 0:
                    monthly[ym]["sales"] += ga_sales
                    monthly[ym]["count"] += ga_count
                    monthly[ym]["days"] += 1

    elif store_id == "GA_BG":
        # BGのみ抽出（ブースト計算用）
        # ※ GA_daily.csvのbg_totalは客数が入っている（バグ）
        # → TV_TOWER_daily.csvに正しいBG売上額が格納されている
        path = CSV_DIR / "TV_TOWER_daily.csv"
        with open(path) as f:
            for row in csv.DictReader(f):
                ym = row["date"][:7]
                bg_total = int(row.get("bg_total", 0) or 0)
                bg_count = int(row.get("bg_count", 0) or 0)
                if bg_total > 0:
                    monthly[ym]["sales"] += bg_total
                    monthly[ym]["count"] += bg_count
                    monthly[ym]["days"] += 1

    elif store_id == "NP":
        path = CSV_DIR / "NP_daily.csv"
        with open(path) as f:
            for row in csv.DictReader(f):
                ym = row["date"][:7]
                gt = int(row.get("grand_total", 0) or 0)
                lc = int(row.get("l_count", 0) or 0)
                dc = int(row.get("d_count", 0) or 0)
                ec = int(row.get("event_count", 0) or 0)
                if gt > 0:
                    monthly[ym]["sales"] += gt
                    monthly[ym]["count"] += lc + dc + ec
                    monthly[ym]["days"] += 1

    elif store_id == "Ce":
        path = CSV_DIR / "Ce_daily.csv"
        with open(path) as f:
            for row in csv.DictReader(f):
                ym = row["date"][:7]
                total = int(row.get("total", 0) or 0)
                count = int(row.get("count", 0) or 0)
                if total > 0:
                    monthly[ym]["sales"] += total
                    monthly[ym]["count"] += count
                    monthly[ym]["days"] += 1

    elif store_id == "RP":
        path = CSV_DIR / "RP_daily.csv"
        with open(path) as f:
            for row in csv.DictReader(f):
                ym = row["date"][:7]
                total = int(row.get("total", 0) or 0)
                count = int(row.get("count", 0) or 0)
                if total > 0:
                    monthly[ym]["sales"] += total
                    monthly[ym]["count"] += count
                    monthly[ym]["days"] += 1

    elif store_id == "BQ":
        path = CSV_DIR / "BQ_daily.csv"
        with open(path) as f:
            for row in csv.DictReader(f):
                ym = row["date"][:7]
                gt = int(row.get("grand_total", 0) or 0)
                lc = int(row.get("l_count", 0) or 0)
                ac = int(row.get("at_count", 0) or 0)
                dc = int(row.get("d_count", 0) or 0)
                rc = int(row.get("ryb_count", 0) or 0)
                if gt > 0:
                    monthly[ym]["sales"] += gt
                    monthly[ym]["count"] += lc + ac + dc + rc
                    monthly[ym]["days"] += 1

    return dict(monthly)


def aggregate_base_monthly(store_ids):
    """複数店舗の月次データを拠点単位に合算"""
    base_monthly = defaultdict(lambda: {"sales": 0, "count": 0, "days": 0})
    for sid in store_ids:
        store_data = load_daily_to_monthly(sid)
        for ym, d in store_data.items():
            base_monthly[ym]["sales"] += d["sales"]
            base_monthly[ym]["count"] += d["count"]
            base_monthly[ym]["days"] = max(base_monthly[ym]["days"], d["days"])
    return dict(base_monthly)


def monthly_to_averages(monthly_data):
    """月次データを月ごとの全年平均に集約"""
    by_month = defaultdict(lambda: {"sales": [], "count": []})
    for ym, d in monthly_data.items():
        m = int(ym.split("-")[1])
        if d["sales"] > 0:
            by_month[m]["sales"].append(d["sales"])
            by_month[m]["count"].append(d["count"])

    averages = {}
    for m in range(1, 13):
        if by_month[m]["sales"]:
            n = len(by_month[m]["sales"])
            averages[m] = {
                "avg_sales": sum(by_month[m]["sales"]) / n,
                "avg_count": sum(by_month[m]["count"]) / n,
                "data_years": n,
            }
    return averages


# ============================================================
# MP計算
# ============================================================
def calc_base_mp(base_id, config):
    """拠点MPを計算（日別CSVから直接積み上げ）"""
    # Step 1: 日別CSV → 月次積み上げ → 月別平均
    monthly_raw = aggregate_base_monthly(config["stores"])
    averages = monthly_to_averages(monthly_raw)

    if not averages:
        return None

    # Step 2: 正規化レンジ（拠点内）
    s_vals = [v["avg_sales"] for v in averages.values()]
    c_vals = [v["avg_count"] for v in averages.values()]
    s_min, s_max = min(s_vals), max(s_vals)
    c_min, c_max = min(c_vals), max(c_vals)

    # Step 3: R8曜日指数
    r8_wd = {}
    for m in range(4, 13):
        r8_wd[m] = calc_weekday_index(2026, m)
    for m in range(1, 4):
        r8_wd[m] = calc_weekday_index(2027, m)

    # Step 4: MP算出
    results = {}
    order = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
    for m in order:
        seasonal = config["seasonal"][m]
        visitor = config["visitor"][m]
        weekday = r8_wd[m]
        kf1 = round((seasonal + weekday + visitor) / 3, 2)

        if m in averages:
            avg = averages[m]
            kf2 = normalize(avg["avg_sales"], s_min, s_max)
            kf3 = normalize(avg["avg_count"], c_min, c_max)
            mp = round((kf1 + kf2 + kf3) / 3, 2)
            results[m] = {
                "kf1": kf1, "kf2": kf2, "kf3": kf3, "mp": mp,
                "avg_sales": round(avg["avg_sales"]),
                "avg_count": round(avg["avg_count"]),
                "data_years": avg["data_years"],
            }
        else:
            results[m] = {
                "kf1": kf1, "kf2": 1.0, "kf3": 1.0,
                "mp": round((kf1 + 1.0 + 1.0) / 3, 2),
                "avg_sales": 0, "avg_count": 0, "data_years": 0,
                "note": "実績データなし",
            }

    return results


def calc_tv_tower_with_bg(ga_mp, config):
    """テレビ塔: 天井方式（GA単体12月ピーク = 5.00 キャップ）
    
    GA+BG合算を拠点売上/客数とし、GA単体12月ピークを天井に設定。
    BG夏季月は天井を超えるが5.00にキャップされ、
    冬季GA月の正規化が圧殺されない。
    R7予算表のロジックと整合する方式。
    """
    # GA月次データ（天井算出用）
    ga_monthly = aggregate_base_monthly(["GA"])
    ga_averages = monthly_to_averages(ga_monthly)
    
    # BG月次データ
    bg_monthly = load_daily_to_monthly("GA_BG")
    bg_averages = monthly_to_averages(bg_monthly)
    
    # GA+BG合算の月次データ
    combined_monthly = defaultdict(lambda: {"sales": 0, "count": 0})
    for ym, d in aggregate_base_monthly(["GA"]).items():
        combined_monthly[ym]["sales"] += d["sales"]
        combined_monthly[ym]["count"] += d["count"]
    for ym, d in load_daily_to_monthly("GA_BG").items():
        combined_monthly[ym]["sales"] += d["sales"]
        combined_monthly[ym]["count"] += d["count"]
    combined_averages = monthly_to_averages(dict(combined_monthly))
    
    # 天井 = GA単体12月ピーク
    ceil_sales = ga_averages[12]["avg_sales"] if 12 in ga_averages else max(v["avg_sales"] for v in ga_averages.values())
    ceil_count = ga_averages[12]["avg_count"] if 12 in ga_averages else max(v["avg_count"] for v in ga_averages.values())
    
    # フロア = 合算の最低月
    floor_sales = min(v["avg_sales"] for v in combined_averages.values())
    floor_count = min(v["avg_count"] for v in combined_averages.values())
    
    def normalize_capped(value, floor, ceiling):
        """天井でキャップする正規化"""
        if value >= ceiling:
            return 5.0
        if ceiling == floor:
            return 3.0
        return round(max(1.0, min(5.0, (value - floor) / (ceiling - floor) * 4 + 1)), 2)
    
    # R8曜日指数
    r8_wd = {}
    for m in range(4, 13):
        r8_wd[m] = calc_weekday_index(2026, m)
    for m in range(1, 4):
        r8_wd[m] = calc_weekday_index(2027, m)
    
    results = {}
    order = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
    for m in order:
        if m not in combined_averages:
            results[m] = ga_mp[m]
            continue
        
        avg = combined_averages[m]
        seasonal = config["seasonal"][m]
        visitor = config["visitor"][m]
        weekday = r8_wd[m]
        kf1 = round((seasonal + weekday + visitor) / 3, 2)
        kf2 = normalize_capped(avg["avg_sales"], floor_sales, ceil_sales)
        kf3 = normalize_capped(avg["avg_count"], floor_count, ceil_count)
        mp = round((kf1 + kf2 + kf3) / 3, 2)
        
        # BG情報も保持
        bg_s = bg_averages[m]["avg_sales"] if m in bg_averages else 0
        bg_c = bg_averages[m]["avg_count"] if m in bg_averages else 0
        ga_s = ga_averages[m]["avg_sales"] if m in ga_averages else 0
        
        is_capped = avg["avg_sales"] >= ceil_sales
        
        results[m] = {
            "kf1": kf1, "kf2": kf2, "kf3": kf3, "mp": mp,
            "avg_sales": round(avg["avg_sales"]),
            "avg_count": round(avg["avg_count"]),
            "data_years": avg["data_years"],
            "ga_sales": round(ga_s),
            "bg_sales": round(bg_s),
            "capped": is_capped,
        }
    
    return results


# ============================================================
# 出力
# ============================================================
def print_base_report(base_id, label, results):
    """拠点別レポート表示"""
    order = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
    mn = {4:"4月",5:"5月",6:"6月",7:"7月",8:"8月",9:"9月",
          10:"10月",11:"11月",12:"12月",1:"1月",2:"2月",3:"3月"}

    is_tv = base_id == "TV_TOWER"

    print(f"\n{'='*80}")
    print(f"  {label}")
    print(f"{'='*80}")

    if is_tv:
        print(f"{'月':>4} | {'KF①':>5} | {'KF②':>5} | {'KF③':>5} | {'GA MP':>5} | {'BG MP':>5} | {'拠点MP':>5} | {'GA売上':>12} | {'BG売上':>12}")
        print("—" * 80)
    else:
        print(f"{'月':>4} | {'KF①':>5} | {'KF②':>5} | {'KF③':>5} | {'MP':>5} | {'平均売上':>12} | {'平均客数':>6} | {'年数':>3}")
        print("—" * 80)

    for m in order:
        r = results[m]
        if is_tv:
            ga_mp = r.get("ga_mp", r["mp"])
            bg_mp = r.get("bg_mp")
            bg_s = r.get("bg_sales", 0)
            bg_str = f"{bg_mp:>5.2f}" if bg_mp else "  —  "
            bg_s_str = f"¥{bg_s:>10,}" if bg_s else "         —"
            print(f" {mn[m]:>3} | {r['kf1']:>5.2f} | {r['kf2']:>5.2f} | {r['kf3']:>5.2f} | {ga_mp:>5.2f} | {bg_str} | {r['mp']:>5.2f} | ¥{r['avg_sales']:>10,} | {bg_s_str}")
        else:
            note = r.get("note", "")
            note_str = f"  ※{note}" if note else ""
            print(f" {mn[m]:>3} | {r['kf1']:>5.2f} | {r['kf2']:>5.2f} | {r['kf3']:>5.2f} | {r['mp']:>5.2f} | ¥{r['avg_sales']:>10,} | {r['avg_count']:>5,}名 | {r['data_years']:>2}年{note_str}")

    avg_mp = sum(r["mp"] for r in results.values()) / 12
    print("—" * 80)
    print(f" 年平均 |       |       |       | {avg_mp:>5.2f}")
    return avg_mp


# ============================================================
# メイン
# ============================================================
def main():
    print("=" * 80)
    print("  R8 Momentum Peaks — 正規版エンジン v1.0")
    print("  データソース: バックエンド日別CSV（直接積み上げ）")
    print("=" * 80)

    all_results = {}
    summaries = []

    for base_id, config in BASE_CONFIG.items():
        # 拠点MP算出（日別CSV → 月次積み上げ → MP）
        results = calc_base_mp(base_id, config)
        if not results:
            print(f"\n  ⚠️ {config['label']}: データなし")
            continue

        # テレビ塔はBGブースト適用
        if base_id == "TV_TOWER":
            results = calc_tv_tower_with_bg(results, config)

        avg_mp = print_base_report(base_id, config["label"], results)
        all_results[base_id] = {
            "label": config["label"],
            "annual_avg": round(avg_mp, 2),
            "monthly": {str(m): r for m, r in results.items()},
        }
        summaries.append((config["label"], avg_mp))

    # サマリー
    print(f"\n\n{'='*60}")
    print(f"  R8 拠点別MP サマリー")
    print(f"{'='*60}")
    for label, avg in sorted(summaries, key=lambda x: -x[1]):
        print(f"  {label:<30} | 年平均 {avg:.2f}")

    # JSON出力
    with open(OUTPUT_JSON, "w") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)
    print(f"\nJSON: {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
