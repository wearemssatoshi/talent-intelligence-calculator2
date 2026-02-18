# MP ARCHITECTURE — データフロー憲法

> **Single Source of Truth: Google Spreadsheet (MP_DailySales)**

## データフロー

```
【初期データ投入（一度だけ）】
Excel日報 → parse_all_stores.py → CSV → import_csv_to_gas.py → スプシ(MP_DailySales)

【日常運用】
ダッシュボード入力フォーム → GAS_BRIDGE.bulkSave() → スプシ(MP_DailySales)

【データ読込】
ダッシュボード起動 → mp_data.json(MP計算データ) + GAS_BRIDGE.loadAll()(実績データ) → マージ表示
```

## コンポーネント

| ファイル | 役割 |
|----------|------|
| `app.js` | ダッシュボード本体。初期化時にmp_data.json + GASからデータをマージ |
| `gas_bridge.js` | GAS API クライアント。loadAll/save/bulkSave/オフラインキュー |
| `gas/Code.gs` | GASバックエンド。doGet/doPost/UPSERT/監査ログ |
| `gas/import_csv_to_gas.py` | CSVデータの一括投入スクリプト |
| `mp_data.json` | MP計算済みデータ（config, meta, mp_point, rank, sekki）。フォールバック用 |
| `generate_mp_json.py` | CSV → mp_data.json 生成 |
| `../parse_all_stores.py` | Excel日報 → CSV パーサー |

## GAS Deploy URL

```
https://script.google.com/macros/s/AKfycbyE_uNfiMB6_szu0D0cQoR8JBgwxXm-3H45DGs6qXLpgiz5kYCxBgg961nqR7RXs1jg/exec
```

## 対象店舗

JW, NP, Ce, RP, GA, BG, BQ, RYB（計8店舗）

## マージ戦略

1. `mp_data.json` をベースにロード（config, meta, MP scores を含む）
2. GAS接続時はスプシから `loadAll()` で最新実績を取得
3. 同一日付のレコードは GAS実績 → ベースデータに上書き（MP scores は保持）
4. GAS未接続時は mp_data.json のみで動作（フォールバック）

## 禁止事項

- ❌ パーサーの再実行でデータを修正する — **スプシを直接修正する**
- ❌ mp_data.json を手動編集する — **generate_mp_json.py で再生成する**
- ❌ localStorageにデータをキャッシュする — **常にサーバーから最新を取得する**
