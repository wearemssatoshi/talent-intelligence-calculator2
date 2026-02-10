---
name: gas-development
description: Google Apps Script (GAS) ウェブアプリケーションの標準開発スキル。MINDFUL Blueprint準拠のアーキテクチャ、JST Date Alignment、Action Dispatcher、Multi-Remote Deploymentのパターンを自動適用する。
---

# GAS Development Skill — WEAREMS Standard

Google Apps Script (GAS) ウェブアプリケーションの設計・開発・デプロイを標準化するスキル。
SVD-OS エコシステムで実証済みのパターンを全クライアントに展開可能な汎用スキルとして定義。

## When to Activate

- GAS ウェブアプリの新規作成/修正
- Google Sheets をデータベースとして使用するアプリ
- `doGet(e)` / `doPost(e)` の実装
- PWA + GAS バックエンドの構築
- GitHub Pages + GAS のハイブリッドアーキテクチャ

## Architecture: MINDFUL Blueprint

```
┌─────────────────────────────────┐
│  Frontend (GitHub Pages)        │
│  ┌───────────┐  ┌───────────┐  │
│  │ index.html│  │   sw.js   │  │
│  │ (PWA)     │  │ (Cache)   │  │
│  └─────┬─────┘  └───────────┘  │
│        │ fetch() / POST         │
├────────┼────────────────────────┤
│  Backend (Google Cloud)         │
│  ┌─────▼─────┐  ┌───────────┐  │
│  │  GAS      │  │  Sheets   │  │
│  │ doPost(e) │◄►│ (Database)│  │
│  └───────────┘  └───────────┘  │
└─────────────────────────────────┘
```

### 設計原則
1. **Monolithic Frontend**: CSS, JS, データをすべて `index.html` に埋め込み、CORS回避とキャッシュ最適化
2. **Action Dispatcher**: `doPost(e)` で `action` パラメータによるルーティング
3. **Zero-Cost Tier**: Google Cloud の無料枠内で完結

## Core Patterns

### 1. Action Dispatcher Pattern

```javascript
function doPost(e) {
  const params = JSON.parse(e.postData.contents);
  const action = params.action;

  switch (action) {
    case 'save':
      return handleSave(params);
    case 'load':
      return handleLoad(params);
    case 'update':
      return handleUpdate(params);
    case 'delete':
      return handleDelete(params);
    default:
      return ContentService.createTextOutput(
        JSON.stringify({ status: 'error', message: 'Unknown action: ' + action })
      ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const action = e.parameter.action || 'loadAll';
  // GET handler for data retrieval
  switch (action) {
    case 'loadAll':
      return handleLoadAll();
    default:
      return ContentService.createTextOutput(
        JSON.stringify({ status: 'error', message: 'Unknown GET action' })
      ).setMimeType(ContentService.MimeType.JSON);
  }
}
```

### 2. JST Date Alignment (v1.6)

**問題**: `toISOString()` は UTC を返すため、JST 0:00〜9:00 の間で日付がずれる。

**Frontend**:
```javascript
function getJSTDateString(date = new Date()) {
  const jstOffset = 9 * 60;
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const jstDate = new Date(utc + (jstOffset * 60000));
  return `${jstDate.getFullYear()}-${String(jstDate.getMonth() + 1).padStart(2, '0')}-${String(jstDate.getDate()).padStart(2, '0')}`;
}
```

**Backend**:
```javascript
function getJSTTimestamp() {
  return Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");
}

function getJSTDateOnly() {
  return Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd");
}
```

### 3. Response Builder Pattern

```javascript
function jsonResponse(data) {
  return ContentService.createTextOutput(
    JSON.stringify(data)
  ).setMimeType(ContentService.MimeType.JSON);
}

function successResponse(data) {
  return jsonResponse({ status: 'success', data: data, timestamp: getJSTTimestamp() });
}

function errorResponse(message) {
  return jsonResponse({ status: 'error', message: message, timestamp: getJSTTimestamp() });
}
```

### 4. Spreadsheet CRUD Operations

```javascript
function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(sheetName);
}

function appendRow(sheetName, rowData) {
  const sheet = getSheet(sheetName);
  sheet.appendRow(rowData);
  return { row: sheet.getLastRow() };
}

function findRowByKey(sheetName, keyColumn, keyValue) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][keyColumn]) === String(keyValue)) {
      return { row: i + 1, data: data[i] };
    }
  }
  return null;
}

function updateRow(sheetName, rowNumber, rowData) {
  const sheet = getSheet(sheetName);
  sheet.getRange(rowNumber, 1, 1, rowData.length).setValues([rowData]);
}
```

### 5. Frontend Fetch Pattern (CORS-safe)

```javascript
async function postToGAS(action, payload = {}) {
  const GAS_URL = 'YOUR_DEPLOYMENT_URL';
  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action, ...payload })
    });
    return await response.json();
  } catch (error) {
    console.error('GAS Error:', error);
    return { status: 'error', message: error.message };
  }
}
```

> **注意**: `Content-Type: text/plain` を使用。`application/json` は GAS で CORS プリフライトエラーを引き起こす。

### 6. Multi-Remote Deployment Pattern

複数拠点（base）への同時展開パターン。

```javascript
// Frontend: 複数GASエンドポイントへ一斉送信
async function broadcastToAllBases(action, payload) {
  const BASE_URLS = {
    moiwayama: 'https://script.google.com/macros/s/xxx/exec',
    tvtower:   'https://script.google.com/macros/s/yyy/exec',
    akarenga:  'https://script.google.com/macros/s/zzz/exec',
    okurayama: 'https://script.google.com/macros/s/www/exec'
  };

  const results = await Promise.allSettled(
    Object.entries(BASE_URLS).map(([base, url]) =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action, ...payload, source_base: base })
      }).then(r => r.json()).then(data => ({ base, ...data }))
    )
  );
  return results;
}
```

## Deployment Checklist

- [ ] GAS プロジェクト作成
- [ ] Spreadsheet ID を定数として定義
- [ ] `doPost(e)` / `doGet(e)` 実装
- [ ] Action Dispatcher でルーティング
- [ ] JST Date Alignment 適用
- [ ] 「新しいデプロイ」→「ウェブアプリ」→「全員がアクセス可能」
- [ ] デプロイ URL をフロントエンドに設定
- [ ] GitHub Pages にフロントエンドをデプロイ
- [ ] CORS テスト実行
- [ ] PWA マニフェスト + Service Worker 設定

## Known Traps

| トラップ | 症状 | 対策 |
|---|---|---|
| **Target URL Trap** | 古いデプロイURLが残る | 新しいデプロイ毎にURLを更新 |
| **Deployment Desync** | コード更新が反映されない | 「新しいデプロイ」を作成（「デプロイを管理」ではない） |
| **SW Cache Trap** | Service Workerが古いHTMLをキャッシュ | SW バージョン番号を更新 |
| **CORS Preflight** | `application/json` でエラー | `text/plain` を使用 |
| **UTC Date Gap** | 深夜に日付がずれる | JST Date Alignment パターン適用 |
