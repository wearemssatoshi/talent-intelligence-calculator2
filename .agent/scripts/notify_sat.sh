#!/bin/zsh
# G → SAT 承認リクエスト通知スクリプト
# Discord Webhook + Obsidian 二重通知

WEBHOOK_URL="https://discord.com/api/webhooks/1469140053300084870/NtWJ9Gg5t03GQj2fMeHVYilVxeCFt9kfRgQou94C-Kprg3U4cDfqUqeITsZThJT3vtOA"
OBSIDIAN_FILE="/Users/satoshiiga/dotfiles/SAT_Vault/SAT_Vault/00_INBOX/APPROVAL_REQUEST.md"
SATOSHI_INBOX="/Users/satoshiiga/dotfiles/SAT_Vault/SAT_Vault/00_INBOX/SATOSHI_INBOX.md"

# 引数
TITLE="${1:-承認リクエスト}"
CONTENT="${2:-詳細未記載}"
URGENCY="${3:-中}"

TIMESTAMP=$(date "+%Y-%m-%d %H:%M")

# 1. Discord に通知（自動実行）
curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"G 🤖\",
    \"content\": \"🔔 **${TITLE}**\n\n📋 **承認リクエスト**\n| 項目 | 内容 |\n|------|------|\n| 日時 | ${TIMESTAMP} |\n| 内容 | ${CONTENT} |\n| 緊急度 | ${URGENCY} |\n\nSAT、確認お願いします！🦞\"
  }"

# 2. SATOSHI_INBOX に通知を追加
cat >> "$SATOSHI_INBOX" << EOF

### 🔔 ${TIMESTAMP} - ${TITLE}
${CONTENT}
📋 詳細: \`APPROVAL_REQUEST.md\` を確認してね！
📍 緊急度: ${URGENCY}
EOF

echo "✅ 通知完了: Discord + Obsidian"
