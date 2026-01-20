import re
import sys

def remove_punctuation(input_path, output_path):
    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove punctuation
    content = re.sub(r'[、.。」「“”?!]', '', content)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(f"Usage: python {sys.argv[0]} <input_srt>")
        sys.exit(1)
    input_file = sys.argv[1]
    remove_punctuation(input_file, input_file)
