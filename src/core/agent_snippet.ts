export const AGENTS_SNIPPET = `## DLR — Decision Log & Reflect

This project uses \`dlr\` for decision logging. Available commands:

- \`dlr reflect <topic>\` — Load previous session context (stdout)
- \`dlr persist <topic>\` — Save constats/decisions (reads from stdin)
- \`dlr topics\` — List available topics
- \`dlr log\` — Show timeline of all entries

### Workflow
1. Always run \`dlr reflect <topic>\` at the start of a session to load context
2. At end of session, when the user asks to persist:
   a. Run \`dlr reflect <topic>\` to check what was already persisted
   b. Generate a block with only NEW constats/decisions (no duplicates)
   c. Present the block to the user for approval
   d. After approval, pipe the block via stdin to \`dlr persist <topic>\`

### Format
The block piped to \`dlr persist\` must contain at least one section:

\\\`\\\`\\\`
### Constat
- observation or finding

### Decision
- choice made
\\\`\\\`\\\`

The timestamp is auto-generated. Do not include it.`;
