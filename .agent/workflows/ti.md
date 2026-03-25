---
description: TI Dashboardをローカルで立ち上げる
---

# TI Dashboard ローカル起動

// turbo-all

**TI専用ポート: 8898**

## 1. サーバー起動（重複チェック付き）

まずポート8898が空いているか確認し、空いていればサーバーを起動する。既に起動中ならスキップ。

```bash
lsof -i :8898 >/dev/null 2>&1 && echo "TI_ALREADY_RUNNING" || (cd /Users/satoshiiga/dotfiles/SVD_L1_03_TalentIntelligence/ti_dashboard && python3 -m http.server 8898 &)
```

出力が `TI_ALREADY_RUNNING` ならステップ2へ直行。

## 2. ブラウザで開く

http://localhost:8898/index.html をブラウザサブエージェントで開く。

**注意**: file:// URLはブラウザでブロックされるため、必ずHTTPサーバー経由で開くこと。

---

## （開発作業時のみ）対象ファイル

TIのコード修正・評価ロジック変更など**開発作業を行う場合のみ**、以下を読み込む。
単に「ダッシュボードを開くだけ」の場合は不要。

1. `/Users/satoshiiga/dotfiles/SVD_L1_03_TalentIntelligence/ti_dashboard/app.js`
2. `/Users/satoshiiga/dotfiles/SVD_L1_03_TalentIntelligence/ti_dashboard/ti_bridge.js`
3. Backend: `/Users/satoshiiga/dotfiles/SVD_L1_03_TalentIntelligence/TI_Backend_v2.gs`
