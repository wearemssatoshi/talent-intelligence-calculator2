# Homebrew
eval "$(/opt/homebrew/bin/brew shellenv)"

# Python
export PATH="$HOME/Library/Python/3.9/bin:$PATH"

# User bin
export PATH="$HOME/bin:$PATH"

# API Keys
[ -f ~/.zshrc.local ] && source ~/.zshrc.local

# nvm (Node Version Manager)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# SVD Agent Bus v2.0
alias bus="$HOME/dotfiles/.agent/scripts/agent_bus.sh"

# MP Dashboard (localhost:8765)
alias mp="npx -y http-server $HOME/dotfiles/SVD_L1_08_Restaurant_Sales/mp_dashboard -p 8765 -c-1 --cors"
