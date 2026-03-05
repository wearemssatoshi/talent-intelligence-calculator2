---
name: momentum-peaks
description: "売上予測・需要予測に関する質問、シフト人数の計算、モメンタムピークスの計算、二十四節気の係数、拠点定指数、営業インテンシティの算出、チャネル別フォーキャスト、OnHand統合、定休日判定が必要な時に発動する。トリガー: MP, mp, モメンタムピークス, 売上予測, 需要予測, シフト最適化, フォーキャスト, ダッシュボード, OnHand, 予約データ, GASインポート, 売上データ, Code.gs, mp_dashboard, mp_data, 3CH, チャネル, バックエンド"
---

# Momentum Peaks — 完全憲法 📈

> SVDが開発した独自の需要予測フレームワーク。
> 「業界のなんとなく」を排し、データに基づく**適正フォーキャスト**を算出する。
> **このファイルがMPの唯一の設計図。壊れたら、ここから再構築する。**

---

## §1. 2層構造の計算ルール

### Layer 1: 拠点レベル（定数）
1. **① 月別季節指数** (1.00-5.00): 地域の季節要因
2. **② 月別曜日指数** (1.00-5.00): 曜日ごとの需要パターン
3. **③ 月別来場者指数** (1.00-5.00): 施設来場者の実績
4. **④ KF① = (① + ② + ③) / 3**

### Layer 2: 店舗レベル（実績）
5. **⑤ KF②**: 月別売上実績のmin-max正規化 → 1.00-5.00スケール
6. **⑥ KF③**: 月別来客者数のmin-max正規化 → 1.00-5.00スケール

### 最終統合
7. **⑦ Momentum Peaks Point = (KF① + KF② + KF③) / 3**

### スケール表示ルール
- 全指数は **小数点以下2桁** で表示（例: `5.00` ではなく `5` とは書かない）

---

## §2. ステータス分類

| 範囲 | Season | 意味 |
|------|--------|------|
| 4.30-5.00 | 🔥 TOP SEASON | フル稼働・最大配置 |
| 3.43-4.29 | ⚡ HIGH SEASON | 増員推奨 |
| 2.57-3.42 | 🌤️ FLOW SEASON | 標準構成 |
| 1.70-2.56 | 💤 LOW SEASON | 最小構成・戦略日 |
| 1.00-1.69 | 🧘 OFF SEASON | 休養・メンテナンス期 |

---

## §3. データアーキテクチャ

### GAS-First Architecture
- **GASが唯一の正**（Single Source of Truth）
- `mp_data.json` はGASオフライン時のフォールバック専用
- 静的config（bases, sekki_levels）は `app.js` の `SVD_CONFIG` に定義
- KF2/KF3はGAS実績データからmin-max正規化で算出

### GASバックエンドURL
```
https://script.google.com/macros/s/AKfycbyE_uNfiMB6_szu0D0cQoR8JBgwxXm-3H45DGs6qXLpgiz5kYCxBgg961nqR7RXs1jg/exec
```

### API Endpoints
| Action | Method | Description |
|---|---|---|
| `loadAll` | GET | 全店舗の全売上データ取得 |
| `loadDate` | GET | 特定日のデータ取得 |
| `loadRange` | GET | 日付範囲のデータ取得 |
| `loadOnHand` | GET | OnHand（確定予約）データ取得 |
| `save` | POST | 1行保存 |
| `bulkSave` | POST | バッチ保存 |
| `import` | POST | CSVインポート（バッチ500行） |
| `setupSheets` | POST | シート初期作成 |

### Token
```
SVD_API_TOKEN = 'a6b93874301b54dac9a37afc89d04f56'
```

