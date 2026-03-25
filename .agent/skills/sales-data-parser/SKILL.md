---
name: sales-data-parser
description: "SVDレストラン売上日報（.xlsx）を読み込み、統一フォーマットのJSONに変換するスキル。売上データの読み込み、Excelファイルのパース、日別売上の抽出、チャネル別集計（LUNCH/DINNER/T.O/宴会/BG）、月別サマリーの生成が必要な時に発動する。「売上データを読んで」「Excelを分析して」「日報を取り込んで」等のトリガーで起動。"
---

# Sales Data Parser — SVD売上日報パーサー 📊

SVDレストランの売上日報Excel（.xlsx）を読み込み、MP（Momentum Peaks）互換の統一JSONに変換する。

## Core Rules

### データ構造の理解

SVDの売上日報Excelは以下の構造を持つ：

- **ヘッダー行2（iloc[2]）**: セクション名（LUNCH, DINNER, レストランTOTAL, EAT-IN・T/O, 宴会, ビアガーデン, TOTAL）
- **ヘッダー行3（iloc[3]）**: 列名（人数合計, 料理売上, 飲料売上, 合計(税込), 客単価 等）
- **データ行**: 行4以降。列1に日付（datetime型）
- **合計行**: 列0または列1に「合計」文字列を含む行

### チャネル自動判定

ヘッダー行2のセクション名から5チャネルを自動判定：

| チャネル | ヘッダー行2のキーワード | 主要列 |
|:--|:--|:--|
| LUNCH | `LUNCH` | 人数(+0), 料理売上(+1), 飲料売上(+3), 合計(+5), 客単価(+6) |
| DINNER | `DINNER` | 同上オフセット |
| T/O | `EAT-IN・T/O` | 人数(+1), 料理売上(+2), 飲料売上(+4), 合計(+6), 客単価(+7) |
| 宴会 | `宴会` | 人数(+1), 料理売上(+2), 飲料売上(+4), 合計(+6), 客単価(+7) |
| BG | `ビアガーデン` | 人数(+1), 合計=ヘッダー行3で「合計」を探索 |

### 固定列マッピング（GA標準）

検証済みの固定列位置（TV TOWER / GA）：

| 列 | 内容 |
|:--|:--|
| 列1 | 日付 |
| 列4 | ランチ人数 |
| 列9 | ランチ売上合計 |
| 列10 | ランチ客単価 |
| 列12 | ディナー人数 |
| 列17 | ディナー売上合計 |
| 列18 | ディナー客単価 |
| 列19 | L+D人数 |
| 列22 | L+D売上合計 |
| 列25 | T/O人数 |
| 列30 | T/O売上合計 |
| 列33 | 宴会人数 |
| 列38 | 宴会売上合計 |
| 列52 | 全チャネル売上（L+D+T/O+宴会+BG TOTAL） |
| 列61 | 売上合計（花束預り金除く） |

> BG列は動的。ヘッダー行2で「ビアガーデン」を探索し、その後のヘッダー行3で「合計」を探索。

### 出力フォーマット

パーサーは以下のJSON構造を出力：

```json
{
  "metadata": {
    "store_id": "GA",
    "store_name": "The Garden Sapporo",
    "base": "TV_TOWER",
    "fiscal_year": "2023",
    "quarter": "3Q",
    "source_file": "TV2023_3Q.xlsx",
    "parsed_at": "2026-02-11T19:50:00+09:00"
  },
  "monthly_summary": [
    {
      "month": "2023-10",
      "channels": {
        "lunch": {"pax": 914, "sales": 4375885, "avg_spend": 4787},
        "dinner": {"pax": 621, "sales": 6034125, "avg_spend": 9716},
        "ld_total": {"pax": 1535, "sales": 10410010},
        "takeout": {"pax": 301, "sales": 223480},
        "banquet": {"pax": 96, "sales": 503756},
        "beer_garden": {"pax": 76, "sales": 126240},
        "all_channels": {"sales": 11141936}
      }
    }
  ],
  "daily_data": [
    {
      "date": "2023-10-01",
      "weekday": 6,
      "channels": {
        "lunch": {"pax": 38, "sales": 186720},
        "dinner": {"pax": 7, "sales": 54500},
        "takeout": {"pax": 0, "sales": 0},
        "banquet": {"pax": 0, "sales": 0},
        "beer_garden": {"pax": 0, "sales": 0}
      }
    }
  ],
  "validation": {
    "status": "PASS",
    "checks": [
      {"check": "monthly_total_match", "result": "PASS", "detail": "全月の日別合算と合計行が一致"}
    ]
  }
}
```

