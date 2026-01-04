import pandas as pd
import os

file_path = '/Users/satoshiiga/dotfiles/SVD_Gemini_R7Budget/Momentum Peaks拠点定指数解説.xlsx'

try:
    xl = pd.ExcelFile(file_path)
    sheet_name = xl.sheet_names[0] # First sheet seems to have the explanation
    print(f"Reading Sheet: {sheet_name}")
    
    df = xl.parse(sheet_name, header=None) # No header to see raw layout
    
    # Print first 30 rows, first 10 columns
    print(df.iloc[:30, :10].to_markdown())
        
except Exception as e:
    print(f"Error: {e}")
