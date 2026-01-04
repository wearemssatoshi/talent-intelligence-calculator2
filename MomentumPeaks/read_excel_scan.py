import pandas as pd
import os

file_path = '/Users/satoshiiga/dotfiles/SVD_Gemini_R7Budget/Momentum Peaks拠点定指数解説.xlsx'

try:
    xl = pd.ExcelFile(file_path)
    sheet_name = xl.sheet_names[0] 
    df = xl.parse(sheet_name, header=None)
    
    # Iterate to find keywords and print surrounding context
    keywords = ['月', '季節指数', '来場者指数', '曜日指数']
    
    print(f"Scanning sheet: {sheet_name} for tables...")
    
    # Convert to string to search
    df_str = df.astype(str)
    
    found_rows = set()
    for i, row in df_str.iterrows():
        row_content = " ".join(row.values)
        if any(k in row_content for k in keywords):
            # If keyword found, mark this row and a few after it
            for r in range(i, min(i + 15, len(df))):
                found_rows.add(r)
                
    # Sort and print the rows
    sorted_rows = sorted(list(found_rows))
    
    if sorted_rows:
        print(f"Found {len(sorted_rows)} relevant rows. Printing content:")
        # Group by contiguous blocks
        if len(sorted_rows) > 0:
            current_block_start = sorted_rows[0]
            prev_row = sorted_rows[0]
            
            for r in sorted_rows[1:] + [None]: # Add None to flush last block
                if r is None or r > prev_row + 1:
                    # Print block
                    print(f"\n--- Block: Rows {current_block_start} to {prev_row} ---")
                    print(df.iloc[current_block_start:prev_row+1].to_markdown())
                    if r is not None:
                        current_block_start = r
                prev_row = r
    else:
        print("No specific tables found with keywords.")

except Exception as e:
    print(f"Error: {e}")
