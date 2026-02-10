#!/bin/zsh
# ================================================================
# G → SATOSHI Direct Communication Script
# ================================================================
# GeminiCLI(G)からOpenClaw Gateway APIを経由して
# SATOSHI(Discord Bot)に直接メッセージを送る。
#
# Usage:
#   ./talk_to_satoshi.sh "メッセージ内容"
#   ./talk_to_satoshi.sh  # 引数なしの場合は対話モード
# ================================================================

GATEWAY_URL="http://127.0.0.1:18789/v1/chat/completions"
GATEWAY_TOKEN="a889ebc5a69c18671397c86ee129fddcbebc113673d77492"

if [ -z "$1" ]; then
    echo "🤖 G → SATOSHI 直接通信"
    echo "======================="
    echo -n "メッセージ: "
    read MESSAGE
else
    MESSAGE="$1"
fi

if [ -z "$MESSAGE" ]; then
    echo "❌ メッセージが空です"
    exit 1
fi

echo ""
echo "📡 送信中..."
echo ""

RESPONSE=$(curl -s -X POST "$GATEWAY_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GATEWAY_TOKEN" \
  -d "{
    \"model\": \"openclaw:main\",
    \"messages\": [
      {
        \"role\": \"user\",
        \"content\": \"$MESSAGE\"
      }
    ],
    \"user\": \"G-Antigravity\"
  }")

# レスポンスからcontentを抽出
CONTENT=$(echo "$RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data['choices'][0]['message']['content'])
except:
    print('❌ 応答の解析に失敗しました')
    print(sys.stdin.read() if hasattr(sys.stdin, 'read') else '')
" 2>/dev/null)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🦞 SATOSHI:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$CONTENT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