### GAS Store Sheets（ヘッダー定義 — 2026-03-05更新）
```
MOIWA_JW:       date|L_Food|L_Drink|L人数|D_Food|D_Drink|D人数|TO_Food|TO_Drink|席料|南京錠|花束|物販_食品|物販_アパレル
TVTOWER_GA:     date|L_Food|L_Drink|L人数|D_Food|D_Drink|D人数|3CH_Food|3CH_Drink|3CH人数|宴会_Food|宴会_Drink|宴会人数|室料|展望台|物販_食品|物販_アパレル
TVTOWER_BG:     date|Food|Drink|Tent|人数|物販_食品|物販_アパレル
OKURAYAMA_NP:   date|L_Food|L_Drink|L人数|D_Food|D_Drink|D人数|室料|花束|Event_Food|Event_Drink|Event人数|物販_食品|物販_アパレル
OKURAYAMA_Ce:   date|Food|Drink|人数|物販_食品|物販_アパレル
OKURAYAMA_RP:   date|Food|Drink|人数|物販_食品|物販_アパレル
AKARENGA_BQ:    date|L_Food|L_Drink|L人数|AT_Food|AT_Drink|AT人数|D_Food|D_Drink|D人数|席料|物販_食品|物販_アパレル
AKARENGA_RYB:   date|Food|Drink|人数|物販_食品|物販_アパレル
```

> [!NOTE]
> GA の `3CH` = 第3チャネル統合（TO→AT→WBの時代変遷を1つに統合）
> - TO時代（〜2025/3）: テイクアウト
> - AT時代（2025/4〜2026/1/12）: アフタヌーンティ
> - WB時代（2026/1/13〜）: ワインバー

---

## §4. チャネル別予測前提（5分類）

| Type | Method | 説明 | OnHand反映 |
|---|---|---|---|
| `通常営業` | `historical_weighted` | 同月×同曜日の成長加重平均 | 予約進捗率 |
| `予約確定` | `onhand_only` | OnHand確定予約が唯一のソース | 確定額=予測値 |
| `天候依存` | `weather_adjusted` | 実績×**0.75**（天候保守係数） | 予約進捗率 |
| `付帯収入` | `recent_90d_avg` | 直近90日の日平均 | 反映しない |
| `成長チャネル` | `growth_target` | 前月実績×1.10（自動BL） | 予約進捗率 |

### 予約進捗率

```
予約進捗率 = OnHand確定額 / フォーキャスト予測額 × 100%
```

### OnHand反映ルール（2026-03-05確定）
- **全店舗** でOnHandをフォーキャストに加算（`addOnHand = true`）
- ステータスフィルタ: **キャンセル/ノーショー除外**方式（ホワイトリストではない）
  - 除外: `キャンセル`, `ノーショー`, `ノーショー（無断キャンセル）`
  - それ以外（確認, 確認済み, 花束手配済, ガトー手配済 等）は全て有効
- OnHand Radar: 今後30日 × 20名以上の大型案件を表示

### 全店舗チャネルマッピング

```
MOIWAYAMA/JW:   L=通常(※土日祝のみ) | D=通常 | T.O=通常 | 席料=付帯 | 南京錠=付帯 | 花束=付帯
TV_TOWER/GA:    L=通常 | D=通常 | WB=成長 | 宴会=予約確定 | 室料=付帯 | 展望台=付帯
TV_TOWER/BG:    MAIN=天候依存 | テント=天候依存 | 物販=付帯
OKURAYAMA/NP:   L=通常 | D=通常 | Event=予約確定 | 室料=付帯 | 花束=付帯
OKURAYAMA/Ce:   ALL=通常 | 物販=付帯
OKURAYAMA/RP:   ALL=通常 | 物販=付帯
AKARENGA/BQ:    L=通常 | AT=通常 | D=通常 | 席料=付帯
AKARENGA/RYB:   ALL=通常 | 物販=付帯
```

### WINE BAR 目標値（GA）
```
開始: 2026年2月
月間目標: ¥200,000（固定目標、日割≈¥7,000）
実績12ヶ月以上蓄積後 → historical_weighted に昇格
```

