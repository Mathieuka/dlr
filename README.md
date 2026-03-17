# dlr — Decision Log & Reflect

**Never lose context between coding sessions.**

A stateless, filesystem-based CLI for decision logging during development sessions. Designed for developers who work with LLM agents (Claude, GPT, Copilot) and need to preserve observations and decisions across sessions.

---

## The Problem

During development sessions, you make observations and decisions. Between sessions — especially when working with LLM agents that don't persist context — this knowledge gets lost. You waste time re-explaining the same architectural choices, rediscovering the same insights, or making inconsistent decisions.

`dlr` captures this context and makes it instantly retrievable.

---

## Installation

```bash
npm install -g dlr
```

---

## How It Works

A typical session with an LLM agent:

1. **You start working** on a topic (e.g., auth flow redesign)
2. **The agent loads context** from previous sessions via `dlr reflect`
3. **You work together** — the agent now knows what was discovered and decided before
4. **At the end of the session**, you ask the agent to persist
5. **The agent generates** the constat/decision block from the conversation
6. **The agent shows you** the block for review
7. **You validate** ("ok", "go") — the agent calls `dlr persist`

You never write the constats and decisions yourself. The agent extracts them from the conversation and proposes them. You just approve.

---

## Quick Start

```bash
# 1. Link your project directory
cd ~/projects/myapp
dlr init

# 2. Load previous context (if any)
dlr reflect auth-flow

# 3. Work with your agent... then ask it to persist.
#    The agent generates the block, shows it to you, you validate,
#    and the agent runs the persist command.

# 4. See what you've been working on
dlr log
dlr topics
```

---

## Commands

### `dlr init`

Links the current directory to a dlr project. The project name is derived from the current directory name.

```bash
cd ~/projects/fabriq
dlr init
```

```
✓ Created .dlr-project in current directory
✓ Initialized project 'fabriq' in ~/.dlr/projects/fabriq
⚠ Add .dlr-project to your .gitignore

Add the following to your AGENTS.md (or equivalent):
────────────────────────────────────────────────────

## DLR — Decision Log & Reflect

This project uses `dlr` for decision logging. Available commands:

- `dlr reflect <topic>` — Load previous session context (stdout)
- `dlr persist <topic>` — Save constats/decisions (reads from stdin)
- `dlr topics` — List available topics
- `dlr log` — Show timeline of all entries

### Workflow
1. Always run `dlr reflect <topic>` at the start of a session to load context
2. At end of session, when the user asks to persist:
   a. Run `dlr reflect <topic>` to check what was already persisted
   b. Generate a block with only NEW constats/decisions (no duplicates)
   c. Present the block to the user for approval
   d. After approval, pipe the block via stdin to `dlr persist <topic>`

### Format
The block piped to `dlr persist` must contain at least one section:

### Constat
- observation or finding

### Decision
- choice made

The timestamp is auto-generated. Do not include it.

────────────────────────────────────────────────────
```

Use `--name` to override the project name:

```bash
dlr init --name my-custom-name
```

### `dlr persist <topic>`

Reads a constat/decision block from stdin and appends it to the session file. The topic identifies the subject (e.g., `planning`, `auth-flow`, `kamishibai`). The timestamp is generated automatically.

The topic is a required argument. The agent is responsible for knowing or asking the user which topic to use, generating the content, presenting it to the user for validation, and only then calling this command.

```
✓ Appended to planning (1 constat, 1 decision)
```

### `dlr reflect <topic>`

Outputs the session history to stdout. By default, outputs the full history. Use `--last N` to limit to the last N blocks.

```bash
# Full history
dlr reflect planning

# Last 3 blocks only
dlr reflect planning --last 3
```

### `dlr log`

Timeline of all blocks across all topics, most recent first.

```bash
dlr log
```

```
2026-03-11 19:42  planning      2 constats, 1 decision
2026-03-10 16:57  planning      1 constat, 1 decision
2026-03-09 10:23  kamishibai    3 constats, 2 decisions
```

### `dlr topics`

Lists all topics with stats.

```bash
dlr topics
```

```
planning      5 blocks   last: 2026-03-11
kamishibai    2 blocks   last: 2026-03-09
refactoring   1 block    last: 2026-03-08
```

---

## Session File Format

Sessions are stored as markdown in `~/.dlr/projects/<project>/sessions/<topic>.md`:

```markdown
---
topic: planning
created: 2026-03-10T16:57:00+01:00
tags: []
---

## 2026-03-10 16:57

### Constat
- The projection logic exists in 3 MSW files

### Decision
- Implementation plan in 9 steps

## 2026-03-11 19:42

### Constat
- Respondents are stored inline in form_planning

### Decision
- Output format: always a resolved object
```

Each block has:
- **Timestamp header** (`## YYYY-MM-DD HH:MM`) — auto-generated by `dlr persist`
- **Constat section** (optional) — observations, findings
- **Decision section** (optional) — choices made

At least one section per block is required.

---

## Store Structure

```
~/.dlr/
├── config.yaml
└── projects/
    └── fabriq/
        ├── meta.yaml
        └── sessions/
            ├── planning.md
            └── kamishibai.md
```

### Project Linking

A `.dlr-project` file at the repo root links it to a project:

```
fabriq
```

The CLI walks up parent directories to find this file (like git finds `.git/`). Add `.dlr-project` to your `.gitignore` — dlr is private by default.

---

## Usage with LLM Agents

`dlr` is designed to be called by LLM agents via shell commands. The CLI is 100% non-interactive — no prompts, no confirmations.

When you run `dlr init`, the CLI outputs an AGENTS.md snippet that teaches the agent how to use dlr. Copy-paste it into your project's AGENTS.md (or equivalent: `.cursorrules`, `.claude/rules`, etc.) and the agent knows the workflow.

### Agent Workflow

```
1. dlr reflect <topic>          Load previous context into agent's memory
2. (work session)
3. Agent generates block         Extracts constats/decisions from conversation
4. Agent shows block to user     User reviews and validates
5. dlr persist <topic>           Agent pipes the block via stdin
```

### Agent Responsibilities

The CLI is stateless. The following responsibilities belong to the agent, not the CLI:

- **Know or ask the topic** — the topic is required, the agent must determine it from context or ask the user
- **Always reflect before persisting** — to avoid duplicating existing entries
- **Always present the block to the user** — never persist without explicit approval
- **Generate high-quality constats/decisions** — by analyzing the last persisted block to produce complementary, non-redundant content

### Technical: How the Agent Calls Persist

The agent passes the validated block to stdin:

```bash
dlr persist planning <<'EOF'
### Constat
- The API returns null for missing users instead of 404

### Decision
- Update API to return 404 with error body
EOF
```

The user never writes this command. The agent composes and executes it after receiving approval.

---

## FAQ

**Why not git commit messages?**
Git commits track code changes. dlr tracks context and reasoning — the "why" behind the changes.

**Why not a note-taking app?**
dlr is structured, timestamped, CLI-first, and queryable. It's designed for programmatic usage by agents, not manual note-taking.

**Can I edit session files manually?**
Yes. They're plain markdown. Maintain the structure (frontmatter, timestamp headers, section headers) and the CLI will parse them correctly.

**Can I use dlr across multiple projects?**
Yes. Each project has its own namespace in `~/.dlr/projects/`. Use `dlr init` in each repository.

---

## Roadmap

- **v1.0** — CLI with filesystem storage (current)
- **v1.x** — Docker service with HTTP API
- **v2.0** — MCP server (agents call directly, no shell needed)
- **v3.0** — AI features (semantic search, summaries — when the need emerges)
