---
name: TSS Development
description: TEAM SYNERGY STAGEアプリの開発パターン
---

# TSS Development Skill

TEAM SYNERGY STAGE (TSS) アプリケーションの開発ガイド。

## アーキテクチャ

TSS は MINDFUL と同じアーキテクチャを採用:
- **フロントエンド**: 単一HTML + Vanilla CSS + JavaScript
- **バックエンド**: Google Apps Script (GAS)
- **データストア**: Google Spreadsheet
- **ホスティング**: GitHub Pages

## プロジェクト構造

```
TSS/
├── index.html          # メインアプリ
├── dashboard.html      # 管理ダッシュボード
├── style.css           # スタイル
├── manifest.json       # PWA設定
├── sw.js               # Service Worker
├── logo.png            # ロゴ
└── TSS.gs              # GASバックエンド
```

## デザイン原則

- **カラースキーム**: ゴールド系（#D4AF37, #FFD700）+ ダーク背景
- **フォント**: Noto Sans JP
- **グラスモーフィズム**: 半透明カード + ブラー

## 主要機能

1. **ユーザー登録・ログイン**: PIN + ユーザー名
2. **掲示板**: チーム内コミュニケーション
3. **To-Doリスト**: タスク管理
4. **プロフィール**: 自己紹介、テーマソング
5. **AIチャット**: JINSEI AI（Gemini連携）
6. **トークン**: TSST（ポイントシステム）

## MINDFULとの違い

| 機能 | MINDFUL | TSS |
|------|---------|-----|
| 目的 | 個人の成長記録 | チームシナジー |
| トークン | MINDFUL Token | TSST |
| クエスト | 100個の行動指針 | なし |
| 掲示板 | なし | あり |

## 参照

- MINDFUL開発パターン: `.agent/skills/mindful-dev.md`
- Webデザイン原則: `.agent/skills/web-design.md`
- リポジトリ: https://github.com/wearemssatoshi/TSS
