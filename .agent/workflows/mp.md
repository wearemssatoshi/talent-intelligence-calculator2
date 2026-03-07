---
description: MPダッシュボードをローカルで立ち上げる
---

# MP Dashboard ローカル起動

// turbo-all

1. ローカルサーバーを起動する

```bash
cd /Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/mp_dashboard && python3 -m http.server 8888 &
```

2. ブラウザで開く

http://localhost:8888/index.html をブラウザサブエージェントで開く。

**注意**: file:// URLはブラウザでブロックされるため、必ずHTTPサーバー経由で開くこと。
