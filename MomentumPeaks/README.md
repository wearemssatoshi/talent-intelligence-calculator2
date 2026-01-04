# SVD Momentum Peaks Daily Workflow Setup Guide

## 🚀 クイックスタート

### Step 1: Google Sheetsを作成
1. [Google Sheets](https://sheets.google.com/)にアクセス
2. 「新規」→「空のスプレッドシート」
3. 名前を「SVD_Momentum_Peaks_Daily」に変更

### Step 2: Apps Scriptを開く
1. 上部メニュー「拡張機能」→「Apps Script」
2. 新しいタブが開く

### Step 3: スクリプトを貼り付け
1. `setup_form.gs` の内容をコピー
2. Apps Scriptエディタに貼り付け
3. 「保存」（Ctrl+S）

### Step 4: 実行
1. 関数セレクタで `createMomentumPeaksForm` を選択
2. 「実行」ボタンをクリック
3. 初回は認証を求められます → 「許可」

### Step 5: 完成！
- フォームURLが `Info` シートに記録されます
- そのURLをブックマーク or ホーム画面に追加

---

## 📱 毎日のルーティン

1. フォームを開く
2. 拠点を選択
3. 日付・客数・売上を入力
4. 送信

→ 自動でスプレッドシートに蓄積！

---

## 📊 データ活用

### ダッシュボード連携（将来）
- 既存の `MomentumPeaks Dashboard` と連携可能
- 毎日のデータをリアルタイム表示

### 拠点一覧
| コード | 店舗名 |
|--------|--------|
| JW | THE JEWELS |
| GA | THE GARDEN SAPPORO |
| NP | ヌーベルプース大倉山 |
| MOIWA | もいわ山 |
| TV_TOWER | さっぽろテレビ塔 |
| AKARENGA_BQ | 赤れんがテラス LA BRIQUE |
| AKARENGA_RYB | 赤れんがテラス ルスツ羊蹄ぶた |
