import re
import sys
import os

def parse_srt(srt_content):
    blocks = []

    raw_blocks = re.split(r'\n\n', srt_content.strip())
    for raw_block in raw_blocks:
        lines = raw_block.split('\n')
        if len(lines) >= 3:
            try:
                index = int(lines[0])
                timestamps = lines[1]
                text = "\n".join(lines[2:])
                blocks.append({'index': index, 'timestamps': timestamps, 'text': text})
            except ValueError:
                continue
    return blocks

def clean_text(text):
    # 「、」「。」を除去し、感嘆符・疑問符は保持
    cleaned_text = text.replace('、', '').replace('。', '')
    return cleaned_text

def format_time(ms):
    hours = int(ms / 3_600_000)
    ms %= 3_600_000
    minutes = int(ms / 60_000)
    ms %= 60_000
    seconds = int(ms / 1_000)
    ms %= 1_000
    return f"{hours:02}:{minutes:02}:{seconds:02},{ms:03}"

def srt_time_to_ms(time_str):
    parts = re.split(r'[:,]', time_str)
    h = int(parts[0])
    m = int(parts[1])
    s = int(parts[2])
    ms = int(parts[3])
    return (h * 3_600_000) + (m * 60_000) + (s * 1_000) + ms

def is_hiragana(s):
    return all('ぁ' <= char <= 'ん' for char in s)

def split_japanese_text(text, max_chars=30):
    marker = "@@@"
    delimiters = ['、', '。', '！', '？', '』', '」']
    
    temp_text = text
    for d in delimiters:
        temp_text = temp_text.replace(d, d + marker)
        
    chunks = temp_text.split(marker)
    chunks = [c for c in chunks if c]

    segments = []
    current_segment = ""

    for chunk in chunks:
        if len(current_segment) + len(chunk) <= max_chars:
            current_segment += chunk
        else:
            if current_segment:
                segments.append(current_segment)
            
            while len(chunk) > max_chars:
                split_point = max_chars
                if split_point < len(chunk) and chunk[split_point-1].isascii() and chunk[split_point].isascii() and \
                   chunk[split_point-1].isalpha() and chunk[split_point].isalpha():
                    for i in range(split_point - 1, 0, -1):
                        if not chunk[i-1].isalpha():
                            split_point = i
                            break
                    else: # All alpha
                        pass # Keep original hard split

                segments.append(chunk[:split_point])
                chunk = chunk[split_point:]
            
            current_segment = chunk

    if current_segment:
        segments.append(current_segment)
        
    # Rule 1 (Corrected Buffer Logic): Merge short lines correctly
    final_segments = []
    buffer = ""
    for segment in segments:
        # Clean the segment before checking its length
        cleaned_s = clean_text(segment.strip())
        if len(cleaned_s) <= 3:
            buffer += segment # Buffer the original segment with punctuation
        else:
            final_segments.append(buffer + segment)
            buffer = ""
    if buffer and final_segments:
        final_segments[-1] += buffer
    elif buffer:
        final_segments.append(buffer)

    return final_segments

def process_srt_blocks(blocks):
    processed_blocks = []
    for block in blocks:
        original_text = block['text']
        
        start_time_str, end_time_str = block['timestamps'].split(' --> ')
        start_ms = srt_time_to_ms(start_time_str)
        end_ms = srt_time_to_ms(end_time_str)
        duration_ms = end_ms - start_ms

        segments = split_japanese_text(original_text, max_chars=30)

        if segments:
            total_chars = sum(len(s) for s in segments)
            current_ms = start_ms
            for segment in segments:
                cleaned_segment = clean_text(segment.strip())
                if not cleaned_segment:
                    continue

                segment_duration = int(duration_ms * (len(segment) / total_chars)) if total_chars > 0 else 0
                segment_end_ms = current_ms + segment_duration
                
                if segment_end_ms <= current_ms:
                    segment_end_ms = current_ms + 100

                processed_blocks.append({
                    'index': len(processed_blocks) + 1,
                    'timestamps': f"{format_time(current_ms)} --> {format_time(segment_end_ms)}",
                    'text': cleaned_segment
                })
                current_ms = segment_end_ms
    return processed_blocks

# Main execution
if len(sys.argv) < 2:
    print("Usage: python3 format_srt.py <input_srt_file>")
    sys.exit(1)

input_srt_path = sys.argv[1]

if not os.path.exists(input_srt_path):
    print(f"Error: Input file not found at {input_srt_path}")
    sys.exit(1)

base_name, ext = os.path.splitext(input_srt_path)
output_srt_path = f"{base_name}_formatted_true_perfect{ext}"


with open(input_srt_path, 'r', encoding='utf-8') as f:
    srt_content = f.read()

blocks = parse_srt(srt_content)
processed_blocks = process_srt_blocks(blocks)

with open(output_srt_path, 'w', encoding='utf-8') as f:
    for block in processed_blocks:
        f.write(f"{block['index']}\n")
        f.write(f"{block['timestamps']}\n")
        f.write(f"{block['text']}\n\n")

print(f"Formatted SRT saved to {output_srt_path}")
