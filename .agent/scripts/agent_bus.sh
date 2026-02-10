#!/bin/bash
# ============================================
# Agent Bus v2.0 — 統合通信CLIツール
# ============================================
# G ↔ SATOSHI 間の統合通信・タスク管理ツール
#
# Usage:
#   agent_bus.sh send <to> <message>      — メッセージ送信
#   agent_bus.sh inbox                     — 受信メッセージ確認
#   agent_bus.sh task create <title> [options] — タスク作成
#   agent_bus.sh task list                 — タスク一覧
#   agent_bus.sh task claim <id>           — タスクをクレーム
#   agent_bus.sh task done <id> [result]   — タスク完了
#   agent_bus.sh status                    — システム状態確認
# ============================================

BASE_DIR="$HOME/dotfiles/.agent"
BUS_DIR="$BASE_DIR/bus"
TASKS_FILE="$BASE_DIR/shared_tasks.json"
GATEWAY_URL="http://127.0.0.1:18789/v1/chat/completions"
GATEWAY_TOKEN="a889ebc5a69c18671397c86ee129fddcbebc113673d77492"
WEBHOOK_URL="https://discord.com/api/webhooks/1469140053300084870/NtWJ9Gg5t03GQj2fMeHVYilVxeCFt9kfRgQou94C-Kprg3U4cDfqUqeITsZThJT3vtOA"
SATOSHI_INBOX="$HOME/dotfiles/SAT_Vault/SAT_Vault/00_INBOX/SATOSHI_INBOX.md"

# エージェント識別（呼び出し元で切替可能）
AGENT_ID="${AGENT_BUS_ID:-G}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# --- ユーティリティ ---
timestamp() { date '+%Y-%m-%dT%H:%M:%S+09:00'; }
msg_id() { echo "msg_$(date '+%Y%m%d_%H%M%S')_$(( RANDOM % 1000 ))"; }
task_id() { echo "task_$(date '+%Y%m%d_%H%M%S')_$(( RANDOM % 1000 ))"; }

