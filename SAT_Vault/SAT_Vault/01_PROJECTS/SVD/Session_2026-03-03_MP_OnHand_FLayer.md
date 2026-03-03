---
date: 2026-03-03
tags: [SVD-OS, MomentumPeaks, F-Layer, OnHand]
status: completed
---

# MP v2.3 "F-Layer + OnHand" System 完成

## 概要

Momentum Peaks の予測エンジンに **F-Layer Forecast System** を完成させた。
TableCheck の予約データ（OnHand）を取り込み、確定済み予約を予測に反映する仕組み。

## 実装した機能

### 1. OnHand パーサー (`parse_onhand.py`)
- TableCheck CSVから個人情報を完全除去
- GA_宴会分離（「テレビ塔宴会コース」→ 独立store ID）
- NP定休日（12〜3月 火水）フラグ
- 20名以上ハイライト出力
- バラ予約日別集計

### 2. GAS OnHand API (`Code.gs`)
- `loadOnHand` — 全件取得（GET）
- `saveOnHand` — 1件UPSERT（POST）
- `importOnHand` — 全件入れ替え（POST weekly refresh）
- MP_OnHand シート自動作成

### 3. Forecast F-Layer (`app.js`)
- **定休日チェック**: NP火水（12〜3月）→ return 0
- **OnHand合流**: 確定予約をforecastに反映
- **二重計上防止**: GA/GA_宴会のみ加算、JW/NP/BQはメモ表示のみ
  - 理由: JW/NP/BQのF5（ロングラン予測）は過去の団体・宴会売上を含む

### 4. THE BRIDGE UI
- 🔴 定休日バッジ（store card）
- 🎯 OnHandバッジ（確定案件の人数＆金額）
- 🎯 OnHand Radar（30日先の大型案件一覧、50名↑赤 / 30名↑橙）

### 5. インフラ
- `import_onhand_to_gas.py` — GAS週次投入スクリプト
- clasp push/deploy ワークフロー確立（URL変更不要）
- GASデプロイ: @11 (OnHand API + Store Holidays)

## 運用ワークフロー（毎週月曜）

```bash
python3 parse_onhand.py on_hand/
python3 import_onhand_to_gas.py <GAS_URL>
```

## バグ修正

### Entryタブ拠点切替バグ
- **症状**: 売上入力タブで大倉山以外に遷移できない
- **原因**: `renderSalesForm` L1244 のベースタブonclickが `renderCommand()` を呼んでいた
- **修正**: `renderEntry()` に変更 + `selectedStoreFilter='ALL'` リセット

## デプロイ状況

| 対象 | 状態 | 備考 |
|:--|:--:|:--|
| GASバックエンド | ✅ @11 | clasp deploy完了、旧URL維持 |
| origin (GitHub) | ✅ push済 | talent-intelligence-calculator2 |
| GitHub Pages | ⚠️ 未デプロイ | pagesリモートへのpushが必要 |
| localhost:8888 | ✅ 最新反映 | リロードで確認可 |

## 設計上の重要な判断

| 判断 | 理由 |
|:--|:--|
| 最新CSVのみ処理 | TableCheckの「今の真実」を信じる。古いデータは差分管理の温床 |
| GA_宴会を独立store化 | 宴会場とレストランの売上を混合しない（予測精度向上） |
| OnHand加算はGA/GA_宴会のみ | F5が内包する店舗では二重計上になるため |
| 全件入れ替え方式 | ID重複排除の複雑さを排除、シンプルが正義 |

## 今後の展開

1. **TIブラッシュアップ**: MP×TI統合→「ワンボタンシフト生成」
2. **BGページブラッシュアップ**: ビアガーデンシーズン準備
3. **F2/F1レイヤー**: 天候予報・Timee API連携

## 関連ファイル

- [[MP_ARCHITECTURE]] — 設計書 v2.3
- `SVD_L1_08_Restaurant_Sales/parse_onhand.py`
- `SVD_L1_08_Restaurant_Sales/import_onhand_to_gas.py`
- `SVD_L1_08_Restaurant_Sales/mp_dashboard/app.js`
- `SVD_L1_08_Restaurant_Sales/mp_dashboard/gas/Code.gs`
