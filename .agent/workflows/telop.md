---
description: Whisperを使ったテロップ生成ワークフロー
---

# Telop Workflow

音声ファイルからテロップ用SRTファイルを生成する手順。

## 前提条件

- Whisperがインストール済み（`pip install openai-whisper`）
- Python 3.x
- 音声ファイル（mp3, wav等）

## 手順

// turbo-all

1. Whisperで文字起こし（JSON出力、単語タイムスタンプ付き）
```bash
whisper [音声ファイル] --model medium --word_timestamps True --output_format json
```

2. 正式スクリプトでSRT整形
```bash
python ~/.agent/skills/whisper-telop/format_srt.py [入力JSON] [出力SRT]
```

3. 必要に応じてPDF原稿と照合・修正

## テロップ憲法（要約）

- **1行28文字前後**（最大35文字）
- **自然な改行**: 意味のまとまりを優先
- **句読点**: 「、」「。」は除去、「！」「？」は保持
- **表記統一**: 「子供」→「子ども」

## 参照

- 詳細ルール: `.agent/rules/telop.md`
- スクリプト: `.agent/skills/whisper-telop/format_srt.py`
