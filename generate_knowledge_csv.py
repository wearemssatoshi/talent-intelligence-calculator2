import os
import re
import csv

# 設定
INPUT_DIR = 'NoteArticles'
OUTPUT_FILE = 'tss_knowledge_base.csv'

def parse_file(filepath, filename):
    chunks = []
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 章のタイトルを取得 (### CHAPTER ...)
    chapter_match = re.search(r'### (.*)', content)
    chapter_title = chapter_match.group(1).strip() if chapter_match else filename

    # セクションまたは見出しで分割
    # パターン: 
    # 1. #### SECTION ...
    # 2. **見出し**
    
    # まず行ごとに処理して、見出しを見つけたらチャンクを切り替える
    lines = content.split('\n')
    
    current_title = chapter_title
    current_text = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # セクション見出し (####)
        if line.startswith('####'):
            # 前のチャンクを保存
            if current_text:
                chunks.append({
                    'Source': filename,
                    'Title': current_title,
                    'Content': '\n'.join(current_text)
                })
            # 新しいタイトル設定
            current_title = line.replace('####', '').strip()
            current_text = []
            
        # 強調見出し (**) - ただし文中の強調を除くため、行頭・行末にあるもののみ
        elif line.startswith('**') and line.endswith('**') and len(line) < 50:
             # 前のチャンクを保存
            if current_text:
                chunks.append({
                    'Source': filename,
                    'Title': current_title,
                    'Content': '\n'.join(current_text)
                })
            # 新しいタイトル設定 (章タイトル + 見出し)
            subtitle = line.replace('**', '').strip()
            current_title = f"{chapter_title} - {subtitle}"
            current_text = []
            
        # 章見出し (###) はスキップ（すでに取得済み）
        elif line.startswith('###'):
            continue
            
        else:
            current_text.append(line)
            
    # 最後のチャンクを保存
    if current_text:
        chunks.append({
            'Source': filename,
            'Title': current_title,
            'Content': '\n'.join(current_text)
        })
        
    return chunks

def main():
    all_chunks = []
    
    # ディレクトリ内のファイルを走査
    if not os.path.exists(INPUT_DIR):
        print(f"Error: Directory '{INPUT_DIR}' not found.")
        return

    files = [f for f in os.listdir(INPUT_DIR) if f.endswith('.txt')]
    files.sort()
    
    print(f"Found {len(files)} text files.")
    
    for filename in files:
        filepath = os.path.join(INPUT_DIR, filename)
        print(f"Processing {filename}...")
        try:
            chunks = parse_file(filepath, filename)
            all_chunks.extend(chunks)
            print(f"  -> Extracted {len(chunks)} chunks.")
        except Exception as e:
            print(f"  -> Error: {e}")

    # CSV出力
    with open(OUTPUT_FILE, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['Source', 'Title', 'Content'])
        writer.writeheader()
        writer.writerows(all_chunks)
        
    print(f"\nSuccessfully created '{OUTPUT_FILE}' with {len(all_chunks)} total chunks.")

if __name__ == '__main__':
    main()
