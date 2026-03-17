import matter from 'gray-matter';
import type { Block } from '../types.js';
import { parseTimestamp } from './timestamp.js';

export function createSessionFile(topic: string, isoTimestamp: string): string {
	return `---\ntopic: ${topic}\ncreated: ${isoTimestamp}\ntags: []\n---\n`;
}

export function appendBlock(
	existingContent: string,
	blockContent: string,
	timestampHeader: string,
): string {
	const trimmed = existingContent.trimEnd();
	return `${trimmed}\n\n${timestampHeader}\n\n${blockContent}\n`;
}

const TIMESTAMP_HEADER_RE = /^## \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

export function parseBlocks(content: string): Block[] {
	const { content: body } = matter(content);
	const lines = body.split('\n');
	const blocks: Block[] = [];

	let currentHeader: string | null = null;
	let currentLines: string[] = [];

	function flushBlock(): void {
		if (currentHeader === null) return;

		const timestamp = parseTimestamp(currentHeader);
		if (!timestamp) return;

		const raw = currentLines.join('\n').trim();
		const constats = extractBullets(raw, '### Constat');
		const decisions = extractBullets(raw, '### Decision');

		blocks.push({ timestamp, constats, decisions, raw });
	}

	for (const line of lines) {
		if (TIMESTAMP_HEADER_RE.test(line.trim())) {
			flushBlock();
			currentHeader = line.trim();
			currentLines = [];
		} else if (currentHeader !== null) {
			currentLines.push(line);
		}
	}
	flushBlock();

	return blocks;
}

function extractBullets(raw: string, sectionHeader: string): string[] {
	const lines = raw.split('\n');
	const bullets: string[] = [];
	let inSection = false;

	for (const line of lines) {
		if (line.trim().startsWith('### ')) {
			inSection = line.trim() === sectionHeader;
			continue;
		}
		if (inSection) {
			const bulletMatch = /^\s*-\s+(.+)/.exec(line);
			if (bulletMatch) {
				bullets.push(bulletMatch[1]!);
			}
		}
	}

	return bullets;
}

export function getLastNBlocks(content: string, n: number): string {
	const blocks = parseBlocks(content);
	if (blocks.length === 0 || n <= 0) return '';

	const selected = blocks.slice(-n);
	return selected
		.map((block) => {
			const ts = `## ${formatBlockTimestamp(block.timestamp)}`;
			return `${ts}\n\n${block.raw}`;
		})
		.join('\n\n');
}

function formatBlockTimestamp(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	const h = String(date.getHours()).padStart(2, '0');
	const min = String(date.getMinutes()).padStart(2, '0');
	return `${y}-${m}-${d} ${h}:${min}`;
}

export function removeLastNBlocks(content: string, n: number): string {
	const { data } = matter(content);
	const blocks = parseBlocks(content);

	if (n >= blocks.length) {
		return `---\ntopic: ${data.topic}\ncreated: ${data.created}\ntags: ${JSON.stringify(data.tags ?? [])}\n---\n`;
	}

	const remaining = blocks.slice(0, blocks.length - n);
	let result = `---\ntopic: ${data.topic}\ncreated: ${data.created}\ntags: ${JSON.stringify(data.tags ?? [])}\n---\n`;

	for (const block of remaining) {
		const ts = `## ${formatBlockTimestamp(block.timestamp)}`;
		result = `${result.trimEnd()}\n\n${ts}\n\n${block.raw}\n`;
	}

	return result;
}

export function countBlockStats(block: Block): { constats: number; decisions: number } {
	return { constats: block.constats.length, decisions: block.decisions.length };
}
