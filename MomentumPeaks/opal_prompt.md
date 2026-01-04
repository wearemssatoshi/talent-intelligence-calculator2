# Prompt for Google Opal

Google Opal（Google LabsのノーコードAIツール）でアプリを作成する際は、以下のプロンプトをチャット欄に貼り付けてください。

---

### 📋 Opalへの指示プロンプト

```text
タイトル: SVD Momentum Peaks Daily

このアプリは、札幌のレストラン・観光施設（SVDグループ）の店長が、毎日の営業実績を入力するためのツールです。

【機能要件】
1. ユーザーに以下の情報を順番に聞いてください：
   - 拠点（選択肢:MOIWAYMA_JW,MOIWAYAMA_JW_TO,TV_TOWER_GA,TV_TOWER_BG,TV_TOWER_BAR,OKURAYAMA_NP,OKURAYAMA_Ce,OKURAYAMA_Rp,AKARENGA_BQ,AKARENGA_RYBから選ばせる）
   - 日付（デフォルトは今日）
   - 実績客数（数字のみ）
   - 実績売上（数字のみ）
   - 天候（晴れ/曇り/雨/雪）
   - 特記事項（あれば）

2. 入力されたデータを、Google Sheets「SVD_Momentum_Peaks_Daily」に新しい行として追加してください。
   (シートの列: A=Timestamp, B=拠点, C=日付, D=客数, E=売上, F=天候, G=特記事項)

3. 入力完了後、入力された客数と売上に応じて、店長を労うポジティブなメッセージ（例：「お疲れ様です！素晴らしい成果です！」など）を表示してください。

4. アプリの見た目は、SAPPORO VIEWTIFUL DININGのブランドに合わせて、高級感のあるシンプルで美しいデザインにしてください。
```

---

### 💡 ヒント
- Opalが「Google Sheetsと連携しますか？」と聞いてきたら、**許可**してください。
- 最初に連携するスプレッドシートを選択（または新規作成）する必要があります。
