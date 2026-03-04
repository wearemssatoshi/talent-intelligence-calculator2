---
name: momentum-peaks
description: "売上予測・需要予測に関する質問、シフト人数の計算、モメンタムピークスの計算、二十四節気の係数、拠点定指数、営業インテンシティの算出が必要な時に発動する。"
---

# Momentum Peaks — 需要予測スキル 📈

SVDが開発した独自の需要予測フレームワーク。「業界のなんとなく」を排し、データに基づく**適正フォーキャスト**を算出する。

## Core Rules

### 2層構造の計算ルール

**Layer 1: 拠点レベル（定数）**
1. **① 月別季節指数** (1.00-5.00): 地域の季節要因
2. **② 月別曜日指数** (1.00-5.00): 曜日ごとの需要パターン
3. **③ 月別来場者指数** (1.00-5.00): 施設来場者の実績
4. **④ KF① = (① + ② + ③) / 3**

**Layer 2: 店舗レベル（実績）**
5. **⑤ KF②**: 月別売上実績平均
6. **⑥ KF③**: 月別来客者数平均

**最終統合:**
7. **⑦ Momentum Peaks Point = (KF① + KF② + KF③) / 3**

### 二十四節気モデル（日本独自の差別化）

365日を二十四節気で24分割し、繁忙係数（×0.7〜×1.5）を割り当てる。
海外の「月×曜日」単純モデルに対し、**二十四節気×POS×予約の三層モデル**で差別化。

詳細: `references/sekki_model.md`

### スケール表示ルール
- 全指数は **小数点以下2桁** で表示（例: `5.00` ではなく `5` とは書かない）
- 科学的精度の表現として統一

## Output Format

```json
{
  "momentum_peaks_point": 4.83,
  "status": "HYPER-INTENSITY",
  "kf1_base_index": 4.50,
  "kf2_sales_factor": 5.00,
  "kf3_customer_factor": 5.00,
  "sekki": "大雪",
  "sekki_coefficient": 1.5,
  "recommended_staff": 15
}
```

### ステータス分類
| 範囲 | ステータス | 意味 |
|------|-----------|------|
| 4.00-5.00 | 🔥 HYPER-INTENSITY | フル稼働・最大配置 |
| 3.00-3.99 | ⚡ HIGH-HEAT | 増員推奨 |
| 2.00-2.99 | 🌤️ STANDARD-FLOW | 標準構成 |
| 1.00-1.99 | 🧊 STABLE-FLOW | 最小構成・戦略日 |

## Anti-patterns

- ❌ 整数に丸めてはいけない（`5` ではなく `5.00`）
- ❌ 単一因子（季節だけ、曜日だけ）で判断してはいけない
- ❌ 「忙しい/暇」の二元論で語ってはいけない。営業インテンシティとして段階的に表現する
- ❌ 「なんとなく去年も忙しかったから」という直感を許容してはいけない
- ❌ 拠点ごとの特性を無視した一律適用をしてはいけない

## データアーキテクチャ

### GAS-First Architecture
- **GASが唯一の正**（Single Source of Truth）
- `mp_data.json` はGASオフライン時のフォールバック専用
- 静的config（bases, sekki_levels）は `app.js` の `SVD_CONFIG` に定義
- KF2/KF3はGAS実績データからmin-max正規化で算出

### チャネル別予測前提（5分類）

| Type | Method | 説明 | OnHand反映 |
|---|---|---|---|
| `通常営業` | `historical_weighted` | 同月×同曜日の成長加重平均 | 予約進捗率 |
| `予約確定` | `onhand_only` | OnHand確定予約が唯一のソース | 確定額=予測値 |
| `天候依存` | `weather_adjusted` | 実績×**0.75**（天候保守係数） | 予約進捗率 |
| `付帯収入` | `recent_90d_avg` | 直近90日の日平均 | 反映しない |
| `成長チャネル` | `growth_target` | 前月実績×1.10（自動BL） | 予約進捗率 |

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

詳細: `references/channel_forecast.md`

## 計算スクリプト

```bash
python scripts/momentum_calculator.py <売上CSV> [日付列] [売上列]
```

## 関連リファレンス
- `references/fixed_indices.md` — 拠点定指数テーブル
- `references/sekki_model.md` — 二十四節気モデル
- `references/calculation_examples.md` — 詳細計算シナリオ
- `references/channel_forecast.md` — チャネル別予測設定（全店舗完全版）
- `assets/base_config.json` — 4拠点設定データ
