# MINDFUL 開発リファレンス

> SATOSHIと共有するための開発ドキュメント

---

## 📁 ファイル構成

| ファイル | 用途 |
|----------|------|
| `SVD_MINDFUL_Backend.gs` | Google Apps Script バックエンド |
| `SVD_MINDFUL_Dashboard.html` | 管理ダッシュボード |

---

## 🔗 API エンドポイント

### 基本URL
```
https://script.google.com/macros/s/[DEPLOY_ID]/exec
```

### アクション一覧

| action | 説明 | パラメータ |
|--------|------|-----------|
| `version` | バージョン確認 | なし |
| `register` | ユーザー登録 | name, pin, base |
| `login` | ログイン | name, pin |
| `syncUserData` | データ同期 | name, pin |
| `getUsersList` | ユーザー一覧 | なし |
| `getTokenRanking` | トークンランキング | period, base |
| `getAnnouncements` | アナウンスメント取得 | なし |
| `askSatoshi` | SATOSHI AI連携 🆕 | message, userId |
| `askAI` | 既存AI（Gemini） | question |

---

## 🆕 SATOSHI (OpenClaw) 連携

### 概要
MINDFULから直接SATOSHIに質問できる機能。

### API呼び出し例
```
?action=askSatoshi&message=こんにちは&userId=sat
```

### 実装コード（Backend.gs）

#### doGet内
```javascript
if (action === 'askSatoshi') {
  const message = e?.parameter?.message || '';
  const userId = e?.parameter?.userId || 'anonymous';
  
  if (!message) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: 'メッセージを入力してください' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const reply = callOpenClawGateway(message, userId);
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    reply: reply 
  })).setMimeType(ContentService.MimeType.JSON);
}
```

#### Gateway連携関数
```javascript
function callOpenClawGateway(message, userId) {
  const GATEWAY_URL = 'https://sat-macbook-pro.tail243dad.ts.net/v1/chat/completions';
  const TOKEN = PropertiesService.getScriptProperties().getProperty('OPENCLAW_TOKEN');
  
  if (!TOKEN) {
    return 'OPENCLAW_TOKENが設定されていません。';
  }
  
  const options = {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + TOKEN,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({
      model: 'openclaw:main',
      messages: [{ role: 'user', content: message }],
      user: userId
    }),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(GATEWAY_URL, options);
    const data = JSON.parse(response.getContentText());
    return data.choices[0].message.content || '回答を取得できませんでした';
  } catch (e) {
    console.error('OpenClaw Error:', e);
    return 'SATOSHIに接続できませんでした。';
  }
}
```


---

## 🔐 スクリプトプロパティ

| キー | 値 | 用途 |
|------|-----|------|
| `OPENCLAW_TOKEN` | `a889ebc5...` | Gateway認証 |
| `GEMINI_API_KEY` | (各拠点で設定) | 既存AI用 |

---

## 📊 主要関数一覧

### ユーザー管理
- `registerUser()` - ユーザー登録
- `loginUser()` - ログイン
- `syncUserData()` - データ同期
- `updateUserGoals()` - 目標更新
- `uploadProfileImage()` - 画像アップロード

### トークン・ランキング
- `getTokenRanking()` - トークンランキング取得
- `getUsersList()` - ユーザー一覧取得

### AI連携
- `askSatoshiAI()` - Gemini AI（既存）
- `callOpenClawGateway()` - SATOSHI (OpenClaw) 🆕

---

## 🔗 関連リンク

- [[SVD戦略MOC]]
- GitHub: `/Users/satoshiiga/dotfiles/SVD_MINDFUL/`

---

*最終更新: 2026-02-04*
