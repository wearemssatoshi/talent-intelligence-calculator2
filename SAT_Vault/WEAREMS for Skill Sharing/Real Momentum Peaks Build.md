# Real Momentum Peaks Build: Industry Intuition to Precision Engineering

**Created:** 2026-02-15
**Last Updated:** 2026-02-15 20:30
**Status:** Phase 1.5 Complete → Phase 2 Backend START
**Tech Stack:** Vanilla JS, Python (Pandas/CSV), Chart.js, GAS (Next)
**Core Philosophy:** 脱・業界の「なんとなく」 (Eliminating "Somehow" Intuition)

---

## 1. Overview: The Shift to Precision

This document captures the architectural evolution of the **Momentum Peaks Dashboard** (Feb 2026).
Our goal was to replace the restaurant industry's reliance on "intuition and grit" with a **precision engineering approach** to sales forecasting and labor management.

The core challenge was aligning disparate data sources (Excel daily reports from 2023-2025 across 9 different stores) into a single, unified "Command Center" that speaks the truth about our business performance.

## 2. Phase 1: The Foundation (Command Center)

We rebuilt the dashboard from scratch to serve as a central operating system for SVD managers.

### Key Architectural Decisions:
1.  **"Same Sekki x Same Weekday" Matching Logic**:
    *   Instead of simple Year-Over-Year (YoY) comparison, we implemented a sophisticated search algorithm.
    *   It finds past days that match both the current **24 Sekki (Solar Term)** and the **Weekday**.
    *   This eliminates weather/season seasonality noise and provides a "True Forecast".

2.  **Unified Navigation Architecture**:
    *   **Tab 1: COMMAND CENTER** — The executive summary. Real-time Sales vs Forecast.
    *   **Tab 2: FORECAST DETAIL** — Deep dive into the "Why" (matching records).
    *   **Tab 3: FORECAST CHART** — Visual trend analysis.
    *   **Tab 4: DATA IMPORT** — The ingestion engine.
    *   **Tab 5: STAFFING** — The "One Button Shift" goal.

3.  **Visual Language**:
    *   Adopted the **"Silent Gold"** design system. Dark mode by default, Gold for Actuals, Blue for Forecasts.
    *   **`fmt$` Utility**: Standardized currency formatting to avoid ambiguity.

## 3. Phase 1.5: Store Specificity (The "Form" Revolution)

The generic "Food/Drink Sales" form was insufficient for the complex reality of SVD's portfolio. We needed to capture **specific revenue streams** without complicating the UI.

### The Problem
*   **JW:** Has "Lock Fees" (南京錠) and "Curry" sales that are distinct from standard dining.
*   **GA:** Manages "Ticket Sales" (展望台) and "Beer Garden" (seasonal).
*   **NP:** Heavy reliance on "Wedding/Banquet" (婚礼・宴会) revenue.
*   **Generic Forms:** Failed to capture these nuances, leading to "Other" bucket overflow and data rot.

### The Solution: Dynamic `STORE_FORMS` Configuration
We implemented a configuration-driven architecture in `app.js`. The form renders dynamically based on the selected store ID.

```javascript
const STORE_FORMS = {
    'JW': [
        { id: 'LUNCH', type: 'section', title: '🌤 LUNCH', fields: ['count', 'food', 'drink'] },
        { id: 'MISC', type: 'group', title: '📋 その他', items: [{ ch: '南京錠', label: '南京錠' }, ...]}
    ],
    'GA': [
        { id: 'BEARGARDEN', type: 'section', title: '🍺 ビアガーデン', fields: ['count', 'sales'] },
        ...
    ]
};
```

### The Tax Logic Strategy (Management View)
We made a critical decision to prioritize **Tax Excluded (税抜)** numbers for management, while supporting **Tax Included (税込)** input for onsite staff convenience.

*   **Input:** Checkbox default "Tax Included Mode" (税込入力). Staff enters receipt totals directly.
*   **Process:** System automatically calculates `Val / 1.10`.
*   **Output:** Dashboard displays **Tax Excluded** as the primary metric (Gold/Large font), with Tax Included as secondary.
*   **Correction:** Fixed historical comparison bugs by standardizing all internal storage to Tax Included, but converting on-the-fly for display.

---

## 4. Session 2026-02-15: Channel Refinement & Forecast Documentation

### 4.1 チャネル精密化

全4拠点のチャネル構造を精密化し、実際のCSVデータカラムと完全に一致させた。

| 拠店 | 変更前 | 変更後 |
|------|--------|--------|
| Ce/RP | ALL（一括） | ☕ CAFE + 🛍 GOODS（個別） |
| GA | TAKEOUT | 🍷 WINE BAR（実態に合致） |
| GA | なし | 🎉 宴会/バンケット（F/B/客数） |
| GA | なし | 室料 / 展望台チケット（明示化） |
| 全店 | なし | ⚡ SP（内特需案件） |

### 4.2 正式店名の反映

`restaurant_config.json` の店名を全て正式名称に統一:

