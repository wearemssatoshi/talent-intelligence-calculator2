


import csv
from collections import defaultdict
from decimal import Decimal

# 集計対象のCSVファイルの絶対パス
CSV_FILE_PATH = '/Users/satoshiiga/dotfiles/beergarden_laber.csv'
# 出力先のCSVファイルの絶対パス
OUTPUT_CSV_PATH = '/Users/satoshiiga/dotfiles/labor_summary.csv'

def summarize_labor_costs():
    # 日付をキーとして、各数値を格納する辞書を準備
    daily_summary = defaultdict(lambda: {
        '実働時間': Decimal('0.0'),
        '合計報酬額': Decimal('0'),
        '利用料': Decimal('0'),
        '消費税': Decimal('0'),
    })

    try:
        # 文字コードを 'utf-8-sig' にして、BOM付きファイルに対応
        with open(CSV_FILE_PATH, mode='r', encoding='utf-8-sig') as infile:
            reader = csv.DictReader(infile)
            
            for row in reader:
                date = row.get('求人日')
                
                # 日付や必須項目がない行はスキップ
                if not date or not row.get('実働時間') or not row.get('合計報酬額'):
                    continue

                try:
                    # Decimal型を使い、小数点計算の精度を担保
                    actual_hours = Decimal(row['実働時間'])
                    total_reward = Decimal(row['合計報酬額'])
                    usage_fee = Decimal(row['利用料'])
                    # カラム名が「消費税（参考値）」であることに注意
                    tax = Decimal(row['消費税（参考値）'])

                    summary = daily_summary[date]
                    summary['実働時間'] += actual_hours
                    summary['合計報酬額'] += total_reward
                    summary['利用料'] += usage_fee
                    summary['消費税'] += tax

                except (ValueError, TypeError):
                    # 数値に変換できないデータはスキップ
                    continue

    except FileNotFoundError:
        print(f"エラー: ファイルが見つかりません。パスを確認してください: {CSV_FILE_PATH}")
        return
    except Exception as e:
        print(f"予期せぬエラーが発生しました: {e}")
        return

    # --- ここからが出力処理 ---
    try:
        with open(OUTPUT_CSV_PATH, mode='w', encoding='utf-8', newline='') as outfile:
            writer = csv.writer(outfile)

            # ヘッダーを書き込む
            writer.writerow(["日付", "合計実働時間", "合計報酬額", "合計利用料", "合計消費税"])

            # 日付順にソートして書き込む
            for date, data in sorted(daily_summary.items()):
                writer.writerow([
                    date,
                    f"{data['実働時間']:.2f}",
                    data['合計報酬額'],
                    data['利用料'],
                    data['消費税']
                ])
        print(f"集計結果を {OUTPUT_CSV_PATH} に保存しました。")

    except Exception as e:
        print(f"ファイル書き出し中にエラーが発生しました: {e}")

if __name__ == "__main__":
    summarize_labor_costs()