# ============================================
# send: メッセージ送信
# ============================================
cmd_send() {
    local TO="${1:-SATOSHI}"
    local MESSAGE="${2}"

    if [ -z "$MESSAGE" ]; then
        echo -e "${RED}❌ Usage: agent_bus.sh send <to> <message>${NC}"
        return 1
    fi

    local ID=$(msg_id)
    local TS=$(timestamp)
    local TO_LOWER=$(echo "$TO" | tr '[:upper:]' '[:lower:]')

    # JSONメッセージ作成
    local MSG_FILE="$BUS_DIR/inbox/$TO_LOWER/${ID}.json"
    python3 -c "
import json
msg = {
    'id': '$ID',
    'from': '$AGENT_ID',
    'to': '$TO',
    'timestamp': '$TS',
    'type': 'message',
    'body': $(python3 -c "import json; print(json.dumps('$MESSAGE'))"),
    'status': 'pending'
}
with open('$MSG_FILE', 'w') as f:
    json.dump(msg, f, ensure_ascii=False, indent=2)
"

    echo -e "${GREEN}📨 Message sent${NC}"
    echo -e "   ID: $ID"
    echo -e "   To: $TO"

    # SATOSHI宛ならAPI経由でも送信
    if [ "$TO_LOWER" = "satoshi" ]; then
        echo -e "   ${CYAN}📡 OpenClaw API にも送信中...${NC}"

        local ESCAPED_MSG
        ESCAPED_MSG=$(python3 -c "import json; print(json.dumps('$MESSAGE'))")

        local RESPONSE
        RESPONSE=$(curl -s --max-time 30 -X POST "$GATEWAY_URL" \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $GATEWAY_TOKEN" \
          -d "{
            \"model\": \"openclaw:main\",
            \"messages\": [{\"role\": \"user\", \"content\": $ESCAPED_MSG}],
            \"user\": \"$AGENT_ID\"
          }" 2>/dev/null)

        if [ $? -eq 0 ] && [ -n "$RESPONSE" ]; then
            local REPLY
            REPLY=$(echo "$RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data['choices'][0]['message']['content'])
except:
    print('')
" 2>/dev/null)

            if [ -n "$REPLY" ]; then
                # 応答をGのinboxに保存
                local REPLY_ID=$(msg_id)
                local REPLY_FILE="$BUS_DIR/inbox/g/${REPLY_ID}.json"
                python3 -c "
import json
msg = {
    'id': '$REPLY_ID',
    'from': 'SATOSHI',
    'to': '$AGENT_ID',
    'timestamp': '$(timestamp)',
    'type': 'response',
    'body': $(echo "$REPLY" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read().strip()))"),
    'status': 'unread',
    'in_reply_to': '$ID'
}
with open('$REPLY_FILE', 'w') as f:
    json.dump(msg, f, ensure_ascii=False, indent=2)
"
                echo -e "   ${GREEN}✅ SATOSHI 応答受信${NC}"
                echo ""
                echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
                echo -e "${BOLD}🦞 SATOSHI:${NC}"
                echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
                echo "$REPLY"
                echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            fi
        else
            echo -e "   ${YELLOW}⚠️ SATOSHI オフラインのためメッセージバスにのみ保存${NC}"
        fi
    fi

    # Discord にも通知
    local DISC_MSG
    DISC_MSG=$(python3 -c "import json; print(json.dumps('📬 [$AGENT_ID → $TO] $MESSAGE'))")
    curl -s -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "{\"username\": \"Agent Bus 📬\", \"content\": $DISC_MSG}" > /dev/null 2>&1
}

# ============================================
# inbox: 受信メッセージ確認
# ============================================
cmd_inbox() {
    local AGENT_LOWER=$(echo "$AGENT_ID" | tr '[:upper:]' '[:lower:]')
    local INBOX_DIR="$BUS_DIR/inbox/$AGENT_LOWER"

    if [ ! -d "$INBOX_DIR" ] || [ -z "$(ls -A "$INBOX_DIR" 2>/dev/null)" ]; then
        echo -e "${GREEN}📭 受信ボックスは空です${NC}"
        return 0
    fi

    echo -e "${BOLD}📬 ${AGENT_ID} の受信ボックス${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    for file in "$INBOX_DIR"/*.json; do
        [ -f "$file" ] || continue
        python3 -c "
import json
with open('$file') as f:
    msg = json.load(f)
status_icon = '🔴' if msg.get('status') == 'unread' else '⚪'
print(f\"{status_icon} [{msg['from']}] {msg['body'][:60]}...\")
print(f\"   ID: {msg['id']}  Time: {msg['timestamp']}\")
print()
"
    done
}

# ============================================
# task: タスク管理
# ============================================
cmd_task() {
    local SUBCMD="${1:-list}"
    shift

    case "$SUBCMD" in
        create)
            cmd_task_create "$@"
            ;;
        list)
            cmd_task_list "$@"
            ;;
        claim)
            cmd_task_claim "$@"
            ;;
        done)
            cmd_task_done "$@"
            ;;
        *)
            echo -e "${RED}❌ Unknown: task $SUBCMD${NC}"
            echo "Usage: agent_bus.sh task {create|list|claim|done}"
            ;;
    esac
}

cmd_task_create() {
    local TITLE="$1"
    local PRIORITY="${2:-medium}"
    local SATELLITE="${3:-}"

    if [ -z "$TITLE" ]; then
        echo -e "${RED}❌ Usage: agent_bus.sh task create <title> [priority] [satellite]${NC}"
        return 1
    fi

    local ID=$(task_id)
    local TS=$(timestamp)

    python3 -c "
import json

with open('$TASKS_FILE', 'r') as f:
    data = json.load(f)

task = {
    'id': '$ID',
    'title': $(python3 -c "import json; print(json.dumps('$TITLE'))"),
    'status': 'open',
    'assignee': None,
    'created_by': '$AGENT_ID',
    'priority': '$PRIORITY',
    'satellite': '$SATELLITE' if '$SATELLITE' else None,
    'created_at': '$TS',
    'claimed_at': None,
    'completed_at': None,
    'result': None
}

data['tasks'].append(task)
data['last_updated'] = '$TS'

with open('$TASKS_FILE', 'w') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f'✅ Task created: $ID')
print(f'   Title: $TITLE')
print(f'   Priority: $PRIORITY')
"
}

