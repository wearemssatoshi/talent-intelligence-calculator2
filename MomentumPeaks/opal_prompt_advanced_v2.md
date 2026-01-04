# Prompt for Google Opal (Advanced Version)

**⚠️ 重要: このプロンプトは、複雑なデータ構造（店舗×セグメント）を扱うための高度なバージョンです。**

---

### 📋 Opalへの指示プロンプト v2

```text
タイトル: SVD Momentum Peaks System (Advanced)

このアプリは、SVDグループの全店舗における、セグメント別（ランチ、ディナー、BAR、宴会、婚礼）の精緻な売上・環境データを入力し、自動的に「Momentum Peaks」データベースを構築するシステムです。

【データ構造の定義】
1. **拠点と店舗**
   - **MOIWA**: JW (The Jewels), TO (Takeout)
   - **TV_TOWER**: GA (Garden), BG (Beer Garden), BAR
   - **OKURAYAMA**: NP (Nouvelle Pousse), Ce (Cafe), Rp
   - **AKARENGA**: BQ (La Brique), RYB (Yotei Buta)

2. **セグメント**
   各店舗で以下のセグメントが発生します：
   - LUNCH, DINNER, BAR, BANQUET, WEDDING

【アプリの挙動】
1. **ユーザー入力フロー**
   Step 1: **日付** と **拠点** を選択（例: TV_TOWER）
   Step 2: **拠点来場者数** を入力（これは拠点単位で1つ）
   Step 3: 選択した拠点に紐づく**店舗**を選択（例: GA）
   Step 4: その店舗の**稼働セグメント**を複数選択（例: Lunch, Dinner, Wedding）
   Step 5: 選択した各セグメントについて、順番に以下を聞く：
     - 売上
     - 客数
     - 天候（セグメントごとに変わる可能性があるため）
     - 特記事項

2. **データ蓄積（Google Sheets）**
   入力データは以下の2つのシートに分けて保存してください：
   - **Sheet A (Summary)**: 日付、拠点、拠点来場者数、全店合計売上
   - **Sheet B (Segment Detail)**: 日付、店舗名、セグメント名、売上、客数、天気

3. **Momentum Peaksの自動計算**
   入力完了後、過去の同条件（曜日、天気、シーズン）の平均データと比較し、
   「今日のMomentum Score（勢い指数）」を1.0〜5.0で算出して表示してください。

4. **デザイン**
   プロフェッショナルな業務アプリとして、情報の視認性を最優先したダークモード基調のデザインにしてください。
```
