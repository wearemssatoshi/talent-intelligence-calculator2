---
trigger: model_decision
description: ワークスペースのフォルダ構造ルール。ファイルの新規作成・保存先の決定・フォルダの整理・ファイルの移動時に参照。
---

# フォルダ構造ルール（Folder Structure Rules）

> このルールは、AIがファイルを作成・保存する際に必ず参照すること。
> ワークスペース: `/Users/satoshiiga/dotfiles`

---

## トップレベルフォルダ一覧

| # | フォルダ名 | 用途 | 書き込み |
|---|---|---|---|
| 1 | `.agent/` | AIエージェント設定（rules, skills, workflows） | ⚠️ 慎重 |
| 2 | `.github/` | GitHub Actions等 | ⚠️ 慎重 |
| 3 | `.vscode/` | VSCode設定 | ⚠️ 慎重 |
| 4 | `7Habits_Daily/` | 7つの習慣トラッカーアプリ | ⚠️ 慎重 |
| 5 | `AudioTranscripts/` | 音声文字起こし（srt, json, m4a） | ✅ 可 |
| 6 | `BeerGarden/` | ビアガーデン関連資料 | ✅ 可 |
| 7 | `Creative/` | クリエイティブ素材 | ✅ 可 |
| 8 | `Essays/` | エッセイ・文章 | ✅ 可 |
| 9 | `KRMSALES/` | KRM売上データ | ⚠️ 慎重 |
| 10 | `Media/` | メディアファイル（画像・動画） | ✅ 可 |
| 11 | `Misc/` | 雑多なメモ・ガイド・一時的なドキュメント | ✅ 可 |
| 12 | `MomentumPeaks/` | Momentum Peaksプロジェクト | ⚠️ 慎重 |
| 13 | `NoteArticles/` | note記事の原稿 | ✅ 可 |
| 14 | `PDFArchive/` | PDF保管庫 | ✅ 可 |
| 15 | `PaymentAnalysis/` | 決済分析 | ⚠️ 慎重 |
| 16 | `SAT_Vault/` | Obsidian Vault（ナレッジ管理） | ⚠️ 慎重 |
| 17 | `SVD_L1_01_Calligraphy_Logos/` | SVDロゴ・書道素材 | ✅ 可 |
| 18 | `SVD_L1_01_RYB/` | RYBプロジェクト（売上・戦略） | ⚠️ 慎重 |
| 19 | `SVD_L1_02_Presentations/` | プレゼン資料 | ✅ 可 |
| 20 | `SVD_L1_02_Roadmap/` | ロードマップ資料 | ✅ 可 |
| 21 | `SVD_L1_02_TACTICS/` | 戦術資料 | ✅ 可 |
| 22 | `SVD_L1_03_MINDFUL/` | MINDFULアプリ（PWA） | ⚠️ 慎重 |
| 23 | `SVD_L1_03_OS/` | SVD-OS（Next.jsアプリ） | ⚠️ 慎重 |
| 24 | `SVD_L1_03_TalentIntelligence/` | Talent Intelligenceシステム | ⚠️ 慎重 |
| 25 | `SVD_L1_07_budget/` | 予算関連 | ⚠️ 慎重 |
| 26 | `SVD_L1_08_Restaurant_Sales/` | 売上データ・MP分析エンジン | ⚠️ 慎重 |
| 27 | `SVD_L3_Deliciousness/` | 美味しさプロジェクト | ⚠️ 慎重 |
| 28 | `TSS/` | Team Synergy Stage | ⚠️ 慎重 |
| 29 | `The 7 Habits.../` | 7つの習慣 勉強会資料（PDF） | ✅ 可 |
| 30 | `WINE_ITEMS/` | ワインアイテムデータ | ⚠️ 慎重 |
| 31 | `_archive/` | アーカイブ（過去のファイル） | ✅ 可 |
| 32 | `agent-bus/` | エージェント間通信 | ⚠️ 慎重 |
| 33 | `design-system/` | デザインシステム | ⚠️ 慎重 |
| 34 | `kaito-study-app/` | 学習アプリ | ⚠️ 慎重 |
| 35 | `logo/` | ロゴ素材 | ✅ 可 |
| 36 | `output/` | 出力先フォルダ | ✅ 可 |
| 37 | `payment_all/` | 決済CSVデータ（クレカ・電マネ） | ⚠️ 慎重 |
| 38 | `restaurant-os/` | Restaurant OS | ⚠️ 慎重 |
| 39 | `src/` | ソースコード | ⚠️ 慎重 |
| 40 | `svd_fix_temp/` | 一時修正ファイル | ✅ 可 |
| 41 | `svd_mindful_clone/` | MINDFULクローン | ⚠️ 慎重 |
| 42 | `wearems-design-system/` | WEAREMSデザインシステム | ⚠️ 慎重 |
| 43 | `wearems-lp/` | WEAREMSランディングページ | ⚠️ 慎重 |
| 44 | `wine-list-generator/` | ワインリスト生成器 | ⚠️ 慎重 |

---

## 絶対ルール

### 1. ルートディレクトリへのファイル作成 絶対禁止 🚫🚫🚫

ワークスペース直下（`/Users/satoshiiga/dotfiles/`）にいかなるファイル・フォルダも新規作成してはならない。必ず上記フォルダ一覧のいずれかの配下に作成すること。

一時ファイルが必要な場合は `/tmp/` を使用する。判断に迷う場合はユーザーに確認。

### 2. 新規トップレベルフォルダの作成禁止 🚫

