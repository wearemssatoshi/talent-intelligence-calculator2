# 6. PL（PL Auto）プロジェクト資料

> 損益計算書自動化システム

---

## 📋 概要

PL Autoは、売上・原価・人件費を自動集計し、損益計算書を自動生成するシステム。

---

## 🗂️ 関連ファイル

### PaymentAnalysis（決済分析）
| ファイル | 説明 |
|----------|------|
| [svd_payment_dashboard.html](file:///Users/satoshiiga/dotfiles/PaymentAnalysis/svd_payment_dashboard.html) | 決済ダッシュボード |
| [svd_payment_summary.csv](file:///Users/satoshiiga/dotfiles/PaymentAnalysis/svd_payment_summary.csv) | 決済サマリー |
| [generate_payment_dashboard.py](file:///Users/satoshiiga/dotfiles/PaymentAnalysis/generate_payment_dashboard.py) | ダッシュボード生成 |
| [credit_card_summary_*.csv](file:///Users/satoshiiga/dotfiles/PaymentAnalysis/) | クレジットカード集計 |
| [electronic_money_summary_*.csv](file:///Users/satoshiiga/dotfiles/PaymentAnalysis/) | 電子マネー集計 |
| [labor_summary.csv](file:///Users/satoshiiga/dotfiles/PaymentAnalysis/labor_summary.csv) | 人件費集計 |

### 予算関連
| ファイル | 説明 |
|----------|------|
| [SVD_Gemini_R7Budget/](file:///Users/satoshiiga/dotfiles/SVD_Gemini_R7Budget/) | R7予算資料 |
| [SVD_Gemini_R8Budget/](file:///Users/satoshiiga/dotfiles/SVD_Gemini_R8Budget/) | R8予算資料 |

---

## ⏳ 計画中機能

| 機能 | 状態 | 説明 |
|------|------|------|
| 売上自動集計 | ⏳ | POS連携 |
| 原価自動計算 | ⏳ | 仕入れデータ連携 |
| 人件費自動計算 | ⏳ | シフトデータ連携 |
| FL比率分析 | ⏳ | Food & Labor Cost |
| 月次PL自動生成 | ⏳ | 1クリックレポート |
| 予実管理 | ⏳ | 予算対比分析 |

---

## 🏗️ 損益計算書構造

```
売上高
├── 売上原価（Food Cost）
│   └── 原価率計算
├── 人件費（Labor Cost）
│   └── FL比率
├── その他経費
│   ├── 家賃
│   ├── 光熱費
│   └── 消耗品
└── 営業利益
```

---

## 📊 主要KPI

| 指標 | 目標 |
|------|------|
| Food Cost | 30%以下 |
| Labor Cost | 30%以下 |
| FL比率 | 60%以下 |
| 営業利益率 | 10%以上 |

---

## 🔗 連携予定

- **MINDFUL**: シフトデータ → 人件費計算
- **MP**: 需要予測 → 売上予測
- **WINE**: ワイン原価 → 原価計算

---

## 📈 自動化フロー（計画）

```
POS売上データ → 自動取得
仕入れデータ → 自動取得
シフトデータ → MINDFUL連携
    ↓
自動計算
    ↓
月次PL自動生成
    ↓
予実比較レポート
```

---

*最終更新: 2026-02-05*
