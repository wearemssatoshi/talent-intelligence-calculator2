
import markdown

def convert_md_to_html(markdown_file, html_file):
    with open(markdown_file, 'r', encoding='utf-8') as f:
        md_text = f.read()

    # HTMLに変換
    html_body = markdown.markdown(md_text, extensions=['fenced_code', 'tables'])

    # スタイリングを追加して見栄えを良くする
    html_content = f"""
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SVD Future Strategy Presentation</title>
        <style>
            body {{
                font-family: 'Hiragino Kaku Gothic ProN', 'ヒラギノ角ゴ ProN W3', Meiryo, メイリオ, Osaka, 'MS PGothic', sans-serif;
                line-height: 1.8;
                max-width: 800px;
                margin: 40px auto;
                padding: 0 20px;
                color: #333;
            }}
            h1, h2, h3, h4 {{
                border-bottom: 1px solid #eee;
                padding-bottom: 10px;
                margin-top: 40px;
            }}
            h1 {{ font-size: 2.2em; }}
            h2 {{ font-size: 1.8em; }}
            h3 {{ font-size: 1.5em; }}
            h4 {{ font-size: 1.2em; }}
            strong {{
                color: #000;
            }}
            ul {{
                padding-left: 20px;
            }}
            li {{
                margin-bottom: 10px;
            }}
        </style>
    </head>
    <body>
        {html_body}
    </body>
    </html>
    """

    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"HTMLファイル '{html_file}' を作成しました。")

if __name__ == '__main__':
    markdown_input = "/Users/satoshiiga/Desktop/SVD_Future_Strategy_Presentation.md"
    html_output = "/Users/satoshiiga/Desktop/SVD_Future_Strategy_Presentation.html"
    convert_md_to_html(markdown_input, html_output)
