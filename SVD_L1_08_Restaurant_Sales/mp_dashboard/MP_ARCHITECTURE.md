# MP ARCHITECTURE — リアル運用パーフェクトパッケージ設計

> **Single Source of Truth: Google Spreadsheet (MP_DailySales)**
> **MP計算: バックエンドの蓄積データからリアルタイム算出**

---

## 1. 現状の問題

| 問題 | 原因 |
|------|------|
| パーサー再実行でデータが変わる | Excel→CSVの変換が不安定（月境界スピルオーバー等） |
| MP scoresが固定値 | generate_mp_json.pyで事前に焼いたmp_data.jsonに依存 |
| 入力データがリロードで消える | 読込元がローカルJSON / 書込先がスプシで不整合 |
| 新データ追加でMP scoresが更新されない | MP計算が蓄積データと連動していない |

## 2. パーフェクトアーキテクチャ

```
【データの正】 Google Spreadsheet (MP_DailySales)
    ↑ 初期投入: Excel → CSV → import_csv_to_gas.py → スプシ ✅完了
    ↑ 日常入力: ダッシュボード入力フォーム → GAS_BRIDGE.bulkSave() → スプシ
    ↓
【MP計算】 フロントエンド (app.js) でリアルタイム算出
    ← スプシの蓄積実績データ
    ← mp_indices.json (KF1: 拠点定数テーブル)
    ← restaurant_config.json (店舗設定)
    → mp_point = (KF1 + KF2 + KF3) / 3
```

## 3. MP計算ロジック

### KF1: 拠点定指数（環境の"定数"）
- **算出元**: [compute_indices.py](file:///Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/mp_engine/compute_indices.py)
- **入力**: CSVの売上データ（拠点単位で集約）
- **出力**: [mp_indices.json](file:///Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/mp_dashboard) の各拠点
- **構成**: 5層のインデックスの加重平均
  - `monthly_idx`: 月別繁忙度 (1.00-5.00)
  - `weekday_idx`: 曜日別繁忙度 (1.00-5.00)
  - `sekki_idx`: 24節気別繁忙度 (1.00-5.00)
  - `weekly_idx`: ISO週別繁忙度 (1.00-5.00)
  - `daily_idx`: 祝日・特別日の定義（静的テーブル）
- **更新頻度**: 3ヶ月に1回（四半期データが蓄積されたら再算出）

### KF2: 売上FACTOR（過去実績の"変数"）
- **算出**: 過去の同一条件日の売上をmin-max正規化 (1.00-5.00)
- **更新**: データが蓄積されるごとに自動変化

### KF3: 来客FACTOR（過去実績の"変数"）
- **算出**: 過去の同一条件日の客数をmin-max正規化 (1.00-5.00)
- **更新**: データが蓄積されるごとに自動変化

### MP POINT
```javascript
mp_point = (KF1 + KF2 + KF3) / 3  // 1.00 ~ 5.00
```

## 4. 実装計画（次回セッション）

### Phase 1: GASバックエンドをSSoTにする
- [x] ~~GAS接続テスト~~ ✅
- [x] ~~全7店舗5,816レコードをスプシに投入~~ ✅
- [x] ~~app.jsをGAS優先読込に変更~~ ✅
- [ ] **GAS URL設定の永続化** — ダッシュボードのlocalStorageにURLを保存済みか確認

### Phase 2: KF2/KF3のリアルタイム算出
- [ ] **app.js にKF2/KF3計算エンジンを移植**
  - 現在: mp_data.jsonの事前計算済みkf2/kf3を参照（2330行）
  - 変更: スプシから読んだ実績データでkf2/kf3をリアルタイム計算
  - 参考: [compute_indices.py](file:///Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/mp_engine/compute_indices.py) の `min_max_normalize` 関数
- [ ] **KF1テーブル（mp_indices.json）をGASに移行**
  - MP_Configシートに定数テーブルとして保存
  - `handleLoadConfig()` で読み込み（Code.gsに既存）

### Phase 3: mp_data.json依存の撤廃
- [ ] **app.js初期化をGAS完全移行**
  - 現在: mp_data.json → GASマージ
  - 変更: GASが唯一のデータソース。mp_data.jsonはオフライン用フォールバックのみ
- [ ] **configとmetaもGAS MP_Configシートから読込**
- [ ] **generate_mp_json.py → 非推奨化**（初期投入・バックアップ用にのみ残す）

## 5. ファイルマップ

| ファイル | 役割 | 現状 | 目標 |
|----------|------|------|------|
| `app.js` | ダッシュボード本体 | mp_data.json + GASマージ | GASのみ + リアルタイムMP計算 |
| `gas_bridge.js` | GAS APIクライアント | 完成済み ✅ | そのまま使用 |
| `gas/Code.gs` | GASバックエンド | 完成済み ✅ | configエンドポイント追加 |
| `gas/import_csv_to_gas.py` | CSV一括投入 | 完了 ✅ | 初期投入用に保持 |
| `mp_data.json` | MP計算済みデータ | メインデータソース | フォールバック専用 |
| `generate_mp_json.py` | JSON生成 | 運用必須 | バックアップ用に格下げ |
| `mp_engine/compute_indices.py` | KF1算出 | 手動実行 | GASバックエンドに移植 |
| `../parse_all_stores.py` | Excel→CSV | 手動実行 | 初期データ投入用のみ |

## 6. GASデプロイ情報

```
URL: https://script.google.com/macros/s/AKfycbyE_uNfiMB6_szu0D0cQoR8JBgwxXm-3H45DGs6qXLpgiz5kYCxBgg961nqR7RXs1jg/exec
シート: MP_DailySales, MP_AuditLog, MP_Config
投入済み: JW(1065) NP(1036) GA(1065) BQ(304) Ce(1036) RP(1036) RYB(274) = 5,816 records
```

## 7. 禁止事項

- ❌ パーサー再実行でデータを修正する → **スプシを直接修正**
- ❌ mp_data.jsonを手動編集する → **generate_mp_json.pyで再生成（バックアップ用）**
- ❌ localStorageにデータをキャッシュする → **常にGASから最新取得**
- ❌ MP scoresを事前に焼く → **蓄積データからリアルタイム算出**
