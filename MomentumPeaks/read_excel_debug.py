import pandas as pd
import os
import sys

# Try to find the file
search_path = '/Users/satoshiiga/dotfiles/SVD_Gemini_R7Budget/Momentum Peaks拠点定指数解説.xlsx'

if not os.path.exists(search_path):
    print(f"File not found at: {search_path}")
    # Fallback search
    for root, dirs, files in os.walk('/Users/satoshiiga/dotfiles'):
        for file in files:
            if file.endswith('.xlsx') and 'Momentum' in file:
                print(f"Found candidate: {os.path.join(root, file)}")
                search_path = os.path.join(root, file)
                break

try:
    print(f"Reading: {search_path}")
    xl = pd.ExcelFile(search_path)
    print("Sheets:", xl.sheet_names)
    
    for sheet in xl.sheet_names:
        print(f"\n========== SHEET: {sheet} ==========")
        df = xl.parse(sheet)
        # Print first 50 rows to capture enough context
        print(df.head(50).to_string())
        
except Exception as e:
    print(f"Error reading excel: {e}")
    # Check if openpyxl is missing
    try:
        import openpyxl
        print("openpyxl is installed")
    except ImportError:
        print("openpyxl is NOT installed")
