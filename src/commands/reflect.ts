import type { Command } from 'commander';
import { resolveProject, readSessionFile } from '../core/store.js';
import { getLastNBlocks } from '../core/markdown.js';
import { isValidTopic } from '../core/topic.js';

export function registerReflectCommand(program: Command): void {
	program
		.command('reflect <topic>')
		.description('Output session history to stdout')
		.option('-l, --last <n>', 'Output only the last N blocks')
		.action((topic: string, options: { last?: string }) => {
			if (!isValidTopic(topic)) {
				process.stderr.write(
					`Error: Invalid topic "${topic}". Topics must be kebab-case (e.g., "auth-flow", "planning").\n`,
				);
				process.exitCode = 1;
				return;
			}

			const paths = resolveProject(process.cwd());
			if (!paths) {
				process.stderr.write(
					"Error: No dlr project found. Run 'dlr init' first.\n",
				);
				process.exitCode = 1;
				return;
			}

			const content = readSessionFile(paths, topic);
			if (content === null) {
				process.stderr.write(`Error: No session found for topic '${topic}'.\n`);
				process.exitCode = 1;
				return;
			}

			if (options.last !== undefined) {
				const n = parseInt(options.last, 10);
				if (isNaN(n) || n < 0) {
					process.stderr.write('Error: --last must be a non-negative integer.\n');
					process.exitCode = 1;
					return;
				}
				const result = getLastNBlocks(content, n);
				if (result.length > 0) {
					process.stdout.write(result + '\n');
				}
				return;
			}

			process.stdout.write(content);
		});
}