一覧にないフォルダを勝手に作ってはならない。新しいカテゴリが必要な場合は既存フォルダのサブフォルダとして作成。迷ったらユーザーに確認。

### 3. 触ってはいけないフォルダ 🚫

以下のフォルダはAIが直接操作してはならない:

- `.git/` — Gitバージョン管理。**勝手に git push しないこと。**
- `.venv/` — Python仮想環境
- `node_modules/` — npm依存パッケージ（各プロジェクト配下）
- `.obsidian/` — Obsidian設定（`SAT_Vault/` 配下）
- `.next/` — Next.jsビルド出力（`SVD_L1_03_OS/` 配下）

> [!CAUTION]
> **git push は絶対に自動実行しない。** ユーザーの明示的な指示がある場合のみ実行する。

### 4. ファイルの保存先ルール

#### コンテンツ出力（完成物）

| ファイル種別 | 保存先 |
|---|---|
| note記事の原稿 | `NoteArticles/` |
| エッセイ・文章 | `Essays/` |
| プレゼン資料（HTML/PDF） | `SVD_L1_02_Presentations/` |
| ロードマップ資料 | `SVD_L1_02_Roadmap/` |
| クリエイティブ素材 | `Creative/` |
| ロゴ素材 | `logo/` |
| PDF出力 | `PDFArchive/` |
| HTMLレポート・ダッシュボード | `output/` |

#### インプット・ナレッジ

| ファイル種別 | 保存先 |
|---|---|
| 学習メモ・ナレッジ | `SAT_Vault/` 配下 |
| 音声文字起こし | `AudioTranscripts/` |
| 勉強会資料 | `The 7 Habits.../` |
| 雑多なメモ・一時ドキュメント | `Misc/` |

#### プロジェクト作業ファイル

| ファイル種別 | 保存先 |
|---|---|
| MINDFUL関連 | `SVD_L1_03_MINDFUL/` |
| TI関連 | `SVD_L1_03_TalentIntelligence/` |
| MP・売上関連 | `SVD_L1_08_Restaurant_Sales/` |
| RYB関連 | `SVD_L1_01_RYB/` |
| 美味しさ関連 | `SVD_L3_Deliciousness/` |
| TSS関連 | `TSS/` |
| 予算関連 | `SVD_L1_07_budget/` |
| ワイン関連 | `wine-list-generator/` or `WINE_ITEMS/` |
| 決済データ | `payment_all/` or `PaymentAnalysis/` |
| ビアガーデン関連 | `BeerGarden/` |

#### その他

| ファイル種別 | 保存先 |
|---|---|
| 一時ファイル・スクラッチ | `/tmp/` |
| 使い終わったファイル | `_archive/` |
| メディアファイル | `Media/` |
| AIスキル・ルール | `.agent/skills/` or `.agent/rules/` |
| AIワークフロー | `.agent/workflows/` |
| 不明なファイル | **ユーザーに確認する（勝手に保存しない）** |

### 5. ファイル命名規則

- **時系列で並べるもの**（日報、月次データ等）: `YYYYMMDD_概要.md`
- **内容で探すもの**（マニュアル、設計書等）: `概要.md`
- ファイル名にスペースは使わず、区切りは `_`（アンダースコア）を使用
- 日本語のファイル名はOK（既存のファイルに合わせる）

### 6. フォルダ構造のガイドライン

- 階層の深さは **3〜4層まで**（深すぎるとトークンを無駄に消費する）
- 1フォルダ内のファイル数は **20件以下** を目安（超えたらサブフォルダで分割を検討）

### 7. フォルダ名の重複チェック

ファイルを新規作成する際は既存のフォルダ構造を確認してから配置先を決定。類似名のフォルダがあればそちらを使用。同じ用途のサブフォルダを複数作成しないこと。

---

## 書き込み注意フォルダの理由

| フォルダ | 理由 |
|---|---|
| `.agent/` | AIの動作に直結する設定ファイル。スキルやルールの破損は致命的 |
| `SAT_Vault/` | Obsidian Vault。ノート構造を崩すとナレッジ管理に支障 |
| `SVD_L1_03_MINDFUL/` | 本番稼働中のPWA。コード変更は慎重に |
| `SVD_L1_03_TalentIntelligence/` | 本番稼働中のTIシステム |
| `SVD_L1_08_Restaurant_Sales/` | 売上データ・MPエンジン。データ破損は許されない |
| `SVD_L1_07_budget/` | 予算・会計データ。年度構造を崩さない |
| `payment_all/` | 決済の生データCSV。上書き厳禁 |
| `SVD_L3_Deliciousness/` | スタッフの評価データ含む |

---

## 判断フローチャート

ファイルの保存先を判断する時、上から順にチェック:

1. **一時ファイル・スクラッチか？** → `/tmp/`
2. **note記事か？** → `NoteArticles/`
3. **プレゼン資料か？** → `SVD_L1_02_Presentations/`
4. **特定プロジェクトの作業ファイルか？** → 該当する `SVD_L1_*` フォルダ配下
5. **クリエイティブ素材・ロゴか？** → `Creative/` or `logo/`
6. **メディアファイルか？** → `Media/`
7. **PDF保存か？** → `PDFArchive/`
8. **HTMLレポート出力か？** → `output/`
9. **学習メモ・ナレッジか？** → `SAT_Vault/` or `Misc/`
10. **音声文字起こしか？** → `AudioTranscripts/`
11. **使い終わったファイルか？** → `_archive/`
12. **上記どれにも当てはまらない** → **ユーザーに確認する（勝手に保存しない）**
