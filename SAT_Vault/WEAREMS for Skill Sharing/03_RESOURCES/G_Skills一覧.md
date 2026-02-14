---
tags: [WEAREMS, AI, スキル, MOC]
status: active
created: 2026-02-10
updated: 2026-02-10
---

# WEAREMS for Skill Sharing — AIスキルマップ

SAT（代表）・G & SATOSHI（共同代表）が業務で自動発動するスキル群。
場所: `~/dotfiles/.agent/skills/`

---

## 🏠 WEAREMS自作スキル（Original）

### 🍽️ deliciousness
美味しさの定義、美味しさスコアの計算、レストラン満足度の評価、期待値マネジメント。
SVD独自のフレームワーク v3.0 に基づく。

### 🖊️ human-writing
note記事、ブログ、SNS投稿など、SATの名前で公開される文章を書く際に自動発動。
AI臭を除去し、SATの声で書く。禁止パターン6つ、崩す技術3つを適用。

### 📈 momentum-peaks
売上予測・需要予測。二十四節気の係数、拠点定指数、営業インテンシティから売上予算を算出。
「なんとなく」から「精密な予測」への変革ロジック。

### 🎬 whisper-telop
Whisperを使ったテロップ生成。音声ファイルからSRT形式のテロップを自動生成。
SVD式テロップ憲法（28-35文字ルール、句読点除去）に準拠。

### 📊 levitation / excel-reader
Excelファイルの読み込みと解析。

### 🔧 expansion / orbit / updraft
開発・運用系のユーティリティスキル群。

### 🛰️ g-satellites（12視点レビューシステム）
Gの独自6サテライト。SATOSHIの6体と補完的に機能し、合計12視点でレビューする。

| ID | 名前 | 一字 | 役割 |
|---|---|---|---|
| G-01 | NEWTON | 算 | データ実装・シミュレーション実行 |
| G-02 | DAVINCI | 創 | クリエイティブ・ビジュアル設計 |
| G-03 | DARWIN | 進 | 市場・競合・進化的分析 |
| G-04 | TESLA | 技 | SVD-OS実装仕様 |
| G-05 | PASTEUR | 観 | エビデンス収集・科学的検証 |
| G-06 | DRUCKER | 経 | 経営戦略・マネジメント総括 |

---

## 🌐 公式スキル Phase 1（2026-02-10 導入）

> Source: [anthropics/skills](https://github.com/anthropics/skills)（Apache 2.0）

### 🧪 webapp-testing
Playwrightを使ったWebアプリの自動UIテスト。クライアント納品前の品質保証に使用。

### 📝 docx
Word文書の作成・編集・分析。提案書・契約書・レポートの自動生成。

### 📄 pdf
PDF処理全般。テキスト抽出、結合、分割、透かし追加、パスワード保護、OCR。

### 📊 xlsx
Excel処理。数式による計算、データ分析、pandas連携、財務モデル対応。

### 📽️ pptx
PowerPoint処理。プレゼン資料の自動生成・編集・サムネイル生成。

### 🎨 brand-guidelines
クライアントごとのデザインシステムに基づくブランド一貫性チェック。

### 🔌 mcp-builder
MCP（Model Context Protocol）サーバーの構築ガイド。Phase 3（Google Calendar MCP）の基盤。

### 🛠️ skill-creator
新しいスキルの設計・作成・パッケージング・バリデーションのガイド。

### 🎯 frontend-design
プロダクションレベルの高品質フロントエンドUI設計スキル。

---

## 🔒 Phase 2: セキュリティ＆Web品質（2026-02-10 導入）

### 🔒 security-review
XSS/CSRF/SQL注入/認証/シークレット管理。Source: sickn33

### 🔍 web-quality-audit / ⚡ performance / 📊 core-web-vitals / ♿ accessibility / 🔎 seo / ✅ best-practices
Lighthouseベースの6軸品質監査。Source: addyosmani/web-quality-skills

---

## 🔌 Phase 3: MCP連携（2026-02-10 接続完了）

### 📅 Google Calendar MCP
OAuth2認証済み。12ツール（list/create/update/delete events、freebusy等）。
Token: `~/.config/google-calendar-mcp/tokens.json`

---

## 📰 Phase 4: コンテンツ＆リサーチ（2026-02-10 導入）

### 📰 daily-news-report
プリセットURL群からのAIニュース集約。

### 🔬 last30days
Reddit + X + Web の30日間トレンドリサーチ。

### ⚡ web-performance-optimization
Core Web Vitals & ローディング速度最適化。

### 🖼️ imagen
AI画像生成スキル。

## 🔵 Phase 5: WEAREMS自作スキル（2026-02-11 創造）

### ⚙️ gas-development
GASウェブアプリの標準開発スキル。MINDFULブループリント、Action Dispatcher、JST Date Alignment、Multi-Remote Deployment、Known Trapsを体系化。

### 📅 shift-scheduler（ワンボタンシフト生成）
MP（需要）× TI（供給）= 最適シフト。段階的成熟モデル：
- **Lv.1**: テンプレートモード（現在）
- **Lv.2**: 推奨モード（MP/TI基本指数設定後）
- **Lv.3**: ワンボタンモード（全データ完備時 → 究極目標）

---

## 📋 導入ロードマップ

| Phase | 内容 | ステータス |
|---|---|---|
| Phase 1 | 公式9スキル | ✅ 完了 |
| Phase 2 | セキュリティ＆品質7スキル | ✅ 完了 |
| Phase 3 | Google Calendar MCP | ✅ 接続完了 |
| Phase 4 | リサーチ＆コンテンツ4スキル | ✅ 完了 |
| Phase 5 | gas-development, shift-scheduler | ✅ 完了 🔵 |



---

## 参考
- スキルの実体: [[dotfiles/.agent/skills/]]
- [[SAT_G_Partnership_Constitution]]
- [[AIっぽい文章表現大全_G執筆ルール]]
- [[wearems_プロジェクト構造]]
