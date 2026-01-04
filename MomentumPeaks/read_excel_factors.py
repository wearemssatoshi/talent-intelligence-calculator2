import pandas as pd
import os

file_path = '/Users/satoshiiga/dotfiles/SVD_Gemini_R7Budget/Momentum Peaks拠点定指数解説.xlsx'

try:
    xl = pd.ExcelFile(file_path)
    sheet_name = xl.sheet_names[0] 
    print(f"Reading Sheet: {sheet_name}")
    
    df = xl.parse(sheet_name, header=None)
    
    # Print rows 29-45, first 5 columns to read the definitions
    print(df.iloc[29:45, :5].to_markdown())
        
except Exception as e:
    print(f"Error: {e}")
