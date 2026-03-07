# 3. MP（Momentum Peaks）プロジェクト資料

> 需要予測＆シフト最適化システム — GAS-First Architecture

---

## 📋 概要

Momentum Peaksは、環境要因（季節、曜日、来場者）を数値化し、需要を予測するシステム。シフト最適化の「需要側」データを提供。「業界のなんとなく」を排し、データに基づく**適正フォーキャスト**を算出する。

---

## 🗂️ 関連ファイル

| ファイル | 説明 |
|----------|------|
| [index.html](file:///Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/mp_dashboard/index.html) | メインダッシュボード |
| [app.js](file:///Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/mp_dashboard/app.js) | フロントエンドロジック |
| [gas_bridge.js](file:///Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/mp_dashboard/gas_bridge.js) | GAS通信ブリッジ |
| [Code.gs](file:///Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/mp_dashboard/gas/Code.gs) | GASバックエンド |
| [SKILL.md](file:///Users/satoshiiga/dotfiles/.agent/skills/momentum-peaks/SKILL.md) | **MP完全憲法（唯一の設計図）** |
| [MP_ARCHITECTURE.md](file:///Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/mp_dashboard/MP_ARCHITECTURE.md) | アーキテクチャ設計書 |
| [enter_survey.html](file:///Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/mp_dashboard/enter_survey.html) | スタッフ配置定義（TIモデルシフト候補） |

---

## 🏗️ アーキテクチャ（GAS-First v4.5 — 2026-03-05）

### Single Source of Truth
- **GASが唯一の正**
- `mp_data.json` はフォールバック専用
- 静的config（拠点定指数、sekki）は `app.js` の `SVD_CONFIG` に定義

### GASバックエンド
```
URL: https://script.google.com/macros/s/AKfycbyE_uNfiMB6_szu0D0cQoR8JBgwxXm-3H45DGs6qXLpgiz5kYCxBgg961nqR7RXs1jg/exec
Token: a6b93874301b54dac9a37afc89d04f56
Deploy: @19 (v4.5)
```

### 8店舗シート構成
| Sheet | ヘッダー |
|---|---|
| MOIWA_JW | date\|L_Food\|L_Drink\|L人数\|D_Food\|D_Drink\|D人数\|TO_Food\|TO_Drink\|席料\|南京錠\|花束\|物販 |
| TVTOWER_GA | date\|L/D + **3CH_Food\|3CH_Drink\|3CH人数** + 宴会 + 室料\|展望台\|物販 |
| TVTOWER_BG | date\|Food\|Drink\|Tent\|人数\|物販 |
| OKURAYAMA_NP | date\|L/D + 室料\|花束\|Event\|物販 |
| OKURAYAMA_Ce | date\|Food\|Drink\|人数\|物販 |
| OKURAYAMA_RP | date\|Food\|Drink\|人数\|物販 |
| AKARENGA_BQ | date\|L/AT/D + 席料\|物販 |
| AKARENGA_RYB | date\|Food\|Drink\|人数\|物販 |

> **3CH** = 第3チャネル統合（TO→AT→WB の時代変遷を1つに統合）

---

## 📊 F-Layer フォーキャスト統合ルール

```
F1: Historical Weighted　→ 同月×同曜日の成長加重平均（基盤）
F2: チャネル別分解　　　→ 5分類ルール適用（通常/予約確定/天候/付帯/成長）
F3: OnHand合流　　　　　→ 全店舗で予約データ加算（キャンセル除外）
F4: Walk-in Layer　　　 → 当日〜翌日のみ、1組2名×客単価
F5: 最終統合　　　　　　→ F2 + F3 + F4 = predicted_sales
```

### OnHand反映ルール
- **全店舗** で加算（`addOnHand = true`）
- ステータス: キャンセル/ノーショー**除外**方式
- GA宴会: コース名「宴会」含む → `GA_宴会` に分離

---

## ✅ 実装済み機能

| 機能 | 状態 |
|------|------|
| 2層統合需要定量化 (KF1/KF2/KF3) | ✅ |
| GAS-First Architecture | ✅ |
| 8店舗×チャネル別フォーキャスト | ✅ |
| OnHand統合（TableCheck CSV取込） | ✅ |
| F-Layer 5段階予測統合 | ✅ |
| GA 3CH統合（TO→AT→WB） | ✅ |
| GA宴会分離 | ✅ |
| Walk-in Layer | ✅ |
| OnHand Radar（大型案件アラート） | ✅ |
| 5段階ステータス（TOP/HIGH/FLOW/LOW/OFF） | ✅ |
| 定休日自動判定（NP水曜/火水） | ✅ |
| モデルシフト連携 | ⏳ TI側で構築予定 |
| 1ボタンシフト最適化 | ⏳ MP×TI統合後 |

---

## 🚀 起動方法

ターミナルで `mp` と入力 → サーバー起動 + ブラウザ自動オープン

---

## 🎯 究極の目標

```
最適シフト = Momentum Peaks (Demand) × Talent Intelligence (Supply)
```

**1ボタンで最適シフトを提案する** = SVD-OS の究極目標

---

*最終更新: 2026-03-05*
