#!/usr/bin/env python3
"""
Momentum Peaks — MP計算コア (calculator.py)
全店舗 × 全日付のMPポイントを自動計算する汎用エンジン。

Architecture:
  Config Layer  →  restaurant_config.json (顧客ごとに差し替え)
  Indices Layer →  mp_indices.json (拠点定指数)
  Sekki Engine  →  sekki.py (日付→節気→季節PT)
  Data Layer    →  各店舗CSV (日次売上データ)
  Output        →  {store}_mp_daily.csv (日次MPポイント)
"""

import csv
import json
import os
import sys
from datetime import date, timedelta
from typing import Dict, List, Optional, Tuple
from collections import defaultdict

# 同一ディレクトリの節気エンジンをインポート
from sekki import get_sekki, get_weekday_ja, get_kf1, _load_indices


class MPCalculator:
    """Momentum Peaks 計算エンジン"""
    
    def __init__(self, engine_dir: str = None):
        if engine_dir is None:
            engine_dir = os.path.dirname(os.path.abspath(__file__))
        
        self.engine_dir = engine_dir
        self.csv_dir = os.path.join(os.path.dirname(engine_dir), "csv_output")
        
        # 設定読み込み
        with open(os.path.join(engine_dir, "restaurant_config.json"), "r", encoding="utf-8") as f:
            self.config = json.load(f)
        
        self.indices = _load_indices()
        
        # 全店舗のCSVデータをロード
        self.store_data = {}
        self._load_all_store_data()
    
    def _load_all_store_data(self):
        """全店舗のCSVデータを読み込む"""
        for base in self.config["bases"]:
            for store in base["stores"]:
                store_id = store["id"]
                csv_path = os.path.join(self.csv_dir, store["csv_file"])
                if not os.path.exists(csv_path):
                    print(f"⚠️  CSV not found: {csv_path} (store: {store_id})")
                    continue
                
                # KF計算から除外するチャネル
                exclude_channels = set(store.get("exclude_channels_from_kf", []))
                
                data = {}
                with open(csv_path, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        d = row["date"]
                        grand_total_col = store["grand_total_col"]
                        
                        # 来客数の計算（チャネル別count列の合計）
                        total_count = 0
                        excluded_count = 0
                        excluded_sales = 0
                        for ch_name, ch_conf in store["channels"].items():
                            count_val = 0
                            sales_val = 0
                            if "count_col" in ch_conf and ch_conf["count_col"] in row:
                                try:
                                    count_val = int(row[ch_conf["count_col"]] or 0)
                                except (ValueError, KeyError):
                                    pass
                            if "sales_col" in ch_conf and ch_conf["sales_col"] in row:
                                try:
                                    sales_val = int(row[ch_conf["sales_col"]] or 0)
                                except (ValueError, KeyError):
                                    pass
                            
                            total_count += count_val
                            
                            if ch_name in exclude_channels:
                                excluded_count += count_val
                                excluded_sales += sales_val
                        
                        # 売上額
                        try:
                            grand_total = int(row.get(grand_total_col, 0) or 0)
                        except ValueError:
                            grand_total = 0
                        
                        # KF計算用（除外チャネル分を差し引き）
                        kf_sales = grand_total - excluded_sales
                        kf_count = total_count - excluded_count
                        
                        data[d] = {
                            "total_count": total_count,
                            "grand_total": grand_total,
                            "kf_sales": kf_sales,
                            "kf_count": kf_count,
                            "weekday": row.get("weekday", ""),
                        }
                
                self.store_data[store_id] = data
                if exclude_channels:
                    print(f"✅ Loaded {store_id}: {len(data)} days (KF除外: {', '.join(exclude_channels)})")
                else:
                    print(f"✅ Loaded {store_id}: {len(data)} days")
    
    def _get_base_id_for_store(self, store_id: str) -> str:
        """店舗IDから拠点IDを逆引き"""
        for base in self.config["bases"]:
            for store in base["stores"]:
                if store["id"] == store_id:
                    return base["id"]
        raise ValueError(f"Store '{store_id}' not found in config")
    
    def calculate_kf2_kf3(self, store_id: str, target_date: date,
                          lookback_years: int = 2) -> Tuple[float, float]:
        """
        KF②（売上ファクター）とKF③（来客数ファクター）を計算する。
        過去N年の同月実績から正規化（min-max → 1.00-5.00）。
        
        Args:
            store_id: 店舗ID
            target_date: 対象日付
            lookback_years: 参照する過去年数
        
        Returns:
            (kf2, kf3) as floats
        """
        if store_id not in self.store_data:
            return 2.50, 2.50  # データなしの場合は中間値
        
        data = self.store_data[store_id]
        target_month = target_date.month
        
        # 過去の同月データを収集（月別の日平均売上・日平均来客数）
        monthly_sales = {}  # {year-month: avg_daily_sales}
        monthly_counts = {}  # {year-month: avg_daily_count}
        
        for date_str, row in data.items():
            try:
                d = date.fromisoformat(date_str)
            except ValueError:
                continue
            
            key = f"{d.year}-{d.month:02d}"
            if key not in monthly_sales:
                monthly_sales[key] = []
                monthly_counts[key] = []
            
            if row["kf_sales"] > 0:  # 営業日のみ（KF用売上で判定）
                monthly_sales[key].append(row["kf_sales"])
                monthly_counts[key].append(row["kf_count"])
        
        # 月別平均を計算
        month_avg_sales = {}
        month_avg_counts = {}
        for key, values in monthly_sales.items():
            if values:
                month_avg_sales[key] = sum(values) / len(values)
        for key, values in monthly_counts.items():
            if values:
                month_avg_counts[key] = sum(values) / len(values)
        
        if not month_avg_sales:
            return 2.50, 2.50
        
        # 全月の平均値でmin-max正規化の基準を作る
        all_sales_avgs = list(month_avg_sales.values())
        all_count_avgs = list(month_avg_counts.values())
        
        min_sales = min(all_sales_avgs)
        max_sales = max(all_sales_avgs)
        min_count = min(all_count_avgs) if all_count_avgs else 0
        max_count = max(all_count_avgs) if all_count_avgs else 1
        
        # 対象月の過去N年の平均を取得
        target_sales_values = []
        target_count_values = []
        
        for y in range(target_date.year - lookback_years, target_date.year + 1):
            key = f"{y}-{target_month:02d}"
            if key in month_avg_sales:
                target_sales_values.append(month_avg_sales[key])
            if key in month_avg_counts:
                target_count_values.append(month_avg_counts[key])
        
        # 過去N年の同月平均
        if target_sales_values:
            avg_sales = sum(target_sales_values) / len(target_sales_values)
        else:
            avg_sales = sum(all_sales_avgs) / len(all_sales_avgs)
        
        if target_count_values:
            avg_count = sum(target_count_values) / len(target_count_values)
        else:
            avg_count = sum(all_count_avgs) / len(all_count_avgs) if all_count_avgs else 0
        
        # min-max正規化 → 1.00-5.00
        def normalize(val, vmin, vmax):
            if vmax == vmin:
                return 3.00
            normalized = (val - vmin) / (vmax - vmin)
            return round(1.00 + normalized * 4.00, 2)
        
        kf2 = normalize(avg_sales, min_sales, max_sales)
        kf3 = normalize(avg_count, min_count, max_count)
        
        return kf2, kf3
    
    def calculate_mp_point(self, store_id: str, target_date: date) -> Dict:
        """
        1日分のMPポイントを計算する。
        
        Formula: MP Point = (KF① + KF② + KF③) / 3
        
        Returns:
            Dict with all calculation details
        """
        base_id = self._get_base_id_for_store(store_id)
        
        # KF①: 拠点定指数
        kf1_result = get_kf1(target_date, base_id, self.indices)
        kf1 = kf1_result["kf1"]
        
        # KF②③: 店舗実績ファクター
        kf2, kf3 = self.calculate_kf2_kf3(store_id, target_date)
        
        # 最終MPポイント
        mp_point = round((kf1 + kf2 + kf3) / 3, 2)
        
        # 予測値の計算（過去同月同曜日の平均）
        predicted_sales, predicted_count = self._predict(store_id, target_date)
        
        # 実績値の取得
        actual = self.store_data.get(store_id, {}).get(target_date.isoformat(), {})
        
        return {
            "date": target_date.isoformat(),
            "weekday": kf1_result["weekday_ja"],
            "sekki": kf1_result["sekki"],
            "rank": kf1_result["rank"],
            "season": kf1_result["season"],
            "season_pt": kf1_result["season_pt"],
            "seasonal_idx": kf1_result["seasonal_idx"],
            "weekday_idx": kf1_result["weekday_idx"],
            "visitor_idx": kf1_result["visitor_idx"],
            "kf1": kf1,
            "kf2": kf2,
            "kf3": kf3,
            "mp_point": mp_point,
            "predicted_sales": predicted_sales,
            "predicted_count": predicted_count,
            "actual_sales": actual.get("grand_total", 0),
            "actual_count": actual.get("total_count", 0),
        }
    
    def _predict(self, store_id: str, target_date: date) -> Tuple[int, int]:
        """過去同月同曜日の加重平均から予測値を算出"""
        if store_id not in self.store_data:
            return 0, 0
        
        data = self.store_data[store_id]
        target_weekday = target_date.weekday()
        target_month = target_date.month
        
        sales_values = []
        count_values = []
        weights = []
        
        for date_str, row in data.items():
            try:
                d = date.fromisoformat(date_str)
            except ValueError:
                continue
            
            # 同月・同曜日のみ
            if d.month == target_month and d.weekday() == target_weekday and d < target_date:
                if row["grand_total"] > 0:
                    # 新しい年のデータに高い重みを付ける
                    year_diff = target_date.year - d.year
                    weight = 1.0 / max(year_diff, 1)
                    sales_values.append(row["grand_total"])
                    count_values.append(row["total_count"])
                    weights.append(weight)
        
        if not sales_values:
            return 0, 0
        
        # 加重平均
        total_weight = sum(weights)
        pred_sales = int(sum(s * w for s, w in zip(sales_values, weights)) / total_weight)
        pred_count = int(sum(c * w for c, w in zip(count_values, weights)) / total_weight)
        
        return pred_sales, pred_count
    
    def generate_mp_csv(self, store_id: str, 
                        start_date: date, end_date: date,
                        output_path: str = None) -> str:
        """
        指定期間のMP CSVを生成する。
        
        Args:
            store_id: 店舗ID
            start_date: 開始日
            end_date: 終了日
            output_path: 出力パス（Noneの場合はcsv_output/{store}_mp_daily.csv）
        
        Returns:
            出力ファイルパス
        """
        if output_path is None:
            output_path = os.path.join(self.csv_dir, f"{store_id}_mp_daily.csv")
        
        fieldnames = [
            "date", "weekday", "sekki", "rank", "season", "season_pt",
            "seasonal_idx", "weekday_idx", "visitor_idx",
            "kf1", "kf2", "kf3", "mp_point",
            "predicted_sales", "predicted_count",
            "actual_sales", "actual_count",
        ]
        
        rows = []
        current = start_date
        total_days = (end_date - start_date).days + 1
        
        print(f"\n🔄 Calculating MP for {store_id}: {start_date} → {end_date} ({total_days} days)")
        
        while current <= end_date:
            try:
                row = self.calculate_mp_point(store_id, current)
                rows.append(row)
            except Exception as e:
                print(f"  ⚠️  Error on {current}: {e}")
            
            current += timedelta(days=1)
            
            # 進捗表示
            done = len(rows)
            if done % 100 == 0:
                print(f"  📊 {done}/{total_days} days calculated...")
        
        with open(output_path, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        
        print(f"✅ Generated: {output_path} ({len(rows)} rows)")
        return output_path


def main():
    """CLI: 全店舗のMP CSVを生成"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Momentum Peaks Calculator")
    parser.add_argument("--store", type=str, default=None, 
                        help="Store ID (e.g., JW, NP, GA, BQ). Default: all stores")
    parser.add_argument("--start", type=str, default="2023-04-01",
                        help="Start date (YYYY-MM-DD)")
    parser.add_argument("--end", type=str, default="2026-03-31",
                        help="End date (YYYY-MM-DD)")
    parser.add_argument("--verify", action="store_true",
                        help="Run verification against existing MP CSVs")
    parser.add_argument("--single", type=str, default=None,
                        help="Calculate single date (e.g., 2023-09-07)")
    
    args = parser.parse_args()
    
    calc = MPCalculator()
    
    if args.single:
        target = date.fromisoformat(args.single)
        store = args.store or "JW"
        result = calc.calculate_mp_point(store, target)
        
        print(f"\n{'━' * 50}")
        print(f"📅 {result['date']} ({result['weekday']})")
        print(f"🌿 {result['sekki']} (Level {result['rank']}) — {result['season']}")
        print(f"{'─' * 50}")
        print(f"① 季節IDX:    {result['seasonal_idx']:.2f}")
        print(f"② 曜日IDX:    {result['weekday_idx']:.2f}")
        print(f"③ 来場者IDX:  {result['visitor_idx']:.2f}")
        print(f"   KF① =      {result['kf1']:.2f}")
        print(f"{'─' * 50}")
        print(f"⑤ KF② (売上): {result['kf2']:.2f}")
        print(f"⑥ KF③ (来客): {result['kf3']:.2f}")
        print(f"{'━' * 50}")
        print(f"🔥 MP Point =  {result['mp_point']:.2f}")
        print(f"{'━' * 50}")
        print(f"📈 予測売上:   ¥{result['predicted_sales']:,}")
        print(f"👥 予測来客:   {result['predicted_count']}名")
        print(f"📊 実績売上:   ¥{result['actual_sales']:,}")
        print(f"👤 実績来客:   {result['actual_count']}名")
        return
    
    if args.verify:
        _verify(calc, args.store or "JW")
        return
    
    start = date.fromisoformat(args.start)
    end = date.fromisoformat(args.end)
    
    # 対象店舗
    if args.store:
        stores = [args.store]
    else:
        stores = []
        for base in calc.config["bases"]:
            for store in base["stores"]:
                stores.append(store["id"])
    
    for store_id in stores:
        if store_id in calc.store_data:
            calc.generate_mp_csv(store_id, start, end)
        else:
            print(f"⚠️  Skipping {store_id}: no data loaded")


def _verify(calc, store_id: str):
    """既存のMP CSVと照合検証"""
    existing_path = os.path.join(calc.csv_dir, f"{store_id}_mp_24levels.csv")
    if not os.path.exists(existing_path):
        print(f"❌ Existing MP CSV not found: {existing_path}")
        return
    
    print(f"\n🔍 Verifying {store_id} against {existing_path}")
    
    with open(existing_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        mismatches = 0
        total = 0
        for row in reader:
            total += 1
            d = date.fromisoformat(row["date"])
            
            try:
                result = calc.calculate_mp_point(store_id, d)
            except Exception as e:
                continue
            
            # 節気の一致を確認
            if result["sekki"] != row["sekki"]:
                print(f"  ⚠️  {row['date']}: sekki mismatch — "
                      f"expected '{row['sekki']}', got '{result['sekki']}'")
                mismatches += 1
            
            if total <= 5 or total % 200 == 0:
                print(f"  ✅ {row['date']}: {result['sekki']} "
                      f"KF①={result['kf1']:.2f} MP={result['mp_point']:.2f}")
    
    print(f"\n📊 Verification: {total} rows checked, {mismatches} mismatches")


if __name__ == "__main__":
    main()
