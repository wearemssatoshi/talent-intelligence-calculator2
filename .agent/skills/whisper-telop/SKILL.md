# Whisper テロップ生成スキル

## 概要

音声ファイルからテロップ用SRTファイルを生成するワークフロー。

## 必要なツール

- `whisper` (OpenAI Whisper)
- Python 3.x

## ワークフロー

### Step 1: Whisperで文字起こし

```bash
whisper 音声ファイル.mp3 --model medium --word_timestamps True --output_format json
```

**オプション:**
- `--model large`: より高精度（時間がかかる）
- `--language ja`: 日本語を明示

### Step 2: SRT整形

```bash
python format_srt.py 入力.json 出力.srt
```

### Step 3: 確認・修正

1. 生成されたSRTをエディタで確認
2. 固有名詞や専門用語を修正
3. PDF原稿がある場合は照合

## 品質基準

- 1行最大28文字（35文字まで許容）
- 意味のまとまりで改行
- 句読点「、」「。」は除去、「！」「？」は保持

## 参照

- ルール: `../rules/telop.md`