### BG天候保守係数
| 時間軸 | ロジック |
|---|---|
| トップシーズン | OnHand（予約）でほぼ確定 |
| 1〜2週先 | 実績ベース × **0.75** |
| 当日〜数日前 | OnHand確定 + ウォークイン見込み |

---

## §4.1 F-Layer フォーキャスト統合ルール（2026-03-05確定）

> フォーキャストは5段階のF-Layerを積み上げて算出する。

### F1: Historical Weighted（ロングラン実績）
同月×同曜日の過去実績を**成長加重平均**で算出。全ての基盤。
```
客数 = Σ(過去同月同曜日の客数 × weight) / Σ(weight)
客単価 = Σ(過去同月同曜日の客単価 × weight) / Σ(weight)
売上 = 客数 × 客単価
weight = 直近ほど高く（例: 今年=3, 昨年=2, 一昨年=1）
```

### F2: チャネル別分解
F1をLUNCH/DINNER/3CH/宴会等の**チャネル単位**に分解し、§4の5分類ルールを適用:
- `通常営業` → F1の加重平均そのまま
- `予約確定`（GA宴会/NP Event）→ OnHand確定額 = 予測値
- `天候依存`（BG）→ 実績 × 0.75
- `付帯収入`（席料/南京錠/花束/室料/展望台）→ **直近90日の日平均**
- `成長チャネル`（WB）→ 月間¥200,000固定目標（日割≈¥7,000）

### F3: OnHand合流（予約データ）
**全店舗**でTableCheckの予約データをフォーキャストに加算。
- フィルタ: キャンセル/ノーショー**除外**方式（ホワイトリストではない）
- GA宴会: コース名に「宴会」含む → `store='GA_宴会'` に分離
- `predicted_sales += OnHand金額`, `predicted_count += OnHand人数`

### F4: Walk-in Layer（フリー客見込み）
**当日〜翌日のみ**、4レストラン（JW/NP/BQ/GA）に加算。
```
Walk-in = 各チャネル(L/D) × 1組2名 × チャネル平均客単価
```
- 2日以上先には Walk-in は加算しない（ノイズ防止）

### F5: 最終統合
```
predicted_sales = F2チャネル合計 + F3 OnHand額 + F4 Walk-in額
predicted_count = F2客数合計 + F3 OnHand人数 + F4 Walk-in人数
predicted_avg_spend = predicted_sales / predicted_count
```

---

## §5. 定休日ルール

### 全店共通
- **元旦（1/1）**: 全店休業

### MOIWAYAMA / JW
- **平日ランチ休み**（土日祝のみ営業）→ チャネルレベルで処理
- 不定休あり（予測不能、未反映）

### OKURAYAMA / NP
- **4/1〜10/31**: 毎週**水曜**定休
- **11/1〜3/31**: 毎週**火曜・水曜**定休
- **年末年始**: 12/27〜1/3 休業
  - 例外: **12/31 おせち営業**（実績¥1,700,000）
- ※祝日に当たる場合は営業に変更あり

### 他店舗（GA, BQ, RYB, Ce, RP, BG）
- 不定休のみ（予測不能、未反映）

---

## §6. 拠点定指数テーブル

### ① 月別季節指数 (1.00-5.00)

| 月 | 指数 | ポジティブ要因 | ネガティブ要因 |
|----|------|---------------|--------------|
| 1月 | 2.00 | お正月 | 正月明け反動・冬の出控え |
| 2月 | 3.00 | 雪まつり | 冬の出控え |
| 3月 | 3.00 | 春・雪解け | - |
| 4月 | 1.00 | 春・GW | 運休(藻岩山) |
| 5月 | 3.00 | 春・GW・もいわ山の日 | GW明け反動 |
| 6月 | 4.00 | 初夏・新緑・よさこい・神宮祭 | - |
| 7月 | 5.00 | 夏・ビアガーデン・PMF・花火 | - |
| 8月 | 5.00 | 夏休み・北海道マラソン | - |
| 9月 | 5.00 | オータムフェスト | - |
| 10月 | 5.00 | 秋・紅葉 | - |
| 11月 | 3.00 | ホワイトイルミネーション | 端境期 |
| 12月 | 5.00 | クリスマス・イルミネーション | 冬の出控え |

