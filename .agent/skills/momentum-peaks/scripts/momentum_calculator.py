#!/usr/bin/env python3
"""
Momentum Peaks Calculator for Anti-Gravity Skills
==================================================
売上データから「モメンタムピークス（需要係数）」を計算する。

Usage:
    python momentum_calculator.py <sales_csv> [date_col] [sales_col]
    
Examples:
    python momentum_calculator.py sales_2025.csv
    python momentum_calculator.py sales.csv 日付 売上
"""

import sys
import json
import os
from datetime import datetime

def calculate_momentum(file_path: str, date_col: str = None, sales_col: str = None) -> dict:
    """売上データからモメンタムピークスを計算"""
    
    if not os.path.exists(file_path):
        return {"success": False, "error": f"ファイルが見つかりません: {file_path}"}
    
    try:
        import pandas as pd
        import numpy as np
    except ImportError:
        return {"success": False, "error": "pandas/numpyがインストールされていません"}
    
    try:
        # CSV読み込み（エンコーディング自動検出）
        for encoding in ['utf-8', 'cp932', 'shift_jis']:
            try:
                df = pd.read_csv(file_path, encoding=encoding)
                break
            except UnicodeDecodeError:
                continue
        
        # 列名を自動検出
        if date_col is None:
            date_candidates = ['日付', 'date', 'Date', '日時', 'datetime']
            for c in date_candidates:
                if c in df.columns:
                    date_col = c
                    break
        
        if sales_col is None:
            sales_candidates = ['売上', 'sales', 'Sales', '売上金額', 'revenue']
            for c in sales_candidates:
                if c in df.columns:
                    sales_col = c
                    break
        
        if date_col is None or sales_col is None:
            return {
                "success": False, 
                "error": f"列が見つかりません。利用可能な列: {df.columns.tolist()}"
            }
        
        # 日付変換
        df[date_col] = pd.to_datetime(df[date_col])
        df['weekday'] = df[date_col].dt.weekday  # 0=月曜
        df['month'] = df[date_col].dt.month
        df['day'] = df[date_col].dt.day
        
        # ===== 曜日係数 (SAT's Momentum Peaks Index) =====
        # Scale: 1-5 based on actual base index data
        weekday_factor = {
            0: 2,  # 月曜 (閑散)
            1: 2,  # 火曜
            2: 2,  # 水曜
            3: 3,  # 木曜 (週末準備)
            4: 4,  # 金曜 (週末需要開始)
            5: 5,  # 土曜 (最大需要)
            6: 4   # 日曜 (週末需要)
        }
        df['weekday_factor'] = df['weekday'].map(weekday_factor)
        
        # ===== 月別季節係数 (SAT's Momentum Peaks Index) =====
        # Scale: 1-5 based on 藻岩山 base index data
        season_index = {
            1: 2,   # 1月: お正月 / お正月明け反動
            2: 3,   # 2月: 雪まつり / 冬の出控え
            3: 3,   # 3月: 春・雪解け
            4: 1,   # 4月: 春・GW準備 / 運休期間
            5: 3,   # 5月: GW / GW明け反動
            6: 4,   # 6月: 初夏・新緑・よさこい・神宮祭
            7: 5,   # 7月: 夏・ビアガーデン・PMF・花火
            8: 5,   # 8月: 夏休み・北海道マラソン
            9: 5,   # 9月: オータムフェスト
            10: 5,  # 10月: 秋・紅葉
            11: 3,  # 11月: ホワイトイルミネーション / 端境期
            12: 5   # 12月: クリスマス・イルミネーション
        }
        df['season_factor'] = df['month'].map(season_index)
        
        # ===== イベントブースト =====
        def event_boost(row):
            m, d = row['month'], row['day']
            boost = 0
            # GW (4/29-5/5): +1
            if (m == 4 and d >= 29) or (m == 5 and d <= 5):
                boost += 1
            # 雪まつり (2/4-2/11): +1
            if m == 2 and 4 <= d <= 11:
                boost += 1
            # お盆 (8/10-8/16): +1
            if m == 8 and 10 <= d <= 16:
                boost += 1
            # 年末年始 (12/28-1/3): +1
            if (m == 12 and d >= 28) or (m == 1 and d <= 3):
                boost += 1
            # オータムフェスト (9月中旬-10月上旬): +0.5
            if m == 9 and d >= 10:
                boost += 0.5
            return boost
        
        df['event_boost'] = df.apply(event_boost, axis=1)
        
        # ===== 売上の相対値（0-100スケール）→ 来場者指数の代用 =====
        sales_min = df[sales_col].min()
        sales_max = df[sales_col].max()
        # 来場者指数相当（1-5スケール）
        df['visitor_factor'] = 1 + ((df[sales_col] - sales_min) / (sales_max - sales_min)) * 4
        
        # ===== モメンタム計算 (SAT's TOTAL拠点指数) =====
        # TOTAL = (①季節指数 + ②曜日指数 + ③来場者指数) / 3 + イベントブースト
        df['momentum_raw'] = (df['season_factor'] + df['weekday_factor'] + df['visitor_factor']) / 3 + df['event_boost']
        
        # 0-100にスケーリング（5段階を100点満点に変換）
        # 最大値は約5+1(event) = 6、最小値は約1
        df['momentum'] = ((df['momentum_raw'] - 1) / 5) * 100
        df['momentum'] = df['momentum'].clip(0, 100).round(1)
        
        # ===== 分析結果 =====
        result = {
            "success": True,
            "file": os.path.basename(file_path),
            "period": {
                "start": df[date_col].min().strftime('%Y-%m-%d'),
                "end": df[date_col].max().strftime('%Y-%m-%d'),
                "days": len(df)
            },
            "momentum_stats": {
                "mean": round(df['momentum'].mean(), 1),
                "min": round(df['momentum'].min(), 1),
                "max": round(df['momentum'].max(), 1),
                "std": round(df['momentum'].std(), 1)
            },
            "weekday_average": {
                "月曜": round(df[df['weekday']==0]['momentum'].mean(), 1),
                "火曜": round(df[df['weekday']==1]['momentum'].mean(), 1),
                "水曜": round(df[df['weekday']==2]['momentum'].mean(), 1),
                "木曜": round(df[df['weekday']==3]['momentum'].mean(), 1),
                "金曜": round(df[df['weekday']==4]['momentum'].mean(), 1),
                "土曜": round(df[df['weekday']==5]['momentum'].mean(), 1),
                "日曜": round(df[df['weekday']==6]['momentum'].mean(), 1)
            },
            "peak_days": df.nlargest(5, 'momentum')[[date_col, sales_col, 'momentum']].to_dict('records'),
            "low_days": df.nsmallest(5, 'momentum')[[date_col, sales_col, 'momentum']].to_dict('records')
        }
        
        # 日付をstring化
        for item in result['peak_days']:
            item[date_col] = item[date_col].strftime('%Y-%m-%d')
        for item in result['low_days']:
            item[date_col] = item[date_col].strftime('%Y-%m-%d')
        
        return result
        
    except Exception as e:
        return {"success": False, "error": str(e)}


def main():
    if len(sys.argv) < 2:
        print("Usage: python momentum_calculator.py <sales_csv> [date_col] [sales_col]")
        sys.exit(1)
    
    file_path = sys.argv[1]
    date_col = sys.argv[2] if len(sys.argv) > 2 else None
    sales_col = sys.argv[3] if len(sys.argv) > 3 else None
    
    result = calculate_momentum(file_path, date_col, sales_col)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
