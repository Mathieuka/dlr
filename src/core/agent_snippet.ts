export const AGENTS_SNIPPET = `## DLR — Decision Log & Reflect

\`dlr\` is a CLI tool for decision logging. It captures observations (constats) and
decisions across coding sessions so context is never lost between sessions.

This project has a \`.dlr-project\` file at its root, meaning dlr is active here.

### Commands

- \`dlr reflect <topic>\` — Load previous context (stdout)
  - \`--last N\` — Show last N blocks only
- \`dlr persist <topic>\` — Save constats/decisions (reads from stdin)
- \`dlr topics\` — List available topics with stats
- \`dlr log\` — Show timeline of all entries across topics

### Workflow

1. **Start of session**: Run \`dlr reflect <topic>\` to load context
2. **During session**: Work normally
3. **End of session**, when the user asks to persist:
   a. Run \`dlr reflect <topic>\` to check what was already persisted
   b. Generate a block with only NEW constats/decisions (no duplicates)
   c. Present the block to the user for approval
   d. After approval, pipe via stdin:

      \\\`\\\`\\\`bash
      dlr persist <topic> <<'EOF'
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

### Agent responsibilities

- **Always reflect before persisting** — avoid duplicating existing entries
- **Never persist without explicit user approval** — show the block first
- **Know or ask the topic** — infer from context or ask the user
- **Generate concise, non-redundant content** — complementary to existing entries`;
