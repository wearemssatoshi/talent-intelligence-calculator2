# Prompt for Google Opal (Final Structure)

このプロンプトをOpalに貼り付けると、定義された**全4拠点・全チャンネル（セグメント別）**に対応したアプリが作成されます。

---

### 📋 Opalへの指示プロンプト v3

```text
タイトル: SVD Momentum Peaks System (Master)

このアプリは、SVDグループの全4拠点における、各チャンネル・セグメントごとの精緻な売上・環境データを入力するシステムです。

【拠点とチャンネル構造】
以下のリストを厳密に守って選択肢を作成してください。

1. **藻岩山 (MOIWAYAMA)**
   - THE JEWELS [LUNCH, DINNER]
   - JW_TakeOut [ALL]

2. **大倉山 (OKURAYAMA)**
   - NOUVELLE POUSSE OKURAYAMA [LUNCH, DINNER]
   - CELESTÉ [ALL]
   - PEPOS [ALL]

3. **さっぽろテレビ塔 (TV_TOWER)**
   - THE GARDEN SAPPORO HOKKAIDO GRILLE [LUNCH, DINNER]
   - GA_WINEBAR [NIGHT]
   - GA_BANQUET [宴会]
   - BEER GARDEN [SUMMER]

4. **赤れんがテラス (AKARENGA)**
   - LA BRIQUE SAPPORO Akarenga Terrace [LUNCH, DINNER]
   - ルスツ羊蹄ぶた [LUNCH, DINNER]

【アプリの動作フロー】
1. **拠点選択**: まず4つの拠点から1つを選択。
2. **拠点来場者数**: その拠点全体の来場者数を入力（例: ロープウェイ乗車数など）。
3. **チャンネル選択**: 選んだ拠点に紐づくチャンネルのみを表示し、ユーザーに選択させる（複数選択可）。
4. **セグメント入力**:
   - 選択されたチャンネルが [LUNCH, DINNER] などの区分を持つ場合、それぞれの区分について「売上」「客数」「天気」を入力させる。
   - 例: THE JEWELSを選んだら、「ランチ売上/客数/天気」「ディナー売上/客数/天気」を順に入力。
5. **特記事項**: 最後にイベントや特記事項を入力。

【データ保存】
Google Sheetsに以下の形式で保存してください：
- Timestamp
- 拠点名
- 拠点来場者数
- チャンネル名
- セグメント名 (Lunch/Dinner/etc)
- 売上
- 客数
- 天気
- 特記事項
```
