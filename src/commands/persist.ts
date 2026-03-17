import type { Command } from 'commander';
import { resolveProject, readSessionFile, writeSessionFile } from '../core/store.js';
import { validateBlockContent } from '../core/validator.js';
import { generateTimestampHeader, generateISOTimestamp } from '../core/timestamp.js';
import { createSessionFile, appendBlock } from '../core/markdown.js';
import { isValidTopic } from '../core/topic.js';

function readStdin(): Promise<string> {
	return new Promise((resolve, reject) => {
		let data = '';
		process.stdin.setEncoding('utf-8');
		process.stdin.on('data', (chunk) => {
			data += chunk;
		});
		process.stdin.on('end', () => resolve(data));
		process.stdin.on('error', reject);
	});
}

export function registerPersistCommand(program: Command): void {
	program
		.command('persist <topic>')
		.description('Save constats/decisions from stdin to a session file')
		.action(async (topic: string) => {
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

			const stdin = await readStdin();
			const content = stdin.trim();

			const validation = validateBlockContent(content);
			if (!validation.valid) {
				process.stderr.write(`Error: ${validation.error}\n`);
				process.exitCode = 1;
				return;
			}

			const timestampHeader = generateTimestampHeader();
			let existing = readSessionFile(paths, topic);

			if (existing === null) {
				existing = createSessionFile(topic, generateISOTimestamp());
			}

			const updated = appendBlock(existing, content, timestampHeader);
			writeSessionFile(paths, topic, updated);

			const cLabel = validation.constats === 1 ? 'constat' : 'constats';
			const dLabel = validation.decisions === 1 ? 'decision' : 'decisions';
			process.stdout.write(
				`✓ Appended to ${topic} (${validation.constats} ${cLabel}, ${validation.decisions} ${dLabel})\n`,
			);
		});
}