### ② 月別曜日指数 (1.00-5.00)

| 曜日 | 指数 | 備考 |
|------|------|------|
| 日 | 4.00 | 週末需要 |
| 月 | 2.00 | 平日閑散 |
| 火 | 2.00 | 平日 |
| 水 | 2.00 | 平日 |
| 木 | 3.00 | 週末前 |
| 金 | 4.00 | 週末需要 |
| 土 | 5.00 | 最大需要 |

### 特別日指数
| 区分 | 指数 |
|------|------|
| 祝休 | 4.00 |
| 夏連休中日 | 5.00 |
| 冬連休中日 | 3.00 |
| 夏連休明け | 2.00 |
| 冬連休明け | 1.00 |

### ③ 月別来場者指数（データソース）
| 拠点 | ソース |
|------|--------|
| 藻岩山 | ロープウェイ+ミニケーブル乗車人数 |
| 大倉山 | ジャンプ場入場者数 |
| テレビ塔 | 展望台入場者数 |
| 赤れんが | (理論整理中) |

### イベント係数（ブースト）
| イベント | 係数 |
|---------|------|
| GW | +1.50 |
| オータムフェスト | +1.40 |
| 雪まつり | +1.30 |
| クリスマス | +1.30 |
| 花火大会 | +1.20 |

---

## §7. 24分割需要モデル

> **着想は二十四節気から。しかし節気名は分かりにくいので使わない。**
> 1年を24期間に分割し、各期間にpt値（5.00〜1.00）を割り当てる。
> **高い数字 = 忙しい。低い数字 = 閑散。**

### 5段階 × 24ランク（SVD_CONFIG準拠）

| Season | Rank範囲 | pt範囲 |
|--------|---------|--------|
| 🔥 TOP | Rank 1-5 | 5.00〜4.30 |
| ⚡ HIGH | Rank 6-10 | 4.13〜3.43 |
| 🌤️ FLOW | Rank 11-15 | 3.26〜2.57 |
| 💤 LOW | Rank 16-20 | 2.39〜1.70 |
| 🧘 OFF | Rank 21-24 | 1.52〜1.00 |

### SVD_CONFIG pt値一覧（app.js実装値）

```
Rank  1: 5.00 (TOP)    Rank 13: 2.91 (FLOW)
Rank  2: 4.83 (TOP)    Rank 14: 2.74 (FLOW)
Rank  3: 4.65 (TOP)    Rank 15: 2.57 (FLOW)
Rank  4: 4.48 (TOP)    Rank 16: 2.39 (LOW)
Rank  5: 4.30 (TOP)    Rank 17: 2.22 (LOW)
Rank  6: 4.13 (HIGH)   Rank 18: 2.04 (LOW)
Rank  7: 3.96 (HIGH)   Rank 19: 1.87 (LOW)
Rank  8: 3.78 (HIGH)   Rank 20: 1.70 (LOW)
Rank  9: 3.61 (HIGH)   Rank 21: 1.52 (OFF)
Rank 10: 3.43 (HIGH)   Rank 22: 1.35 (OFF)
Rank 11: 3.26 (FLOW)   Rank 23: 1.17 (OFF)
Rank 12: 3.09 (FLOW)   Rank 24: 1.00 (OFF)
```

> ❗ 基準スタッフ数は未設定（今後、実績データとTIを統合して決定する）

---

## §7b. BG天候データ（準備中）

> **このセクションは将来、天候実績データを補充する。**

```
[ 天候データ: 後日SATが補充 ]

予定項目:
- 過去の天候実績と客数の相関
- 天候別の売上補正係数（晴/曇/雨/暴風雨）
- 天気予報APIとの連携案
```

