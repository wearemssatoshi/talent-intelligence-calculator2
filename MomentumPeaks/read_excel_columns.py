import pandas as pd
import os

file_path = '/Users/satoshiiga/dotfiles/SVD_Gemini_R7Budget/Momentum Peaks拠点定指数解説.xlsx'

try:
    xl = pd.ExcelFile(file_path)
    sheet_name = xl.sheet_names[0] 
    df = xl.parse(sheet_name, header=None)
    
    # Rows 4-15
    # Let's print columns 0 to 15 to find where the 1-5 score is
    print("Extracting Monthly Data (Columns 0-15) from Rows 4-15...")
    target_data = df.iloc[4:16, 0:16]
    print(target_data.to_markdown())

except Exception as e:
    print(f"Error: {e}")
