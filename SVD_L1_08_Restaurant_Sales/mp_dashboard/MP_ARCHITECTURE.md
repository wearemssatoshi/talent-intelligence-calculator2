# Momentum Peaks — 設計書 v2.3 "F-Layer + OnHand"

> **SAPPORO VIEWTIFUL DINING — 需要予測エンジン**
> Single Source of Truth: Google Spreadsheet (MP_DailySales)
> Last Updated: 2026.03.03 — OnHand F-Layer System 完成

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
    ↑ 初期投入: Excel → parse_*.py → CSV → import_csv_to_gas.py → GAS API → スプシ ✅完了
    ↑ 日常入力: ダッシュボード → GAS API (save) → スプシ
    ↓
【MP計算】 フロントエンド (app.js) でリアルタイム算出
    ← スプシの蓄積実績データ (8,768 records)
    ← mp_indices.json (KF①: 拠点定数テーブル + 曜日乗数)
    ← restaurant_config.json (店舗設定)
    → mp_point = (KF① + KF② + KF③) / 3
```

### GASデプロイ情報

```
Script ID: 19F6rDayPjH2tSfdHWi5yae0vYOOi6eRNoUUXsiep00mk1wtpz3fUrhF6
URL: https://script.google.com/macros/s/AKfycbyE_uNfiMB6_szu0D0cQoR8JBgwxXm-3H45DGs6qXLpgiz5kYCxBgg961nqR7RXs1jg/exec
Deploy: @11 (2026-03-03: OnHand API + Store Holidays)
Clasp: mp_dashboard/gas/ (.clasp.json + appsscript.json)
シート: MP_DailySales, MP_AuditLog, MP_Config, MP_OnHand
投入済み: JW(1096) NP(1096) Ce(1096) RP(1096) GA(1096) BG(1096) BQ(1096) RYB(1096) = 8,768件
OnHand: 74件 (JW:9 NP:30 GA:21 GA_宴会:11 BQ:3)
期間: 2023-04-01 〜 2026-03-31（全店舗統一）
```

---

## 3. 拠点・店舗構成（4拠点8店舗）

### 藻岩山 (MOIWAYAMA)

| 店舗 | ID | チャネル |
|:--|:--|:--|
| THE JEWELS | JW | LUNCH, DINNER, T.O, 席料, 南京錠, 花束, モーリスカレー |

- 拠点来場者ソース: **ロープウェイ乗車人数**
- 特有指標: 🌃 **夜景ポイント**（スタッフ主観評価 0〜100。特別: 150=最高夜景, 1669=10/7氷室京介生誕日）

### 大倉山 (OKURAYAMA)

| 店舗 | ID | チャネル |
|:--|:--|:--|
| ヌーベルプース大倉山 | NP | LUNCH, DINNER, 室料, 花束, Event(宴会) |
| セレステ | Ce | 料理, 飲料, 物販 |
| カフェルポ | RP | 料理, 飲料, 物販 |

- 拠点来場者ソース: **来場者数 + リフト利用者数**
- 特性: スキージャンプ大会時に大幅増

### テレビ塔 (TV_TOWER)

| 店舗 | ID | チャネル |
|:--|:--|:--|
| THE GARDEN SAPPORO | GA | LUNCH, DINNER, T.O, 宴会, 室料 |
| BEER GARDEN | BG | Food, Drink, Tent, 物販 |

- 拠点来場者ソース: **展望台入場者数**
- 特有指標: 🍺 **BG時間帯別データ**（12:00/15:00/18:00の天気+気温 → 気温が高い時間帯に来客集中）

### 赤れんがテラス (AKARENGA)

| 店舗 | ID | チャネル |
|:--|:--|:--|
| ラ・ブリック | BQ | LUNCH, AT(アフタヌーンティー), DINNER, 席料 |
| ルスツ羊蹄とんかつテラス by BQ | RYB | LUNCH |

- 2025年5月OPEN、ビジネス街立地

---

## 4. MP計算ロジック

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
入力: 2026年3月14日（土曜日）、JW — THE JEWELS、節気「啓蟄」

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

## 5. 予測エンジン（Forecast Engine）

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

### 5.1 Forecast Layer System（F-Layer）

> **F1に近づくほど精度が上がり、確定情報を取り込み、行動が具体化する。**

```
F5 ─── F4 ─── F3 ──── F2 ──── F1
365d   180d   90d     30d    7-21d
HORIZON SEASON QUARTER MONTH  SPRINT
                ↑              ↑
          オンハンド合流    Timee連結
