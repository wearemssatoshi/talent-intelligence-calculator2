
import json
import re
from datetime import timedelta

# --- CONFIG ---
JSON_INPUT_PATH = "/Users/satoshiiga/dotfiles/there's-nothing-but-happiness.json"
SRT_OUTPUT_PATH = "/Users/satoshiiga/dotfiles/there's-nothing-but-happiness_v3.srt"

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
    # Normalize different apostrophes and dashes
    text = text.replace("’", "'").replace("”", '"').replace("“", '"').replace("—", " ")
    # Remove all punctuation except apostrophes and quotes for contractions/possessives
    text = re.sub(r'[^a-zA-Z0-9\'" ]', '', text)
    return text.lower().strip()

def find_best_match_index(user_line_words, whisper_words, start_search_idx):
    if not user_line_words:
        return -1, 0

    best_match_score = -1
    best_match_index = -1
    # Limit search range to avoid excessive computation
    search_window = min(len(whisper_words), start_search_idx + 300)

    for i in range(start_search_idx, search_window - len(user_line_words) + 1):
        score = 0
        for j in range(len(user_line_words)):
            # Use Levenshtein distance for fuzzy word matching
            if user_line_words[j] == whisper_words[i + j]:
                score += 2 # Exact match bonus
            # Allow for small typos
            elif len(user_line_words[j]) > 3 and len(whisper_words[i+j]) > 3:
                # Simple similarity: count common characters
                common = len(set(user_line_words[j]) & set(whisper_words[i+j]))
                if common / len(user_line_words[j]) > 0.6:
                    score += 1

        if score > best_match_score:
            best_match_score = score
            best_match_index = i

    # Threshold: require a score that indicates a reasonable match
    # This threshold might need tuning
    if best_match_score < len(user_line_words) * 0.8:
        return -1, best_match_score

    return best_match_index, best_match_score

def generate_srt_v3():
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
            match_end_idx = match_start_idx + num_words_in_line -1

            # To get a better end time, we can try to match the end of the user line
            # with the whisper transcript to find the real last word.
            # This handles cases where whisper adds/misses words.
            actual_num_words_in_whisper = 0
            temp_score = 0
            for i in range(len(user_line_words_cleaned)):
                if (match_start_idx + i < len(whisper_words_cleaned) and 
                    user_line_words_cleaned[i] == whisper_words_cleaned[match_start_idx+i]):
                    temp_score +=1
                actual_num_words_in_whisper = i
                if temp_score < i * 0.5 and i > 5: # if we are losing the match
                    break
            
            match_end_idx = match_start_idx + actual_num_words_in_whisper

            if match_end_idx < len(all_word_objects):
                start_time = all_word_objects[match_start_idx]['start']
                end_time = max(start_time, all_word_objects[match_end_idx]['end'])

                srt_content.append(str(subtitle_index))
                srt_content.append(f"{format_srt_time(start_time)} --> {format_srt_time(end_time)}")
                srt_content.append(f"{line.strip()}\n")
                
                subtitle_index += 1
                current_search_idx = match_end_idx + 1
            else:
                 print(f"Warning: Match for '{line}' is out of bounds.")
        else:
            print(f"Warning: No good match for line: '{line}'")

    if srt_content:
        with open(SRT_OUTPUT_PATH, 'w', encoding='utf-8') as f:
            f.write('\n'.join(srt_content))
        print(f"Successfully created SRT file: {SRT_OUTPUT_PATH}")
    else:
        print("Could not generate any subtitles.")

if __name__ == "__main__":
    generate_srt_v3()
