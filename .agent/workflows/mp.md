---
description: MPダッシュボードをローカルで立ち上げる
---

# MP Dashboard ローカル起動

// turbo-all

**MP専用ポート: 8899**（8888はMission Board等で使用済みのため衝突回避）

## 1. サーバー起動（重複チェック付き）

まずポート8899が空いているか確認し、空いていればサーバーを起動する。既に起動中ならスキップ。

```bash
lsof -i :8899 >/dev/null 2>&1 && echo "MP_ALREADY_RUNNING" || (cd /Users/satoshiiga/dotfiles/SVD_L1_08_Restaurant_Sales/mp_dashboard && python3 -m http.server 8899 &)
```

出力が `MP_ALREADY_RUNNING` ならステップ2へ直行。

## 2. ブラウザで開く

http://localhost:8899/index.html をブラウザサブエージェントで開く。

**注意**: file:// URLはブラウザでブロックされるため、必ずHTTPサーバー経由で開くこと。

---

## （開発作業時のみ）憲法読み込み

MPのコード修正・データ分析・予測ロジック変更など**開発作業を行う場合のみ**、以下を読み込む。
単に「ダッシュボードを開くだけ」の場合は不要。

1. `/Users/satoshiiga/dotfiles/.agent/skills/momentum-peaks/SKILL.md`
