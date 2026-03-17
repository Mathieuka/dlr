import { describe, it, expect } from 'vitest';
import {
	createSessionFile,
	appendBlock,
	parseBlocks,
	getLastNBlocks,
	countBlockStats,
	removeLastNBlocks,
} from './markdown.js';

const FRONTMATTER = `---
topic: planning
created: 2026-03-10T16:57:00+01:00
tags: []
---
`;

const BLOCK_1 = `### Constat
- The projection logic exists in 3 MSW files

### Decision
- Implementation plan in 9 steps`;

const BLOCK_2 = `### Constat
- Respondents are stored inline in form_planning

### Decision
- Output format: always a resolved object`;

describe('markdown', () => {
	describe('createSessionFile', () => {
		it('generates correct frontmatter', () => {
			const result = createSessionFile('planning', '2026-03-10T16:57:00+01:00');
			expect(result).toContain('---');
			expect(result).toContain('topic: planning');
			expect(result).toContain('tags: []');
		});

		it('includes topic and created fields', () => {
			const result = createSessionFile('auth-flow', '2026-03-10T10:00:00+01:00');
			expect(result).toContain('topic: auth-flow');
			expect(result).toContain('created: 2026-03-10T10:00:00+01:00');
		});
	});

	describe('appendBlock', () => {
		it('adds block to empty file (after frontmatter)', () => {
			const result = appendBlock(FRONTMATTER, BLOCK_1, '## 2026-03-10 16:57');
			expect(result).toContain('## 2026-03-10 16:57');
			expect(result).toContain(BLOCK_1);
		});

		it('adds block to file with existing blocks', () => {
			const first = appendBlock(FRONTMATTER, BLOCK_1, '## 2026-03-10 16:57');
			const second = appendBlock(first, BLOCK_2, '## 2026-03-11 19:42');
			expect(second).toContain('## 2026-03-10 16:57');
			expect(second).toContain('## 2026-03-11 19:42');
			expect(second).toContain(BLOCK_2);
		});

		it('adds blank line separator between blocks', () => {
			const first = appendBlock(FRONTMATTER, BLOCK_1, '## 2026-03-10 16:57');
			const second = appendBlock(first, BLOCK_2, '## 2026-03-11 19:42');
			expect(second).toContain('\n\n## 2026-03-11 19:42');
		});
	});

	describe('parseBlocks', () => {
		function buildFile(...blocks: [string, string][]): string {
			let content = FRONTMATTER;
			for (const [header, body] of blocks) {
				content = appendBlock(content, body, header);
			}
			return content;
		}

		it('returns empty array for file with no blocks', () => {
			expect(parseBlocks(FRONTMATTER)).toEqual([]);
		});

		it('parses single block correctly', () => {
			const file = buildFile(['## 2026-03-10 16:57', BLOCK_1]);
			const blocks = parseBlocks(file);
			expect(blocks).toHaveLength(1);
		});

		it('parses multiple blocks correctly', () => {
			const file = buildFile(
				['## 2026-03-10 16:57', BLOCK_1],
				['## 2026-03-11 19:42', BLOCK_2],
			);
			const blocks = parseBlocks(file);
			expect(blocks).toHaveLength(2);
		});

		it('extracts timestamp from header', () => {
			const file = buildFile(['## 2026-03-10 16:57', BLOCK_1]);
			const blocks = parseBlocks(file);
			expect(blocks[0]!.timestamp.getFullYear()).toBe(2026);
			expect(blocks[0]!.timestamp.getMonth()).toBe(2);
			expect(blocks[0]!.timestamp.getDate()).toBe(10);
			expect(blocks[0]!.timestamp.getHours()).toBe(16);
			expect(blocks[0]!.timestamp.getMinutes()).toBe(57);
		});

		it('extracts constats as array of strings', () => {
			const file = buildFile(['## 2026-03-10 16:57', BLOCK_1]);
			const blocks = parseBlocks(file);
			expect(blocks[0]!.constats).toEqual(['The projection logic exists in 3 MSW files']);
		});

		it('extracts decisions as array of strings', () => {
			const file = buildFile(['## 2026-03-10 16:57', BLOCK_1]);
			const blocks = parseBlocks(file);
			expect(blocks[0]!.decisions).toEqual(['Implementation plan in 9 steps']);
		});

		it('handles block with only constat', () => {
			const constatOnly = `### Constat\n- Only an observation`;
			const file = buildFile(['## 2026-03-10 16:57', constatOnly]);
			const blocks = parseBlocks(file);
			expect(blocks[0]!.constats).toHaveLength(1);
			expect(blocks[0]!.decisions).toHaveLength(0);
		});

		it('handles block with only decision', () => {
			const decisionOnly = `### Decision\n- Only a choice`;
			const file = buildFile(['## 2026-03-10 16:57', decisionOnly]);
			const blocks = parseBlocks(file);
			expect(blocks[0]!.constats).toHaveLength(0);
			expect(blocks[0]!.decisions).toHaveLength(1);
		});

		it('preserves raw text of each block', () => {
			const file = buildFile(['## 2026-03-10 16:57', BLOCK_1]);
			const blocks = parseBlocks(file);
			expect(blocks[0]!.raw).toBe(BLOCK_1);
		});
	});

	describe('getLastNBlocks', () => {
		function buildFile(...blocks: [string, string][]): string {
			let content = FRONTMATTER;
			for (const [header, body] of blocks) {
				content = appendBlock(content, body, header);
			}
			return content;
		}

		it('returns last N blocks', () => {
			const file = buildFile(
				['## 2026-03-10 16:57', BLOCK_1],
				['## 2026-03-11 19:42', BLOCK_2],
			);
			const result = getLastNBlocks(file, 1);
			expect(result).toContain('## 2026-03-11 19:42');
			expect(result).not.toContain('## 2026-03-10 16:57');
		});

		it('returns all blocks if N > total', () => {
			const file = buildFile(['## 2026-03-10 16:57', BLOCK_1]);
			const result = getLastNBlocks(file, 10);
			expect(result).toContain('## 2026-03-10 16:57');
			expect(result).toContain(BLOCK_1);
		});

		it('returns empty string if no blocks', () => {
			expect(getLastNBlocks(FRONTMATTER, 5)).toBe('');
		});
	});

	describe('countBlockStats', () => {
		it('counts correctly', () => {
			const file = appendBlock(FRONTMATTER, BLOCK_1, '## 2026-03-10 16:57');
			const blocks = parseBlocks(file);
			const stats = countBlockStats(blocks[0]!);
			expect(stats).toEqual({ constats: 1, decisions: 1 });
		});
	});

	describe('removeLastNBlocks', () => {
		function buildFile(...blocks: [string, string][]): string {
			let content = FRONTMATTER;
			for (const [header, body] of blocks) {
				content = appendBlock(content, body, header);
			}
			return content;
		}

		it('removes the last block', () => {
			const file = buildFile(
				['## 2026-03-10 16:57', BLOCK_1],
				['## 2026-03-11 19:42', BLOCK_2],
			);
			const result = removeLastNBlocks(file, 1);
			const blocks = parseBlocks(result);
			expect(blocks).toHaveLength(1);
			expect(blocks[0]!.raw).toBe(BLOCK_1);
		});

		it('removes multiple blocks', () => {
			const file = buildFile(
				['## 2026-03-10 16:57', BLOCK_1],
				['## 2026-03-11 19:42', BLOCK_2],
			);
			const result = removeLastNBlocks(file, 2);
			const blocks = parseBlocks(result);
			expect(blocks).toHaveLength(0);
		});

		it('preserves frontmatter when all blocks removed', () => {
			const file = buildFile(['## 2026-03-10 16:57', BLOCK_1]);
			const result = removeLastNBlocks(file, 1);
			expect(result).toContain('topic: planning');
			expect(result).toContain('tags: []');
			const blocks = parseBlocks(result);
			expect(blocks).toHaveLength(0);
		});

		it('handles N greater than block count', () => {
			const file = buildFile(['## 2026-03-10 16:57', BLOCK_1]);
			const result = removeLastNBlocks(file, 10);
			const blocks = parseBlocks(result);
			expect(blocks).toHaveLength(0);
		});
	});
});
