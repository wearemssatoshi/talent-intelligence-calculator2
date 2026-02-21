# Momentum Peaks — 設計書 v2.0 "Real MP"

> **SAPPORO VIEWTIFUL DINING — 需要予測エンジン**
> Single Source of Truth: Google Spreadsheet (MP_DailySales)
> Last Updated: 2026.02.19

---

## 1. Momentum Peaksとは

SVD全拠点の「**日ごとの需要強度**」を1.00〜5.00のスコアで定量化するシステム。
季節・曜日・過去実績から算出し、シフト計画・売上予測・人時生産性の基盤となる。

### 設計思想: Why Based Approach

```
❌「なんとなく忙しそう」（業界の慣習 — Industry Intuition）
✅「3月の土曜 × 啓蟄 × 過去実績 = MP 3.54」（根拠のある予測 — Proper Forecast）
```

---

## 2. システムアーキテクチャ

```
【データの正】 Google Spreadsheet (MP_DailySales)
    ↑ 初期投入: Excel → CSV → import_csv_to_gas.py → スプシ ✅完了
    ↑ 日常入力: ダッシュボード司令室 → GAS API (save) → スプシ
    ↓
【MP計算】 フロントエンド (app.js) でリアルタイム算出
    ← スプシの蓄積実績データ (5,816 records)
    ← mp_indices.json (KF①: 拠点定数テーブル + 曜日乗数)
    ← restaurant_config.json (店舗設定)
    → mp_point = (KF① + KF② + KF③) / 3
```

### GASデプロイ情報

```
URL: https://script.google.com/macros/s/AKfycbyE_uNfiMB6_szu0D0cQoR8JBgwxXm-3H45DGs6qXLpgiz5kYCxBgg961nqR7RXs1jg/exec
シート: MP_DailySales, MP_AuditLog, MP_Config
投入済み: JW(1065) NP(1036) GA(1065) BQ(304) Ce(1036) RP(1036) RYB(274) = 5,816件
```

---

## 3. MP計算ロジック

### 最終式

```javascript
mp_point = (KF① + KF② + KF③) / 3    // 1.00 ~ 5.00
```

| Factor | 名称 | 性質 | 更新頻度 |
|--------|------|------|----------|
| **KF①** | 拠点定指数 | 環境の"定数" | 四半期に1回 |
| **KF②** | 売上FACTOR | 過去実績の"変数" | データ蓄積で自動変化 |
| **KF③** | 来客FACTOR | 過去実績の"変数" | データ蓄積で自動変化 |

---

### KF①: 拠点定指数 — 2段構造（Real MP v2.0）

**「その日その場所は、環境要因だけで見てどのくらい忙しいか？」**

#### Step 1: 季節ベースを算出（KF①ₛ）

4つの「いつの時期か」を測る指標の平均:

| 層 | 名前 | 区分 | 粒度 | 出典 |
|---|------|------|------|------|
| ① | 月別IDX | 拠点別 | 12ヵ月 | 実績データから算出 |
| ② | 節気別IDX | 拠点別 | 24節気 | 実績データから算出 |
| ③ | 週別IDX | 拠点別 | ISO 52週 | 実績データから算出 |
| ④ | 日別IDX | 全店共通 | 特別日のみ | 祝日・札幌イベント |

```javascript
KF①_seasonal = (月別 + 節気 + 週別 + [日別]) / 3 or 4    // 1.00 ~ 5.00
```

