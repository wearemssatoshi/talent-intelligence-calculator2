
import pandas as pd
import glob
import os

def generate_store_detailed_summary_final(input_dir, output_file, start_date, end_date):
    """
    クレジットカードと電子マネーのデータを正しく集計し、店舗ごとに
    月別・カテゴリ別の詳細なサマリーを一つのCSVファイルに出力する（修正版）。
    """
    # --- 1. データ読み込みと前処理 (整合性チェックで検証済みのロジック) ---
    
    credit_files = glob.glob(os.path.join(input_dir, 'Credit_Card_Summary_Daily_List*.csv'))
    emoney_files = glob.glob(os.path.join(input_dir, 'Elecronic_Money_Summary_Daily_List*.csv'))

    if not credit_files and not emoney_files:
        print("エラー: 集計対象のデータがありません。")
        return

    df_credit = pd.concat([pd.read_csv(f, encoding='utf-8', na_values=['-']) for f in credit_files], ignore_index=True) if credit_files else pd.DataFrame()
    df_emoney = pd.concat([pd.read_csv(f, encoding='utf-8', na_values=['-']) for f in emoney_files], ignore_index=True) if emoney_files else pd.DataFrame()
    
    df_all = pd.concat([df_credit, df_emoney], ignore_index=True)
    df_all['営業日'] = pd.to_datetime(df_all['営業日'], format='%Y%m%d')
    df_all = df_all[(df_all['営業日'] >= start_date) & (df_all['営業日'] <= end_date)]

    id_vars = ['店舗コード', '店舗名', '直営店/フランチャイズ', '営業日']
    value_vars = [col for col in df_all.columns if '(売上金額)' in col]
    df_melted = df_all.melt(id_vars=id_vars, value_vars=value_vars, var_name='ブランド', value_name='売上金額')

    df_melted['ブランド'] = df_melted['ブランド'].str.replace('(売上金額)', '', regex=False)
    df_melted['売上金額'] = pd.to_numeric(df_melted['売上金額'].replace('[￥,]', '', regex=True), errors='coerce').fillna(0)

    df_melted['ブランド'] = df_melted['ブランド'].replace('AMEX', 'アメリカン・エキスプレス')
    df_melted['ブランド'] = df_melted['ブランド'].replace(['クレジット', 'クレジットカード'], 'その他クレジット')
    
    visa_master_sales = df_melted[df_melted['ブランド'] == 'VIsa,MasterCard'].copy()
    if not visa_master_sales.empty:
        df_melted = df_melted[df_melted['ブランド'] != 'VIsa,MasterCard']
        visa_master_sales['売上金額'] /= 2
        visa_sales = visa_master_sales.copy()
        visa_sales['ブランド'] = 'VISA'
        master_sales = visa_master_sales.copy()
        master_sales['ブランド'] = 'MasterCard'
        df_melted = pd.concat([df_melted, visa_sales, master_sales], ignore_index=True)

    # --- 2. 店舗ごとに集計してファイル出力 ---
    
    unique_stores = df_melted['店舗名'].unique()
    
    with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
        for store_name in sorted(unique_stores):
            f.write(f"■店舗名: {store_name}\n")
            
            store_df = df_melted[df_melted['店舗名'] == store_name]
            
            # 月別サマリー
            monthly_summary = store_df.set_index('営業日').resample('ME')['売上金額'].sum().reset_index()
            monthly_summary.rename(columns={'営業日': '年月', '売上金額': '月間合計'}, inplace=True)
            monthly_summary['年月'] = monthly_summary['年月'].dt.strftime('%Y-%m')
            
            f.write("月別サマリー\n")
            monthly_summary.to_csv(f, index=False)
            f.write("\n")

            # カテゴリ別サマリー
            brand_summary = store_df.groupby('ブランド')['売上金額'].sum().reset_index()
            brand_summary = brand_summary[brand_summary['売上金額'] > 0].sort_values(by='売上金額', ascending=False)
            brand_summary.rename(columns={'売上金額': 'ブランド合計'}, inplace=True)

            f.write("カテゴリ別サマリー\n")
            brand_summary.to_csv(f, index=False)
            f.write("\n")

            # 店舗合計
            store_total = store_df['売上金額'].sum()
            f.write(f"店舗合計,{int(store_total):,}\n")
            f.write("\n\n")

        # 最終的な総合計を、処理済みの全データから計算して追記
        grand_total = df_melted['売上金額'].sum()
        f.write(f"■総合計,{int(grand_total):,}\n")

    print(f"修正版の詳細サマリーが完了し、{output_file} に保存されました。")


if __name__ == '__main__':
    INPUT_DIR = 'payment_all'
    OUTPUT_FILE = 'store_detailed_summary_final.csv'
    START_DATE = '2024-11-01'
    END_DATE = '2025-10-31'
    generate_store_detailed_summary_final(INPUT_DIR, OUTPUT_FILE, START_DATE, END_DATE)
