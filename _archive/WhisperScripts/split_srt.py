
import sys
import re
import os

def split_srt_file(file_path):
    """SRTファイルを2つに分割する"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"エラー: ファイルが見つかりません: {file_path}")
        return

    # SRTブロックは空行2つで区切られていると仮定
    blocks = content.strip().split('\n\n')
    
    if len(blocks) < 2:
        print("エラー: ファイルを分割するには、少なくとも2つの字幕ブロックが必要です。")
        return

    total_blocks = len(blocks)
    split_point = total_blocks // 2

    # ファイル名の準備
    base_name, ext = os.path.splitext(file_path)
    output_path_part1 = f"{base_name}_part1{ext}"
    output_path_part2 = f"{base_name}_part2{ext}"

    # 前半部分の書き出し
    part1_content = '\n\n'.join(blocks[:split_point])
    with open(output_path_part1, 'w', encoding='utf-8') as f:
        f.write(part1_content + '\n\n')
    print(f"前半部分を保存しました: {output_path_part1} ({split_point}件の字幕)")

    # 後半部分の連番を振り直して書き出し
    part2_blocks = blocks[split_point:]
    new_part2_blocks = []
    for i, block in enumerate(part2_blocks):
        # ブロックの最初の行（連番）を新しい番号に置換
        # 空のブロックや不正な形式のブロックを考慮
        lines = block.split('\n')
        if len(lines) > 0:
            lines[0] = str(i + 1)
            new_block = '\n'.join(lines)
            new_part2_blocks.append(new_block)
    
    part2_content = '\n\n'.join(new_part2_blocks)
    with open(output_path_part2, 'w', encoding='utf-8') as f:
        f.write(part2_content + '\n\n')
    print(f"後半部分を保存しました: {output_path_part2} ({len(new_part2_blocks)}件の字幕)")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("使用法: python split_srt.py <SRTファイルパス>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    split_srt_file(input_file)