cmd_task_list() {
    python3 -c "
import json

with open('$TASKS_FILE', 'r') as f:
    data = json.load(f)

tasks = data.get('tasks', [])
if not tasks:
    print('📋 タスクなし')
else:
    print('📋 共有タスクリスト')
    print('━' * 50)
    for t in tasks:
        icons = {'open': '⬜', 'claimed': '🔵', 'done': '✅'}
        pri = {'high': '🔴', 'medium': '🟡', 'low': '🟢'}
        icon = icons.get(t['status'], '❓')
        p = pri.get(t.get('priority', 'medium'), '⚪')
        assignee = t.get('assignee') or '-'
        satellite = t.get('satellite') or '-'
        print(f\"{icon} {p} {t['title']}\")
        print(f\"   ID: {t['id']}  Assignee: {assignee}  Satellite: {satellite}\")
    print('━' * 50)
    print(f'Total: {len(tasks)} tasks')
"
}

cmd_task_claim() {
    local TASK_ID="$1"
    if [ -z "$TASK_ID" ]; then
        echo -e "${RED}❌ Usage: agent_bus.sh task claim <task_id>${NC}"
        return 1
    fi

    python3 -c "
import json

with open('$TASKS_FILE', 'r') as f:
    data = json.load(f)

found = False
for t in data['tasks']:
    if t['id'] == '$TASK_ID':
        t['status'] = 'claimed'
        t['assignee'] = '$AGENT_ID'
        t['claimed_at'] = '$(timestamp)'
        found = True
        print(f\"✅ Claimed: {t['title']}\")
        print(f\"   Assignee: $AGENT_ID\")
        break

if not found:
    print('❌ Task not found')
else:
    data['last_updated'] = '$(timestamp)'
    with open('$TASKS_FILE', 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
"
}

cmd_task_done() {
    local TASK_ID="$1"
    local RESULT="${2:-完了}"

    if [ -z "$TASK_ID" ]; then
        echo -e "${RED}❌ Usage: agent_bus.sh task done <task_id> [result]${NC}"
        return 1
    fi

    python3 -c "
import json

with open('$TASKS_FILE', 'r') as f:
    data = json.load(f)

found = False
for t in data['tasks']:
    if t['id'] == '$TASK_ID':
        t['status'] = 'done'
        t['completed_at'] = '$(timestamp)'
        t['result'] = $(python3 -c "import json; print(json.dumps('$RESULT'))")
        found = True
        print(f\"✅ Completed: {t['title']}\")
        break

if not found:
    print('❌ Task not found')
else:
    data['last_updated'] = '$(timestamp)'
    with open('$TASKS_FILE', 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
"
}

# ============================================
# status: システム状態確認
# ============================================
cmd_status() {
    echo -e "${BOLD}🤖 Agent Teams v2.0 Status${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # G の状態
    echo -e "${GREEN}🤖 G (Antigravity): ONLINE${NC}"

    # SATOSHI の状態
    if pgrep -f "openclaw-gateway" > /dev/null 2>&1; then
        echo -e "${GREEN}🦞 SATOSHI (OpenClaw): ONLINE${NC}"
    else
        echo -e "${RED}🦞 SATOSHI (OpenClaw): OFFLINE${NC}"
    fi

    # ウォッチドッグの状態
    if [ -f "$HOME/.openclaw/watchdog.pid" ] && kill -0 "$(cat "$HOME/.openclaw/watchdog.pid")" 2>/dev/null; then
        echo -e "${GREEN}🐕 Watchdog: ACTIVE${NC}"
    else
        echo -e "${YELLOW}🐕 Watchdog: INACTIVE${NC}"
    fi

    echo ""

    # タスク統計
    python3 -c "
import json
with open('$TASKS_FILE', 'r') as f:
    data = json.load(f)
tasks = data.get('tasks', [])
open_t = sum(1 for t in tasks if t['status'] == 'open')
claimed = sum(1 for t in tasks if t['status'] == 'claimed')
done = sum(1 for t in tasks if t['status'] == 'done')
print(f'📋 Tasks: {open_t} open / {claimed} in progress / {done} done')
"

    # メッセージ統計
    local G_MSGS=$(find "$BUS_DIR/inbox/g" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
    local S_MSGS=$(find "$BUS_DIR/inbox/satoshi" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
    echo -e "📬 Messages: G inbox=$G_MSGS / SATOSHI inbox=$S_MSGS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ============================================
# メインエントリポイント
# ============================================
case "${1:-status}" in
    send)
        shift; cmd_send "$@"
        ;;
    inbox)
        cmd_inbox
        ;;
    task)
        shift; cmd_task "$@"
        ;;
    status)
        cmd_status
        ;;
    help|--help|-h)
        echo -e "${BOLD}Agent Bus v2.0${NC} — G ↔ SATOSHI 統合通信ツール"
        echo ""
        echo "Usage:"
        echo "  agent_bus.sh send <to> <message>              メッセージ送信"
        echo "  agent_bus.sh inbox                             受信メッセージ確認"
        echo "  agent_bus.sh task create <title> [pri] [sat]   タスク作成"
        echo "  agent_bus.sh task list                         タスク一覧"
        echo "  agent_bus.sh task claim <id>                   タスクをクレーム"
        echo "  agent_bus.sh task done <id> [result]           タスク完了"
        echo "  agent_bus.sh status                            システム状態"
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo "Run 'agent_bus.sh help' for usage"
        exit 1
        ;;
esac
