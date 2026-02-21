import srt
import json
import os
import MeCab

tagger = MeCab.Tagger("-Owakati")

MAX_CHARS_LINE1 = 12
MAX_CHARS_LINE2 = 18
MAX_LINES_PER_SCREEN = 2

def split_text_by_rules(text, original_start_ms, original_end_ms):
    segments = []
    
    words = tagger.parse(text).strip().split(' ')
    words = [word for word in words if word] # Remove empty strings

    if not words:
        return []

    current_segment_lines = [] # Stores lines for the current output segment (max 2 lines)
    current_line_buffer = [] # Stores words for the current line
    
    for i, word in enumerate(words):
        # Determine max chars for the current line we are building
        max_line_chars = MAX_CHARS_LINE1 if len(current_segment_lines) == 0 else MAX_CHARS_LINE2

        # Calculate length if word is added to current line
        # Add 1 for space if not the first word in the line
        current_line_length = sum(len(w) for w in current_line_buffer) + (len(current_line_buffer) - 1 if current_line_buffer else 0) # Length of words in buffer + spaces
        
        # Check if adding the word exceeds the current line's limit
        # Add 1 for space if current_line_buffer is not empty
        if current_line_length + len(word) + (1 if current_line_buffer else 0) > max_line_chars:
            # Current word makes the line too long. Complete the current line and start a new one.
            if current_line_buffer: # If there are words in the buffer, complete the line
                current_segment_lines.append("".join(current_line_buffer))
                current_line_buffer = [word] # Start new line with current word
            else: # If buffer is empty, and word itself is too long, just add it as a line
                current_segment_lines.append(word)
                current_line_buffer = []
        else:
            current_line_buffer.append(word)

        # Check if current_segment_lines is full (2 lines) or if this is the last word
        if len(current_segment_lines) == MAX_LINES_PER_SCREEN or (i == len(words) - 1 and current_line_buffer):
            # If there are words in the buffer, add them as the last line of the segment
            if current_line_buffer and len(current_segment_lines) < MAX_LINES_PER_SCREEN:
                current_segment_lines.append("".join(current_line_buffer))
                current_line_buffer = [] # Clear buffer

            if current_segment_lines: # If we have lines for a segment, process it
                segment_text = "\n".join(current_segment_lines) # Join with newline for 2-line display
                
                # Remove "、" and "。"
                segment_text = segment_text.replace("、", "").replace("。", "")

                segments.append(segment_text)
                current_segment_lines = [] # Reset for next segment
                current_line_buffer = [] # Reset buffer

    # Recalculate timestamps (same logic as before)
    total_duration_ms = original_end_ms - original_start_ms
    num_segments = len(segments)
    
    if num_segments == 0:
        return []

    segment_duration_ms = total_duration_ms / num_segments
    
    result = []
    for i, text_content in enumerate(segments):
        start_ms = original_start_ms + i * segment_duration_ms
        end_ms = start_ms + segment_duration_ms
        
        result.append({
            "id": f"{i+1}",
            "text": text_content,
            "startMs": int(start_ms),
            "endMs": int(end_ms)
        })
    return result


def convert_srt_to_json(srt_file_path, json_file_path):
    try:
        with open(srt_file_path, 'r', encoding='utf-8') as f:
            srt_content = f.read()
        
        subs = list(srt.parse(srt_content))
        
        parsed_data = []
        for i, sub in enumerate(subs):
            original_start_ms = int(sub.start.total_seconds() * 1000)
            original_end_ms = int(sub.end.total_seconds() * 1000)
            
            # Split text according to new rules and recalculate timestamps
            new_segments = split_text_by_rules(sub.content, original_start_ms, original_end_ms)
            parsed_data.extend(new_segments)
        
        with open(json_file_path, 'w', encoding='utf-8') as f:
            json.dump(parsed_data, f, ensure_ascii=False, indent=2)
        
        print(f"Successfully converted '{srt_file_path}' to '{json_file_path}'")
    except FileNotFoundError:
        print(f"Error: SRT file not found at '{srt_file_path}'")
    except Exception as e:
        print(f"An error occurred: {e}")


if __name__ == "__main__":
    os.makedirs('scripts', exist_ok=True)
    
    # Define paths based on user's confirmation
    srt_input_path = "/Users/satoshiiga/dotfiles/src/rieNEW.srt"
    json_output_path = "/Users/satoshiiga/dotfiles/src/rieNEW_formatted.json" # Using a new name to avoid confusion

    convert_srt_to_json(srt_input_path, json_output_path)