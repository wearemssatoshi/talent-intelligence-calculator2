# SVD WordPress News Update Guide (Final Code)

SATさん、こちらが「貼り付けるだけ」の完全なコードです。
これをWordPressの投稿画面に貼り付けてください。

## 手順

1.  WordPressの「新規投稿」画面を開く。
2.  エディタのタブを「ビジュアル」から **「テキスト」**（HTML編集モード）に切り替える。
    *   *※ここが重要です！ビジュアルモードだと崩れます。*
3.  以下のコードを全てコピーして、本文欄に貼り付ける。
4.  タイトルに `さっぽろホワイトイルミネーション開催期間中のお席レイアウトについて` と入力する。
5.  「公開」する。

## 貼り付けるコード

```html
<p>さっぽろホワイトイルミネーション開催期間中はお席の指定を多くいただきますことから、一部指定席料金を設定させていただいております。何卒ご容赦ください。</p>
<p>また、期間中はエレベーターも大変混み合います。レストランはさっぽろテレビ塔3階にございますが、通常のビルでは6〜7階の高さにございますので、エレベーターをご利用ください。</p>
<p>※長い列ができている際は、レストランのご予約の旨、お近くのスタッフにお申し付けいただきますと可能な限り優先乗車ができるようになっております。</p>

<div style="text-align: center; margin: 30px 0;">
    <a href="https://the-gardensapporo.jp/wp/wp-content/uploads/2025/11/GA-illumination-layout.pdf" target="_blank" rel="noopener" style="display: inline-block; padding: 15px 30px; background-color: #1A237E; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: all 0.3s;">
        お席のレイアウトについてはこちらから<br>
        <span style="font-size: 0.8em; font-weight: normal;">(PDFダウンロード)</span>
    </a>
</div>
```
