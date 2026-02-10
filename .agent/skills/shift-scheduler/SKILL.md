---
name: shift-scheduler
description: 売上予測（Momentum Peaks）とスタッフ能力（Talent Intelligence）を統合し、最適なシフトを提案する。WEAREMS独自の「ワンボタンシフト生成」スキル。TI/MPのデータ成熟度に応じて段階的に機能が拡張される。
---

# Shift Scheduler Skill — WEAREMS Proprietary

**DEMAND × SUPPLY = OPTIMAL SHIFT**

SVD-OSの究極目標「ワンボタンシフト生成（業務革命）」を実現するためのスキル。
Momentum Peaks（需要予測）とTalent Intelligence（人材戦闘力）を掛け合わせ、最適なシフトを自動生成する。

## When to Activate

- シフト作成/調整の依頼
- 「明日の人数は？」「来週の適正配置は？」等の質問
- Momentum Peaks スコアに基づく人員計画
- イベント/繁忙期の人員配置設計
- Google Calendar への自動シフト登録

## Core Formula

```
Optimal Shift = MP(需要) × TI(供給)

Where:
  MP = Momentum Peaks Point（営業インテンシティ）
  TI = Talent Intelligence Combat Power（スタッフ戦闘力）
```

## Progressive Maturity Model

スキルはTI/MPのデータ成熟度に応じて段階的に拡張される。

### Lv.1: Template Mode（現在）
**条件**: TI/MPデータ未整備
**機能**:
- 構造化されたシフトテンプレートの生成
- 曜日別の基本パターン提案
- 拠点別の営業時間マッピング

```
出力例:
┌──────────────────────────────────────┐
│ THE JEWELS (藻岩山) — 2026/02/15 (土)│
├──────────────────────────────────────┤
│ LUNCH  11:30-15:00                   │
│   ホール: __ 名 / キッチン: __ 名    │
│ DINNER 17:00-22:00                   │
│   ホール: __ 名 / キッチン: __ 名    │
└──────────────────────────────────────┘
```

### Lv.2: Recommendation Mode
**条件**: MP基本指数 + TI基本属性が設定済み
**機能**:
- MP月別季節指数に基づく推奨人数
- TI属性レベルを考慮したスタッフ選定
- 曜日×季節のクロス分析

```
出力例:
┌──────────────────────────────────────────────┐
│ THE JEWELS — 2026/02/15 (土)                 │
│ MP Point: 4.20 (High Season × Weekend)       │
├──────────────────────────────────────────────┤
│ LUNCH  推奨: ホール 4名 / キッチン 3名       │
│ DINNER 推奨: ホール 5名 / キッチン 4名       │
│                                              │
│ 📊 根拠: 季節指数 4.5 × 曜日指数 4.0        │
│         来場者指数 4.1 → MP Point 4.20       │
└──────────────────────────────────────────────┘
```

### Lv.3: One-Button Mode（究極目標）
**条件**: MP全指数 + TI 18属性 + 過去実績データ完備
**機能**:
- ワンボタンで最適シフト自動生成
- スタッフ個別の戦闘力マッチング
- Google Calendar MCPへの直接登録
- 不足人員アラート + Timee連携提案

```
出力例:
┌────────────────────────────────────────────────────┐
│ 🔵 ONE-BUTTON SHIFT: THE JEWELS — 2026/02/15 (土) │
│ MP Point: 4.20 │ Required Power: 32,000           │
├────────────────────────────────────────────────────┤
│ LUNCH 11:30-15:00 │ Total Power: 33,500 ✅        │
│   田中 (Lv.4 / Power: 8,500) — ホールリーダー      │
│   佐藤 (Lv.3 / Power: 6,200) — ホール              │
│   鈴木 (Lv.3 / Power: 5,800) — ホール              │
│   李   (Lv.2 / Power: 4,000) — ホール              │
│   山田 (Lv.4 / Power: 9,000) — キッチンチーフ      │
│   ── 以下略 ──                                      │
├────────────────────────────────────────────────────┤
│ ⚠️ DINNER: Power不足 (-2,300)                      │
│   → Timeeスポットワーカー 1名推奨                   │
│   → 必要スキル: ホール基礎 Lv.2+                    │
├────────────────────────────────────────────────────┤
│ [📅 Googleカレンダーに登録] [📤 LINE通知送信]       │
└────────────────────────────────────────────────────┘
```

## Architecture

### Data Flow

```
┌─────────────────┐     ┌─────────────────────┐
│ Momentum Peaks  │     │ Talent Intelligence  │
│ (Demand)        │     │ (Supply)             │
│                 │     │                      │
│ ① 季節指数      │     │ 18属性評価            │
│ ② 曜日指数      │     │ 役職・拠点情報        │
│ ③ 来場者指数    │     │ 戦闘力スコア          │
│ ④ 拠点指数      │     │ 資格・スキルパスポート │
│ ⑤ 売上平均      │     │                      │
│ ⑥ 来客数平均    │     │                      │
│ ⑦ MP Point      │     │                      │
└────────┬────────┘     └──────────┬──────────┘
         │                        │
         ▼                        ▼
┌──────────────────────────────────────────┐
│         Shift Scheduler Engine           │
│                                          │
│  MP Point → 必要戦闘力 → スタッフ選定    │
│  → 最適シフト生成 → Calendar MCP登録     │
└──────────────────────────────────────────┘
```

### Base Map (拠点マップ)

| Base | Store | Segments |
|---|---|---|
| 藻岩山 | THE JEWELS | LUNCH, DINNER |
| 藻岩山 | JW_TakeOut | ALL_DAY |
| 大倉山 | NOUVELLE POUSSE | LUNCH, DINNER |
| 大倉山 | CELESTÉ | ALL_DAY |
| 大倉山 | PEPOS | ALL_DAY |
| TV塔 | THE GARDEN | LUNCH, DINNER |
| TV塔 | GA_WINEBAR | NIGHT |
| TV塔 | GA_BANQUET | EVENT |
| TV塔 | BEER GARDEN | SUMMER |
| 赤れんが | LA BRIQUE | LUNCH, DINNER |
| 赤れんが | RYB | LUNCH, DINNER |

### MP → Required Staff Mapping

MP Pointから必要人数への変換テーブル（拠点・セグメント別に調整）:

| MP Point | 営業強度 | 必要人数倍率 |
|---|---|---|
| 1.0 - 2.0 | Low | ×0.7（最少配置） |
| 2.0 - 3.0 | Normal | ×1.0（標準配置） |
| 3.0 - 4.0 | High | ×1.3（増員配置） |
| 4.0 - 5.0 | Peak | ×1.6（最大配置） |

## Integration Points

### Google Calendar MCP
Lv.3ではシフトをGoogleカレンダーに直接登録:
- `create-event`: スタッフごとのシフトイベント作成
- `get-freebusy`: スタッフの空き状況確認
- `list-events`: 既存シフトの確認

### Momentum Peaks Skill
`updraft/momentum-peaks` スキルから需要予測データを取得。

### Talent Intelligence
TI Calculator (v8.x) のスプレッドシートからスタッフデータを取得。

## Current Status

- **Lv.1**: ✅ テンプレート生成可能
- **Lv.2**: 🔜 MP/TI基本指数の設定待ち
- **Lv.3**: 📋 MP全指数 + TI 18属性の完全データが必要
