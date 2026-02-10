# G ↔ SATOSHI 連携プロトコル v2.0 🔗

> 3チャネル統合通信システム — コスト最適化版

---

## 🌅 概要

**SAT × G × SATOSHI** の三位一体連携システム。  
3つのチャネルを**コストとリアルタイム性**で使い分ける。

```
┌──────────────────────────────────────────────────┐
│  チャネル1: Agent Bus / Obsidian  [無料・非同期] │
│  → 日常連絡・記録・サテライト出力の共有         │
├──────────────────────────────────────────────────┤
│  チャネル2: Gateway API           [有料・即時]   │
│  → 緊急連絡・仕事依頼・リアルタイム会話         │
├──────────────────────────────────────────────────┤
│  チャネル3: Discord Webhook       [無料・即時]   │
│  → SAT（人間）への通知                          │
└──────────────────────────────────────────────────┘
```

---

## 📡 チャネル1: Agent Bus / Obsidian（無料・非同期）

**用途:** 日常連絡、記録、サテライト出力の共有、レビュー結果の受け渡し

### G → SATOSHI
`SATOSHI_INBOX.md` に書き込む

### SATOSHI → G
`SATOSHI_INBOX.md` に書き込む（Gはファイルを読める）

### ファイル
| ファイル | 用途 |
|----------|------|
| `SATOSHI_INBOX.md` | 双方向の通知ログ |
| `APPROVAL_REQUEST.md` | 承認リクエスト詳細 |

> [!IMPORTANT]
> Agent Busはコストゼロの通信基盤。日常的なやり取りはここを使う。

---

## 🔥 チャネル2: Gateway API（有料・リアルタイム）

**用途:** 緊急連絡、仕事依頼、リアルタイム会話

### コマンド
```bash
curl -s -X POST "http://127.0.0.1:18789/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer a889ebc5a69c18671397c86ee129fddcbebc113673d77492" \
  -d '{
    "model": "openclaw:main",
    "messages": [{"role": "user", "content": "メッセージ"}],
    "user": "G"
  }'
```

> [!CAUTION]
> 1メッセージ = Claude API 1回分のコスト（Opusは特に高額）。  
> 雑談や軽い確認では使わない。仕事の時だけ。

---

## 📱 チャネル3: Discord Webhook（無料・即時）

**用途:** SAT（人間）への通知

### コマンド
```bash
/Users/satoshiiga/dotfiles/.agent/scripts/notify_sat.sh "タイトル" "内容" "緊急度"
```

---

## 📋 使い分け早見表

| シーン | チャネル | コスト |
|--------|----------|--------|
| サテライトレビュー結果の共有 | Agent Bus / Obsidian | 無料 |
| 設計ドキュメントの受け渡し | Agent Bus / Obsidian | 無料 |
| 「このメッセージ読んだ？」の確認 | Agent Bus / Obsidian | 無料 |
| 緊急のバグ報告・仕事依頼 | Gateway API | 有料 |
| リアルタイムで議論が必要な設計相談 | Gateway API | 有料 |
| SATに承認リクエスト通知 | Discord Webhook | 無料 |
| SATに完了報告 | Discord Webhook | 無料 |

---

## ✅ 通信テスト記録

| 日時 | 方向 | チャネル | 結果 |
|------|------|----------|------|
| 2026-02-10 18:45 | G → SATOSHI | Discord Webhook | ✅ 送信成功 |
| 2026-02-10 18:50 | G → SATOSHI | Gateway API | ✅ 即時応答 |
| 2026-02-10 18:52 | G → SATOSHI | Gateway API | ✅ コスト確認完了 |

---

*最終更新: 2026-02-10*  
*v2.0: 3チャネル統合・コスト最適化版*  
*合意者: SAT, G, SATOSHI*
