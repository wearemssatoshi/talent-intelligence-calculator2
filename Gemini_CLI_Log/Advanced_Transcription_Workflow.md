# 高精度テロップ作成ワークフロー (タイムスタンプ付き)

## 1. 目的

音声ファイルから文字起こしを行い、ビデオ編集ソフト（Final Cut Proなど）で使用可能な、高精度なタイムスタンプ付きのテロップファイル（SRT形式）を生成する。

## 2. テロップのルール（厳守）

- **一文の最大文字数:** 30文字以内
- **フォーマット:** 1テロップ1行
- **表現:** 話し言葉の自然さを活かしつつ、読みやすく整形する
- **フィラー除去:** 「あー」「えー」などの不要なフィラーや無音区間は除去する

## 3. ワークフロー手順

### ステップ1: WhisperによるSRTファイルの初期生成

まず、`whisper`コマンドを使用して、対象の音声ファイルからタイムスタンプ情報を含むSRT形式の字幕ファイルを生成する。

- **モデル:** `medium`（日本語の高精度な文字起こしに推奨）
- **言語:** `Japanese`
- **出力形式:** `srt`

**コマンド例:**
```bash
whisper '/path/to/your/audio.m4a' --model medium --language Japanese --output_format srt
```

これにより、`audio.srt` のようなファイルが生成される。

### ステップ2: スクリプトによるテロップの整形とタイムスタンプ再計算

次に、ステップ1で生成されたSRTファイルを読み込み、指定されたルール（30文字以内、自然な区切り）に従ってテロップを再分割し、各テロップのタイムスタンプを精密に再計算するPythonスクリプトを実行する。

**スクリプト (`reformat_srt_with_timestamps.py`):**

```python
import re
from datetime import datetime, timedelta

# --- 設定項目 --- #
# 入力するSRTファイルのパス
INPUT_FILE = '/Users/satoshiiga/rie_money.srt' 
# 出力するSRTファイルのパス
OUTPUT_FILE = '/Users/satoshiiga/rie_money_formatted.srt'
# 1行あたりの最大文字数
MAX_CHARS_PER_LINE = 30
# --- 設定項目ここまで --- 

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
            time_line = lines[1]
            text_lines = lines[2:]

            start_time_str, end_time_str = time_line.split(' --> ')
            start_time = parse_srt_time(start_time_str)
            end_time = parse_srt_time(end_time_str)
            total_duration = end_time - start_time

            full_text = ' '.join(text_lines)
            cleaned_text = re.sub(r'[、。！？]', '', full_text).strip()
            cleaned_text = re.sub(r'\s+', ' ', cleaned_text).strip()

            if not cleaned_text:
                continue

            chunks = []
            last_split = 0
            while last_split < len(cleaned_text):
                if len(cleaned_text) - last_split <= MAX_CHARS_PER_LINE:
                    chunks.append(cleaned_text[last_split:])
                    break
                
                best_cut = -1
                # 自然な分割点（助詞、句読点など）を探す
                split_points = [m.start() for m in re.finditer(r'( |　|です|ます|でした|ました|から|ので|が|を|に|は|て|で|と|、|。)', cleaned_text)]
                for sp in reversed(split_points):
                    if last_split < sp < last_split + MAX_CHARS_PER_LINE:
                        best_cut = sp + 1 # 分割点の直後で分割
                        break
                
                if best_cut == -1: # 自然な分割点が見つからない場合は強制的に分割
                    best_cut = last_split + MAX_CHARS_PER_LINE

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
                chunk_duration = (total_duration * chunk_len) / total_text_len if total_text_len > 0 else timedelta(seconds=0)
                chunk_end_time = current_start_time + chunk_duration

                new_block = f"{new_counter}\n"
                new_block += f"{format_srt_time(current_start_time)} --> {format_srt_time(chunk_end_time)}\n"
                new_block += chunk
                new_srt_blocks.append(new_block)

                current_start_time = chunk_end_time
                new_counter += 1

        except (ValueError, IndexError) as e:
            print(f"Skipping malformed block: {block}\nError: {e}")
            continue

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write('\n\n'.join(new_srt_blocks))

# スクリプトの実行
reformat_srt()

```

### ステップ3: スクリプトの実行

上記Pythonスクリプトを保存し、ターミナルで実行する。

**コマンド例:**
```bash
python /path/to/your/reformat_srt_with_timestamps.py
```

### ステップ4: 成果物の確認

実行後、指定した出力パスに、最終的なフォーマット済みSRTファイル（例: `rie_money_formatted.srt`）が生成される。
このファイルをビデオ編集ソフトに読み込ませて使用する。

```