| ID | 正式名称 |
|----|---------|
| JW | THE JEWELS |
| GA | THE GARDEN SAPPORO HOKKAIDO GRILLE |
| BG | さっぽろテレビ塔ビアガーデン |
| BQ | LA BRIQUE SAPPORO Akarenga Terrace |
| RYB | ルスツ羊蹄とんかつテラス by BQ |

### 4.3 予測エンジンの構造解明

MPダッシュボードには **2つの予測エンジン** が搭載されている:

| エンジン | 用途 | ロジック |
|---------|------|---------|
| `forecastForDate` | COMMAND CENTER（日次） | 同節気×同曜日の実績平均（N数表示＋信頼度バッジ） |
| `runForecast` | FORECAST タブ（期間） | KF①②③ 三因子モデル → MP Point → 月別平均日次売上 × (MP/3.0) |

### 4.4 データ検証で判明した事実

- **JW席料**: 全曜日で発生率80〜92%。偏りは**ほぼない**。現行ロジックが有効
- **JW席料単価**: R5→R7で約1.8倍に上昇（¥16,000→¥31,000/日）
- **データ規模**: 7店舗合計 7,672レコード（RYBのみMP CSV欠如）

### 4.5 残課題（7項目）

1. 🔴 南京錠の月曜集中計上ルール未反映
2. 🟡 婚礼・宴会の予約駆動型予測の弱さ
3. 🟡 季節指数が全拠点共通（拠点別差分なし）
4. 🟡 天候ファクター未導入（特にBG）
5. 🟠 RYBのMP事前計算データ欠如
6. 🟠 赤れんがの来場者指数未定義
7. 🔵 SPチャネルのデータ蓄積待ち

---

## 5. Technical Insights

*   **No-Framework Approach:** We deliberately avoided React/Vue/Next.js for the dashboard itself to ensure **maximum speed** and **zero build step** for the CSV processing pipeline. It runs directly in the browser.
*   **Data Pipeline:**
    *   `Raw Excel (Daily Reports)` -> `Python Parser` -> `Standardized CSV` -> `JSON Generator` -> `Dashboard (JS)`
    *   This pipeline ensures that historical data (Excel legacy) is treated with the same respect as new digital data.

## 6. Phase 2: Backend Construction (GAS + Google Sheets) — NOW

### The "GAS" Strategy (Google Apps Script)
Instead of expensive AWS/GCP servers, we will use the SVD ecosystem's native tongue: **GAS + Google Sheets**.

*   **API Endpoint:** Deploy a `doPost()` / `doGet()` API on maximizing the "Zero Cost" infrastructure.
*   **The "Database":** A dedicated Google Sheet acting as a relational database for daily sales records.
*   **Multi-Device Sync:**
    *   Manager at JW enters data on iPad.
    *   GM (SAT) checks dashboard on Mac at HQ.
    *   Data updates instantly across the network.
*   **Identity Awareness:** Simple passcode authentication to tag *who* made the edit (Audit Logs).

### Backend Architecture Target

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  MP Dashboard │ ←→  │  GAS API     │ ←→  │ Google Sheet  │
│  (Frontend)   │      │  doPost/Get  │      │  (Database)   │
│  app.js       │      │              │      │  MP_Data      │
└──────────────┘      └──────────────┘      └──────────────┘
        ↓                                          ↑
  localStorage                              CSV Seed Import
  (offline cache)                           (Initial Load)
```

### Immediate Next Actions
1. Google Sheet構造設計（シート名、カラム定義）
2. GAS doPost/doGet API実装
3. CSVシードデータのインポート
4. フロントエンドのfetch統合
5. **予算（Budget）連携** ← SATの急務

## 7. The Horizon: From "Monitor" to "Generator"

### Phase 3: "One Button" Staffing (Auto-Shift)
*   **Logic:** `Predicted Sales` ÷ `Efficiency KPI` = `Required Staff`.
*   **Action:** The system will output the *exact number of staff needed* for Lunch/Dinner based on the forecast.
*   **Integration:** Connects directly with the **SVD Shift Scheduler**.

### Phase 4: Autonomous "MP Agent"
*   **Anomaly Detection:** "Alert: JW Lunch sales are 20% below forecast. Suggested action: Check staff ratio."
*   **Daily Briefing:** Auto-generated PDF reports sent to LINE/Discord every morning, summarizing yesterday's truth and today's battle plan.

---

## 📎 Related Files

| ファイル | 場所 | 内容 |
|---------|------|------|
| app.js | `mp_dashboard/app.js` | フロントエンド全ロジック |
| generate_mp_json.py | `mp_dashboard/generate_mp_json.py` | CSV→JSON変換 |
| restaurant_config.json | `mp_engine/restaurant_config.json` | 全拠点チャネル定義 |
| MP_Forecast_Rationale_All_Bases.md | `SAT_Vault/WEAREMS for Skill Sharing/` | 予測算出根拠 全拠点完全解説 |

---
**Conclusion:**
We have successfully built the **"Brain"** (Logic) and the **"Face"** (UI).
Now, we build the **"Nervous System"** (Connectivity).
This is the beginning of the end for "Intuition-based Management".

*Generated by G-Satellite System for SATOSHI IGA*
