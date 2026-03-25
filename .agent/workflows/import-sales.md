---
description: 売上日報Excelを読み込んでGASに流す。「売上読み込んで」「日報インポート」「Excelからインポート」等で発動。
---

# 売上日報 Excel → GAS インポート

// turbo-all

## 概要

dotfiles内の各拠点フォルダにある売上日報Excelを、店舗専用パーサーで読み込み、GASスプレッドシートに自動送信する。

## Excel置き場（既存構造）

```
SVD_L1_08_Restaurant_Sales/
├── Mt.MOIWA/MW20XX/       → JW（藻岩山 THE JEWELS）
├── TV_TOWER/TV20XX/       → GA（テレビ塔 THE GARDEN）, BG
├── OKURAYAMA/OK20XX/      → NP, Ce, RP（大倉山）
└── Akarenga/AK20XX/       → BQ, RYB（赤れんがテラス）
```

## STEP 1: パース（Excel → CSV）

最新のExcelファイルだけを対象にパースする。`--latest` オプションで自動判定。

```bash
cd /Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales && python3 parse_all_stores.py
```

> SATに確認：どの拠点のExcelが更新されたか聞いてから実行すること。
> 全店舗一括よりも、更新された店舗だけを対象にする方が安全。

## STEP 2: GAS送信（CSV → GASスプレッドシート）

パース結果のCSVをGAS APIに送信する。

```bash
cd /Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales && python3 mp_dashboard/gas/import_csv_to_gas.py --url https://script.google.com/macros/s/AKfycbyE_uNfiMB6_szu0D0cQoR8JBgwxXm-3H45DGs6qXLpgiz5kYCxBgg961nqR7RXs1jg/exec
```

## STEP 3: 確認

GASへの送信完了後:
1. SATに送信結果（成功件数/エラー件数）を報告する
2. 必要に応じてMPダッシュボードで表示確認

## パーサー一覧

| 拠点 | パーサー | 対象Excel |
|---|---|---|
| 藻岩山 (JW) | `parse_all_stores.py` → `parse_jw()` | `Mt.MOIWA/MW20XX/MW*.xlsx` |
| テレビ塔 (GA) | `parse_tv_tower.py` | `TV_TOWER/TV20XX/TV*.xlsx` |
| テレビ塔 (BG) | `parse_bg_excel.py` | `TV_TOWER/TV20XX/BG*.xlsx` |
| 大倉山 (NP) | `parse_all_stores.py` → `parse_np()` | `OKURAYAMA/OK20XX/NP*.xlsx` |
| 大倉山 (Ce) | 未実装 | `OKURAYAMA/OK20XX/セレステ*.xlsx` |
| 大倉山 (RP) | 未実装 | `OKURAYAMA/OK20XX/ルポ*.xlsx` |
| 赤れんが (BQ) | `parse_all_stores.py` → `parse_bq()` | `Akarenga/AK20XX/*.xlsx` |
| 赤れんが (RYB) | import_csv_to_gas.py内 | `Akarenga/AK20XX/*.xlsx` |

## 注意事項

- ⚠️ **Excelの税込/税抜は店舗ごとに異なる** — パーサーが自動処理
- ⚠️ **フォーマットはバラバラ** — 各パーサーが個別対応
- 🔐 Git push 禁止 — SVD_L1_08_Restaurant_Sales/ は .gitignore 済み