- 算出元: [compute_indices.py](file:///Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/mp_engine/compute_indices.py)
- 定数テーブル: [mp_indices.json](file:///Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/mp_dashboard/mp_indices.json)
- 更新頻度: 3ヶ月に1回（四半期データが蓄積されたら再算出）

#### Step 2: 曜日乗数を適用

```javascript
KF① = KF①_seasonal × weekday_multiplier[store][曜日]
```

曜日乗数は**店舗別**に実績データから算出（基準: 全曜日平均=1.000）:

| 曜日 | JW | GA | NP | BQ |
|------|------:|------:|------:|------:|
| 月 | 0.978 | 0.842 | 0.732 | 0.844 |
| 火 | 0.890 | 0.876 | 0.844 | 0.921 |
| 水 | 0.885 | 0.939 | — ※ | 0.903 |
| 木 | 0.878 | 0.875 | 0.803 | 0.776 |
| 金 | 0.908 | 0.995 | 1.005 | 1.009 |
| **土** | **1.222** | **1.307** | **1.330** | **1.397** |
| **日** | **1.224** | **1.163** | **1.143** | **1.141** |

※ NP水曜は定休日影響でサンプル不足のため暫定除外

> [!IMPORTANT]
> **なぜ掛け算か？** 実データで検証済み。JWの週末/平日比は **春1.35x → 夏1.37x → 秋1.35x → 冬1.31x** とほぼ一定。季節を問わず「土曜は平日の1.2倍」が成立するため、加算ではなく乗算が正しいモデル。

#### v1.0 → v2.0 変更点

```diff
 【v1.0 — 旧ロジック】
-KF① = (月別 + 曜日 + 節気 + 週別 + [日別]) / 4~5    ← 曜日が他4層と等重で加算
-→ 曜日の予測差: ±6~7%（実態 ±35~47% に対して不足）

 【v2.0 — Real MP】
+KF①ₛ = (月別 + 節気 + 週別 + [日別]) / 3~4           ← 季節は季節同士で平均
+KF①  = KF①ₛ × 曜日乗数                              ← 曜日は掛け算で独立適用
+→ 曜日の予測差: ±35~47%（実態に忠実）
```

---

### KF②: 売上FACTOR

**「過去の同条件日と比べて売上はどの水準か？」**

- 過去の同一条件日（同節気 × 同曜日）の売上をmin-max正規化
- スケール: 1.00〜5.00
- データ蓄積で自動更新

### KF③: 来客FACTOR

**「過去の同条件日と比べて客数はどの水準か？」**

- 過去の同一条件日（同節気 × 同曜日）の客数をmin-max正規化
- スケール: 1.00〜5.00
- データ蓄積で自動更新

---

### 計算例

```
入力: 2026年3月14日（土曜日）、JW — The Jewels、節気「啓蟄」

Step 1: KF①_seasonal
  月別IDX(3月)=3.20 + 節気IDX(啓蟄)=3.10 + 週別IDX(W11)=3.30
  → KF①ₛ = (3.20 + 3.10 + 3.30) / 3 = 3.20

Step 2: 曜日乗数
  KF① = 3.20 × 1.222(JW土曜) = 3.91

Step 3: MP POINT
  KF①=3.91 + KF②=3.50 + KF③=3.20
  → MP = 3.54

比較: 同じ週の火曜日
  KF① = 3.20 × 0.890(JW火曜) = 2.85
  → MP = (2.85 + 2.80 + 2.60) / 3 = 2.75

  土曜3.54 vs 火曜2.75 = 1.29倍  → 実態(1.35倍)に近い ✅
```

---

## 4. 予測エンジン（Forecast Engine）

MP POINTとは別に、**具体的な売上金額の予測**も提供:

```javascript
function forecastForDate(storeData, targetDate) {
    // 過去の「同節気 × 同曜日」の実績を抽出・平均して予測
    matches = storeData.filter(r =>
        r.sekki === targetSekki &&
        r.weekday === targetWeekday &&
        r.actual_sales > 0
    );
    return average(matches.actual_sales);
}
```

この予測エンジンは曜日マッチングを内蔵しているため、曜日効果を自然に反映する。

---

## 5. ダッシュボード構成

| タブ | 機能 |
|------|------|
| ① COMMAND CENTER | 司令室 — 日次サマリー・売上入力フォーム・人時生産性 |
| ② FORECAST DETAIL | 予測詳細 — 日別予測の根拠（同節気×同曜日マッチ一覧） |
| ③ FORECAST CHART | 予測チャート — 期間指定の全店舗売上予測グラフ |
| ④ VISITORS | 来場者データ — 拠点別来場者入力（KF①精度向上用） |
| ⑤ DATA IMPORT | データ取込 — GAS接続設定・CSV一括投入 |
| ⑥ STAFFING | 人員配置 — MP POINTに基づくシフト提案 |
| ⑦ REPORT | 実績レポート — 月次・拠点別の実績/予測対比 |

---

## 6. ファイルマップ

| ファイル | 役割 | ステータス |
|----------|------|:----------:|
| [app.js](file:///Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/mp_dashboard/app.js) | ダッシュボード本体 + MP計算 | 🔄 Real MP対応中 |
| [gas_bridge.js](file:///Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/mp_dashboard/gas_bridge.js) | GAS APIクライアント | ✅ 完成 |
| [gas/Code.gs](file:///Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/mp_dashboard/gas/Code.gs) | GASバックエンド | ✅ 完成 |
| [mp_indices.json](file:///Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/mp_dashboard/mp_indices.json) | KF①定数テーブル | 🔄 曜日乗数追加予定 |
| [restaurant_config.json](file:///Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/mp_dashboard/restaurant_config.json) | 店舗設定 | ✅ 完成 |
| [mp_engine/sekki.py](file:///Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/mp_engine/sekki.py) | 節気エンジン + KF①計算 | 🔄 2段構造に更新予定 |

### 廃止対象（Real MP完了後）

| ファイル | 理由 |
|----------|------|
| `mp_data.json` | GASが唯一のデータソース |
| `generate_mp_json.py` | リアルタイム算出に移行 |
| `compute_r8_mp*.py` | 曜日乗数テーブルに置換 |

---

## 7. 実装ロードマップ

### Phase 1: GASバックエンドをSSoTにする ✅
- [x] GAS接続テスト
- [x] 全7店舗 5,816レコードをスプシに投入
- [x] app.jsをGAS優先読込に変更
- [x] 司令室sf-フォームのGAS API直接保存（`channelsToGASValues`変換）

### Phase 2: Real MP計算ロジック実装 ← **NOW**
- [ ] `mp_indices.json` に店舗別 `weekday_multiplier` を追加
- [ ] `sekki.py` の `get_kf1()` を2段構造に更新
- [ ] `app.js` の予測チャート・ヒートマップを新ロジックに対応
- [ ] 過去データでバックテスト（予測 vs 実績の誤差率検証）

### Phase 3: KF②/KF③のリアルタイム算出
- [ ] app.js にKF②/KF③計算エンジンを移植
- [ ] KF①テーブルをGAS MP_Configシートに移行

### Phase 4: クリーンアップ
- [ ] mp_data.json依存の完全排除
- [ ] 旧スクリプト群の廃止
- [ ] ドキュメント最終整理

---

## 8. 将来課題

| 課題 | 方針 |
|------|------|
| 労働時間の日次記録 | マネージャー閉店後入力 → シフト計画値プリセット → Timee API |
| 来場者データ（④ VISITORS） | 各拠点の入場者数を蓄積し、KF①精度向上 |
| KF④/KF⑤の追加検討 | 天候・イベント等の外部要因、予約数ベースの補正 |

---

## 9. 運用ルール

- ❌ パーサー再実行でデータを修正する → **スプシを直接修正**
- ❌ mp_data.jsonを手動編集する → **廃止予定**
- ❌ localStorageにデータをキャッシュする → **常にGASから最新取得**
- ❌ MP scoresを事前に焼く → **蓄積データからリアルタイム算出**
- ✅ 曜日乗数は四半期ごとに実績データから再算出
- ✅ データの正は常にGoogle Spreadsheet

---

*Momentum Peaks v2.0 "Real MP" — SAPPORO VIEWTIFUL DINING*
*"なんとなく" から "根拠のある予測" へ*
