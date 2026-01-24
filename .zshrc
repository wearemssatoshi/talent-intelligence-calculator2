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
