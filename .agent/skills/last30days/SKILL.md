---
name: last30days
description: Research a topic from the last 30 days on Reddit + X + Web, become an expert, and write copy-paste-ready prompts for the user's target tool.
argument-hint: "[topic] for [tool] or [topic]"
context: fork
agent: Explore
disable-model-invocation: true
allowed-tools: Bash, Read, Write, AskUserQuestion, WebSearch
---

# last30days: Research Any Topic from the Last 30 Days

## Step 1: Parse User Intent

Extract from user input:
- **TOPIC**: what they want to learn about
- **TARGET_TOOL**: where they'll use prompts (or "unknown" — ask AFTER research)
- **QUERY_TYPE**: PROMPTING | RECOMMENDATIONS | NEWS | GENERAL

## Step 2: Run Research

```bash
python3 ~/.claude/skills/last30days/scripts/last30days.py "$ARGUMENTS" --emit=compact 2>&1
```

Modes (auto-detected by API keys in `~/.config/last30days/.env`):
- **Full**: Reddit + X + WebSearch (both keys)
- **Partial**: Reddit-only or X-only + WebSearch
- **Web-Only**: WebSearch fallback (no keys — still works)

## Step 3: WebSearch (all modes)

Search queries by QUERY_TYPE:

| Type | Queries |
|------|---------|
| RECOMMENDATIONS | `best {TOPIC} recommendations`, `{TOPIC} list examples`, `most popular {TOPIC}` |
| NEWS | `{TOPIC} news 2026`, `{TOPIC} announcement update` |
| PROMPTING | `{TOPIC} prompts examples 2026`, `{TOPIC} techniques tips` |
| GENERAL | `{TOPIC} 2026`, `{TOPIC} discussion` |

**Rules**: Use user's EXACT terminology (don't add assumed names). Exclude reddit.com/x.com.

## Step 4: Synthesize

Ground synthesis in ACTUAL research, not pre-existing knowledge.

1. Weight Reddit/X higher (engagement signals) > WebSearch
2. Identify patterns across all sources
3. Note contradictions
4. Extract top 3-5 actionable insights
5. For RECOMMENDATIONS: extract SPECIFIC NAMES with mention counts

**Anti-pattern**: Conflating similar-sounding products (e.g., ClawdBot ≠ Claude Code). Read what research actually says.

## Step 5: Display Results

**Sequence**: What I learned → Stats → Invitation (ask for vision)

For RECOMMENDATIONS:
```
🏆 Most mentioned:
1. [Name] - mentioned {n}x (sources)
...
```

For others:
```
What I learned:
[2-4 sentences from ACTUAL research]

KEY PATTERNS:
1. [Pattern from research]
...
```

Stats footer:
```
✅ All agents reported back!
├─ 🟠 Reddit: {n} threads │ {sum} upvotes
├─ 🔵 X: {n} posts │ {sum} likes
├─ 🌐 Web: {n} pages │ {domains}
```

Then invite: "Share your vision for what you want to create..."

## Step 6: Write Prompt (after user shares vision)

**CRITICAL**: Match FORMAT that research recommends (JSON/structured/keywords/prose).

```
Here's your prompt for {TARGET_TOOL}:
---
[Prompt in research-recommended format]
---
This uses [1-line explanation of applied insight].
```

Quality check: Format matches research ✓ | Addresses user's vision ✓ | Copy-paste ready ✓

## Follow-up Behavior

- You are now an EXPERT — answer from research, don't re-search
- Write more prompts on request
- Only re-research if user asks about a DIFFERENT topic
- Footer: `📚 Expert in: {TOPIC} for {TARGET_TOOL} | 📊 Based on: {n} sources`

## First-Time Setup (Optional)

```bash
mkdir -p ~/.config/last30days && cat > ~/.config/last30days/.env << 'EOF'
OPENAI_API_KEY=
XAI_API_KEY=
EOF
chmod 600 ~/.config/last30days/.env
```
