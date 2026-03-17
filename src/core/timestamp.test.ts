import { describe, it, expect } from 'vitest';
import {
	generateTimestamp,
	generateTimestampHeader,
	parseTimestamp,
	generateISOTimestamp,
} from './timestamp.js';

describe('timestamp', () => {
	const fixedDate = new Date(2026, 2, 10, 16, 57, 0);

	describe('generateTimestamp', () => {
		it('formats correctly', () => {
			const result = generateTimestamp(fixedDate);
			expect(result).toBe('2026-03-10 16:57');
		});

		it('works with explicit date', () => {
			const date = new Date(2025, 0, 1, 9, 5, 0);
			expect(generateTimestamp(date)).toBe('2025-01-01 09:05');
		});
	});

	describe('generateTimestampHeader', () => {
		it('prepends ## ', () => {
			const result = generateTimestampHeader(fixedDate);
			expect(result).toBe('## 2026-03-10 16:57');
		});
	});

	describe('parseTimestamp', () => {
		it('parses valid header', () => {
			const result = parseTimestamp('## 2026-03-10 16:57');
			expect(result).not.toBeNull();
			expect(result!.getFullYear()).toBe(2026);
			expect(result!.getMonth()).toBe(2);
			expect(result!.getDate()).toBe(10);
			expect(result!.getHours()).toBe(16);
			expect(result!.getMinutes()).toBe(57);
		});

		it('returns null for invalid input', () => {
			expect(parseTimestamp('not a timestamp')).toBeNull();
		});

		it('returns null for non-timestamp h2 headers', () => {
			expect(parseTimestamp('## Some Section')).toBeNull();
			expect(parseTimestamp('## Constat')).toBeNull();
		});
	});

	describe('generateISOTimestamp', () => {
		it('includes timezone offset', () => {
			const result = generateISOTimestamp(fixedDate);
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
			expect(result).toContain('2026-03-10T16:57:00');
		});
	});
});
