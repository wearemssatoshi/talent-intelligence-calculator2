import re

def find_japanese_natural_break(text, max_len):
    # This function aims to find the most natural break point within a given text segment
    # up to a specified maximum length (max_len), prioritizing linguistic units.
    
    # Define patterns for natural break points based on Japanese grammar and prosody.
    # These are ordered by preference (higher preference first).
    
    # 1. After particles (助詞の後): These are strong natural break points.
    #    Example: 「〜が」「〜を」「〜に」「〜で」「〜と」「〜から」「〜まで」「〜より」「〜など」
    #    Also includes sentence-ending particles like 「ね」「よ」「わ」 etc.
    #    And conjunctive particles like 「て」「で」
    #    Crucially, avoid splitting verb/adjective stems from their conjugations/auxiliaries.
    particle_pattern = r'([はがをにでとからまでよりなどへもばがなよわね])(?!(いう|ます|です|ません|たい|れる|られる|せる|させる|ない|たがる|がる|そう|らしい|ようだ|みたい|ぽい))'

    # 2. Before conjunctions (接続詞の前): Indicates a new clause or thought.
    #    Example: 「そして」「しかし」「だが」「ので」「から」
    conjunction_pattern = r'(そして|しかし|だが|ので|から|そのため|したがって|ところが|さて|では|つまり|要するに|例えば|一方|また|あるいは|もしくは|だが|しかし|ところが|さて|では|なぜなら|したがって|ゆえに|それゆえ|そこで|すると|すると|そこで|さて|では|つまり|要するに|例えば|一方|また|あるいは|もしくは)'

    # 3. After a verb/adjective stem (動詞・形容詞の語幹の後): Before auxiliary verbs or conjugations.
    #    This is tricky without a full morphological analyzer, so we'll use a simple heuristic:
    #    A hiragana character followed by another hiragana, where the first might be a stem ending.
    #    Prioritize if it's not a particle.
    verb_adj_stem_pattern = r'([ぁ-ん])(?=[ぁ-ん])'

    # 4. Punctuation marks (句読点): Strong break points.
    punctuation_pattern = r'([！？])'

    # 5. After a noun phrase (名詞句の後): Less strong than particles, but often natural.
    #    Heuristic: After a Kanji/Katakana sequence, before Hiragana.
    noun_phrase_end_pattern = r'([一-龯ァ-ヶ]+)(?=[ぁ-ん])'

    # List of potential break points and their scores
    # Score: Higher is better. We want to find the highest scoring break point closest to max_len.
    potential_breaks = [] # List of (score, index)

    # Iterate through the text up to max_len to find potential break points
    for i in range(1, min(len(text) + 1, max_len + 1)): # Iterate up to max_len (inclusive)
        segment = text[:i]
        last_char = text[i-1]
        next_char = text[i] if i < len(text) else ''

        score = 0

        # Check for particle break (highest priority)
        if re.search(particle_pattern, last_char) and i < len(text):
            # Ensure it's not splitting a verb/adjective stem from its ending
            if not re.search(r'[ぁ-ん]([いえるうくぐすつぬふぶぷむゆるとどごぞぼぽ])', text[i-2:i]): # Simple check for common verb endings
                score = max(score, 10) 
        
        # Check for conjunction break (before next_char)
        if re.match(conjunction_pattern, text[i:]):
            score = max(score, 9) 

        # Check for punctuation break
        if re.search(punctuation_pattern, last_char):
            score = max(score, 8) 

        # Check for verb/adjective stem break (heuristic, lower priority than particles/conjunctions)
        if re.search(verb_adj_stem_pattern, last_char) and re.match(r'[ぁ-ん]', next_char):
            score = max(score, 5) 

        # Check for noun phrase end
        if re.search(noun_phrase_end_pattern, text[:i]) and re.match(r'[ぁ-ん]', next_char):
            score = max(score, 3) 

        # Add to potential breaks if a score is assigned
        if score > 0:
            potential_breaks.append((score, i))
    
    # If no natural breaks found, or if max_len is very small, just split at max_len
    if not potential_breaks:
        return min(len(text), max_len)

    # Find the best break point: highest score, and closest to max_len
    # Sort by score (desc), then by index (desc to prefer breaks closer to max_len)
    potential_breaks.sort(key=lambda x: (x[0], x[1]), reverse=True)
    
    # Return the index of the best break point
    return potential_breaks[0][1]

