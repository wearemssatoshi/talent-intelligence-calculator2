import json
import re
import sys
from datetime import timedelta

# --- 設定項目 ---
# 1テロップあたりの最大文字数
MAX_CHARS_PER_LINE = 30
# --- 設定項目ここまで ---

def format_srt_time(seconds):
    """秒数をSRTのタイムスタンプ形式に変換"""
    delta = timedelta(seconds=seconds)
    hours, remainder = divmod(delta.seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    milliseconds = delta.microseconds // 1000
    return f"{hours:02}:{minutes:02}:{seconds:02},{milliseconds:03d}"

def create_subtitles(input_path, output_path):
    """
    Whisperの単語レベルタイムスタンプ付きJSONから、
    指定したルールでSRTファイルを作成する。
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
    current_line = ""
    line_start_time = None
    line_end_time = None

    for word_info in all_words:
        word = word_info['word']
        start_time = word_info['start']
        end_time = word_info['end']

        if line_start_time is None:
            line_start_time = start_time

        # 新しい単語を追加すると最大文字数を超えるかチェック
        if len(current_line + word.strip()) > MAX_CHARS_PER_LINE:
            # 現在の行を字幕として追加
            if current_line:
                subtitles.append({
                    'start': line_start_time,
                    'end': line_end_time,
                    'text': current_line
                })
            # 新しい行を開始
            current_line = word
            line_start_time = start_time
            line_end_time = end_time
        else:
            # 現在の行に単語を追加
            current_line += word
            line_end_time = end_time

    # 最後の行を追加
    if current_line:
        subtitles.append({
            'start': line_start_time,
            'end': line_end_time,
            'text': current_line
        })

    # SRTファイルとして書き出し
    with open(output_path, 'w', encoding='utf-8') as f:
        for i, sub in enumerate(subtitles, 1):
            # テキストから句読点を除去
            text = re.sub(r'[、。]', '', sub['text'].strip())
            if not text:
                continue
            
            start_ts = format_srt_time(sub['start'])
            end_ts = format_srt_time(sub['end'])
            
            f.write(f"{i}\n")
            f.write(f"{start_ts} --> {end_ts}\n")
            f.write(f"{text}\n\n")

    print(f"SRTファイルの作成が完了しました: {output_path}")

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("使用法: python format_whisper_v3.py <入力JSONファイル> <出力SRTファイル>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    create_subtitles(input_file, output_file)