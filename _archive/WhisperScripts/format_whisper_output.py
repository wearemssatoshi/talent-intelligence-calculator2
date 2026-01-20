import json
import re
import sys
import os
import argparse

def clean_text(text):
    """句読点（、。）を除去し、感嘆符・疑問符は保持する"""
    return text.replace('、', '').replace('。', '')

def ms_to_srt_time(ms):
    """ミリ秒をSRTのタイムスタンプ形式に変換する"""
    hours = int(ms / 3_600_000)
    ms %= 3_600_000
    minutes = int(ms / 60_000)
    ms %= 60_000
    seconds = int(ms / 1_000)
    ms %= 1_000
    return f"{hours:02}:{minutes:02}:{seconds:02},{ms:03}"

def split_japanese_text(text, max_chars):
    """自然な改行位置で日本語テキストを分割する"""
    marker = "@@@"
    # 文節の区切りになりそうな文字でマーカーを挿入
    delimiters = ['、', '。', '！', '？', '』', '」', ' ']
    temp_text = text
    for d in delimiters:
        temp_text = temp_text.replace(d, d + marker)
    
    chunks = temp_text.split(marker)
    chunks = [c.strip() for c in chunks if c.strip()]

    segments = []
    current_segment = ""

    for chunk in chunks:
        # 現在のセグメントにチャンクを追加すると長すぎる場合
        if len(current_segment) + len(chunk) > max_chars:
            if current_segment:
                segments.append(current_segment)
            
            # チャンク自体が長すぎる場合は強制的に分割
            while len(chunk) > max_chars:
                segments.append(chunk[:max_chars])
                chunk = chunk[max_chars:]
            
            current_segment = chunk
        else:
            current_segment += chunk

    if current_segment:
        segments.append(current_segment)
        
    return segments

def process_segments(segments, max_chars):
    """Whisperのセグメントを処理し、指定されたルールで再分割・整形する（安定版）"""
    all_sub_segments = []
    for segment in segments:
        original_text = segment['text'].strip()
        if not original_text:
            continue

        start_ms = int(segment['start'] * 1000)
        end_ms = int(segment['end'] * 1000)
        duration_ms = end_ms - start_ms

        sub_segments = split_japanese_text(original_text, max_chars=max_chars)
        
        if not sub_segments:
            continue

        total_chars = sum(len(s) for s in sub_segments)
        
        accumulated_chars = 0
        for i, sub_segment_text in enumerate(sub_segments):
            cleaned_text = clean_text(sub_segment_text.strip())
            if not cleaned_text:
                continue

            start_offset = (duration_ms * accumulated_chars) // total_chars if total_chars > 0 else 0
            
            accumulated_chars += len(sub_segment_text)

            if i == len(sub_segments) - 1:
                end_offset = duration_ms
            else:
                end_offset = (duration_ms * accumulated_chars) // total_chars if total_chars > 0 else 0
            
            current_start_ms = start_ms + start_offset
            current_end_ms = start_ms + end_offset

            all_sub_segments.append({
                'start_ms': current_start_ms,
                'end_ms': current_end_ms,
                'text': cleaned_text
            })

    # タイムスタンプの連続性を保証し、重複を修正する
    final_blocks = []
    last_end_ms = -1
    for block in all_sub_segments:
        start_ms = block['start_ms']
        end_ms = block['end_ms']

        if start_ms < last_end_ms:
            start_ms = last_end_ms
        
        if end_ms <= start_ms:
            end_ms = start_ms + 100  # 最低表示時間

        final_blocks.append({
            'start_ms': start_ms,
            'end_ms': end_ms,
            'text': block['text']
        })
        last_end_ms = end_ms
        
    return final_blocks

def main():
    parser = argparse.ArgumentParser(description='WhisperのJSON出力を整形してSRTファイルを作成します。')
    parser.add_argument('input_json', help='入力するWhisperのJSONファイル')
    parser.add_argument('--max_chars', type=int, default=30, help='テロップ1行あたりの最大文字数')
    parser.add_argument('--output_srt', help='出力するSRTファイル名 (指定しない場合は自動生成)')
    args = parser.parse_args()

    if not os.path.exists(args.input_json):
        print(f"エラー: 入力ファイルが見つかりません: {args.input_json}")
        sys.exit(1)

    # 出力ファイル名の決定
    if args.output_srt:
        output_srt_path = args.output_srt
    else:
        base_name, _ = os.path.splitext(args.input_json)
        output_srt_path = f"{base_name}_original_constitution_max{args.max_chars}.srt"

    # JSONファイルの読み込み
    with open(args.input_json, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # セグメントの処理
    processed_blocks = process_segments(data['segments'], args.max_chars)

    # SRTファイルの書き出し
    with open(output_srt_path, 'w', encoding='utf-8') as f:
        for i, block in enumerate(processed_blocks):
            if not block['text']:
                continue
            f.write(f"{i + 1}\n")
            f.write(f"{ms_to_srt_time(block['start_ms'])} --> {ms_to_srt_time(block['end_ms'])}\n")
            f.write(f"{block['text']}\n\n")

    print(f"整形済みSRTファイルを保存しました: {output_srt_path}")

if __name__ == "__main__":
    main()