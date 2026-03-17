import type { Command } from 'commander';
import { resolveProject, listSessionFiles, readSessionFile } from '../core/store.js';
import { parseBlocks, countBlockStats } from '../core/markdown.js';
import { generateTimestamp } from '../core/timestamp.js';

interface LogEntry {
	timestamp: Date;
	topic: string;
	constats: number;
	decisions: number;
}

export function registerLogCommand(program: Command): void {
	program
		.command('log')
		.description('Show timeline of all entries across topics')
		.action(() => {
			const paths = resolveProject(process.cwd());
			if (!paths) {
				process.stderr.write(
					"Error: No dlr project found. Run 'dlr init' first.\n",
				);
				process.exitCode = 1;
				return;
			}

			const topics = listSessionFiles(paths);
			const entries: LogEntry[] = [];

			for (const topic of topics) {
				const content = readSessionFile(paths, topic);
				if (!content) continue;

				const blocks = parseBlocks(content);
				for (const block of blocks) {
					const stats = countBlockStats(block);
					entries.push({
						timestamp: block.timestamp,
						topic,
						constats: stats.constats,
						decisions: stats.decisions,
					});
				}
			}

			entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

			if (entries.length === 0) return;

			const maxTopicLen = Math.max(...entries.map((e) => e.topic.length));

			for (const entry of entries) {
				const ts = generateTimestamp(entry.timestamp);
				const topicPadded = entry.topic.padEnd(maxTopicLen);
				const cLabel = entry.constats === 1 ? 'constat' : 'constats';
				const dLabel = entry.decisions === 1 ? 'decision' : 'decisions';
				process.stdout.write(
					`${ts}  ${topicPadded}  ${entry.constats} ${cLabel}, ${entry.decisions} ${dLabel}\n`,
				);
			}
		});
}
