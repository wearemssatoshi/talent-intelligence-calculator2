#!/usr/bin/env python3
"""
SVD式テロップ整形スクリプト（正式版）

使用法:
    python format_srt.py <入力JSON> <出力SRT>

入力: Whisperが出力したJSON（--word_timestamps True）
出力: テロップ用SRTファイル
"""

import json
import re
import sys
from datetime import timedelta

# --- 設定項目 ---
TARGET_CHARS = 28
MAX_CHARS = 35

def format_srt_time(seconds):
    """秒数をSRT形式のタイムスタンプに変換"""
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
            return i  # 強制的に改行

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

    return len(words)

def apply_corrections(text):
    """表記統一と誤変換修正"""
    # 句読点処理
    text = re.sub(r'[、。]', '', text)
    
    # 標準表記
    text = text.replace('子供', '子ども')
    
    # よくある誤変換
    corrections = {
        'リエ': 'りえ',
        '嫉妬': '叱咤',
        'めどくさい': 'めんどくさい',
        'マスマス': 'ますます',
        '鉄屋': '徹夜',
        '力無': '力む',
        '企業をしたり': '起業したり',
        '証人': '承認',
        '前承認': '全承認',
    }
    for wrong, correct in corrections.items():
        text = text.replace(wrong, correct)
    
    return text

def create_subtitles(input_path, output_path):
    """メイン処理"""
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"エラー: {e}")
        return False

    # 単語データ取得
    all_words = [word for segment in data.get('segments', []) for word in segment.get('words', [])]
    if not all_words:
        all_words = data.get('words', [])
    if not all_words:
        print("警告: JSONファイルに単語データが含まれていません。")
        return False

    # テロップ生成
    subtitles = []
    current_index = 0
    while current_index < len(all_words):
        break_point = find_best_break_point(all_words, current_index)
        if break_point <= current_index:
            break_point = current_index + 1
            
        line_words = all_words[current_index:break_point]
        if not line_words:
            break

        start_time = line_words[0]['start']
        end_time = line_words[-1]['end']
        text = "".join([w['word'] for w in line_words]).strip()
        
        # 短いテロップは前のものに結合
        if len(text) <= 2 and subtitles:
            prev_sub = subtitles[-1]
            prev_sub['end'] = end_time
            prev_sub['text'] += text
        else:
            subtitles.append({'start': start_time, 'end': end_time, 'text': text})
        
        current_index = break_point

    # SRT出力
    with open(output_path, 'w', encoding='utf-8') as f:
        for i, sub in enumerate(subtitles, 1):
            start_ts = format_srt_time(sub['start'])
            end_ts = format_srt_time(sub['end'])
            text = apply_corrections(sub['text'].strip())

            if text:
                f.write(f"{i}\n{start_ts} --> {end_ts}\n{text}\n\n")

    print(f"✅ SRTファイル生成完了: {output_path}")
    print(f"   テロップ数: {len(subtitles)}")
    return True

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(f"使用法: python {sys.argv[0]} <入力JSON> <出力SRT>")
        sys.exit(1)
    success = create_subtitles(sys.argv[1], sys.argv[2])
    sys.exit(0 if success else 1)
