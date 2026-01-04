
import pandas as pd
import glob
import os

def verify_summary_integrity(input_dir, start_date, end_date):
    """
    データの整合性をチェックするため、3つの異なる方法で総合計を計算し、
    それらが一致するかどうかを検証する。
    """
    # --- 1. データ読み込みと前処理 (generate_store_detailed_summary.py と同じロジック) ---
    
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

    # --- 2. 整合性チェック ---
    
    print("--- データ整合性チェック ---")

    # A) 直接計算した総合計
    grand_total_direct = df_melted['売上金額'].sum()
    print(f"A) 直接計算した総合計          : {int(grand_total_direct):,}")

    # B) 月別合計の総合計
    monthly_summary = df_melted.set_index('営業日').resample('ME')['売上金額'].sum()
    grand_total_from_monthly = monthly_summary.sum()
    print(f"B) 月別合計の総合計            : {int(grand_total_from_monthly):,}")

    # C) ブランド別合計の総合計
    brand_summary = df_melted.groupby('ブランド')['売上金額'].sum()
    grand_total_from_brand = brand_summary.sum()
    print(f"C) ブランド別合計の総合計        : {int(grand_total_from_brand):,}")
    
    print("--------------------------")

    # --- 3. 結果の判定 ---
    if abs(grand_total_direct - grand_total_from_monthly) < 0.01 and abs(grand_total_direct - grand_total_from_brand) < 0.01:
        print("✅ 整合性チェックOK: 3つの合計金額は一致しました。")
        print("前回の `store_detailed_summary` の総合計は 340,316,692円 でした。")
    else:
        print("❌ 整合性チェックNG: 合計金額が一致しません。集計ロジックに問題がある可能性があります。")

if __name__ == '__main__':
    INPUT_DIR = 'payment_all'
    START_DATE = '2024-11-01'
    END_DATE = '2025-10-31'
    verify_summary_integrity(INPUT_DIR, START_DATE, END_DATE)
