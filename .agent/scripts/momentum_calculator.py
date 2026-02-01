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
        
        # ===== 曜日係数 =====
        weekday_factor = {
            0: 0.7,  # 月曜
            1: 0.7,  # 火曜
            2: 0.8,  # 水曜
            3: 0.85, # 木曜
            4: 1.0,  # 金曜
            5: 1.3,  # 土曜
            6: 1.2   # 日曜
        }
        df['weekday_factor'] = df['weekday'].map(weekday_factor)
        
        # ===== 季節係数 =====
        def season_factor(row):
            m, d = row['month'], row['day']
            # GW (4/29-5/5)
            if (m == 4 and d >= 29) or (m == 5 and d <= 5):
                return 1.5
            # お盆 (8/10-8/16)
            if m == 8 and 10 <= d <= 16:
                return 1.4
            # 年末年始 (12/28-1/3)
            if (m == 12 and d >= 28) or (m == 1 and d <= 3):
                return 1.4
            # 春休み・夏休み
            if m in [3, 7, 8]:
                return 1.1
            # 閑散期
            if m in [1, 2, 6]:
                return 0.8
            return 1.0
        
        df['season_factor'] = df.apply(season_factor, axis=1)
        
        # ===== 売上の相対値（0-100スケール）=====
        sales_min = df[sales_col].min()
        sales_max = df[sales_col].max()
        df['sales_normalized'] = ((df[sales_col] - sales_min) / (sales_max - sales_min)) * 100
        
        # ===== モメンタム計算 =====
        # 基本: 売上相対値 × 曜日係数 × 季節係数
        df['momentum_raw'] = df['sales_normalized'] * df['weekday_factor'] * df['season_factor']
        
        # 0-100にスケーリング
        mom_min = df['momentum_raw'].min()
        mom_max = df['momentum_raw'].max()
        df['momentum'] = ((df['momentum_raw'] - mom_min) / (mom_max - mom_min)) * 100
        df['momentum'] = df['momentum'].round(1)
        
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
