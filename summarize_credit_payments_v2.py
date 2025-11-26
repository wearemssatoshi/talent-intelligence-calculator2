
import pandas as pd
import glob
import os

def summarize_credit_card_data_v2(input_dir, output_file, start_date, end_date):
    """
    Credit card summary CSV filesを読み込み、指定された期間で集計し、
    店舗別、月別、ブランド別のサマリーを新しいCSVファイルに出力する。
    V2: ブランド名の正規化と合算処理を追加
    """
    # CSVファイルへのパスを取得
    files = glob.glob(os.path.join(input_dir, 'Credit_Card_Summary_Daily_List*.csv'))
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

    # --- ブランド名の正規化と合算処理 ---
    
    # 1. AMEXとアメリカン・エキスプレスを統一
    df_melted['ブランド'] = df_melted['ブランド'].replace('AMEX', 'アメリカン・エキスプレス')

    # 2. クレジットとクレジットカードを「その他クレジット」に統一
    df_melted['ブランド'] = df_melted['ブランド'].replace(['クレジット', 'クレジットカード'], 'その他クレジット')

    # 3. Visa,Mastercardを分割して加算
    # VIsa,MasterCardの売上を抽出し、元のDataFrameからは削除
    visa_master_sales = df_melted[df_melted['ブランド'] == 'VIsa,MasterCard'].copy()
    df_melted = df_melted[df_melted['ブランド'] != 'VIsa,MasterCard']
    
    if not visa_master_sales.empty:
        # 売上を半分にする
        visa_master_sales['売上金額'] /= 2
        
        # VISAとMasterCardのデータを作成
        visa_sales = visa_master_sales.copy()
        visa_sales['ブランド'] = 'VISA'
        
        master_sales = visa_master_sales.copy()
        master_sales['ブランド'] = 'MasterCard'
        
        # 元のDataFrameに結合
        df_melted = pd.concat([df_melted, visa_sales, master_sales], ignore_index=True)

    # --- 集計 ---
    
    # ブランドごとの合計を計算してから、全体の集計を行う
    df_processed = df_melted.groupby(['店舗名', '営業日', 'ブランド'])['売上金額'].sum().reset_index()

    store_summary = df_processed.groupby('店舗名')['売上金額'].sum().reset_index()
    store_total = pd.DataFrame([{'店舗名': '店舗合計', '売上金額': store_summary['売上金額'].sum()}])
    store_summary = pd.concat([store_summary, store_total], ignore_index=True)

    monthly_summary = df_processed.set_index('営業日').resample('ME')['売上金額'].sum().reset_index()
    monthly_summary['営業日'] = monthly_summary['営業日'].dt.strftime('%Y-%m')
    monthly_total = pd.DataFrame([{'営業日': '月別合計', '売上金額': monthly_summary['売上金額'].sum()}])
    monthly_summary = pd.concat([monthly_summary, monthly_total], ignore_index=True)
    monthly_summary.rename(columns={'営業日': '年月'}, inplace=True)
    monthly_summary['年月'] = pd.to_datetime(monthly_summary['年月'], format='%Y-%m', errors='coerce')
    monthly_summary = monthly_summary.sort_values(by='年月').reset_index(drop=True)
    monthly_summary['年月'] = monthly_summary['年月'].dt.strftime('%Y-%m')

    brand_summary = df_processed.groupby('ブランド')['売上金額'].sum().reset_index()
    brand_total = pd.DataFrame([{'ブランド': 'ブランド合計', '売上金額': brand_summary['売上金額'].sum()}])
    brand_summary = pd.concat([brand_summary, brand_total], ignore_index=True)
    
    grand_total = int(df_processed['売上金額'].sum())
    print(f"総合計: {grand_total:,}円")

    # CSVファイルに出力
    output_file_v3 = output_file.replace('.csv', '_v3.csv')
    with open(output_file_v3, 'w', encoding='utf-8-sig', newline='') as f:
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

    print(f"集計が完了し、{output_file_v3} に保存されました。")

if __name__ == '__main__':
    INPUT_DIR = 'payment_all'
    OUTPUT_FILE = 'credit_card_summary_202411-202510.csv'
    START_DATE = '2024-11-01'
    END_DATE = '2025-10-31'
    summarize_credit_card_data_v2(INPUT_DIR, OUTPUT_FILE, START_DATE, END_DATE)
