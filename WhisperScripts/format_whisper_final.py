import json
import re
import sys
from datetime import timedelta

# --- 設定項目 ---
MAX_CHARS_PER_LINE = 30
MIN_CHARS_FOR_COMMA_BREAK = 18
# --- 設定項目ここまで ---

def format_srt_time(seconds):
    delta = timedelta(seconds=seconds)
    hours, remainder = divmod(delta.seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    milliseconds = delta.microseconds // 1000
    return f"{hours:02}:{minutes:02}:{seconds:02},{milliseconds:03d}"

def create_final_subtitles(input_path, output_path):
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"エラー: 入力ファイルが見つかりません: {input_path}")
        return

    all_words = []
    for segment in data.get('segments', []):
        all_words.extend(segment.get('words', []))

    if not all_words:
        print("警告: JSONファイルに単語データが含まれていません。")
        return

    # Stage 1: Generate initial subtitles with nuanced logic
    preliminary_subtitles = []
    line_buffer = []
    for i, word_info in enumerate(all_words):
        word = word_info['word'].strip()
        if not word:
            continue
        
        line_buffer.append(word_info)
        current_text = "".join([w['word'].strip() for w in line_buffer])
        
        next_word_exists = i + 1 < len(all_words)
        next_word = all_words[i+1]['word'].strip() if next_word_exists else ""

        break_here = False
        if len(current_text + next_word) > MAX_CHARS_PER_LINE:
            break_here = True
        elif re.search(r'[。！？]$', word):
            break_here = True
        elif re.search(r'[、]$', word) and len(current_text) >= MIN_CHARS_FOR_COMMA_BREAK:
            break_here = True
        elif not next_word_exists:
            break_here = True

        if break_here and line_buffer:
            start_time = line_buffer[0]['start']
            end_time = line_buffer[-1]['end']
            text = "".join([w['word'] for w in line_buffer]).strip()
            if text:
                preliminary_subtitles.append({
                    'start': start_time,
                    'end': end_time,
                    'text': text
                })
            line_buffer = []

    # Stage 2: Post-processing to merge orphaned auxiliaries
    if not preliminary_subtitles:
        print("警告: 字幕が生成されませんでした。")
        return

    final_subtitles = []
    merge_auxiliaries = ("です", "ます", "ました", "でした", "します", "しました")
    i = 0
    while i < len(preliminary_subtitles):
        current_sub = preliminary_subtitles[i]
        # Check if the next subtitle is an auxiliary and should be merged
        if (i + 1 < len(preliminary_subtitles) and 
            preliminary_subtitles[i+1]['text'].strip() in merge_auxiliaries):
            
            next_sub = preliminary_subtitles[i+1]
            # Merge text and extend end time
            merged_sub = {
                'start': current_sub['start'],
                'end': next_sub['end'],
                'text': current_sub['text'] + next_sub['text']
            }
            final_subtitles.append(merged_sub)
            i += 2 # Skip the next subtitle as it has been merged
        else:
            final_subtitles.append(current_sub)
            i += 1

    # Stage 3: Write to SRT with final text formatting
    with open(output_path, 'w', encoding='utf-8') as f:
        for i, sub in enumerate(final_subtitles, 1):
            start_ts = format_srt_time(sub['start'])
            end_ts = format_srt_time(sub['end'])
            
            text = sub['text'].strip()
            text = re.sub(r'[、。]', '', text)
            text = text.replace('リエ', 'りえ')

            if not text:
                continue

            f.write(f"{i}\n")
            f.write(f"{start_ts} --> {end_ts}\n")
            f.write(f"{text}\n\n")

    print(f"最終版SRTファイルの生成が完了しました: {output_path}")

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(f"使用法: python {sys.argv[0]} <入力JSONファイル> <出力SRTファイル>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    create_final_subtitles(input_file, output_file)
