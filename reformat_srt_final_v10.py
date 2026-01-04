import json
import re
import sys
from datetime import timedelta

# --- 設定項目 ---
TARGET_CHARS = 28
MAX_CHARS = 35 # これを多少超えることは許容

def format_srt_time(seconds):
    if seconds < 0:
        seconds = 0
    delta = timedelta(seconds=seconds)
    hours, remainder = divmod(delta.total_seconds(), 3600)
    minutes, seconds = divmod(remainder, 60)
    milliseconds = int((seconds - int(seconds)) * 1000)
    return f"{int(hours):02}:{int(minutes):02}:{int(seconds):02},{milliseconds:03d}"

def find_best_break_point(words, start_index):
    """最適な改行ポイントを見つける"""
    current_chars = 0
    last_punctuation_break = -1
    last_particle_break = -1

    for i in range(start_index, len(words)):
        word_info = words[i]
        word = word_info.get('word', '').strip()
        current_chars += len(word)

        if current_chars > MAX_CHARS:
            if last_punctuation_break != -1:
                return last_punctuation_break
            if last_particle_break != -1:
                return last_particle_break
            return i # 強制的に改行

        if re.search(r'[。！？、]', word):
            last_punctuation_break = i + 1
        
        particles = ['は', 'も', 'が', 'に', 'を', 'で', 'と', 'ので', 'から']
        if any(word.endswith(p) for p in particles) and current_chars > 10:
             last_particle_break = i + 1

        if current_chars >= TARGET_CHARS:
            if last_punctuation_break != -1:
                return last_punctuation_break
            if last_particle_break != -1:
                return last_particle_break

    return len(words) # 最後まで

def create_final_subtitles(input_path, output_path):
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"エラー: {e}")
        return

    all_words = [word for segment in data.get('segments', []) for word in segment.get('words', [])]
    if not all_words:
        all_words = data.get('words', [])
    if not all_words:
        print("警告: JSONファイルに単語データが含まれていません。")
        return

    subtitles = []
    current_index = 0
    while current_index < len(all_words):
        break_point = find_best_break_point(all_words, current_index)
        if break_point <= current_index:
            break_point = current_index + 1 # 進行しない場合、強制的に1つ進める
            
        line_words = all_words[current_index:break_point]
        if not line_words:
            break

        start_time = line_words[0]['start']
        end_time = line_words[-1]['end']
        text = "".join([w['word'] for w in line_words]).strip()
        
        if len(text) <= 2 and subtitles:
            prev_sub = subtitles[-1]
            prev_sub['end'] = end_time
            prev_sub['text'] += text
        else:
            subtitles.append({'start': start_time, 'end': end_time, 'text': text})
        
        current_index = break_point

    with open(output_path, 'w', encoding='utf-8') as f:
        for i, sub in enumerate(subtitles, 1):
            start_ts = format_srt_time(sub['start'])
            end_ts = format_srt_time(sub['end'])
            text = sub['text'].strip()
            text = re.sub(r'[、。]', '', text)
            text = text.replace('子供', '子ども')
            text = text.replace('リー', 'りえ')

            if text:
                f.write(f"{i}\n{start_ts} --> {end_ts}\n{text}\n\n")

    print(f"最終版SRTファイルの生成が完了しました: {output_path}")

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(f"使用法: python {sys.argv[0]} <入力JSON> <出力SRT>")
        sys.exit(1)
    create_final_subtitles(sys.argv[1], sys.argv[2])