```

| Layer | 名称 | 期間 | データソース | 精度 |
|:--:|:--|:--:|:--|:--:|
| **F5** | **HORIZON** | 365日 | 過去2〜3年の同月×同曜日の加重平均（通常営業チャネルのみ） | ★★★☆☆ |
| **F4** | **SEASON** | 180日 | F5 + 直近6ヶ月のトレンド補正（成長/下降係数） | ★★★☆☆ |
| **F3** | **QUARTER** | 90日 | F4 + **オンハンド合流**（確定済み宴会・イベント予約） | ★★★★☆ |
| **F2** | **MONTH** | 30日 | F3 + 確定予約の詳細（人数・コース・単価）、天候予報 | ★★★★☆ |
| **F1** | **SPRINT** | 7〜21日 | F2 + 直前予約・Timee人員確定・仕入れ最終チェック | ★★★★★ |

#### F5 HORIZON — 年間予測（地力）

**データ**: 過去実績の加重平均（宴会チャネル除外）
**アクション**:
- 年間売上予算の策定（R7/R8期 損益計算書の根拠）
- 年間シフトフレームの設計（月×曜日の必要人員マトリクス）
- 採用計画のベースライン（通年で何名必要か）

**出力**: 月別×曜日別の売上・客数予測テーブル

#### F4 SEASON — 半年予測（季節）

**データ**: F5 + 直近のトレンド（成長加重 1.05x/1.03x/1.00x）
**アクション**:
- 半期の契約見直し（食材仕入れ、リネン、備品）
- パート・アルバイトの採用開始（面接〜戦力化に2ヶ月かかる）
- メニュー改訂・プロモーション企画の立案

**出力**: 6ヶ月先までの月間売上予測

#### F3 QUARTER — 四半期予測（オンハンド合流）

**データ**: F4 + **確定済みオンハンド**（宴会予約・イベント・団体）
**アクション**:
- 宴会確定分を予測に加算（予測ではなく確定値として処理）
- 繁忙期/閑散期の人員配置調整を開始
- 食材の発注ロット計画

**出力**: 日別予測 = F4ベース予測 + オンハンド確定額

> **ここが「予測」から「確定の取り込み」に切り替わるターニングポイント**

#### F2 MONTH — 月間予測（シフト確定）

**データ**: F3 + 予約人数・コース詳細 + 長期天候予報
**アクション**:
- **シフトメイキング実行**（MP Point × 人時生産性 → 必要人員自動算出）
- コース仕入れの確定発注
- 宴会の追加・キャンセルを即時反映

**出力**: 日別シフト提案書（必要人員×ポジション）

#### F1 SPRINT — 週次予測（即応）

**データ**: F2 + 直前予約動向 + 天気実況 + Timee在庫
**アクション**:
- **Timee手配**（F2のシフトで不足する人員を自動募集）
- 当日の食材最終発注
- 当日朝のブリーフィング資料生成

**出力**: 当日オペレーション指示（配置図 + 予測売上 + 注意事項）

#### 予測の合成式

```
F5 = avg(過去同月×同曜日, 通常営業チャネルのみ) × growth_weight
F4 = F5 + trend_correction
F3 = F4 + Σ(on_hand_confirmed)         ← 宴会は「確定値」を加算
F2 = F3 + reservation_detail + weather
F1 = F2 + last_minute_adj + timee_status
```

---

## 6. ダッシュボード構成

| タブ | 機能 |
|------|------|
| ① THE BRIDGE | SVD操舵室 — 日次サマリー・予測表示・前年/前々年比較 |
| ② FORECAST DETAIL | 予測詳細 — 日別予測の根拠（同節気×同曜日マッチ一覧） |
| ③ FORECAST CHART | 予測チャート — 期間指定の全店舗売上予測グラフ |
| ④ ENTRY | 売上入力 — 日次実績のGAS API直接保存 |
| ⑤ DATA IMPORT | データ取込 — GAS接続設定・mp_data.json読込・手動同期 |
| ⑥ STAFFING | 人員配置 — MP POINTに基づくシフト提案 |
| ⑦ REPORT | 実績レポート — 月次・拠点別の実績/予測対比 |
| ⑧ BG POP UP | ビアガーデン — BG専用ダッシュボード（天候・時間帯別） |

---

## 7. データパイプライン

### Excelパーサー（拠点別）

| 拠点 | スクリプト | 出力CSV |
|:--|:--|:--|
| 藻岩山 | `parse_moiwayama.py` | `MOIWAYAMA_daily.csv` |
| 大倉山 | `parse_okurayama.py` | `OKURAYAMA_NP_daily.csv`, `OKURAYAMA_Ce_daily.csv`, `OKURAYAMA_RP_daily.csv` |
| テレビ塔 | `parse_tvtower.py` | `TV_TOWER_daily.csv` |
| 赤れんが | `parse_akarenga.py` | `AKARENGA_daily.csv` |

### GAS投入スクリプト

| スクリプト | 方式 | 状態 |
|:--|:--|:--|
| [import_csv_to_gas.py](file:///Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/mp_dashboard/gas/import_csv_to_gas.py) | GAS Web API (POST) | ✅ 現行 |

### ローカルJSON生成

| スクリプト | 出力 | 状態 |
|:--|:--|:--|
| [generate_mp_json.py](file:///Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/mp_dashboard/generate_mp_json.py) | `mp_data.json` (3.1MB) | 🟡 Phase 4で廃止予定 |

---

## 8. ファイルマップ

| ファイル | 役割 | ステータス |
|----------|------|:----------:|
| [app.js](file:///Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/mp_dashboard/app.js) | ダッシュボード本体 + forecast + OnHand Radar | ✅ v2.3 |
| [gas_bridge.js](file:///Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/mp_dashboard/gas_bridge.js) | GAS APIクライアント (loadOnHand含む) | ✅ 完成 |
| [gas/Code.gs](file:///Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/mp_dashboard/gas/Code.gs) | GASバックエンド (OnHand API含む) | ✅ 完成 |
| [gas/.clasp.json](file:///Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/mp_dashboard/gas/.clasp.json) | clasp push/deploy設定 | ✅ 完成 |
| [mp_indices.json](file:///Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/mp_dashboard/mp_indices.json) | KF①定数テーブル | 🔄 曜日乗数追加予定 |
| [restaurant_config.json](file:///Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/mp_dashboard/restaurant_config.json) | 店舗設定 | ✅ 完成 |
| [parse_onhand.py](file:///Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/parse_onhand.py) | TableCheck CSV → OnHandクリーンデータ | ✅ 完成 |
| [import_onhand_to_gas.py](file:///Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/import_onhand_to_gas.py) | OnHand → GAS投入スクリプト | ✅ 完成 |
| [mp_engine/sekki.py](file:///Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/mp_engine/sekki.py) | 節気エンジン + KF①計算 | 🔄 2段構造に更新予定 |

### 店舗別定休日 & OnHandルール

| 店舗 | 定休日 | OnHand加算 | 理由 |
|:--|:--|:--:|:--|
| NP | 12〜3月 火・水 | メモのみ | F5が団体・宴会を内包 |
| JW | 平日ランチなし | メモのみ | F5が団体・宴会を内包 |
| BQ | なし | メモのみ | F5が団体・宴会を内包 |
| GA | なし | ✅ 加算 | GA_宴会分離済み、F5が宴会を内包しない |
| GA_宴会 | なし | ✅ 加算 | 独立store、F5データなし |

### 廃止予定（Phase 4完了後）

| ファイル | 理由 |
|----------|------|
| `mp_data.json` | GASが唯一のデータソース + リアルタイム算出に移行 |
| `generate_mp_json.py` | 同上 |

### 廃止対象（次回整理予定）

| ファイル | 理由 |
|----------|------|
| `csv_output/NP_daily.csv` | 旧パイプライン。`OKURAYAMA_NP_daily.csv` に置換済み |
| `csv_output/Ce_daily.csv` | 同上 |
| `csv_output/RP_daily.csv` | 同上 |
| `gas/import_to_sheets.py` | gspread直接書込みの旧版。`import_csv_to_gas.py` に置換済み |

---

## 9. 実装ロードマップ

### Phase 1: GASバックエンドをSSoTにする ✅ 完了

- [x] GAS接続テスト
- [x] 全8店舗 8,768レコードをスプシに投入
- [x] app.jsをGAS優先読込に変更
- [x] ENTRY フォームのGAS API直接保存（`channelsToGASValues`変換）
- [x] JSTタイムゾーン修正（`jstNow()` ダブルオフセット修正、deploy @9）

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
- [ ] 旧CSVファイル・旧スクリプトの廃止
- [ ] ドキュメント最終整理

---

## 10. 将来課題

| 課題 | 方針 |
|------|------|
| 労働時間の日次記録 | マネージャー閉店後入力 → シフト計画値プリセット → Timee API |
| 来場者データ | 各拠点の入場者数を蓄積し、KF①精度向上 |
| KF④/KF⑤の追加検討 | 天候・イベント等の外部要因、予約数ベースの補正 |

---

## 11. 運用ルール

- ❌ パーサー再実行でデータを修正する → **スプシを直接修正**
- ❌ mp_data.jsonを手動編集する → **廃止予定**
- ❌ localStorageにデータをキャッシュする → **常にGASから最新取得**
- ❌ MP scoresを事前に焼く → **蓄積データからリアルタイム算出**
- ✅ 曜日乗数は四半期ごとに実績データから再算出
- ✅ データの正は常にGoogle Spreadsheet
- ✅ OnHandは毎週月曜にフルリフレッシュ（差分管理不要）
- ✅ clasp push + deployでGAS更新（URL変更不要）

---

## 12. 運用ワークフロー

### 毎週月曜: OnHand更新

```bash
# 1. TableCheckから3ヶ月CSV → on_hand/ に配置
python3 parse_onhand.py on_hand/
# 2. GASに投入
python3 import_onhand_to_gas.py <GAS_URL>
```

### GASコード更新

```bash
cd mp_dashboard/gas/
clasp push        # Code.gs → GAS
clasp deploy -i AKfycbyE_uN... --description "説明"
```

---

## 13. 今後の展開

| 項目 | 優先度 | 概要 |
|:--|:--:|:--|
| BGページブラッシュアップ | ☆☆☆ | ビアガーデンシーズン前の準備 |
| TIブラッシュアップ | ☆☆☆☆ | MP×TI統合→「ワンボタンシフト生成」へ |
| F2/F1レイヤー実装 | ☆☆ | 天候予報・Timee API連携 |
| KF②/KF③リアルタイム算出 | ☆☆ | mp_data.json依存解消 |

---

*Momentum Peaks v2.3 "F-Layer + OnHand" — SAPPORO VIEWTIFUL DINING*
*"なんとなく" から "根拠のある予測" へ*
