#!/bin/zsh
# ================================================================
# G ⇆ SATOSHI — Discord 三者間通信スクリプト
# ================================================================
# 1. GのメッセージをDiscord Webhookで投稿
# 2. SATOSHIにAPI経由で送信 → 応答取得
# 3. SATOSHIの応答もDiscord Webhookで投稿
# → SATはDiscord上で両方の発言を見れる！
# ================================================================

WEBHOOK_URL="https://discord.com/api/webhooks/1469140053300084870/NtWJ9Gg5t03GQj2fMeHVYilVxeCFt9kfRgQou94C-Kprg3U4cDfqUqeITsZThJT3vtOA"
GATEWAY_URL="http://127.0.0.1:18789/v1/chat/completions"
GATEWAY_TOKEN="a889ebc5a69c18671397c86ee129fddcbebc113673d77492"

if [ -z "$1" ]; then
    echo "🤖 G ⇆ 🦞 SATOSHI — Discord三者間通信"
    echo "======================================="
    echo -n "Gのメッセージ: "
    read MESSAGE
else
    MESSAGE="$1"
fi

if [ -z "$MESSAGE" ]; then
    echo "❌ メッセージが空です"
    exit 1
fi

echo ""
echo "📡 Step 1: Gのメッセージを Discord に投稿..."

ESCAPED_MSG=$(echo "$MESSAGE" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read().strip()))")

curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"G 🤖\",
    \"content\": $ESCAPED_MSG
  }"

echo " ✅"
echo "🧠 Step 2: SATOSHI に API で送信中..."

RESPONSE=$(curl -s -X POST "$GATEWAY_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GATEWAY_TOKEN" \
  -d "{
    \"model\": \"openclaw:main\",
    \"messages\": [
      {
        \"role\": \"user\",
        \"content\": $ESCAPED_MSG
      }
    ],
    \"user\": \"G-Antigravity\"
  }")

SATOSHI_REPLY=$(echo "$RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data['choices'][0]['message']['content'])
except Exception as e:
    print(f'Error: {e}')
")

echo " ✅"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🦞 SATOSHI:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$SATOSHI_REPLY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📡 Step 3: SATOSHI の応答を Discord に投稿..."

ESCAPED_REPLY=$(echo "$SATOSHI_REPLY" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read().strip()))")

curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"SATOSHI 🦞\",
    \"content\": $ESCAPED_REPLY
  }"

echo " ✅"
echo ""
echo "🎉 Discord三者間通信完了！SATはDiscordで確認してね！"
