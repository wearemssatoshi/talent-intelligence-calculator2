# MINDFUL フロントエンド＆ダッシュボード リファレンス

> SATOSHIと共有するためのUI/フロントエンドドキュメント

---

## 📁 ファイル構成

| ファイル | 用途 | 場所 |
|----------|------|------|
| `SVD_MINDFUL.html` | メインアプリ（PWA） | GitHub Pages |
| `SVD_MINDFUL_Dashboard.html` | 管理ダッシュボード | GitHub Pages |
| `SVD_MINDFUL_Migrate.html` | 拠点移籍ツール | GitHub Pages |
| `SVD_MINDFUL_Invoice.html` | 請求書生成 | GitHub Pages |
| `MINDFUL_Sales_CaseStudy.html` | 営業用ケーススタディ | GitHub Pages |

---

## 🎨 デザインシステム

### カラーパレット
```css
:root {
  --white: #FFFFFF;
  --off-white: #FAFAFA;
  --light-gray: #F5F5F5;
  --navy: #1E3A5F;
  --navy-dark: #0F2A4A;
  --gold: #B8860B;
  --text-dark: #333333;
  --text-gray: #666666;
  --border: #E8E8E8;
  --success: #22C55E;
  --danger: #EF4444;
}
```

### フォント
- **見出し**: Montserrat (300-700)
- **本文**: Inter (400-600)

---

## 📊 ダッシュボード構成

### 拠点URL（SCRIPT_URLS）
```javascript
const SCRIPT_URLS = {
  moiwayama: 'https://script.google.com/macros/s/AKfycbxGL.../exec',
  okurayama: 'https://script.google.com/macros/s/AKfycbxVV.../exec',
  tvtower: 'https://script.google.com/macros/s/AKfycbxlj.../exec',
  akarenga: 'https://script.google.com/macros/s/AKfycbzHN.../exec'
};
```

### 主要セクション
1. **Stats Grid** - 統計カード（C/I数、OK率、振り返り数、平均評価）
2. **Token Ranking Podium** - トークンランキング表彰台
3. **Health Checks Table** - チェックイン一覧
4. **Reflections Table** - 振り返り一覧
5. **Member List** - メンバー一覧
6. **Announcement** - お知らせ投稿

---

## 🔧 主要JavaScript関数

### 初期化
```javascript
function init() {
  // URLパラメータで拠点を指定可能（?base=okurayama）
  selectPeriod('today');
  loadData();
  loadUsersData();
  loadTokenRanking();
}
```

### データ取得
| 関数 | 用途 |
|------|------|
| `loadData()` | ヘルスチェック＆振り返りデータ取得 |
| `loadUsersData()` | メンバー一覧取得 |
| `loadTokenRanking()` | トークンランキング取得 |

### 期間フィルタ
| 関数 | 用途 |
|------|------|
| `selectPeriod(period)` | 期間選択（today/week/month等） |
| `toggleCustomDate()` | カスタム日付ピッカー表示 |
| `filterByDateRange(data)` | データを日付でフィルタ |

### 表示更新
| 関数 | 用途 |
|------|------|
| `renderFilteredData()` | テーブル・統計を更新 |
| `renderPodium(ranking)` | 表彰台を表示 |
| `renderUsersTable()` | メンバー一覧を表示 |

### エクスポート
| 関数 | 用途 |
|------|------|
| `exportCSV()` | CSVダウンロード（File System Access API対応）|

### その他
| 関数 | 用途 |
|------|------|
| `postAnnouncement()` | お知らせ投稿 |
| `clearCacheAndReload()` | キャッシュクリア＆リロード |
| `toggleMemoAccordion()` | メモのアコーディオン開閉 |

---

## 📱 拠点別アクセス

URLパラメータで拠点を固定できる：
```
?base=okurayama  → 大倉山専用ビュー
?base=moiwayama  → 藻岩山専用ビュー
?base=tvtower    → テレビ塔専用ビュー
?base=akarenga   → 赤れんが専用ビュー
```

拠点指定時は拠点選択UIが非表示になる（セキュリティ）

---

## 🔗 API呼び出し例

### データ取得
```javascript
fetch(url + '?action=data') // ヘルスチェック＆振り返り
fetch(url + '?action=users') // メンバー一覧
fetch(url + '?action=ranking&period=today&base=all') // ランキング
```

### 拠点マッピング（Frontend → Backend）
```javascript
const baseMap = {
  'moiwayama': 'moiwa',
  'okurayama': 'okurayama',
  'tvtower': 'teletou',
  'akarenga': 'akarenga'
};
```

---

## 🆕 SATOSHI連携（フロントエンド側）

今後追加予定：
1. チャットUI（SATOSHI AIに質問）
2. 自動レポート生成
3. リアルタイム通知

---

## 🔗 関連リンク

- [[MINDFUL開発リファレンス]] - バックエンド
- [[SVD戦略MOC]]

---

*最終更新: 2026-02-04*
