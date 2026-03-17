import type { Command } from 'commander';
import { resolveProject, readSessionFile, writeSessionFile } from '../core/store.js';
import { parseBlocks, removeLastNBlocks } from '../core/markdown.js';
import { resolveTopic } from '../core/topic.js';

export function registerUndoCommand(program: Command): void {
	program
		.command('undo [topic]')
		.description('Remove the last block(s) from a topic session')
		.option('-l, --last <n>', 'Number of blocks to remove (default: 1)')
		.option('--confirm', 'Required flag to confirm destructive action')
		.action((topicArg: string | undefined, options: { last?: string; confirm?: boolean }) => {
			if (!options.confirm) {
				process.stderr.write(
					'Error: --confirm flag is required for destructive actions.\n',
				);
				process.exitCode = 1;
				return;
			}

			const cwd = process.cwd();

			const resolved = resolveTopic(topicArg, cwd);
			if (!resolved.ok) {
				process.stderr.write(`Error: ${resolved.error}\n`);
				process.exitCode = 1;
				return;
			}
			const { topic } = resolved;

			if (resolved.fromBranch) {
				process.stderr.write(`Using branch as topic: ${topic}\n`);
			}

			const paths = resolveProject(cwd);
			if (!paths) {
				process.stderr.write("Error: No dlr project found. Run 'dlr init' first.\n");
				process.exitCode = 1;
				return;
			}

			const content = readSessionFile(paths, topic);
			if (content === null) {
				process.stderr.write(`Error: No session found for topic '${topic}'.\n`);
				process.exitCode = 1;
				return;
			}

			const n = options.last ? parseInt(options.last, 10) : 1;
			if (isNaN(n) || n < 1) {
				process.stderr.write('Error: --last must be a positive integer.\n');
				process.exitCode = 1;
				return;
			}

			const blocks = parseBlocks(content);
			if (blocks.length === 0) {
				process.stderr.write(`Error: No blocks to remove in topic '${topic}'.\n`);
				process.exitCode = 1;
				return;
			}

			const toRemove = Math.min(n, blocks.length);
			const updated = removeLastNBlocks(content, toRemove);
			writeSessionFile(paths, topic, updated);

			const label = toRemove === 1 ? 'block' : 'blocks';
			process.stdout.write(
				`✓ Removed ${toRemove} ${label} from ${topic} (${blocks.length - toRemove} remaining)\n`,
			);
		});
}
