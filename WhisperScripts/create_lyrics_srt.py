
import json
import re
from datetime import timedelta

# --- CONFIG ---
JSON_INPUT_PATH = "/Users/satoshiiga/dotfiles/there's-nothing-but-happiness.json"
SRT_OUTPUT_PATH = "/Users/satoshiiga/dotfiles/there's-nothing-but-happiness.srt"

# User-provided lyrics
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
    """Converts seconds to SRT time format hh:mm:ss,ms"""
    delta = timedelta(seconds=seconds)
    hours, remainder = divmod(delta.seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    milliseconds = delta.microseconds // 1000
    return f"{hours:02}:{minutes:02}:{seconds:02},{milliseconds:03d}"

def clean_text(text):
    """Cleans text for matching by lowercasing and removing punctuation."""
    return re.sub(r"[^'\w\s]", '', text).lower().strip()

def generate_srt_from_lyrics():
    try:
        with open(JSON_INPUT_PATH, 'r', encoding='utf-8') as f:
            whisper_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: JSON file not found at {JSON_INPUT_PATH}")
        return
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {JSON_INPUT_PATH}")
        return

    all_words = []
    for segment in whisper_data.get("segments", []):
        if "words" in segment:
            all_words.extend(segment["words"])

    if not all_words:
        print("Error: No word-level timestamps found in the JSON file.")
        return

    # Create a clean, searchable string of the Whisper transcript
    whisper_transcript = " ".join(clean_text(word['word']) for word in all_words)
    
    user_lyrics_lines = [line.strip() for line in LYRICS.strip().split('\n') if line.strip()]
    
    srt_content = []
    subtitle_index = 1
    current_word_index = 0

    for line in user_lyrics_lines:
        clean_line = clean_text(line)
        line_words = clean_line.split()
        
        if not line_words:
            continue

        # Find the start of the line in the transcript
        search_str = " ".join(line_words)
        
        # Find the corresponding words in the Whisper data
        start_word_index = -1
        
        # A simple search to find the start of the line
        temp_transcript_words = [clean_text(w['word']) for w in all_words[current_word_index:]]
        
        try:
            # Find the starting position of our line in the remaining transcript
            # This is a naive search that might fail with highly inaccurate transcriptions
            # but works for reasonably good ones.
            
            # We join words to search, which is not robust. A better way would be a sequence search.
            # For now, this will do.
            
            # Let's find the first word
            first_word_of_line = line_words[0]
            
            found_pos = -1
            for i in range(len(temp_transcript_words)):
                if temp_transcript_words[i] == first_word_of_line:
                    # Check if the next few words also match to be more certain
                    match = True
                    for j in range(min(len(line_words), 5)): # Check next 5 words
                         if i+j >= len(temp_transcript_words) or temp_transcript_words[i+j] != line_words[j]:
                            match = False
                            break
                    if match:
                        found_pos = i
                        break
            
            if found_pos != -1:
                start_word_index = current_word_index + found_pos
                
                num_words_in_line = len(line_words)
                end_word_index = start_word_index + num_words_in_line - 1

                if end_word_index < len(all_words):
                    start_time = all_words[start_word_index]['start']
                    end_time = all_words[end_word_index]['end']
                    
                    srt_content.append(f"{subtitle_index}")
                    srt_content.append(f"{format_srt_time(start_time)} --> {format_srt_time(end_time)}")
                    srt_content.append(f"{line.strip()}\n")
                    
                    subtitle_index += 1
                    current_word_index = end_word_index + 1
                else:
                    print(f"Warning: Could not find full match for line: '{line}'")
            else:
                print(f"Warning: Could not find start of line: '{line}'")

        except ValueError:
            print(f"Warning: Could not find a match for line: '{line}'")
            continue

    if srt_content:
        with open(SRT_OUTPUT_PATH, 'w', encoding='utf-8') as f:
            f.write('\n'.join(srt_content))
        print(f"Successfully created SRT file at: {SRT_OUTPUT_PATH}")
    else:
        print("Could not generate any subtitles. The transcription might be too different from the lyrics.")

if __name__ == "__main__":
    generate_srt_from_lyrics()
