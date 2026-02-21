# MP Dashboard 構築セッションログ

> **2025-02-15 — SAT × G**
> ゼロからやり直しにならないために刻む。

---

## ❌ やってはいけないこと（SATからの指摘）

1. **ファッションでゴミを作るな** — 見た目だけ綺麗で中身が伴わないダッシュボードは不要
2. **気分で設計するな** — Blueprint設計図に基づいたアウトプットのみを残す
3. **勝手に決めつけるな** — SATの確認を取ってから進める。1拠点ずつ慎重に
4. **THE JEWELS は必ず全て大文字** — `The Jewels` ではない。`THE JEWELS`

---

## ✅ 絶対に間違えてはいけない構造

### 3層構造: 拠点 → レストラン → チャネル

> **拠点（Base）はレストランの名前ではない。場所の名前。**
> その中にレストランがあり、レストランの中にチャネルがある。

```
拠点（場所）
  └─ レストラン（店舗）
       └─ チャネル（売上区分）
```

### 4拠点

| 拠点 | レストラン |
|------|-----------|
| **藻岩山** | JW — THE JEWELS |
| **大倉山** | NP — ヌーベルプース大倉山 / Ce — カフェ / RP — ラウンジ |
| **テレビ塔** | GA — ザ ガーデン サッポロ |
| **赤れんが** | BQ — ラ・ブリック |

---

## 🔑 SATが確認済みのチャネル構成

### 藻岩山 — JW (THE JEWELS)

SATの言葉そのまま:
> L&D / 席料 / TO / 南京錠・花束（プラン） / モーリスカレー

- **L&D** = ランチ & ディナー
- **席料** = seat_fee
- **TO** = テイクアウト (to_total)
- **南京錠・花束** = 「プラン」としてグルーピング (lock_fee, flower)
- **モーリスカレー** = curry（正式名称は「モーリスカレー」、「カレー」ではない）

### 大倉山 — NP (ヌーベルプース大倉山)

SATの言葉（途中まで）:
> L&D / 室料・席料 / イベント /

- **L&D** = ランチ & ディナー
- **室料・席料** = room_fee（L/D/イベントそれぞれにある）
- **イベント** = 宴会 (event)
- ※ 残りはSATの確認待ち

### テレビ塔 — GA / 赤れんが — BQ

**未確認。SATの指示を待つ。**

---

## 📁 CSVカラム（実データから確認済み）

### JW_daily.csv
```
date, weekday, l_count, l_food, l_drink, l_total, l_avg,
d_count, d_food, d_drink, d_total, d_avg,
to_total, seat_fee, lock_fee, flower, curry, grand_total
```

### OKURAYAMA_daily.csv（NP + Ce + RP 3店舗共存）
```
date, weekday,
np_l_count, np_l_food, np_l_drink, np_l_total, np_l_avg, np_l_room_fee, np_l_flower,
np_d_count, np_d_food, np_d_drink, np_d_total, np_d_avg, np_d_room_fee, np_d_flower,
np_event_count, np_event_food, np_event_drink, np_event_room_fee, np_event_flower, np_event_total, np_event_avg,
np_grand_total,
ce_count, ce_food, ce_drink, ce_goods, ce_total, ce_avg,
rp_count, rp_food, rp_drink, rp_goods, rp_total, rp_avg
```

### GA_daily.csv
```
date, weekday, l_count, l_food, l_drink, l_total, l_avg,
d_count, d_food, d_drink, d_total, d_avg,
to_total, bq_count, bq_total, bg_count, bg_total, room_fee, grand_total
```

### BQ_daily.csv
```
date, weekday, l_count, l_food, l_drink, l_total, l_avg,
at_count, at_food, at_drink, at_total, at_avg,
d_count, d_food, d_drink, d_total, d_avg,
ryb_count, ryb_food, ryb_drink, ryb_total, ryb_avg,
seat_fee, flower, grand_total
```

---

## 📐 Blueprint設計図の核（blueprint.html）

1. **Philosophy**: 定数から変数を導く — Why Based Approach
2. **4粒度**: Monthly(12) / Seasonal(24) / Weekly(52) / Daily(365)
3. **5 Season**: TOP(#1-5) / HIGH(#6-10) / FLOW(#11-15) / LOW(#16-20) / OFF(#21-24)
4. **Step①-⑧**: Layer1(①季節+②曜日+③来場者→④KF①) / Layer2(⑤KF②+⑥KF③→⑦MP→⑧Season)
5. **Vision**: MP × TI = One-Button Shift

---

## 🛑 現在のステータス

**ステイ中 — SATの指示待ち**

- 大倉山のNPチャネル構成の残り
- テレビ塔（GA）のチャネル構成
- 赤れんが（BQ）のチャネル構成

→ 全拠点の確認が完了してからconfig.json → mp_data.js → ダッシュボードの順に構築する

---

## 📂 Phase 1-2 完了済みファイル

| ファイル | パス | 状態 |
|---------|------|------|
| restaurant_config.json | mp_engine/ | ⚠️ 要修正（チャネル名称・構造をSAT確認後に更新） |
| mp_indices.json | mp_engine/ | ✅ 完了 |
| sekki.py | mp_engine/ | ✅ 完了 |
| calculator.py | mp_engine/ | ✅ 完了 |
| *_mp_daily.csv | csv_output/ | ✅ 全6店舗×1,096日 生成済み |
| mp_data.js | mp_dashboard/ | ⚠️ 要再生成（config修正後） |
| index.html | mp_dashboard/ | ⚠️ 要全面改修（Blueprint準拠 + 全チャネル対応） |
