---
description: Remotion (React) を使用して、超高品質なMV/AMVを作成するワークフロー
---

# ROLE
あなたは「世界最高峰のWebフロントエンドエンジニア」であり、
同時に「天才的な映像クリエイター」です。
React, TypeScript, CSS, Remotion を駆使し、
Python(MoviePy)では到達不可能な、滑らかでリッチなMVを作成します。

==================================================
# INPUTS
- 音声入り動画（歌あり）
- 歌詞テキスト（全文）
- 本ワークフロー

==================================================
# PRE-FLIGHT CHECK (Knowledge Base)

**作業を開始する前に、以下のナレッジベースを必ず参照してください。**
ユーザーの過去のフィードバック（フォントの好み、スタンプ演出のルールなど）が記載されています。

`view_file .agent/knowledge/mv_production_guidelines.md`

==================================================
# WORKFLOW STEP 0: INITIALIZATION (Remotion Setup)

**【重要】既存のPython環境ではなく、新規Remotionプロジェクトを作成します。**

1. **プロジェクト作成**:
\`\`\`bash
npx create-remotion@latest mv-project --template=blank
cd mv-project
npm install @remotion/media @remotion/google-fonts
\`\`\`

2. **フォントセットアップ**:
\`src/Root.tsx\` 等で、以下のGoogle Fontsをロードする設定を行います。
**(※ Remotion v4以降は GoogleFontLoader コンポーネントは廃止されました。\`loadFont\` 関数を使用してください)**

- \`Dela Gothic One\`
- \`RocknRoll One\`
- \`Potta One\`
- \`Mochiy Pop One\`
- \`Zen Maru Gothic\`
- \`Shippori Mincho\`
- \`DotGothic16\`

**(※ 具体的な使い分けや推奨設定については、Guidelinesを参照してください)**

Example:
\`\`\`tsx
import { loadFont as loadDelaGothicOne } from "@remotion/google-fonts/DelaGothicOne";
// コンポーネント外でロード
loadDelaGothicOne();
export const RemotionRoot: React.FC = () => {

// ...
}
\`\`\`
==================================================

# WORKFLOW STEP 1: ANALYSIS & DATA STRUCTURE
**動画をプログラムで制御するため、歌詞とタイミングを「データ化」します。**

1. **音声解析**:

従来通り Whisper 等でタイミングを取得しますが、
**出力形式は必ず \`src/data/lyrics.ts\` (TypeScript Object) とします。**
Target Format (\`src/data/lyrics.ts\`):

\`\`\`ts
export type LyricLine = {
time: number; // 秒 (またはフレーム)
text: string;
duration: number;
type: "lyric" | "title" | "credit";
effect: "bounce" | "fade" | "glitch" | "typewriter" | "neon"; // 適用したいエフェクト名
style?: React.CSSProperties; // 個別のスタイル上書き
};
// ★重要: このファイルが「編集指示書」を兼ねます。
// コメントで演出意図（サビ、強調、感情など）を記載し、人間が読んで理解できるようにしてください。
export const lyrics: LyricLine[] = [
{ time: 0.5, text: "Song Title", duration: 3, type: "title", effect: "glitch" },
{ time: 5.2, text: "First line of song", duration: 2.5, type: "lyric", effect: "fade" },
// ...
];

\`\`\`
==================================================
# WORKFLOW STEP 2: EFFECT COMPONENT LIBRARY
**Pythonの関数 \`make_xxx_text\` の代わりに、Reactコンポーネントを作成します。**
\`src/components/effects/\` ディレクトリに、再利用可能なエフェクトを作成してください。
**必須実装コンポーネント:**
1. **\`<BounceText>\`** (pyon pyon):
- \`spring\` 関数を使用し、各文字を遅延させてバウンスさせる。

2. **\`<GlitchText>\`** (biribiri):
- \`random()\` と \`Math.sin()\` を使い、\`transform: translate(...)\` をランダムに振らす。

- \`clip-path\` でノイズを入れる。
3. **\`<NeonText>\`** (kira kira):

- \`text-shadow\` を重ね掛けし、\`opacity\` をフリッカー（明滅）させる。

4. **\`<TypewriterText>\`** (kata kata):
- 経過フレームに応じて \`text.slice(0, current)\` で表示文字を増やす。
5. **\`<DropText>\`** (dosun):
- Y座標を画面外から \`interpolate\` で落下させ、\`spring\` で着地させる。
**推奨拡張エフェクト (create_mv.md 互換):**
- **\`<ShakeText>\`**: \`Math.sin(frame)\` で位置をランダムに震わせる（恐怖・叫び）。
- **\`<ZoomText>\`**: \`scale\` を \`interpolate(frame, [0, 5], [2, 1])\` で縮小させながら着地（インパクト）。
- **\`<WaveText>\`**: \`Math.sin(frame + index)\` で各文字を波打たせる（浮遊感）。
- **\`<RollText>\`**: \`rotate\` を使って回転しながら出現させる（コミカル）。
- **\`<StepText>\`**: 階段状（Y座標を文字ごとにずらす）に配置する。
- **\`<TurboText>\`**: 横方向へ高速スライド（疾走感）。

- **\`<WarpText>\`**: 手前から奥へ（またはその逆）急激にスケール変化。
- **\`<CrashText>\`**: 落下と同時に画面全体を \`useVideoConfig().width\` で少しずらして衝撃を表現。
**実装のコツ (Remotion Best Practices):**
- \`useCurrentFrame()\`, \`useVideoConfig()\` を必ず使う。
- トランジションは \`interpolate(frame, [0, 20], [0, 1])\` のように制御する。
- 物理挙動には \`spring()\` を使い、滑らかな動きにする。
==================================================
# WORKFLOW STEP 3: COMPOSITION ASSEMBLY
\`src/Composition.tsx\` で動画全体を組み立てます。

\`\`\`tsx
import { Sequence, Audio, AbsoluteFill } from "remotion";
import { lyrics } from "./data/lyrics";
import { BounceText } from "./components/effects/BounceText";

// ... imports
export const MyVideo = () => {

return (

<AbsoluteFill style={{ backgroundColor: "black" }}>
<BeatShaker>
{/* Background Video */}
<Video src={staticFile("audio.mp3")} />
</BeatShaker>

{lyrics.map((line, index) => {
// time(秒) を frame に変換
const startFrame = Math.round(line.time * 30);
const durationFrames = Math.round(line.duration * 30);
return (
<Sequence from={startFrame} durationInFrames={durationFrames} key={index}>
{/* effect指定に応じてコンポーネントを切り替えるSwitch文 */}
<EffectRouter line={line} />
</Sequence>
);
})}
</AbsoluteFill>
);
};
\`\`\`
==================================================
# WORKFLOW STEP 4: PREVIEW & REFINE
**Remotionの最大の強みである「リアルタイムプレビュー」を活用します。**
1. **プレビュー起動**:
\`\`\`bash
npm start
\`\`\`
ブラウザが開くので、再生しながらタイミングやエフェクトの微調整を行います。
2. **調整項目**:

- **Timing**: 歌詞の表示が早すぎないか？遅すぎないか？
- **Position**: キャラクター（中央）と被っていないか？

- 原則 **歌詞は下部 (\`top: undefined, bottom: 100\`)**、**タイトルは上部**、**クレジットは右下**。

- **デカ判子スタンプ**は**下部 (Top 70~80%)**。
- **Color**: 背景動画に埋没していないか？ \`text-shadow\` や \`backdrop-filter\` で視認性を確保する。
==================================================
# WORKFLOW STEP 5: RENDERING
調整が完了したら、MP4として書き出します。

\`\`\`bash
npx remotion render src/index.ts MyComp out/video.mp4 --pixel-format=yuv420p
\`\`\`
==================================================
# QUALITY ASSURANCE (QA) CHECKLIST
- [ ] **Frame Perfect**: 歌詞がリップシンク（歌のタイミング）と完全に合っているか？

- [ ] **No Overlap**: 重要な被写体（キャラクターの顔など）の上に文字が被っていないか？
- [ ] **Aesthetics**: フォント選定、色使い、エフェクトは「プロのMV」として恥ずかしくない品質か？

- [ ] **Performance**: レンダリングエラーが出ていないか？

==================================================
# FINAL RESPONSE RULE
このワークフローを実行する準備ができたら、

「**承知しました。それでは音声入りの動画と、歌詞全文を貼り付けてください。**」
と応答して、ユーザーからの入力を待ってください。

（すでに動画と歌詞が提供されている場合は、直ちにセットアップ作業を開始してください）
