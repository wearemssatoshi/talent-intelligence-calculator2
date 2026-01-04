

import re
import sys
from datetime import datetime, timedelta

def srt_time_to_timedelta(srt_time):
    time_parts = list(map(int, re.split(r'[:,]', srt_time)))
    return timedelta(hours=time_parts[0], minutes=time_parts[1], seconds=time_parts[2], milliseconds=time_parts[3])

def timedelta_to_srt_time(td):
    total_seconds = int(td.total_seconds())
    milliseconds = td.microseconds // 1000
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"

def reformat_srt_file(input_path, output_path, max_len=30):
    with 
    
    
    
    
    
    
    
    open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()

    block_pattern = re.compile(r'(\d+)\n([\d:,]+ --> [\d:,]+)\n([\s\S]*?)(?=\n\n|\Z)')

    new_blocks = []
    new_sub_counter = 1
    for match in block_pattern.finditer(content):
        timestamp_str = match.group(2)
        text = match.group(3)

        start_time_str, end_time_str = timestamp_str.split(' --> ')
        start_td = srt_time_to_timedelta(start_time_str)
        end_td = srt_time_to_timedelta(end_time_str)
        total_duration_td = end_td - start_td

        processed_text = re.sub(r'[。、？！「」（）\n]', ' ', text).strip()
        processed_text = re.sub(r'\s+', ' ', processed_text)

        if not processed_text:
            continue

        total_len = len(processed_text)
        if total_len <= max_len:
            new_blocks.append(f"{new_sub_counter}\n{timestamp_str}\n{processed_text}")
            new_sub_counter += 1
        else:
            words = processed_text.split(' ')
            current_line = ''
            line_start_char_index = 0

            for word in words:
                if len(current_line) + len(word) + 1 > max_len:
                    if current_line:
                        line_end_char_index = line_start_char_index + len(current_line)
                        
                        start_ratio = line_start_char_index / total_len
                        end_ratio = line_end_char_index / total_len

                        line_start_td = start_td + total_duration_td * start_ratio
                        line_end_td = start_td + total_duration_td * end_ratio

                        new_timestamp = f"{timedelta_to_srt_time(line_start_td)} --> {timedelta_to_srt_time(line_end_td)}"
                        new_blocks.append(f"{new_sub_counter}\n{new_timestamp}\n{current_line}")
                        new_sub_counter += 1
                        line_start_char_index = line_end_char_index + 1
                    current_line = word
                else:
                    if current_line:
                        current_line += ' '
                    current_line += word
            
            if current_line:
                line_end_char_index = total_len
                start_ratio = line_start_char_index / total_len
                
                line_start_td = start_td + total_duration_td * start_ratio
                # The last segment takes the remaining time
                line_end_td = end_td

                new_timestamp = f"{timedelta_to_srt_time(line_start_td)} --> {timedelta_to_srt_time(line_end_td)}"
                new_blocks.append(f"{new_sub_counter}\n{new_timestamp}\n{current_line}")
                new_sub_counter += 1

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n\n'.join(new_blocks))

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python reformat_srt_final.py <input_srt> <output_srt>")
        sys.exit(1)
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    reformat_srt_file(input_file, output_file)
