# dlr

Give your LLM coding agent a persistent memory across sessions.

[![npm version](https://img.shields.io/npm/v/dlr.svg)](https://www.npmjs.com/package/dlr)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/node/v/dlr.svg)](https://nodejs.org)

## Why

LLM agents lose context between sessions. You waste time re-explaining architectural decisions, rediscovering insights, and making inconsistent choices. `dlr` gives your agent persistent memory, observations and decisions captured in structured markdown, instantly retrievable at the start of every session.

**dlr is a CLI for your agent, not for you.** You only run `dlr init` once. After that, the agent drives everything: loading context, generating summaries, persisting decisions. You just approve.

## Philosophy

dlr is not a vibe coding tool. It's designed for engineers who think and use agents to execute, what we call vibe engineering. You make the architectural decisions, weigh the tradeoffs, steer the direction. The agent executes, captures your reasoning, and carries it forward. dlr is the memory layer that makes this workflow compound over time.

## Install

```bash
npm install -g dlr
```

Or run without installing:

```bash
npx dlr init
```

## Quick Start

### 1. Setup (you do this once)

```bash
cd ~/projects/myapp
dlr init
```

`dlr init` finds your AGENTS.md files, appends the dlr workflow snippet, and sets everything up. Your agent now knows how to use dlr. Restart your agent session.

### 2. First session

The agent starts by running `dlr reflect`. Nothing comes back, it's the first session. You work together normally. At the end, you say "persist" (or equivalent). The agent:

1. Extracts observations and decisions from the conversation
2. Shows you the block for review
3. After your approval, runs:

```bash
dlr persist <<'EOF'
### Constat
- API returns null instead of 404 for missing users
- Error handling is inconsistent across endpoints

### Decision
- Standardize all endpoints to return 404 with error body
- Create shared error handler middleware
EOF
```

```
✓ Appended to auth-login (2 constats, 2 decisions)
```

### 3. Next sessions

The agent runs `dlr reflect` and immediately has the full context from previous sessions. No re-explaining. It picks up exactly where you left off, knows what was decided, and builds on it.

### 4. Over time

Decisions accumulate. The agent uses `dlr topics` to list what exists, `dlr log` to see the timeline across all topics. You can ask the agent to undo a block (`dlr undo --confirm`) or delete an entire topic (`dlr delete topic auth-flow --confirm`).

Everything is driven by the agent. You validate, the agent executes.

## Commands

| Command | Description |
|---------|-------------|
| `dlr init` | Link current directory to a dlr project (interactive, run by you) |
| `dlr reflect [topic]` | Load previous context to stdout. `--last N` for last N blocks |
| `dlr persist [topic]` | Save constats/decisions from stdin |
| `dlr topics` | List all topics with stats |
| `dlr log` | Show timeline of all entries |
| `dlr undo [topic] --confirm` | Remove last block. `--last N` for N blocks |
| `dlr delete topic <name> --confirm` | Delete entire topic |
| `dlr delete project <name> --confirm` | Delete project from store |

When `[topic]` is omitted, dlr uses the current git branch as topic.

## Branch as Topic

When you omit `[topic]`, dlr uses your current git branch. The branch is normalized to kebab-case: `feat/auth-login` becomes `auth-login`. Prefixes like `feat/`, `fix/`, `refactor/` are stripped automatically.

This means you never have to think about topic names. Switch branches, and the agent automatically switches context. Each branch carries its own history of observations and decisions.

On `main`, `develop`, or `master`, the agent asks you for the topic instead of defaulting to the branch name.

## Agent Setup

`dlr init` handles everything. It searches for AGENTS.md files in your project and home config directories (`~/.config/*/`, `~/.cursor/`, `~/.claude/`), then offers to append the dlr workflow snippet. If no AGENTS.md exists, it creates one. The snippet teaches your agent the full workflow, no manual setup required.

`dlr init` is idempotent. Run it again after upgrading to see the latest snippet.

## Where Data Lives

Nothing is stored in your repository. Sessions live in `~/.dlr/projects/<project>/sessions/<topic>.md`, plain markdown files you can read and edit. A small `.dlr-project` file at the repo root links the directory to its dlr project. It's gitignored and local to each developer, every contributor runs `dlr init` on their own machine.

## Safe by Design

`dlr init` never deletes or replaces content in your AGENTS.md files. It only appends. If the DLR section is already present, it skips and shows you the latest snippet for manual comparison.

## FAQ

**Why not git commit messages?**
Git tracks code changes. dlr tracks context and reasoning, the "why" behind the changes.

**Can I edit session files manually?**
Yes. They're plain markdown in `~/.dlr/projects/<project>/sessions/<topic>.md`.

**Can I use dlr across multiple projects?**
Yes. Run `dlr init` in each project. Each gets its own namespace.

**How does the agent know to use dlr?**
`dlr init` appends instructions to your AGENTS.md. The agent reads them and follows the workflow automatically.

## Contributing

```bash
git clone https://github.com/Mathieuka/dlr.git
cd dlr
npm install
npm test
npm run build
```

PRs welcome. Keep it simple.

## License

MIT
