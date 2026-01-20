# Web デザインスキル

## 美的原則

SATとGが作成するWebアプリケーションは、常に**最高品質のデザイン**を目指す。

### 必須要件

1. **Rich Aesthetics（豊かな美的体験）**
   - ユーザーが一目で「WOW」と感じるデザイン
   - シンプルで最低限のMVPは避ける

2. **Modern Design Patterns**
   - ダークモード対応
   - グラスモーフィズム
   - グラデーション
   - マイクロアニメーション

3. **Typography**
   - モダンフォント（Montserrat, Inter, Outfit等）
   - 適切なフォントウェイト階層

## カラーパレット

### SVD Standard（ネイビー×ゴールド）
```css
:root {
    --navy: #1E3A5F;
    --navy-dark: #0F2A4A;
    --gold: #C9A962;
    --gold-light: rgba(201, 169, 98, 0.15);
    --white: #FFFFFF;
    --off-white: #FAFAFA;
    --text-gray: #6B7B8C;
}
```

## CSS ベストプラクティス

```css
/* 高級感のあるカード */
.card {
    background: var(--white);
    border: 1px solid rgba(30, 58, 95, 0.1);
    border-radius: 14px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
}

/* ゴールドアクセント */
.card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--gold), var(--gold-light));
}

/* スムーズトランジション */
.button {
    transition: all 0.2s ease;
}
```

## 禁止事項

- ❌ プレーンな赤・青・緑
- ❌ ブラウザデフォルトフォント
- ❌ プレースホルダー画像（generate_imageを使う）
- ❌ 機能だけのシンプルすぎるUI
