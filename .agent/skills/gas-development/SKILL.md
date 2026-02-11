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
| **1899 Date Trap** | 時間値が `1899-12-30T17:00:00.000Z` で返る | `formatEventTime()` で HH:MM に変換 |

## Advanced Patterns

### 7. 1899 Date Trap — Time Format Handler

**問題**: Google Sheets は時間専用セル（e.g. `17:00`）を内部的に `1899-12-30T17:00:00.000Z` というISO文字列として返す。フロントエンドでそのまま表示すると意味不明な日付になる。

```javascript
// Frontend: GAS時間値をHH:MM形式に変換
function formatEventTime(timeVal) {
    if (!timeVal) return '';
    const s = String(timeVal);
    // Handle GAS 1899-12-30T... ISO format
    if (s.includes('1899') || s.includes('T')) {
        try {
            const d = new Date(s);
            if (!isNaN(d.getTime())) {
                return String(d.getUTCHours()).padStart(2, '0') + ':' +
                       String(d.getUTCMinutes()).padStart(2, '0');
            }
        } catch (e) {}
    }
    // Already HH:MM format — passthrough
    if (/^\d{1,2}:\d{2}$/.test(s)) return s;
    return s;
}
```

> **重要**: `getUTCHours()` を使用すること。`getHours()` はローカルタイムゾーンで変換してしまう。

### 8. Sheet Auto-Migration Pattern

既存のシートに新カラムを安全に追加するパターン。データ破壊なし。

```javascript
function ensureColumns(sheet, expectedHeaders) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  expectedHeaders.forEach((h, i) => {
    const colIndex = i + 1;
    if (headers.length < colIndex || headers[i] !== h) {
      sheet.getRange(1, colIndex).setValue(h);
    }
  });
  sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold');
}

// Usage:
ensureColumns(sheet, ['Timestamp', 'Author', 'Content', 'Likes', 'PostId', 'Likers', 'LinkUrl', 'LinkLabel', 'Pinned']);
```

### 9. Token Consumption Action Pattern

トークン付与（+）だけでなく、消費（-）アクションの安全な実装。残高チェック → 実行 → ログ記録。

```javascript
function handleTokenAction(ss, data) {
  const COST = 5;
  const author = data.author;

  // 1. Check balance BEFORE action
  const userSheet = ss.getSheetByName('TSS_Users');
  const userRow = findUserRowIndex(userSheet, author);
  if (userRow > 0) {
    const balance = Number(userSheet.getRange(userRow, 6).getValue()) || 0;
    if (balance < COST) {
      return createResponse({ success: false, error: 'トークン不足', required: COST, current: balance });
    }
  }

  // 2. Execute action (e.g., update sheet)
  // ...

  // 3. Deduct tokens (negative amount)
  addTokensToUser(ss, author, -COST, 'action_name', 'Description');

  return createResponse({ success: true, tokensCost: COST });
}
```

### 10. Optimistic Update + Rollback Pattern

フロントエンドで先に反映し、バックエンド失敗時に自動リバートする。

```javascript
async function optimisticAction(itemId) {
    const profile = getProfile();

    // 1. Balance check (frontend)
    if ((profile.tokens || 0) < COST) {
        alert('トークン不足！');
        return;
    }

    // 2. Confirm
    if (!confirm(`${COST}トークンを消費しますか？`)) return;

    // 3. Optimistic update
    const item = items.find(i => i.id === itemId);
    const originalState = { ...item };
    item.updated = true;
    addTokens(-COST);
    renderUI();

    // 4. Backend sync with rollback
    try {
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'doAction', id: itemId, author: profile.name })
        });
        const data = await res.json();
        if (!data.success) {
            // ROLLBACK
            Object.assign(item, originalState);
            addTokens(COST); // Refund
            renderUI();
            alert(data.error || '失敗しました');
        }
    } catch (err) {
        // ROLLBACK on network error
        Object.assign(item, originalState);
        addTokens(COST);
        renderUI();
    }
}
```

### 11. PWA Cache Force-Update Pattern

クリティカルな修正をデプロイしても、**古いService Workerキャッシュが残っているユーザーには届かない**。以下の手順で強制更新する。

**問題**: PWAのSWが古いHTMLをキャッシュしており、新しいコードがユーザーに届かない。特にセキュリティ修正やUXの致命的バグ修正時に深刻。

**修正手順（3点セット）:**

```javascript
// 1. sw.js — CACHE_NAME のバージョンをバンプ
const CACHE_NAME = 'tss-cache-v11.0'; // v10.0 → v11.0

// 2. index.html — APP_VERSION をバンプ（バックエンドとの版数照合用）
const APP_VERSION = 'v10.0'; // v9.0 → v10.0

// 3. sw.js に必ず含めるべき3つのメカニズム
// (a) install時: skipWaiting() で待機中SWなしで即有効化
self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
    self.skipWaiting(); // ★ 必須
});

// (b) activate時: 旧キャッシュ削除 + clients.claim()
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(names =>
            Promise.all(names.map(name => {
                if (name !== CACHE_NAME) return caches.delete(name); // ★ 旧キャッシュ削除
            }))
        )
    );
    self.clients.claim(); // ★ 必須: 全タブで即座に新SW有効
});

// (c) fetch: Network First戦略 (キャッシュは fallback のみ)
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .then(response => {
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
                return response;
            })
            .catch(() => caches.match(event.request)) // オフライン時のみキャッシュ
    );
});
```

**デプロイチェックリスト:**
- [ ] `sw.js` の `CACHE_NAME` バージョンをバンプ
- [ ] `index.html` の `APP_VERSION` をバンプ
- [ ] `sw.js` に `skipWaiting()` + `clients.claim()` が存在することを確認
- [ ] fetch戦略が **Network First** であることを確認
- [ ] git push → GitHub Pages デプロイ

> **注意**: `skipWaiting()` がないと、ユーザーが**全タブを閉じて再度開く**まで新SWが有効にならない。`clients.claim()` がないと、現在開いているタブが新SWの管理下に入らない。両方必須。