## Workflow

### Step 1: ファイル読み込み
```bash
python scripts/parse_sales_xlsx.py <input.xlsx> [--output output.json] [--store-id GA]
```

### Step 2: 自動検証
パーサーは自動で以下を検証：
1. 日別データの合算と合計行の突き合わせ（全チャネル）
2. ランチ+ディナー = L+D合計の整合性
3. 人数・売上の型チェック（数値であること）

### Step 3: MP統合
出力JSONは `momentum-peaks` スキルの `momentum_calculator.py` に直接投入可能。

## Anti-patterns

- ❌ 列番号をハードコードだけに頼ってはいけない（BGの列位置はシートごとに変わる）
- ❌ 合計行の一致確認をスキップしてはいけない
- ❌ 客単価を整数丸めで報告してはいけない（Excelの生値をそのまま使う）
- ❌ BGが存在しない月でエラーを出してはいけない（Graceful degradation）

## References

- `references/column_mapping.md` — 列構造の詳細定義
- `references/channel_detection.md` — チャネル自動判定アルゴリズム

## Integration

- **Momentum Peaks**: 出力JSONの `daily_data` を24節気エンジンに投入
- **Shift Scheduler**: MP Point算出後のシフト提案パイプラインに接続
- **Talent Intelligence**: チャネル別の必要スキルマッピング

---

## ⛔ 絶対ルール（2026-03-08 教訓）

### 1. GASへの送信は `bulkSave` のみ使用

- **`action=import` は絶対に使うな。** シート全データを消去して書き直す破壊的操作。
- `bulkSave` は日付単位のUPSERT。既存データを保持したまま追加/更新する。
- Code.gs L476-480: `handleImport` はデータ行を全クリアする実装。

### 2. Excelのデータは全て税込

- 料理売上、飲料売上、席料、南京錠、花束、食品物販 — **全て税込**。
- GASにも**税込のまま格納**する。税抜変換はダッシュボード表示側（`txvAccurate()`）で行う。
- パーサーで `tax_exc()` を呼ぶ必要は**ない**。

### 3. 本番データ操作の前に必ず確認

- GAS APIのアクション名を使う前に、**Code.gsの該当関数の実装を読む**。
- `--send` 実行前に、パース結果のプレビューをSATに見せて承認を得る。
- エラーが出たら**止まる**。修正して再実行する。「ない」と断言しない。

### 4. SATの発言は1回で正確に理解する

- 確認を繰り返さない。不明点があれば具体的に1回だけ聞く。
- SATが教えてくれた情報は、スキルファイルに書き込んで永続化する。

### 5. JW売上日報の仕様

- ファイル: `Mt.MOIWA/MW2025/JW売上日報.xlsx` (65シート, 月別, 3.3MB)
- シート名形式: `2026(3)` = 2026年3月
- Row3: セクション名 (LUNCH C5 / DINNER C13 / TOTAL C21 / T.O C26 / 全TOTAL C34 / 営業終了後 C40)
- Row4: 列名
- Row5〜: データ行（C2に日付）
- Row36: 合計行（税込）
- Row40: 全合計（税込、席料+南京錠+花束+物販含む）
- Row41: 全合計（税抜、÷1.10）
- パーサー: `parse_jw_daily.py`

