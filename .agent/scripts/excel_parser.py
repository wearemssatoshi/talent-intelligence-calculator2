#!/usr/bin/env python3
"""
Excel/CSV Parser for Anti-Gravity Skills
=========================================
売上データ、シフト情報、在庫データなどをJSON形式で読み込む。

Usage:
    python excel_parser.py <file_path> [sheet_name]
    
Examples:
    python excel_parser.py sales_2025.xlsx
    python excel_parser.py staff_data.csv
    python excel_parser.py workbook.xlsx "Sheet2"
"""

import sys
import json
import os

def parse_file(file_path: str, sheet_name: str = None) -> dict:
    """Excel/CSVファイルを読み込んでJSON形式で返す"""
    
    if not os.path.exists(file_path):
        return {"success": False, "error": f"ファイルが見つかりません: {file_path}"}
    
    try:
        import pandas as pd
    except ImportError:
        return {"success": False, "error": "pandasがインストールされていません。pip install pandas openpyxl xlrd を実行してください。"}
    
    try:
        ext = os.path.splitext(file_path)[1].lower()
        
        if ext == '.csv':
            # CSV: エンコーディングを自動検出
            for encoding in ['utf-8', 'cp932', 'shift_jis', 'euc_jp']:
                try:
                    df = pd.read_csv(file_path, encoding=encoding)
                    break
                except UnicodeDecodeError:
                    continue
            else:
                return {"success": False, "error": "CSVのエンコーディングを検出できませんでした"}
        
        elif ext in ['.xlsx', '.xls']:
            # Excel: シート名指定可能
            if sheet_name:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
            else:
                df = pd.read_excel(file_path)
        else:
            return {"success": False, "error": f"未対応のファイル形式: {ext}"}
        
        # データを整形
        result = {
            "success": True,
            "file": os.path.basename(file_path),
            "columns": df.columns.tolist(),
            "rows": len(df),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "summary": {},
            "data": []
        }
        
        # 数値列のサマリー統計
        numeric_cols = df.select_dtypes(include=['number']).columns
        for col in numeric_cols:
            result["summary"][col] = {
                "min": float(df[col].min()) if not pd.isna(df[col].min()) else None,
                "max": float(df[col].max()) if not pd.isna(df[col].max()) else None,
                "mean": float(df[col].mean()) if not pd.isna(df[col].mean()) else None,
                "sum": float(df[col].sum()) if not pd.isna(df[col].sum()) else None
            }
        
        # データ本体（NaNをNoneに変換）
        result["data"] = df.where(pd.notnull(df), None).to_dict(orient='records')
        
        return result
        
    except Exception as e:
        return {"success": False, "error": str(e)}


def main():
    if len(sys.argv) < 2:
        print("Usage: python excel_parser.py <file_path> [sheet_name]")
        sys.exit(1)
    
    file_path = sys.argv[1]
    sheet_name = sys.argv[2] if len(sys.argv) > 2 else None
    
    result = parse_file(file_path, sheet_name)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