def format_text_to_two_lines(text):
    # Remove '、' and '。' as per previous instruction
    text = text.replace('、', '').replace('。', '')

    # If the text is already short enough for one line (max 12 chars), put it on the first line.
    if len(text) <= 12:
        return text, ''

    # Determine the split point for the first line (max 12 chars)
    split_point1 = find_japanese_natural_break(text, 12)
    first_line = text[:split_point1]
    remaining_text = text[split_point1:]

    # If remaining text is short enough for the second line (max 18 chars)
    if len(remaining_text) <= 18:
        second_line = remaining_text
        return first_line, second_line
    else:
        # If remaining text is too long, find a split point for the second line (max 18 chars)
        split_point2 = find_japanese_natural_break(remaining_text, 18)
        second_line = remaining_text[:split_point2]
        overflow_text = remaining_text[split_point2:]
        return first_line, second_line, overflow_text

def parse_srt_time(time_str):
    parts = re.match(r'(\d{2}):(\d{2}):(\d{2}),(\d{3})', time_str)
    h, m, s, ms = map(int, parts.groups())
    return (h * 3600 + m * 60 + s) * 1000 + ms

def format_srt_time(ms):
    h = ms // 3600000
    ms %= 3600000
    m = ms // 60000
    ms %= 60000
    s = ms // 1000
    ms %= 1000
    return f"{h:02}:{m:02}:{s:02},{ms:03}"

def process_srt_file(input_filepath, output_filepath):
    with open(input_filepath, 'r', encoding='utf-8') as f_in:
        content = f_in.read()

    captions = content.strip().split('\n\n') # Split by double newline for each caption block

    new_captions = []
    caption_index = 1

    for caption_block in captions:
        lines = caption_block.strip().split('\n')
        if len(lines) < 3:
            continue # Skip malformed blocks

        try:
            # Original index and time
            original_index = int(lines[0])
            time_str = lines[1]
            start_time_str, end_time_str = time_str.split(' --> ')
            start_ms = parse_srt_time(start_time_str)
            end_ms = parse_srt_time(end_time_str)
            duration_ms = end_ms - start_ms

            # Text content
            text_content = "\n".join(lines[2:]) # Join all text lines

            # Process text for two lines, handling overflow
            current_text = text_content
            while current_text:
                result = format_text_to_two_lines(current_text)
                if len(result) == 3: # Overflow occurred
                    first_line, second_line, overflow_text = result
                    # Estimate duration for this segment
                    segment_text = first_line + second_line
                    # Avoid division by zero if text_content is empty
                    if len(text_content) > 0:
                        segment_duration = int(duration_ms * (len(segment_text) / len(text_content)))
                    else:
                        segment_duration = 0
                    
                    new_captions.append(f"{caption_index}\n{format_srt_time(start_ms)} --> {format_srt_time(start_ms + segment_duration)}\n{first_line}\n{second_line}")
                    
                    start_ms += segment_duration
                    duration_ms -= segment_duration
                    current_text = overflow_text
                    caption_index += 1
                else: # No overflow or last segment
                    first_line, second_line = result
                    new_captions.append(f"{caption_index}\n{format_srt_time(start_ms)} --> {format_srt_time(end_ms)}\n{first_line}\n{second_line}")
                    current_text = '' # No more text to process for this original caption
                    caption_index += 1

        except Exception as e:
            print(f"Error processing caption block: {caption_block}\nError: {e}")
            continue

    with open(output_filepath, 'w', encoding='utf-8') as f_out:
        f_out.write("\n\n".join(new_captions))

# Example usage (will be called by the agent)
input_srt_path = '/Users/satoshiiga/dotfiles/src/rieNEW.srt'
output_srt_path = '/Users/satoshiiga/dotfiles/src/rieNEW_formatted_two_lines.srt'
process_srt_file(input_srt_path, output_srt_path)