### 差別化ポイント
- 海外: 曜日×月の単純モデル
- **SVD**: 24分割×POS×予約の三層モデル 🇯🇵

---

## §8. 店舗構成・基準人数

| 拠点 | 店舗 | ID | セグメント | 基準人数 |
|------|------|----|-----------|---------|
| 藻岩山 | The Jewels | JW | L/D | 8 |
| 藻岩山 | JW TakeOut | JW_TO | ALL_DAY | 2 |
| 大倉山 | ヌーベルプース | NP | L/D | 10 |
| 大倉山 | セレステ | Ce | ALL_DAY | 3 |
| 大倉山 | ルポ | RP | ALL_DAY | 2 |
| テレビ塔 | ザ ガーデン | GA | L/D | 12 |
| テレビ塔 | GA Wine Bar | GA_WB | NIGHT | 3 |
| テレビ塔 | GA Banquet | GA_BQ | EVENT | 5 |
| テレビ塔 | ビアガーデン | BG | SUMMER | 15 |
| 赤れんが | ラ・ブリック | BQ | L/D | 8 |
| 赤れんが | ルスツ羊蹄 | RYB | L/D | 6 |

---

## §9. 計算例

### 🔥 12月土曜 藻岩山（TOP SEASON）
| Step | Factor | Point |
|:---:|---|:---:|
| ① | Season: 12月（Xmas） | 5.00 |
| ② | Weekday: 土曜日 | 5.00 |
| ③ | Visitor: 実績 | 4.50 |
| **④** | **KF① = (①+②+③)/3** | **4.83** |
| ⑤ | KF②: 12月売上 | 5.00 |
| ⑥ | KF③: 12月来客 | 5.00 |
| **⑦** | **MP Point = (④+⑤+⑥)/3** | **4.94** |

→ 🔥 **TOP SEASON**

### 🧘 4月火曜 藻岩山（OFF SEASON）
| Step | Factor | Point |
|:---:|---|:---:|
| ① | Season: 4月（運休） | 1.00 |
| ② | Weekday: 火曜日 | 2.00 |
| ③ | Visitor: 実績 | 2.00 |
| **④** | **KF①** | **1.67** |
| ⑤ | KF② | 2.00 |
| ⑥ | KF③ | 2.00 |
| **⑦** | **MP Point** | **1.89** |

→ 🧘 **OFF SEASON**

### ⚡ 9月土曜 テレビ塔（HIGH SEASON）
| Step | Factor | Point |
|:---:|---|:---:|
| ① | Season: 9月（AFest） | 5.00 |
| ② | Weekday: 土曜 | 5.00 |
| ③ | Visitor: 展望台+AFestブースト | 5.00 |
| **④** | **KF①** | **5.00** |
| ⑤ | KF② | 4.00 |
| ⑥ | KF③ | 4.00 |
| **⑦** | **MP Point** | **4.33** |

→ ⚡ **HIGH SEASON**

---

## §10. 究極目標

```
最適シフト = Momentum Peaks (Demand) × Talent Intelligence (Supply)
```

MP Pointが算出する「需要の熱量」と、TIが算出する「スタッフの戦闘力」を掛け合わせ、**ボタンひとつで最適シフトを提案する** = SVD-OS の究極目標。

---

## §11. Anti-patterns

- ❌ 整数に丸めてはいけない（`5` ではなく `5.00`）
- ❌ 単一因子（季節だけ、曜日だけ）で判断してはいけない
- ❌ 「忙しい/暇」の二元論で語ってはいけない
- ❌ 「なんとなく去年も忙しかったから」という直感を許容してはいけない
- ❌ 拠点ごとの特性を無視した一律適用をしてはいけない
- ❌ GAS以外のデータソースを正として扱ってはいけない（フォールバック専用のmp_data.jsonを正にしない）

---

## §12. パイプライン（データフロー）

