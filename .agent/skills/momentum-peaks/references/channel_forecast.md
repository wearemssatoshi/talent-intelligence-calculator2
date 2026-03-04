# MP Channel Forecast Configuration
> SVD Momentum Peaks — チャネル別予測前提の完全定義

## 予測タイプ（5分類）

| Type | Method | Description |
|---|---|---|
| `通常営業` | `historical_weighted` | 過去実績（同月×同曜日）の成長加重平均。MP標準。 |
| `予約確定` | `onhand_only` | OnHand（確定予約）が唯一のソース。過去実績は参照しない。 |
| `天候依存` | `weather_adjusted` | 実績ベース × **0.75**（天候保守係数）。トップシーズンはOnHandでカバー。 |
| `付帯収入` | `recent_90d_avg` | 直近90日の日平均値。安定的で予測不要。 |
| `成長チャネル` | `growth_target` | 前月実績 × 1.10（月10%成長）を自動ベースライン。目標設定があれば上書き。 |

## OnHand反映ルール

| チャネルType | OnHand反映方法 |
|---|---|
| 通常営業 | **予約進捗率**として表示（OnHand確定 / Forecast × 100%） |
| 予約確定 | **確定額 = 予測値**。Forecastは出さない。 |
| 天候依存 | **予約進捗率**として表示 |
| 付帯収入 | 反映しない |
| 成長チャネル | **予約進捗率**として表示 |

---

## 全店舗チャネル設定

### MOIWAYAMA / JW（もいわ山 ザ ジュエルズ）
```
LUNCH    → 通常営業  historical_weighted  ※土日祝のみ（平日ランチ休み）
DINNER   → 通常営業  historical_weighted
T.O      → 通常営業  historical_weighted
席料     → 付帯      recent_90d_avg
南京錠   → 付帯      recent_90d_avg
花束     → 付帯      recent_90d_avg
物販     → 付帯      recent_90d_avg
```

---

### TV_TOWER / GA（テレビ塔 ザ ガーデン）
```
LUNCH    → 通常営業    historical_weighted
DINNER   → 通常営業    historical_weighted
WINE_BAR → 成長チャネル growth_target        ※2026/2開始、前月+10%自動BL
宴会     → 予約確定    onhand_only           ※OnHandが唯一の正
室料     → 付帯        recent_90d_avg
展望台   → 付帯        recent_90d_avg
花束     → 付帯        recent_90d_avg
物販     → 付帯        recent_90d_avg
```

---

### TV_TOWER / BG（テレビ塔 ビアガーデン）
```
MAIN     → 天候依存  weather_adjusted  ※実績×0.75、トップシーズンはOnHand
テント   → 天候依存  weather_adjusted
物販     → 付帯      recent_90d_avg
```

---

### OKURAYAMA / NP（大倉山 ヌーベルプース）
```
LUNCH    → 通常営業  historical_weighted
DINNER   → 通常営業  historical_weighted
Event    → 予約確定  onhand_only           ※ウェディング/イベント、OnHandが正
室料     → 付帯      recent_90d_avg
花束     → 付帯      recent_90d_avg
物販     → 付帯      recent_90d_avg
```
**定休日ルール:**
- 4/1〜10/31: 毎週**水曜**定休
- 11/1〜3/31: 毎週**火曜・水曜**定休
- 年末年始: **12/27〜1/3** 休業
  - 例外: **12/31 おせち営業**（実績¥1,700,000）
- ※祝日に当たる場合は営業に変更あり

---

### OKURAYAMA / Ce（大倉山 セレステ）
```
ALL      → 通常営業  historical_weighted   ※単一チャネル
物販     → 付帯      recent_90d_avg
```

---

### OKURAYAMA / RP（大倉山 ルポ）
```
ALL      → 通常営業  historical_weighted   ※単一チャネル
物販     → 付帯      recent_90d_avg
```

---

### AKARENGA / BQ（赤れんがテラス ブリック）
```
LUNCH    → 通常営業  historical_weighted
AT       → 通常営業  historical_weighted   ※アフターヌーンティー
DINNER   → 通常営業  historical_weighted
席料     → 付帯      recent_90d_avg
物販     → 付帯      recent_90d_avg
```

---

### AKARENGA / RYB（赤れんがテラス ルスツ羊蹄豚）
```
ALL      → 通常営業  historical_weighted   ※単一チャネル
物販     → 付帯      recent_90d_avg
```

---

## BG天候保守係数

| 時間軸 | ロジック |
|---|---|
| トップシーズン | OnHand（予約）でほぼ確定 |
| 1〜2週先 | 実績ベース × **0.75** |
| 当日〜数日前 | OnHand確定 + ウォークイン見込み |

## WINE BAR 自動ベースライン

```
ベースライン = 前月実績 × 1.10（月10%成長）
目標が明示設定されていれば → 目標値を優先
実績12ヶ月以上蓄積後 → historical_weighted に昇格
```
