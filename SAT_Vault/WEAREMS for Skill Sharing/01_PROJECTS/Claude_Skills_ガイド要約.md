# Claude Skills 完全ガイド要約 🧠

> SAT共有 — 2026-02-08 23:30
> SATOSHI要約 → G参考

---

## 一言で言うと

**「AIに仕事のやり方を一度教えたら、永遠に覚えてる仕組み」**

---

## Skills とは

- AIへの「業務マニュアル」パッケージ
- 4種類の知識を提供：ワークフロー、ドメイン専門知識、ツール統合、再利用リソース
- 一度作れば永遠に使える、チームで共有可能

---

## Skill の構造

```
skill-name/
├── SKILL.md        ← 唯一の必須ファイル（指示書）
├── scripts/        ← Python/Bashスクリプト（自動処理）
├── references/     ← 参考資料（API仕様、スタイルガイド等）
└── assets/         ← テンプレート、画像等（出力に使うファイル）
```

### SKILL.md の構造
```yaml
---
name: skill-name          ← kebab-case
description: "説明文"      ← いつ発動するか（最重要！）
---

## Core Rules            ← 守るべきルール
## Output Format         ← 出力形式
## Anti-patterns         ← やっちゃダメなこと
## Examples              ← 入出力の例
```

---

## 3つの問題を解決

| 問題 | Skills なし | Skills あり |
|------|-----------|-----------|
| 一貫性 | 毎回違う回答 | 毎回同じ基準 |
| 品質 | 業界知識が浅い | 専門家レベル |
| 効率 | 毎回説明し直し | 覚えてるから即戦力 |

---

## Progressive Disclosure（段階的読み込み）

- Level 1: 名前と説明文だけ常時読み込み（~100トークン）
- Level 2: SKILL.md は発動時のみ読み込み
- Level 3: scripts/references/assets は必要時のみ
- → コンテキストウィンドウを効率的に使用

---

## ベストプラクティス

- **簡潔に** — Claudeが知ってることは書かない
- **重要なことを最初に** — 上にあるほど注目される
- **SKILL.md は500行以下** — 詳細はreferencesへ
- **description が最重要** — ここが曖昧だと発動しない
- **例で示す** — 長い説明より入出力例
- **Anti-patternsを定義** — やっちゃダメなことを明記
- **テストと反復** — 最初から完璧を目指さない

---

## 重要：OpenClaw（SATOSHI）は同じ構造！

```
OpenClaw Skills        Claude Skills
├── SKILL.md          ├── SKILL.md      ← 同じ！
├── scripts/          ├── scripts/      ← 同じ！
├── references/       ├── references/   ← 同じ！
└── assets/           └── assets/       ← 同じ！
```

SATOSHIには既に skill-creator（Skillを作るSkill）がある！

---

## RESTAURANT OS への応用

### 作るべきSkills

| # | Skill名 | 内容 |
|---|---------|------|
| 1 | wine-os | ワイン・飲料管理、発注ルール |
| 2 | sekki-shift | 二十四節気モデルシフト計算 |
| 3 | pos-analyzer | POS売上分析、カテゴリ分類 |
| 4 | asias-best | Asia's Best 戦略・審査基準 |
| 5 | svd-brand | SVDブランドガイドライン |
| 6 | menu-review | メニュー原価率チェック |

### 商品化

```
SVDで作ったSkills
  → .skill ファイルにパッケージ（ZIPと同じ）
    → RESTAURANT OS の顧客に配布
      → 全国のレストランがSVD品質のAIを使える
        → SaaS月額課金の付加価値！
```

---

## Agent Teams + Skills = 最強

```
Agent Teams（チーム協働）+ Skills（専門知識）
  = 専門家チームが自律的に動くAI基盤
  = RESTAURANT OS の核心技術
```

---

## Gへの依頼

1. この記事の技術的な深掘り
2. OpenClaw / Antigravity 両方でSkill構造を統一できるか検討
3. 最初に作るSkill（wine-os）の設計案
4. .skillパッケージの配布方法の調査

---

## 参考リンク

1. https://claude.com/skills
2. https://claude.com/blog/skills-explained
3. https://claude.com/blog/how-to-create-skills-key-steps-limitations-and-examples

---

*WEAREMS for ATELIER — VIVA LA HOMARD 4.6* 🦞🍷🎨
