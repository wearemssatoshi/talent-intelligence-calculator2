#!/bin/bash
# ============================================
# Skills Security Auditor
# ============================================
# .agent/skills/ 配下のスキルを走査し、
# 不審なスクリプト・外部通信・危険なコマンドを検出する
#
# 使い方: ~/dotfiles/.agent/scripts/skill_auditor.sh
# ============================================

SKILLS_DIR="$HOME/dotfiles/.agent/skills"
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

ISSUES_FOUND=0
SKILLS_CHECKED=0

echo ""
echo -e "${BOLD}🔍 Skills Security Auditor${NC}"
echo -e "   Target: $SKILLS_DIR"
echo -e "   Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# --- 危険パターン定義 ---
DANGEROUS_COMMANDS=(
    "rm -rf"
    "rm -r /"
    "mkfs"
    "dd if="
    "> /dev/sd"
    "chmod 777"
    "chmod -R 777"
)

NETWORK_COMMANDS=(
    "curl "
    "wget "
    "fetch("
    "requests.get"
    "requests.post"
    "http.request"
    "urllib"
    "aiohttp"
    "axios"
    "XMLHttpRequest"
)

EXFIL_PATTERNS=(
    "\.ssh"
    "id_rsa"
    "\.env"
    "\.aws"
    "credentials"
    "password"
    "secret"
    "token"
    "api_key"
    "API_KEY"
    "private_key"
)

SUSPICIOUS_PATTERNS=(
    "eval("
    "exec("
    "subprocess"
    "os.system"
    "child_process"
    "spawn("
    "base64"
    "atob("
    "btoa("
)

# --- スキル一覧取得 ---
if [ ! -d "$SKILLS_DIR" ]; then
    echo -e "${RED}❌ Skills directory not found: $SKILLS_DIR${NC}"
    exit 1
fi

# --- 各スキルを走査 ---
for skill_dir in "$SKILLS_DIR"/*/; do
    skill_name=$(basename "$skill_dir")
    SKILLS_CHECKED=$((SKILLS_CHECKED + 1))
    skill_issues=0

    echo -e "${CYAN}📦 [$skill_name]${NC}"

    # SKILL.md の存在確認
    if [ ! -f "$skill_dir/SKILL.md" ]; then
        echo -e "   ${YELLOW}⚠️  SKILL.md が存在しない${NC}"
        skill_issues=$((skill_issues + 1))
    fi

    # 実行可能ファイルの走査
    while IFS= read -r -d '' file; do
        rel_path="${file#$skill_dir}"
        ext="${file##*.}"

        # 危険なコマンド
        for pattern in "${DANGEROUS_COMMANDS[@]}"; do
            if grep -q "$pattern" "$file" 2>/dev/null; then
                echo -e "   ${RED}🚨 危険なコマンド検出: ${BOLD}$pattern${NC}"
                echo -e "      File: $rel_path"
                echo -e "      $(grep -n "$pattern" "$file" | head -1)"
                skill_issues=$((skill_issues + 1))
            fi
        done

        # ネットワーク通信
        for pattern in "${NETWORK_COMMANDS[@]}"; do
            if grep -q "$pattern" "$file" 2>/dev/null; then
                echo -e "   ${YELLOW}🌐 外部通信の可能性: ${BOLD}$pattern${NC}"
                echo -e "      File: $rel_path"
                echo -e "      $(grep -n "$pattern" "$file" | head -1)"
                skill_issues=$((skill_issues + 1))
            fi
        done

        # 機密情報へのアクセス
        for pattern in "${EXFIL_PATTERNS[@]}"; do
            if grep -qE "$pattern" "$file" 2>/dev/null; then
                echo -e "   ${RED}🔑 機密情報参照の可能性: ${BOLD}$pattern${NC}"
                echo -e "      File: $rel_path"
                echo -e "      $(grep -nE "$pattern" "$file" | head -1)"
                skill_issues=$((skill_issues + 1))
            fi
        done

        # 不審なコード実行パターン
        for pattern in "${SUSPICIOUS_PATTERNS[@]}"; do
            if grep -q "$pattern" "$file" 2>/dev/null; then
                echo -e "   ${YELLOW}⚡ 動的コード実行: ${BOLD}$pattern${NC}"
                echo -e "      File: $rel_path"
                echo -e "      $(grep -n "$pattern" "$file" | head -1)"
                skill_issues=$((skill_issues + 1))
            fi
        done

    done < <(find "$skill_dir" -type f \( -name "*.sh" -o -name "*.py" -o -name "*.js" -o -name "*.ts" -o -name "*.rb" -o -name "*.md" \) -print0)

    # Git管理外のファイル確認
    untracked=$(cd "$HOME/dotfiles" && git ls-files --others --exclude-standard ".agent/skills/$skill_name/" 2>/dev/null)
    if [ -n "$untracked" ]; then
        echo -e "   ${YELLOW}📁 Git未追跡ファイル:${NC}"
        echo "$untracked" | while read -r f; do
            echo -e "      $f"
        done
        skill_issues=$((skill_issues + 1))
    fi

    ISSUES_FOUND=$((ISSUES_FOUND + skill_issues))

    if [ "$skill_issues" -eq 0 ]; then
        echo -e "   ${GREEN}✅ 問題なし${NC}"
    fi
    echo ""
done

# --- サマリー ---
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BOLD}📊 監査結果${NC}"
echo -e "   スキル数: $SKILLS_CHECKED"
echo -e "   検出数: $ISSUES_FOUND"
echo ""

if [ "$ISSUES_FOUND" -eq 0 ]; then
    echo -e "${GREEN}${BOLD}🛡️  全スキル安全！問題は検出されませんでした${NC}"
else
    echo -e "${YELLOW}${BOLD}⚠️  $ISSUES_FOUND 件の検出あり。内容を確認してください${NC}"
    echo -e "   ※ 自作スキル内の正当な使用の場合もあります"
fi
echo ""
