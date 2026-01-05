# Homebrew
eval "$(/opt/homebrew/bin/brew shellenv)"

# Python
export PATH="$HOME/Library/Python/3.9/bin:$PATH"

# 
     Go
export PATH="$HOME/bin:$PATH"

# API Keys (loaded from .zshrc.local for security - do not commit keys here!)
[ -f ~/.zshrc.local ] && source ~/.zshrc.local

# nvm (Node Version Manager)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR
     /nvm.sh" ] && . "$NVM_DIR/nvm.sh"  # This loads nvm


# Added by Antigravity
export PATH="/Users/satoshiiga/.antigravity/antigravity/bin:$PATH"
export PATH="~/.npm-global/bin:$PATH"
