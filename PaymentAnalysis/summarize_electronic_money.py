

import pandas as pd
import glob
import os

def summarize_electronic_money_data(input_dir, output_file, start_date, end_date):
    """
    Electronic money summary CSV filesを読み込み、指定された期間で集計し、
    店舗別、月別、ブランド別のサマリーを新しいCSVファイルに出力する。
    """
    # CSVファイルへのパスを取得
    files = glob.glob(os.path.join(input_dir, 'Elecronic_Money_Summary_Daily_List*.csv'))
    if not files:
        print("エラー: 対象のCSVファイルが見つかりません。")
        return

    # 全てのCSVファイルを読み込み、一つのDataFrameに結合
    df_list = []
    for file in files:
        df_list.append(pd.read_csv(file, encoding='utf-8', na_values=['-']))
    df = pd.concat(df_list, ignore_index=True)

    # '営業日'をdatetime型に変換
    df['営業日'] = pd.to_datetime(df['営業日'], format='%Y%m%d')

    # 指定された期間でデータをフィルタリング
    df = df[(df['営業日'] >= start_date) & (df['営業日'] <= end_date)]

    # データを整形（ワイド形式からロング形式へ）
    id_vars = ['店舗コード', '店舗名', '直営店/フランチャイズ', '営業日']
    value_vars = [col for col in df.columns if '(売上金額)' in col]
    
    df_melted = df.melt(id_vars=id_vars, value_vars=value_vars, var_name='ブランド', value_name='売上金額')

    # ブランド名をクリーンアップ
    df_melted['ブランド'] = df_melted['ブランド'].str.replace('(売上金額)', '', regex=False)
    
    # '売上金額'を数値に変換
    df_melted['売上金額'] = pd.to_numeric(df_melted['売上金額'].replace('[￥,]', '', regex=True), errors='coerce').fillna(0)

    # --- 集計 ---
    store_summary = df_melted.groupby('店舗名')['売上金額'].sum().reset_index()
    store_total = pd.DataFrame([{'店舗名': '店舗合計', '売上金額': store_summary['売上金額'].sum()}])
    store_summary = pd.concat([store_summary, store_total], ignore_index=True)

    monthly_summary = df_melted.set_index('営業日').resample('ME')['売上金額'].sum().reset_index()
    monthly_summary['営業日'] = monthly_summary['営業日'].dt.strftime('%Y-%m')
    monthly_total = pd.DataFrame([{'営業日': '月別合計', '売上金額': monthly_summary['売上金額'].sum()}])
    monthly_summary = pd.concat([monthly_summary, monthly_total], ignore_index=True)
    monthly_summary.rename(columns={'営業日': '年月'}, inplace=True)
    monthly_summary['年月'] = pd.to_datetime(monthly_summary['年月'], format='%Y-%m', errors='coerce')
    monthly_summary = monthly_summary.sort_values(by='年月').reset_index(drop=True)
    monthly_summary['年月'] = monthly_summary['年月'].dt.strftime('%Y-%m')


    brand_summary = df_melted.groupby('ブランド')['売上金額'].sum().reset_index()
    brand_total = pd.DataFrame([{'ブランド': 'ブランド合計', '売上金額': brand_summary['売上金額'].sum()}])
    brand_summary = pd.concat([brand_summary, brand_total], ignore_index=True)
    
    grand_total = int(df_melted['売上金額'].sum())
    print(f"総合計: {grand_total:,}円")

    # CSVファイルに出力 (Excelでの文字化け対策のため utf-8-sig を使用)
    with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
        f.write("店舗別サマリー\n")
        store_summary.to_csv(f, index=False)
        f.write("\n")
        
        f.write("月別サマリー\n")
        monthly_summary.to_csv(f, index=False)
        f.write("\n")

        f.write("ブランド別サマリー\n")
        brand_summary.to_csv(f, index=False)
        f.write("\n")
        
        f.write(f"総合計,{grand_total:,}\n")

    print(f"集計が完了し、{output_file} に保存されました。")

if __name__ == '__main__':
    INPUT_DIR = 'payment_all'
    OUTPUT_FILE = 'electronic_money_summary_202411-202510.csv'
    START_DATE = '2024-11-01'
    END_DATE = '2025-10-31'
    summarize_electronic_money_data(INPUT_DIR, OUTPUT_FILE, START_DATE, END_DATE)
