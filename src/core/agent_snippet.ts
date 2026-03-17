export const AGENTS_SNIPPET = `## DLR — Decision Log & Reflect

\`dlr\` is a CLI tool for decision logging. It captures observations (constats) and
decisions across coding sessions so context is never lost between sessions.

This project has a \`.dlr-project\` file at its root, meaning dlr is active here.

### Commands

- \`dlr reflect [topic]\` — Load previous context (stdout)
  - \`--last N\` — Show last N blocks only
- \`dlr persist [topic]\` — Save constats/decisions (reads from stdin)
- \`dlr topics\` — List available topics with stats
- \`dlr log\` — Show timeline of all entries across topics
- \`dlr undo [topic] --confirm\` — Remove the last block from a topic
  - \`--last N\` — Remove last N blocks
- \`dlr delete topic <topic> --confirm\` — Delete an entire topic
- \`dlr delete project <name> --confirm\` — Delete a project from the store

When \`[topic]\` is omitted, the current git branch is used as topic (normalized to kebab-case, prefixes like \`feat/\`, \`fix/\` are stripped).

### Workflow

1. **Start of session**: Always check the current git branch (\`git branch --show-current\`).
   Run \`dlr reflect\` to load context for the current branch topic.
   If no session exists yet, run \`dlr topics\` to see other available topics.
2. **During session**: Work normally, accumulate observations and decisions.
3. **End of session**, when the user asks to persist:
   a. Run \`dlr reflect\` to check what was already persisted
   b. Generate a block with only NEW constats/decisions (no duplicates)
   c. Present the block to the user for approval
   d. After approval, pipe via stdin:

      \\\`\\\`\\\`bash
      dlr persist <<'EOF'
      ### Constat
      - observation or finding

      ### Decision
      - choice made
      EOF
      \\\`\\\`\\\`

### Rules

- Timestamp is auto-generated — do not include it
- Topics must be kebab-case (e.g., \`planning\`, \`auth-flow\`)
- At least one \`### Constat\` or \`### Decision\` section required
- Each section needs at least one bullet point (\`- item\`)
- Destructive commands (\`undo\`, \`delete\`) require the \`--confirm\` flag
- On \`main\`, \`develop\`, or \`master\` branches — ask the user for the topic instead of using the branch name automatically

### Agent responsibilities

- **Always check the current branch** before any dlr command
- **Always reflect before persisting** — avoid duplicating existing entries
- **Never persist without explicit user approval** — show the block first
- **On main/develop/master** — ask the user which topic to use instead of defaulting to the branch name
- **New topic naming** — if the topic doesn't exist yet, propose a descriptive kebab-case name and wait for user validation before creating it
- **Generate concise, non-redundant content** — complementary to existing entries
- **Destructive actions** — always ask the user for confirmation before running \`undo\` or \`delete\``;
