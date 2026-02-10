# Google Calendar MCP — WEAREMS セットアップガイド

## 前提条件
- Node.js 18+ インストール済み
- Google Cloud ConsoleでOAuth2認証情報を作成済み

## Step 1: OAuth認証情報ファイルの配置

ダウンロードしたJSONファイルを以下に配置:
```
~/.agent/mcp/gcp-oauth.keys.json
```

## Step 2: Antigravity MCP設定

`~/.gemini/settings.json` に以下を追加:

```json
{
  "mcpServers": {
    "google-calendar": {
      "command": "npx",
      "args": ["@cocal/google-calendar-mcp"],
      "env": {
        "GOOGLE_OAUTH_CREDENTIALS": "/Users/satoshiiga/dotfiles/.agent/mcp/gcp-oauth.keys.json"
      }
    }
  }
}
```

## Step 3: 初回認証

```bash
export GOOGLE_OAUTH_CREDENTIALS="/Users/satoshiiga/dotfiles/.agent/mcp/gcp-oauth.keys.json"
npx @cocal/google-calendar-mcp auth
```

ブラウザが自動で開き、Googleアカウントでログインして認証完了。

## Step 4: 動作確認

Antigravity再起動後、以下のツールが利用可能:
- list-calendars
- list-events / get-event / search-events
- create-event / update-event / delete-event
- respond-to-event
- get-freebusy
- get-current-time
- list-colors
- manage-accounts

## トークン更新（テストモード時）

テストモードではトークンが7日で失効。再認証:
```bash
npx @cocal/google-calendar-mcp auth
```

本番モードにすれば失効なし（Google Cloud Console → OAuth同意画面 → アプリを公開）。
