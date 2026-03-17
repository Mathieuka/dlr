# Implementation Plan — dlr v1

This document is the step-by-step guide to build dlr from scratch. Each step lists exactly what to create, what to test, and what the acceptance criteria are.

Refer to `README.md` for the user-facing specification (commands, format, behavior).

---

## Tech Stack

| Component          | Choice        | Why                                         |
|--------------------|---------------|---------------------------------------------|
| Runtime            | Node.js ≥18   | Target audience already has it              |
| Language           | TypeScript    | Strict mode, ESM modules                    |
| CLI framework      | Commander.js  | Mature, well-documented, agents can parse --help |
| Markdown parsing   | gray-matter   | Frontmatter extraction                      |
| Tests              | Vitest        | Fast, TypeScript-native                     |
| Build              | tsup          | Simple bundler for CLI tools                |
| Package            | npm           | Package name: `dlr`                         |

---

## Project Structure

```
dlr/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── README.md
├── PLAN.md
├── src/
│   ├── cli.ts                          # Entry point, Commander setup
│   ├── commands/
│   │   ├── init.ts                     # dlr init
│   │   ├── persist.ts                  # dlr persist <topic>
│   │   ├── reflect.ts                  # dlr reflect <topic>
│   │   ├── log.ts                      # dlr log
│   │   └── topics.ts                   # dlr topics
│   ├── core/
│   │   ├── store.ts                    # ~/.dlr/ resolution, project resolution
│   │   ├── store.test.ts
│   │   ├── markdown.ts                 # Block parsing, frontmatter, append
│   │   ├── markdown.test.ts
│   │   ├── timestamp.ts                # Timestamp generation
│   │   ├── timestamp.test.ts
│   │   ├── validator.ts                # Stdin content validation
│   │   ├── validator.test.ts
│   │   └── agent_snippet.ts            # AGENTS.md snippet printed by dlr init
│   └── types.ts                        # Shared types (Block, Session, etc.)
```

---

## Step 0 — Scaffolding

### What to do

1. Initialize the git repository
2. Create `package.json`:
   - `name`: `dlr`
   - `version`: `0.1.0`
   - `type`: `module`
   - `bin`: `{ "dlr": "./dist/cli.js" }`
   - Dependencies: `commander`, `gray-matter`
   - Dev dependencies: `typescript`, `tsup`, `vitest`, `@types/node`
   - Scripts: `build`, `dev`, `test`, `lint`
3. Create `tsconfig.json`:
   - `strict: true`
   - `module: "ESNext"`, `moduleResolution: "bundler"`
   - `target: "ES2022"`
   - `outDir: "dist"`
   - `rootDir: "src"`
4. Create `tsup.config.ts`:
   - Entry: `src/cli.ts`
   - Format: `esm`
   - Add shebang `#!/usr/bin/env node`
5. Create `vitest.config.ts`
6. Create the directory structure (`src/`, `src/commands/`, `src/core/`)
7. Create a minimal `src/cli.ts` that prints version

### Acceptance criteria

- `npm run build` succeeds
- `node dist/cli.js --version` prints `0.1.0`
- `npm test` runs (even if no tests yet)
- `npm link` makes `dlr --version` work globally

---

## Step 1 — Types

### What to do

Create `src/types.ts` with the shared types used across the project:

- `Block` — a single timestamped constat/decision block:
  - `timestamp: Date`
  - `constats: string[]`
  - `decisions: string[]`
  - `raw: string` (the original markdown text of the block)
- `SessionFile` — a parsed session file:
  - `topic: string`
  - `created: string` (ISO 8601)
  - `tags: string[]`
  - `blocks: Block[]`
  - `raw: string` (the full file content)
- `ProjectMeta` — project metadata:
  - `name: string`
  - `createdAt: string`
- `DlrPaths` — resolved paths for the current context:
  - `root: string` (`~/.dlr`)
  - `project: string` (`~/.dlr/projects/<name>`)
  - `sessions: string` (`~/.dlr/projects/<name>/sessions`)
  - `projectName: string`

### Acceptance criteria

- Types compile without errors
- No runtime code — types only

---

## Step 2 — Core: Store Module

### What to do

Create `src/core/store.ts` — responsible for everything related to the filesystem structure of `~/.dlr/`.

**Functions to implement:**

1. `getDlrRoot(): string`
   - Returns `~/.dlr` (expand `~` to `os.homedir()`)
   - Creates the directory if it doesn't exist

2. `resolveProject(cwd: string): DlrPaths | null`
   - Walks up from `cwd` looking for `.dlr-project`
   - If found, reads the project name (first line, trimmed)
   - Returns `DlrPaths` with all resolved paths
   - Returns `null` if no `.dlr-project` found

