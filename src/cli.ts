import { createRequire } from 'node:module';
import { Command } from 'commander';
import { registerInitCommand } from './commands/init.js';
import { registerPersistCommand } from './commands/persist.js';
import { registerReflectCommand } from './commands/reflect.js';
import { registerLogCommand } from './commands/log.js';
import { registerTopicsCommand } from './commands/topics.js';
import { registerUndoCommand } from './commands/undo.js';
import { registerDeleteCommand } from './commands/delete.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

const program = new Command();

program
	.name('dlr')
	.description('Decision Log & Reflect — Never lose context between coding sessions')
	.version(pkg.version)
	.addHelpText('after', `
WORKFLOW

  Typical usage with an LLM agent:

  1. dlr reflect                  Load previous context (topic = current branch)
  2. (work session)
  3. Agent generates block        Extracts constats/decisions
  4. Agent shows block to user    User reviews and validates
  5. dlr persist                  Save after user approval

  When topic is omitted, the current git branch is used (normalized to kebab-case).
  The agent is responsible for:
  - Presenting blocks to the user before persisting
  - Reflecting before persisting to avoid duplicates
  - On main/develop/master, asking the user which topic to use

EXAMPLES

  dlr init
  dlr init --name custom-project
  dlr reflect                     (uses current branch as topic)
  dlr reflect planning            (explicit topic)
  dlr reflect planning --last 5
  dlr persist                     (reads block from stdin, uses current branch)
  dlr persist planning            (explicit topic)
  dlr log
  dlr topics
  dlr undo --confirm              (uses current branch as topic)
  dlr undo planning --confirm
  dlr undo planning --last 3 --confirm
  dlr delete topic planning --confirm
  dlr delete project myapp --confirm
`);

registerInitCommand(program);
registerPersistCommand(program);
registerReflectCommand(program);
registerLogCommand(program);
registerTopicsCommand(program);
registerUndoCommand(program);
registerDeleteCommand(program);

program.parse();