```
Excel日報 → parse_*.py → csv_output/*.csv → import_csv_to_gas.py → GAS Sheets
                                                                        ↓
Dashboard ← app.js ← buildDataFromGAS() ← GAS_BRIDGE.loadAll() ← GAS API
```

### パーサー一覧
| Script | 拠点 | CSV |
|--------|------|-----|
| `parse_moiwayama.py` | 藻岩山 | `JW_daily.csv` |
| `parse_tv_tower.py` | テレビ塔 | `TV_TOWER_daily.csv` |
| `parse_okurayama.py` | 大倉山 | `OKURAYAMA_NP/Ce/RP_daily.csv` |
| `parse_akarenga.py` | 赤れんが | `BQ_daily.csv` |
| `parse_bg_excel.py` | BG | (BG専用) |

### インポートコマンド
```bash
# 全店舗一括
python3 mp_dashboard/gas/import_csv_to_gas.py --url <GAS_URL>

# 特定店舗のみ
python3 mp_dashboard/gas/import_csv_to_gas.py --url <GAS_URL> --store TVTOWER_GA

# ドライラン
python3 mp_dashboard/gas/import_csv_to_gas.py --url <GAS_URL> --dry-run
```

---

## §13. ファイルマップ

```
mp_dashboard/
├── index.html            — ダッシュボード本体
├── app.js                — メインロジック（SVD_CONFIG, isStoreHoliday, buildDataFromGAS含む）
├── gas_bridge.js         — GAS通信ブリッジ（importData含む）
├── mp_data.json          — フォールバックJSON（GASオフライン時 + 過去データソース）
├── CHANNEL_FORECAST_CONFIG.md — チャネル予測設定（本ファイルの§4と同内容）
└── gas/
    ├── Code.gs           — GASバックエンド（handleImport含む）
    └── import_to_sheets.py — CSVインポートスクリプト（Service Account版）
```

---

## §14. 🚨 セキュリティルール（絶対遵守）

### git push 絶対禁止

> **MPダッシュボードに関するファイルは、いかなる理由があっても `talent-intelligence-calculator2` やその他のパブリックリポジトリに git push してはならない。**

| ルール | 内容 |
|--------|------|
| push禁止 | `SVD_L1_08_Restaurant_Sales/mp_dashboard/` を含むcommitをパブリックリポにpushしない |
| .gitignore | `SVD_L1_08_Restaurant_Sales/` 全体が .gitignore 済み |
| 運用形態 | **localhost専用**（準備でき次第URL共有に移行予定） |
| AI Agent | `git push` コマンドをMP関連で提案・実行してはならない |

### ダッシュボード起動手順

```bash
# ローカルHTTPサーバー起動（mp_dashboardディレクトリから）
cd ~/dotfiles/SVD_L1_08_Restaurant_Sales/mp_dashboard
python3 -m http.server 8080
# ブラウザで http://localhost:8080 を開く
```

---

## §15. データ移行フロー（GAS-First初期セットアップ）

### 問題
mp_data.jsonに3年分の過去データがあるが、GASスプレッドシートには入力した分しかない。
→ フォーキャスト計算に必要な「同月×同曜日」の過去データが不足し、予測値が0になる。

### 解決: GASインポート機能

1. ダッシュボード → ⑤ DATA IMPORT タブ
2. GAS接続URLが設定済みであることを確認
3. **「📥 過去データをGASにインポート」** ボタンをクリック
4. mp_data.json → GAS STORE_SHEETSヘッダー形式に自動変換 → 8店舗一括送信
5. 完了後、自動的にデータを再読み込み

### ハイブリッドデータソース

GASインポートが完了するまでの間、`mergeHistoricalFallback()` が自動的にmp_data.jsonの過去データをGASデータに補完する。

```
GAS (SSoT) ← 最新データ優先
  ↑ 補完
mp_data.json ← GASにない日付のactual_sales>0のレコードのみ追加
```

GASにデータが蓄積されれば、mp_data.jsonからの補完は自然にゼロになる。