3. `initProject(cwd: string, projectName: string): DlrPaths`
   - Creates `.dlr-project` in `cwd` with `projectName` as content
   - Creates `~/.dlr/projects/<projectName>/` if it doesn't exist
   - Creates `~/.dlr/projects/<projectName>/sessions/` if it doesn't exist
   - Creates `~/.dlr/projects/<projectName>/meta.yaml` with `name` and `createdAt`
   - Returns `DlrPaths`

4. `listSessionFiles(paths: DlrPaths): string[]`
   - Lists all `.md` files in the sessions directory
   - Returns filenames without extension (= topics)

5. `readSessionFile(paths: DlrPaths, topic: string): string | null`
   - Reads `~/.dlr/projects/<project>/sessions/<topic>.md`
   - Returns content as string, or `null` if file doesn't exist

6. `writeSessionFile(paths: DlrPaths, topic: string, content: string): void`
   - Writes content to the session file
   - Creates the file if it doesn't exist

### Tests (`src/core/store.test.ts`)

Use a temporary directory (`os.tmpdir()`) as dlr root to avoid polluting the real `~/.dlr/`.

1. `getDlrRoot` creates the directory if missing
2. `initProject` creates `.dlr-project` with correct content
3. `initProject` creates the full directory structure
4. `initProject` creates `meta.yaml` with correct fields
5. `initProject` is idempotent (running twice doesn't fail)
6. `resolveProject` finds `.dlr-project` in current directory
7. `resolveProject` finds `.dlr-project` in parent directory
8. `resolveProject` finds `.dlr-project` in grandparent directory
9. `resolveProject` returns null when no `.dlr-project` exists
10. `listSessionFiles` returns empty array when no sessions
11. `listSessionFiles` returns topics for existing files
12. `readSessionFile` returns null for non-existent file
13. `readSessionFile` returns content for existing file
14. `writeSessionFile` creates the file if it doesn't exist
15. `writeSessionFile` overwrites existing content

### Acceptance criteria

- All 15 tests pass
- No real filesystem side effects outside tmp directory

---

## Step 3 — Core: Timestamp Module

### What to do

Create `src/core/timestamp.ts` — responsible for generating and parsing timestamps.

**Functions to implement:**

1. `generateTimestamp(date?: Date): string`
   - Returns `YYYY-MM-DD HH:MM` in local timezone
   - Uses current date/time if no argument
   - Accepts a Date for testability

2. `generateTimestampHeader(date?: Date): string`
   - Returns `## YYYY-MM-DD HH:MM`

3. `parseTimestamp(header: string): Date | null`
   - Parses `## YYYY-MM-DD HH:MM` into a Date
   - Returns `null` if the format doesn't match

4. `generateISOTimestamp(date?: Date): string`
   - Returns full ISO 8601 with timezone offset (for frontmatter `created` field)
   - Example: `2026-03-10T16:57:00+01:00`

### Tests (`src/core/timestamp.test.ts`)

1. `generateTimestamp` formats correctly
2. `generateTimestamp` with explicit date
3. `generateTimestampHeader` prepends `## `
4. `parseTimestamp` parses valid header
5. `parseTimestamp` returns null for invalid input
6. `parseTimestamp` returns null for non-timestamp h2 headers
7. `generateISOTimestamp` includes timezone offset

### Acceptance criteria

- All 7 tests pass
- Timestamps are always in local timezone (not UTC)

---

## Step 4 — Core: Validator Module

### What to do

Create `src/core/validator.ts` — validates stdin content before persisting.

**Functions to implement:**

1. `validateBlockContent(content: string): { valid: boolean; error?: string; constats: number; decisions: number }`
   - Checks that content contains at least one `### Constat` or `### Decision` section
   - Counts the number of bullet points under each section
   - Returns validation result with counts

### Tests (`src/core/validator.test.ts`)

1. Valid block with both constat and decision
2. Valid block with only constat
3. Valid block with only decision
4. Invalid block with no section headers
5. Invalid block with empty content
6. Counts multiple constats correctly
7. Counts multiple decisions correctly
8. Handles multi-line bullet points (bullet with continuation lines)
9. Rejects content with section headers but no bullet points

### Acceptance criteria

- All 9 tests pass

---

## Step 5 — Core: Markdown Module

### What to do

Create `src/core/markdown.ts` — responsible for parsing and composing session file content.

**Functions to implement:**

1. `createSessionFile(topic: string, isoTimestamp: string): string`
   - Generates a new session file with frontmatter
   - Returns the full file content as string:
     ```
     ---
     topic: <topic>
     created: <isoTimestamp>
     tags: []
     ---
     ```

2. `appendBlock(existingContent: string, blockContent: string, timestampHeader: string): string`
   - Appends a new block to existing file content
   - Adds a blank line separator, then the timestamp header, then a blank line, then the block content
   - Returns the updated full file content

3. `parseBlocks(content: string): Block[]`
   - Parses a session file into individual blocks
   - Splits on `## YYYY-MM-DD HH:MM` boundaries
   - For each block, extracts timestamp, constats, decisions, and raw text
   - Returns array of `Block`, ordered chronologically (oldest first)

4. `getLastNBlocks(content: string, n: number): string`
   - Parses the file, takes the last N blocks
   - Returns them as markdown string (without frontmatter)

5. `countBlockStats(block: Block): { constats: number; decisions: number }`
   - Returns the count of constats and decisions in a block

### Tests (`src/core/markdown.test.ts`)

1. `createSessionFile` generates correct frontmatter
2. `createSessionFile` includes topic and created fields
3. `appendBlock` adds block to empty file (after frontmatter)
4. `appendBlock` adds block to file with existing blocks
5. `appendBlock` adds blank line separator between blocks
6. `parseBlocks` returns empty array for file with no blocks
7. `parseBlocks` parses single block correctly
8. `parseBlocks` parses multiple blocks correctly
9. `parseBlocks` extracts timestamp from header
10. `parseBlocks` extracts constats as array of strings
11. `parseBlocks` extracts decisions as array of strings
12. `parseBlocks` handles block with only constat
13. `parseBlocks` handles block with only decision
14. `parseBlocks` preserves raw text of each block
15. `getLastNBlocks` returns last N blocks
16. `getLastNBlocks` returns all blocks if N > total
17. `getLastNBlocks` returns empty string if no blocks
18. `countBlockStats` counts correctly

### Acceptance criteria

- All 18 tests pass
- Parsing is round-trip safe: parse then re-serialize produces equivalent content

---

## Step 6 — Command: `dlr init`

### What to do

Create `src/commands/init.ts`.

**Behavior:**
1. Derive project name from the current directory name (`path.basename(cwd)`)
2. If `--name` is provided, use that instead
3. Call `initProject(cwd, projectName)`
4. Print success messages:
   - `✓ Created .dlr-project in current directory`
   - `✓ Initialized project '<name>' in ~/.dlr/projects/<name>`
   - `⚠ Add .dlr-project to your .gitignore`
5. Print the AGENTS.md snippet (see below)
6. If `.dlr-project` already exists in cwd, print error and exit with code 1

**AGENTS.md snippet:**

After the success messages, print a ready-to-copy snippet that the user pastes into their AGENTS.md (or equivalent agent config). The snippet must contain:
- Available commands with descriptions
- The full workflow (reflect → work → persist with validation)
- The expected format for persist stdin
- A note that the timestamp is auto-generated

The snippet is a hardcoded string in the codebase — not dynamically generated. It should be stored in a dedicated file (e.g., `src/core/agent_snippet.ts`) so it's easy to update.

**Wire up in `src/cli.ts`:**
```
dlr init
  -n, --name <name>    Override the project name (defaults to directory name)
```

### Edge cases to handle

- `.dlr-project` already exists → error: "Project already initialized in this directory."
- Directory name contains spaces or special characters → sanitize or warn
- `--name` with empty string → error

### Acceptance criteria

- `dlr init` in `/home/user/projects/fabriq` creates project named "fabriq"
- `dlr init --name custom` creates project named "custom"
- Creates `.dlr-project` and the store structure
- Running `dlr init` twice in the same directory prints an error
- The AGENTS.md snippet is printed to stdout after success messages
- Exit code 0 on success, 1 on error

---

## Step 7 — Command: `dlr persist <topic>`

### What to do

Create `src/commands/persist.ts`.

**Behavior:**
1. Resolve project from cwd (exit 1 if no `.dlr-project`)
2. Read stdin to completion (the block content)
3. Validate content with `validateBlockContent()`
4. If invalid, print error to stderr and exit 1
5. Generate timestamp header
6. Read existing session file (or create new one with frontmatter)
7. Append block with timestamp header
8. Write session file
9. Print confirmation: `✓ Appended to <topic> (N constats, M decisions)`

**Stdin handling:**
- Read all of stdin until EOF
- Trim whitespace

**Wire up in `src/cli.ts`:**
```
dlr persist <topic>
```

### Edge cases to handle

- No stdin (empty pipe) → error: "No content received on stdin."
- Stdin with no valid sections → error with helpful message explaining the expected format
- First persist for a topic → create file with frontmatter
- No `.dlr-project` found → error: "No dlr project found. Run 'dlr init' first."
- Topic with spaces → reject, suggest kebab-case

### Acceptance criteria

- Piping valid content creates/appends to the session file
- Timestamp is auto-generated (not in the input)
- Invalid content produces a clear error on stderr
- Exit code 0 on success, 1 on error

---

## Step 8 — Command: `dlr reflect <topic>`

### What to do

Create `src/commands/reflect.ts`.

**Behavior:**
1. Resolve project from cwd (exit 1 if no `.dlr-project`)
2. Read session file for the topic
3. If file doesn't exist, print nothing to stdout and exit 1
4. If `--last N` is specified:
   - Parse blocks
   - Output only the last N blocks as markdown (no frontmatter)
5. Otherwise, output the full file content to stdout

**Wire up in `src/cli.ts`:**
```
dlr reflect <topic>
  -l, --last <n>    Output only the last N blocks
```

### Edge cases to handle

- Topic doesn't exist → exit 1, nothing on stdout, error on stderr: "No session found for topic '<topic>'."
- `--last 0` → output nothing
- `--last N` where N > total blocks → output all blocks
- No `.dlr-project` found → error: "No dlr project found. Run 'dlr init' first."

### Acceptance criteria

- Full content output by default
- `--last N` outputs exactly the last N blocks
- Exit code 1 if topic doesn't exist
- Output goes to stdout (pipeable)

---

## Step 9 — Command: `dlr log`

### What to do

Create `src/commands/log.ts`.

**Behavior:**
1. Resolve project from cwd (exit 1 if no `.dlr-project`)
2. List all session files
3. For each file, parse all blocks
4. Collect all blocks with their topic
5. Sort by timestamp, most recent first
6. For each block, print: `YYYY-MM-DD HH:MM  <topic>  <N constats, M decisions>`
7. Align columns for readability

**Wire up in `src/cli.ts`:**
```
dlr log
```

### Edge cases to handle

- No session files → print nothing
- Session file with no blocks → skip it
- No `.dlr-project` found → error: "No dlr project found. Run 'dlr init' first."

### Acceptance criteria

- All blocks across all topics appear in the timeline
- Sorted most recent first
- Columns are aligned
- Empty project shows nothing (no error)

---

## Step 10 — Command: `dlr topics`

### What to do

Create `src/commands/topics.ts`.

**Behavior:**
1. Resolve project from cwd (exit 1 if no `.dlr-project`)
2. List all session files
3. For each file, parse blocks and compute:
   - Total number of blocks
   - Most recent block timestamp
4. Sort by most recent timestamp (most active first)
5. Print: `<topic>  <N blocks>  last: <YYYY-MM-DD>`
6. Align columns

**Wire up in `src/cli.ts`:**
```
dlr topics
```

### Edge cases to handle

- No session files → print nothing
- Session file with no blocks → show `0 blocks  last: never` or skip
- No `.dlr-project` found → error: "No dlr project found. Run 'dlr init' first."

### Acceptance criteria

- All topics listed with correct stats
- Sorted by most recent activity
- Columns aligned
- Singular/plural: `1 block` vs `2 blocks`

---

## Step 11 — CLI Entry Point and Help

### What to do

Finalize `src/cli.ts`:

1. Wire all commands with Commander.js
2. Add program description and version
3. Add a detailed help epilogue with the workflow section:

```
WORKFLOW

  Typical usage with an LLM agent:

  1. dlr reflect <topic>         Load previous context
  2. (work session)
  3. Agent generates block        Extracts constats/decisions
  4. Agent shows block to user    User reviews and validates
  5. dlr persist <topic>          Save after user approval

  The CLI is 100% non-interactive. The agent is responsible for:
  - Knowing or asking the user which topic to use
  - Presenting blocks to the user before persisting
  - Reflecting before persisting to avoid duplicates

EXAMPLES

  dlr init
  dlr init --name custom-project
  dlr reflect planning
  dlr reflect planning --last 5
  dlr persist planning            (reads block from stdin)
  dlr log
  dlr topics
```

4. Handle unknown commands with a helpful error
5. Handle missing project gracefully (suggest `dlr init`)

### Acceptance criteria

- `dlr --help` shows all commands with descriptions
- `dlr --help` includes the workflow section
- `dlr --version` prints the version
- Unknown command shows helpful error
- Running any command without `dlr init` first shows a clear message

---

## Step 12 — Integration Tests

### What to do

Create integration tests that exercise the full flow through the CLI (not just core modules).

**Test file:** `src/integration.test.ts`

**Tests:**

1. Full workflow: init → persist → reflect → verify content matches
2. Full workflow: init → persist twice → reflect --last 1 → only last block
3. Full workflow: init → persist to 2 topics → log → both appear sorted
4. Full workflow: init → persist to 2 topics → topics → both listed with stats
5. Persist without init → exit code 1, helpful error on stderr
6. Reflect non-existent topic → exit code 1, error on stderr
7. Persist with invalid stdin (no sections) → exit code 1, error on stderr
8. Persist with empty stdin → exit code 1, error on stderr
9. Init twice in same directory → exit code 1
10. Timestamp is auto-generated (not in stdin, appears in file)
11. Session file has correct frontmatter on first persist
12. Init without --name uses directory name as project name
13. Init with --name uses the provided name

**How to test:**
- Use `child_process.execSync` or `execa` to run the built CLI
- Use a temp directory with a custom `HOME` env var to isolate `~/.dlr/`
- Or mock the dlr root in tests

### Acceptance criteria

- All 13 integration tests pass
- Tests are isolated (no side effects between tests)
- Tests run in CI without special setup

---

## Step 13 — Polish and Edge Cases

### What to do

1. **Error messages:** Review all error paths. Every error should:
   - Print to stderr (not stdout)
   - Be specific about what went wrong
   - Suggest how to fix it (e.g., "Run 'dlr init' first")

2. **Exit codes:**
   - 0: success
   - 1: user error (no project, invalid input, file not found)

3. **Encoding:** Ensure UTF-8 everywhere (stdin, file read/write, stdout)

4. **Large files:** Test with a session file that has 100+ blocks — ensure no performance issues with parsing

5. **Concurrent writes:** Basic file locking or atomic writes to prevent corruption if two agents persist simultaneously (can be simple — append is low-risk)

6. **Trailing newlines:** Ensure consistent newline handling (files always end with a newline)

7. **Topic validation:** Topics must be kebab-case (lowercase, hyphens, no spaces). Reject invalid topics with a helpful error.

### Acceptance criteria

- All error messages are clear and actionable
- No crashes on unexpected input
- UTF-8 content (accents, emojis in constats) works correctly
- Invalid topic names are rejected with a suggestion

---

## Step 14 — Build and Publish

### What to do

1. **Build:**
   - `npm run build` produces `dist/cli.js` with shebang
   - Verify `node dist/cli.js --help` works
   - Verify `node dist/cli.js --version` works

2. **Package.json final check:**
   - `name`: `dlr`
   - `version`: `1.0.0`
   - `bin`: `{ "dlr": "./dist/cli.js" }`
   - `files`: `["dist"]`
   - `engines`: `{ "node": ">=18" }`
   - `keywords`: `["cli", "decision-log", "developer-tools", "llm", "context"]`
   - `description`: set
   - `repository`: set
   - `license`: MIT

3. **Test the package locally:**
   - `npm pack` → inspect the tarball contents
   - `npm install -g ./dlr-1.0.0.tgz` → test the global install
   - Verify `dlr --help`, `dlr init`, `dlr persist`, `dlr reflect` all work

4. **Publish:**
   - `npm login`
   - `npm publish`
   - Verify: `npm install -g dlr` from another machine or clean env

5. **GitHub release:**
   - Tag `v1.0.0`
   - Release notes summarizing features

### Acceptance criteria

- `npm install -g dlr` works on a clean machine with Node ≥18
- `dlr --help` shows complete documentation
- All commands work as specified in README.md
- Package size is reasonable (< 100KB)

---

## Summary

| Step | What                  | Core deliverable                          |
|------|-----------------------|-------------------------------------------|
| 0    | Scaffolding           | Build, test, dev tooling works            |
| 1    | Types                 | Shared types for the project              |
| 2    | Store module          | ~/.dlr/ management, project resolution    |
| 3    | Timestamp module      | Timestamp generation and parsing          |
| 4    | Validator module      | Stdin content validation                  |
| 5    | Markdown module       | Block parsing, frontmatter, append        |
| 6    | `dlr init`            | Project initialization command            |
| 7    | `dlr persist`         | Save constat/decision blocks              |
| 8    | `dlr reflect`         | Load session context                      |
| 9    | `dlr log`             | Cross-topic timeline                      |
| 10   | `dlr topics`          | Topic listing with stats                  |
| 11   | CLI help              | Rich --help with workflow documentation   |
| 12   | Integration tests     | End-to-end validation                     |
| 13   | Polish                | Error handling, edge cases, encoding      |
| 14   | Publish               | npm publish, GitHub release               |
