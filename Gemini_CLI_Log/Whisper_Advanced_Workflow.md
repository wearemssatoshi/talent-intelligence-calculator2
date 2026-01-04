# Whisperによる高度なテロップ作成ワークフロー

このドキュメントは、OpenAI Whisperを使用して音声ファイルから文字起こしを行い、指定された文字数と意味の区切りでテロップを整形し、タイムスタンプを再計算するまでの一連の作業を記録したものです。

## 1. Whisperによる初期文字起こし

まず、`whisper`コマンドを使用して、対象の音声ファイル（`.m4a`）から文字起こしを行い、SRT形式の字幕ファイルを生成します。

- **モデル**: `medium`（日本語の高精度な文字起こしに推奨）
- **言語**: `Japanese`
- **出力形式**: `srt`

```bash
whisper /Users/satoshiiga/rie_whisper.m4a --model medium --language Japanese --output_format srt
```

このコマンドにより、タイムスタンプ付きの `rie_whisper.srt` ファイルが生成されます。

## 2. テロップの整形（句読点除去と1行化）

次に、生成されたSRTファイルに対して、以下の処理を行うPythonスクリプトを作成・実行します。

1.  **句読点の除去**: テキストから「、」「。」「！」「？」を取り除きます。
2.  **1行化**: 複数行にわたるテキストを1つの行にまとめます。

### スクリプト (`format_final.py`)

```python
import re

input_srt_path = '/Users/satoshiiga/rie_whisper.srt'
output_srt_path = '/Users/satoshiiga/rie_whisper_final.srt'

with open(input_srt_path, 'r', encoding='utf-8') as f_in:
    blocks = f_in.read().strip().split('\n\n')

new_blocks = []
for block in blocks:
    lines = block.split('\n')
    if len(lines) < 3:
        continue
    
    number = lines[0]
    timestamp = lines[1]
    text_lines = lines[2:]
    
    full_text = ' '.join(text_lines)
    cleaned_text = re.sub(r'[、。！？]', '', full_text)
    
    new_blocks.append(f"{number}\n{timestamp}\n{cleaned_text}")

with open(output_srt_path, 'w', encoding='utf-8') as f_out:
    f_out.write('\n\n'.join(new_blocks))
```

### 実行コマンド

```bash
/Users/satoshiiga/.pyenv/versions/3.10.13/bin/python /Users/satoshiiga/format_final.py
```

これにより、`rie_whisper_final.srt` が生成されます。

## 3. テロップの最終調整（文字数制限とタイムスタンプ再計算）

最後に、1行化されたテロップを、**1行最大28文字**の制限を守りつつ、**言葉のキリが良い箇所**で分割し、各テロップの表示時間も**テキストの長さに応じて再計算**する、より高度なスクリプトを実行します。

### スクリプト (`reformat_srt_final.py`)

```python
import re
from datetime import datetime, timedelta

INPUT_FILE = '/Users/satoshiiga/rie_whisper.srt'
OUTPUT_FILE = '/Users/satoshiiga/rie_whisper_final_v2.srt'
MAX_CHARS_PER_LINE = 28

def parse_srt_time(time_str):
    return datetime.strptime(time_str, '%H:%M:%S,%f')

def format_srt_time(dt_obj):
    return dt_obj.strftime('%H:%M:%S') + f',{dt_obj.microsecond//1000:03d}'

def reformat_srt():
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    blocks = content.strip().split('\n\n')
    new_srt_blocks = []
    new_counter = 1

    for block in blocks:
        lines = block.split('\n')
        if len(lines) < 3:
            continue

        try:
            num = lines[0]
            time_line = lines[1]
            text_lines = lines[2:]

            start_time_str, end_time_str = time_line.split(' --> ')
            start_time = parse_srt_time(start_time_str)
            end_time = parse_srt_time(end_time_str)
            total_duration = end_time - start_time

            full_text = ' '.join(text_lines)
            cleaned_text = re.sub(r'[、。！？]', '', full_text).strip()

            if not cleaned_text:
                continue

            # Chunk the text
            chunks = []
            current_chunk = ''
            # More natural splitting points
            split_points = [m.start() for m in re.finditer(r'( |　|です|ます|でした|ました|から|ので|が|を|に|は|て|で|と|、|。)', cleaned_text)]
            last_split = 0
            while len(cleaned_text) > last_split:
                # Find the best split point within MAX_CHARS
                best_cut = -1
                if len(cleaned_text) - last_split > MAX_CHARS_PER_LINE:
                    for sp in reversed(split_points):
                        if last_split < sp < last_split + MAX_CHARS_PER_LINE:
                            best_cut = sp
                            break
                    if best_cut == -1: # No natural break found, force cut
                        best_cut = last_split + MAX_CHARS_PER_LINE
                else:
                    best_cut = len(cleaned_text)
                
                chunk = cleaned_text[last_split:best_cut].strip()
                if chunk:
                    chunks.append(chunk)
                last_split = best_cut

            total_text_len = len("".join(chunks))
            if total_text_len == 0:
                continue

            current_start_time = start_time
            for chunk in chunks:
                chunk_len = len(chunk)
                chunk_duration = (total_duration * chunk_len) / total_text_len
                chunk_end_time = current_start_time + chunk_duration

                new_block = f"{new_counter}\n"
                new_block += f"{format_srt_time(current_start_time)} --> {format_srt_time(chunk_end_time)}\n"
                new_block += chunk
                new_srt_blocks.append(new_block)

                current_start_time = chunk_end_time
                new_counter += 1

        except (ValueError, IndexError) as e:
            # Skip malformed blocks
            print(f"Skipping malformed block: {block}\nError: {e}")
            continue

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write('\n\n'.join(new_srt_blocks))

reformat_srt()
```

### 実行コマンド

```bash
/Users/satoshiiga/.pyenv/versions/3.10.13/bin/python /Users/satoshiiga/reformat_srt_final.py
```

これにより、最終的な成果物である `rie_whisper_final_v2.srt` が生成されました。
