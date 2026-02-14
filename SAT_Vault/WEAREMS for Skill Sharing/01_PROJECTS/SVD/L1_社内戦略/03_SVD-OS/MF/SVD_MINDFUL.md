# 1. MF（MINDFUL）プロジェクト資料

> デイリーヘルス＆クエストトラッカー

---

## 📋 概要

MINDFULは、SVDスタッフの日々の健康管理とエンゲージメント向上を目的としたPWAアプリケーション。

---

## 🗂️ 関連ファイル

| ファイル | 説明 |
|----------|------|
| [index.html](file:///Users/satoshiiga/dotfiles/SVD_MINDFUL/index.html) | メインフロントエンド（4608行） |
| [SVD_MINDFUL_Backend.gs](file:///Users/satoshiiga/dotfiles/SVD_MINDFUL/SVD_MINDFUL_Backend.gs) | GASバックエンド（1340行） |
| [SVD_MINDFUL_Dashboard.html](file:///Users/satoshiiga/dotfiles/SVD_MINDFUL/SVD_MINDFUL_Dashboard.html) | 管理者ダッシュボード |
| [SVD_MINDFUL_Migrate.html](file:///Users/satoshiiga/dotfiles/SVD_MINDFUL/SVD_MINDFUL_Migrate.html) | マイグレーションツール |
| [sw.js](file:///Users/satoshiiga/dotfiles/SVD_MINDFUL/sw.js) | サービスワーカー（PWA） |

---

## ✅ 実装済み機能

| 機能 | 状態 |
|------|------|
| ヘルスチェック | ✅ |
| クエストシステム | ✅ |
| トークンエコノミー | ✅ |
| SATOSHI AI（Gemini） | ✅ |
| 拠点間移動 | ✅ |
| ダッシュボード | ✅ |
| アナウンスメント | 🔄 開発中 |

---

## 🏗️ アーキテクチャ

```
フロントエンド（GitHub Pages）
    ↓ HTTP GET/POST
GASバックエンド（各拠点別）
    ↓
Google Spreadsheet（データ永続化）
```

---

## 🔗 デプロイ先

- **本番**: https://wearemssatoshi.github.io/SVD_MINDFUL/SVD_MINDFUL/
- **リポジトリ**: https://github.com/wearemssatoshi/SVD_MINDFUL

---

## 📍 拠点別バックエンド

| 拠点 | GASプロジェクト |
|------|-----------------|
| TVTOWER | MINDFUL_TVTOWER |
| MOIWA | MINDFUL_MOIWA |
| OKURAYAMA | MINDFUL_OKURAYAMA |
| Akarenga | MINDFUL_Akarenga |
| MOIWAYAMA | MINDFUL_MOIWAYAMA |

---

*最終更新: 2026-02-05*
