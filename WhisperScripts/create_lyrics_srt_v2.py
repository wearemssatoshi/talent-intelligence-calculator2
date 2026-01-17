
import json
import re
from datetime import timedelta

# --- CONFIG ---
JSON_INPUT_PATH = "/Users/satoshiiga/dotfiles/there's-nothing-but-happiness.json"
SRT_OUTPUT_PATH = "/Users/satoshiiga/dotfiles/there's-nothing-but-happiness_v2.srt"

LYRICS = """
On that stage, I was hurt at times,
Unfair voices cut deep inside.
But I was watching, I still recall,
Smiles of friends and regrets that stay with me all.

Here, there’s nothing but happiness,
Like a table set with love.
Every smile, every tear turns to light,
This place is our true stage of life.

I’ve seen the bottom, I’ve climbed back again,
With certain love, with uncertain days ahead.
Even through detours, I carry hope inside,
And in that moment, the future shines with light.

Here, there’s nothing but happiness,
Like a table set with love.
Every smile, every tear turns to light,
This place is our true stage of life.

Even without a reply, you were by my side,
The mocked and troubled days shaped this life.
So I’ll say it again, as many times as it takes:
On our stage, there’s only happiness—don’t you agree?

In this restaurant, nothing but happiness,
Every table tells a story of love.
Through the laughter and the tears we’ve shared,
This restaurant is our true stage of life.

Now I stand once more, with my friends I’ll win,
Though stones are thrown, “What can you do with him?”
The world may run from tomorrow, blind with fear,
But we will keep building a stage that lasts a hundred years.
To connect you all, to a radiant, shining future.

Here, there’s nothing but happiness,
Like a table set with love.
Every smile, every tear turns to light,
This place is our true stage of life.

In this restaurant, nothing but happiness,
Every table tells a story of love.
Through the laughter and the tears we’ve shared,
This restaurant is our true stage of life
"""
# --- END CONFIG ---

def format_srt_time(seconds):
    delta = timedelta(seconds=seconds)
    hours, remainder = divmod(delta.seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    milliseconds = delta.microseconds // 1000
    return f"{hours:02}:{minutes:02}:{seconds:02},{milliseconds:03d}"

def clean_text(text):
    # Lowercase, remove punctuation except for apostrophes, and strip whitespace
    return re.sub(r"[^\\w\\s']", "", text).lower().strip()

def find_best_match_index(user_line_words, whisper_words, start_search_idx):
    """Finds the best starting index for a line of lyrics in the whisper transcript."""
    if not user_line_words:
        return -1, 0

    best_match_score = -1
    best_match_index = -1
    search_range = len(whisper_words) - len(user_line_words)

    # Iterate through all possible starting positions in the whisper transcript
    for i in range(start_search_idx, search_range + 1):
        score = 0
        # Compare the user's line with the current window of the transcript
        for j in range(len(user_line_words)):
            if user_line_words[j] == whisper_words[i + j]:
                score += 1
        
        # Give a higher weight to the first word matching
        if user_line_words[0] == whisper_words[i]:
            score += 1

        if score > best_match_score:
            best_match_score = score
            best_match_index = i
            # If we have a very high score, we can probably stop early
            if best_match_score >= len(user_line_words):
                break
    
    # A simple threshold: require at least ~50% of words to match
    if best_match_score < len(user_line_words) * 0.5:
        return -1, best_match_score

    return best_match_index, best_match_score

def generate_srt_v2():
    try:
        with open(JSON_INPUT_PATH, 'r', encoding='utf-8') as f:
            whisper_data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"Error reading JSON file: {e}")
        return

    all_word_objects = []
    for segment in whisper_data.get("segments", []):
        if "words" in segment:
            all_word_objects.extend(segment["words"])

    if not all_word_objects:
        print("Error: No word-level timestamps found.")
        return

    whisper_words_cleaned = [clean_text(w['word']) for w in all_word_objects]
    user_lyrics_lines = [line.strip() for line in LYRICS.strip().split('\n') if line.strip()]
    
    srt_content = []
    subtitle_index = 1
    current_search_idx = 0

    for line in user_lyrics_lines:
        user_line_words_cleaned = clean_text(line).split()
        if not user_line_words_cleaned:
            continue

        match_start_idx, score = find_best_match_index(user_line_words_cleaned, whisper_words_cleaned, current_search_idx)

        if match_start_idx != -1:
            num_words_in_line = len(user_line_words_cleaned)
            match_end_idx = match_start_idx + num_words_in_line - 1

            if match_end_idx < len(all_word_objects):
                start_time = all_word_objects[match_start_idx]['start']
                # Ensure end time is not earlier than start time
                end_time = max(start_time, all_word_objects[match_end_idx]['end'])

                srt_content.append(str(subtitle_index))
                srt_content.append(f"{format_srt_time(start_time)} --> {format_srt_time(end_time)}")
                srt_content.append(f"{line.strip()}\n")
                
                subtitle_index += 1
                current_search_idx = match_end_idx + 1
            else:
                 print(f"Warning: Match found for '{line}' but it goes out of bounds.")
        else:
            print(f"Warning: Could not find a good match for line: '{line}'")

    if srt_content:
        with open(SRT_OUTPUT_PATH, 'w', encoding='utf-8') as f:
            f.write('\n'.join(srt_content))
        print(f"Successfully created SRT file: {SRT_OUTPUT_PATH}")
    else:
        print("Could not generate any subtitles.")

if __name__ == "__main__":
    generate_srt_v2()
