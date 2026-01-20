import json
import re
import sys
from datetime import timedelta

# --- 設定項目 ---
MAX_CHARS_PER_LINE = 30
# 「、」で改行を試みる最小文字数
MIN_CHARS_FOR_COMMA_BREAK = 18 
# --- 設定項目ここまで ---

def format_srt_time(seconds):
    """秒数をSRTのタイムスタンプ形式に変換"""
    delta = timedelta(seconds=seconds)
    hours, remainder = divmod(delta.seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    milliseconds = delta.microseconds // 1000
    return f"{hours:02}:{minutes:02}:{seconds:02},{milliseconds:03d}"

def create_nuanced_subtitles(input_path, output_path):
    """
    Whisperの単語レベルJSONから、文脈を考慮してSRTを作成する。
    """
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"エラー: 入力ファイルが見つかりません: {input_path}")
        return
    except json.JSONDecodeError:
        print(f"エラー: JSONの解析に失敗しました: {input_path}")
        return

    all_words = []
    for segment in data.get('segments', []):
        all_words.extend(segment.get('words', []))

    if not all_words:
        print("警告: JSONファイルに単語データが含まれていません。")
        return

    subtitles = []
    line_buffer = [] # 現在の行の単語情報を保持するリスト

    for i, word_info in enumerate(all_words):
        word = word_info['word'].strip()
        if not word:
            continue
        
        line_buffer.append(word_info)
        current_text = "".join([w['word'].strip() for w in line_buffer])
        
        # 次の単語が存在するかどうか
        next_word_exists = i + 1 < len(all_words)
        next_word = all_words[i+1]['word'].strip() if next_word_exists else ""

        # --- 分割ロジック ---
        break_here = False
        # 1. 最大文字数を超えそうな場合
        if len(current_text + next_word) > MAX_CHARS_PER_LINE:
            break_here = True
        # 2. 文の終わりを示す句読点の場合 (。！？)
        elif re.search(r'[。！？]$', word):
            break_here = True
        # 3. 読点(、)があり、かつ行が一定の長さ以上の場合
        elif re.search(r'[、]$', word) and len(current_text) >= MIN_CHARS_FOR_COMMA_BREAK:
            break_here = True
        # 4. 最後の単語の場合
        elif not next_word_exists:
            break_here = True

        if break_here and line_buffer:
            start_time = line_buffer[0]['start']
            end_time = line_buffer[-1]['end']
            text = "".join([w['word'] for w in line_buffer]).strip()
            
            # 句読点を除去して最終テキストを作成
            final_text = re.sub(r'[、。]', '', text)

            if final_text:
                subtitles.append({
                    'start': start_time,
                    'end': end_time,
                    'text': final_text
                })
            
            line_buffer = [] # バッファをクリア

    # SRTファイルとして書き出し
    with open(output_path, 'w', encoding='utf-8') as f:
        for i, sub in enumerate(subtitles, 1):
            start_ts = format_srt_time(sub['start'])
            end_ts = format_srt_time(sub['end'])
            
            f.write(f"{i}\n")
            f.write(f"{start_ts} --> {end_ts}\n")
            f.write(f"{sub['text']}\n\n")

    print(f"SRTファイルの再生成が完了しました: {output_path}")

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(f"使用法: python {sys.argv[0]} <入力JSONファイル> <出力SRTファイル>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    create_nuanced_subtitles(input_file, output_file)
