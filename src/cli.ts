import { createRequire } from 'node:module';
import { Command } from 'commander';
import { registerInitCommand } from './commands/init.js';
import { registerPersistCommand } from './commands/persist.js';
import { registerReflectCommand } from './commands/reflect.js';
import { registerLogCommand } from './commands/log.js';
import { registerTopicsCommand } from './commands/topics.js';

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
`);

registerInitCommand(program);
registerPersistCommand(program);
registerReflectCommand(program);
registerLogCommand(program);
registerTopicsCommand(program);

program.parse();
