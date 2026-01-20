# MINDFUL 開発スキル

## 概要

SVD MINDFULアプリケーションの開発パターンとベストプラクティス。

## アーキテクチャ

```
SVD_MINDFUL/
├── SVD_MINDFUL.html           # メインアプリ（PWA）
├── SVD_MINDFUL_Dashboard.html # 管理ダッシュボード
├── SVD_MINDFUL_Backend.gs     # Google Apps Script バックエンド
└── sw.js                      # Service Worker
```

## 技術スタック

- **フロントエンド**: HTML + CSS + Vanilla JS（PWA対応）
- **バックエンド**: Google Apps Script
- **データストア**: Google Spreadsheet
- **デプロイ**: GitHub Pages

## デザイン原則

### カラーパレット
- Navy: `#1E3A5F`（メイン）
- Gold: `#C9A962`（アクセント）
- Off-white: `#FAFAFA`（背景）

### UI/UX
- モバイルファースト
- 高級感のあるミニマルデザイン
- スムーズなアニメーション

## よくある作業

### 日付処理
```javascript
// ローカルタイムゾーンで日付取得（UTCズレ防止）
function getLocalDateString(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
```

### デプロイ
```bash
cd ~/dotfiles/SVD_MINDFUL
git add -A && git commit -m "更新内容" && git push
```

## 参照

- リポジトリ: https://github.com/wearemssatoshi/SVD_MINDFUL
- GitHub Pages: https://wearemssatoshi.github.io/SVD_MINDFUL/
