import pandas as pd
import os

file_path = '/Users/satoshiiga/dotfiles/SVD_Gemini_R7Budget/Momentum Peaks拠点定指数解説.xlsx'

try:
    xl = pd.ExcelFile(file_path)
    sheet_name = xl.sheet_names[0] 
    df = xl.parse(sheet_name, header=None)
    
    # Based on previous output (Step 546), lines 4-15 seem to be the monthly table
    # Columns:
    # 0 = Month (sort of, 4, 5, 6...)
    # 2 = Event/Season description
    # 7 = Seasonal Index (KEY FACTOR 1-1)
    # 8 = Visitor Index (KEY FACTOR 1-3) 
    # Let's verify columns 7 and 8
    
    print("Extracting Monthly Indices from Rows 4-15...")
    target_data = df.iloc[4:16, [0, 2, 7, 8]]
    target_data.columns = ['Month', 'Event/Description', 'Seasonal_Index', 'Visitor_Index']
    print(target_data.to_markdown())

except Exception as e:
    print(f"Error: {e}")
