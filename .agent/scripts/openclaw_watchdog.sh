#!/bin/bash
# ============================================
# OpenClaw (SATOSHI) Loop Detector Watchdog
# ============================================
# 同一メッセージが3回以上連続で送信された場合、
# OpenClawを自動停止する安全弁スクリプト
#
# 使い方:
#   起動: ~/dotfiles/.agent/scripts/openclaw_watchdog.sh start
#   停止: ~/dotfiles/.agent/scripts/openclaw_watchdog.sh stop
#   状態: ~/dotfiles/.agent/scripts/openclaw_watchdog.sh status
# ============================================

WATCHDOG_PID_FILE="$HOME/.openclaw/watchdog.pid"
GATEWAY_LOG="$HOME/.openclaw/logs/gateway.log"
CHECK_INTERVAL=10        # 監視間隔（秒）
DUPLICATE_THRESHOLD=3    # この回数以上の重複でkill
LOOKBACK_LINES=50        # 直近N行を監視

# --- 色定義 ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_msg() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') [WATCHDOG] $1"
}

start_watchdog() {
    if [ -f "$WATCHDOG_PID_FILE" ] && kill -0 "$(cat "$WATCHDOG_PID_FILE")" 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Watchdog is already running (PID: $(cat "$WATCHDOG_PID_FILE"))${NC}"
        return 1
    fi

    echo -e "${GREEN}🐕 Starting OpenClaw Watchdog...${NC}"
    echo -e "   Monitor: $GATEWAY_LOG"
    echo -e "   Interval: ${CHECK_INTERVAL}s"
    echo -e "   Threshold: ${DUPLICATE_THRESHOLD} consecutive duplicates"

    # バックグラウンドで監視開始
    _run_watchdog &
    WATCHDOG_PID=$!
    echo "$WATCHDOG_PID" > "$WATCHDOG_PID_FILE"
    echo -e "${GREEN}✅ Watchdog started (PID: $WATCHDOG_PID)${NC}"
}

stop_watchdog() {
    if [ -f "$WATCHDOG_PID_FILE" ]; then
        local pid
        pid=$(cat "$WATCHDOG_PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null
            rm -f "$WATCHDOG_PID_FILE"
            echo -e "${GREEN}✅ Watchdog stopped (PID: $pid)${NC}"
        else
            rm -f "$WATCHDOG_PID_FILE"
            echo -e "${YELLOW}⚠️  Watchdog was not running (stale PID file removed)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Watchdog is not running${NC}"
    fi
}

status_watchdog() {
    if [ -f "$WATCHDOG_PID_FILE" ] && kill -0 "$(cat "$WATCHDOG_PID_FILE")" 2>/dev/null; then
        echo -e "${GREEN}🐕 Watchdog is RUNNING (PID: $(cat "$WATCHDOG_PID_FILE"))${NC}"
        # OpenClawの状態も表示
        if pgrep -f "openclaw-gateway" > /dev/null 2>&1; then
            echo -e "${GREEN}🤖 SATOSHI is RUNNING${NC}"
        else
            echo -e "${RED}🛑 SATOSHI is STOPPED${NC}"
        fi
    else
        echo -e "${YELLOW}😴 Watchdog is NOT running${NC}"
    fi
}

_run_watchdog() {
    log_msg "Watchdog monitoring started"
    
    while true; do
        sleep "$CHECK_INTERVAL"
        
        # OpenClawが起動しているか確認
        if ! pgrep -f "openclaw-gateway" > /dev/null 2>&1; then
            continue
        fi
        
        # 今日のログファイル
        local today_log="/tmp/openclaw/openclaw-$(date -u '+%Y-%m-%d').log"
        local log_to_check=""
        
        if [ -f "$today_log" ]; then
            log_to_check="$today_log"
        elif [ -f "$GATEWAY_LOG" ]; then
            log_to_check="$GATEWAY_LOG"
        else
            continue
        fi
        
        # 直近のDiscordメッセージを抽出（送信メッセージに含まれる特徴的な文字列で検出）
        # discord send / discord_send_message / "content" などのパターン
        local recent_messages
        recent_messages=$(tail -n "$LOOKBACK_LINES" "$log_to_check" 2>/dev/null | \
            grep -oE '"1":"[^"]*"' | \
            sed 's/"1":"//;s/"$//' | \
            tail -n 20)
        
        if [ -z "$recent_messages" ]; then
            continue
        fi
        
        # 連続重複を検出
        local prev_msg=""
        local dup_count=0
        local dup_msg=""
        
        while IFS= read -r line; do
            if [ "$line" = "$prev_msg" ] && [ -n "$line" ]; then
                dup_count=$((dup_count + 1))
                dup_msg="$line"
            else
                dup_count=1
            fi
            prev_msg="$line"
            
            if [ "$dup_count" -ge "$DUPLICATE_THRESHOLD" ]; then
                log_msg "${RED}🚨 LOOP DETECTED! Message repeated ${dup_count}x: ${dup_msg:0:80}...${NC}"
                log_msg "Stopping OpenClaw..."
                
                # launchctl unloadで完全停止
                launchctl unload "$HOME/Library/LaunchAgents/ai.openclaw.gateway.plist" 2>/dev/null
                
                # Discordに通知（オプション）
                log_msg "${RED}🛑 OpenClaw (SATOSHI) has been stopped due to loop detection${NC}"
                
                # 停止を記録
                echo "$(date '+%Y-%m-%d %H:%M:%S') LOOP_KILL: ${dup_msg:0:200}" >> "$HOME/.openclaw/logs/watchdog_kills.log"
                
                # 10秒後に停止を確認
                sleep 2
                if pgrep -f "openclaw-gateway" > /dev/null 2>&1; then
                    log_msg "Force killing remaining processes..."
                    pkill -9 -f "openclaw-gateway" 2>/dev/null
                fi
                
                log_msg "${GREEN}✅ OpenClaw stopped successfully${NC}"
                break
            fi
        done <<< "$recent_messages"
    done
}

# --- メインエントリポイント ---
case "${1:-status}" in
    start)
        start_watchdog
        ;;
    stop)
        stop_watchdog
        ;;
    status)
        status_watchdog
        ;;
    restart)
        stop_watchdog
        sleep 1
        start_watchdog
        ;;
    *)
        echo "Usage: $0 {start|stop|status|restart}"
        exit 1
        ;;
esac
