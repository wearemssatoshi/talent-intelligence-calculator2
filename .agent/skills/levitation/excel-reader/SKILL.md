# Excel Reader Skill

Excel/CSVファイルを読み込み、データをJSON形式で返すスキル。

## 用途
- 売上データの読み込み
- スタッフシフト情報の取得
- 在庫データの解析
- モメンタムピークス計算用データ

## 使用方法

### 1. Pythonスクリプトを実行
```bash
python .agent/scripts/excel_parser.py <ファイルパス> [シート名]
```

### 2. 出力形式
```json
{
  "success": true,
  "columns": ["日付", "売上", "客数"],
  "rows": 365,
  "data": [...]
}
```

## 対応形式
- `.xlsx` (Excel)
- `.xls` (旧Excel)
- `.csv` (CSV)

## 依存関係
```bash
pip install pandas openpyxl xlrd
```
