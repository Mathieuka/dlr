import type { Command } from 'commander';
import { resolveProject, readSessionFile, writeSessionFile } from '../core/store.js';
import { validateBlockContent } from '../core/validator.js';
import { generateTimestampHeader, generateISOTimestamp } from '../core/timestamp.js';
import { createSessionFile, appendBlock } from '../core/markdown.js';
import { resolveTopic } from '../core/topic.js';

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
		.command('persist [topic]')
		.description('Save constats/decisions from stdin to a session file')
		.action(async (topicArg: string | undefined) => {
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
