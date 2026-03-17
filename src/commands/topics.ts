import type { Command } from 'commander';
import { resolveProject, listSessionFiles, readSessionFile } from '../core/store.js';
import { parseBlocks } from '../core/markdown.js';

interface TopicInfo {
	topic: string;
	blockCount: number;
	lastTimestamp: Date | null;
}

export function registerTopicsCommand(program: Command): void {
	program
		.command('topics')
		.description('List all topics with stats')
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
			const infos: TopicInfo[] = [];

			for (const topic of topics) {
				const content = readSessionFile(paths, topic);
				if (!content) continue;

				const blocks = parseBlocks(content);
				const lastBlock = blocks.length > 0 ? blocks[blocks.length - 1]! : null;
				infos.push({
					topic,
					blockCount: blocks.length,
					lastTimestamp: lastBlock?.timestamp ?? null,
				});
			}

			infos.sort((a, b) => {
				if (!a.lastTimestamp && !b.lastTimestamp) return 0;
				if (!a.lastTimestamp) return 1;
				if (!b.lastTimestamp) return -1;
				return b.lastTimestamp.getTime() - a.lastTimestamp.getTime();
			});

			if (infos.length === 0) return;

			const maxTopicLen = Math.max(...infos.map((i) => i.topic.length));

			for (const info of infos) {
				const topicPadded = info.topic.padEnd(maxTopicLen);
				const blockLabel = info.blockCount === 1 ? 'block' : 'blocks';
				const countStr = `${info.blockCount} ${blockLabel}`.padEnd(10);
				const lastStr = info.lastTimestamp
					? `last: ${formatDate(info.lastTimestamp)}`
					: 'last: never';
				process.stdout.write(`${topicPadded}  ${countStr}  ${lastStr}\n`);
			}
		});
}

function formatDate(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}
