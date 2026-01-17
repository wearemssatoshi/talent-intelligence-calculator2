
import markdown
import sys

# このスクリプトは、Markdownファイルを読み込み、美しいCSSスタイルを適用したHTMLファイルに変換します。

# 入力ファイルと出力ファイルのパス
markdown_file = '/Users/satoshiiga/dotfiles/presentation_structure.md'
html_file = '/Users/satoshiiga/dotfiles/presentation_structure.html'

# HTMLテンプレートとCSSスタイル
# シンプルで可読性の高いスタイルを定義します。
html_template = """
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>プレゼンテーション構成案</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
            line-height: 1.7;
            color: #24292e;
            background-color: #ffffff;
            max-width: 880px;
            margin: 40px auto;
            padding: 30px;
            border: 1px solid #e1e4e8;
            border-radius: 6px;
        }}
        h1, h2, h3, h4, h5, h6 {{
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
            border-bottom: 1px solid #eaecef;
            padding-bottom: 0.3em;
        }}
        h1 {{ font-size: 2em; }}
        h2 {{ font-size: 1.5em; }}
        h3 {{ font-size: 1.25em; }}
        p {{ margin-top: 0; margin-bottom: 16px; }}
        blockquote {{
            color: #6a737d;
            border-left: 0.25em solid #dfe2e5;
            padding: 0 1em;
            margin-left: 0;
        }}
        ul, ol {{ padding-left: 2em; margin-top: 0; margin-bottom: 16px; }}
        li > p {{ margin-bottom: 0; }}
        code {{
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
            background-color: rgba(27,31,35,0.05);
            padding: 0.2em 0.4em;
            margin: 0;
            font-size: 85%;
            border-radius: 3px;
        }}
        pre > code {{
            display: block;
            padding: 16px;
            overflow: auto;
            font-size: 85%;
            line-height: 1.45;
            border-radius: 3px;
        }}
    </style>
</head>
<body>
    {{content}}
</body>
</html>
"""

def convert_markdown_to_html():
    try:
        with open(markdown_file, 'r', encoding='utf-8') as f:
            md_text = f.read()
    except FileNotFoundError:
        print(f"エラー: 入力ファイルが見つかりません: {markdown_file}")
        sys.exit(1)

    # MarkdownをHTMLに変換
    html_body = markdown.markdown(md_text, extensions=['fenced_code', 'tables'])

    # テンプレートに埋め込む
    final_html = html_template.replace('{{content}}', html_body)

    try:
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(final_html)
        print(f"成功: HTMLファイルを出力しました: {html_file}")
    except IOError as e:
        print(f"エラー: ファイルの書き込みに失敗しました: {e}")
        sys.exit(1)

if __name__ == '__main__':
    convert_markdown_to_html()
