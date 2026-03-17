import { describe, it, expect } from 'vitest';
import { validateBlockContent } from './validator.js';

describe('validator', () => {
	it('validates block with both constat and decision', () => {
		const content = `### Constat
- observation one

### Decision
- choice made`;
		const result = validateBlockContent(content);
		expect(result.valid).toBe(true);
		expect(result.constats).toBe(1);
		expect(result.decisions).toBe(1);
	});

	it('validates block with only constat', () => {
		const content = `### Constat
- observation one`;
		const result = validateBlockContent(content);
		expect(result.valid).toBe(true);
		expect(result.constats).toBe(1);
		expect(result.decisions).toBe(0);
	});

	it('validates block with only decision', () => {
		const content = `### Decision
- choice made`;
		const result = validateBlockContent(content);
		expect(result.valid).toBe(true);
		expect(result.constats).toBe(0);
		expect(result.decisions).toBe(1);
	});

	it('rejects block with no section headers', () => {
		const content = `just some text without sections`;
		const result = validateBlockContent(content);
		expect(result.valid).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('rejects empty content', () => {
		const result = validateBlockContent('');
		expect(result.valid).toBe(false);
		expect(result.error).toBe('No content received on stdin.');
	});

	it('counts multiple constats correctly', () => {
		const content = `### Constat
- first observation
- second observation
- third observation`;
		const result = validateBlockContent(content);
		expect(result.constats).toBe(3);
	});

	it('counts multiple decisions correctly', () => {
		const content = `### Decision
- first choice
- second choice`;
		const result = validateBlockContent(content);
		expect(result.decisions).toBe(2);
	});

	it('handles multi-line bullet points', () => {
		const content = `### Constat
- first observation that spans
  across multiple lines
- second observation`;
		const result = validateBlockContent(content);
		expect(result.constats).toBe(2);
	});

	it('rejects content with section headers but no bullet points', () => {
		const content = `### Constat
some text without bullet points

### Decision
also no bullets here`;
		const result = validateBlockContent(content);
		expect(result.valid).toBe(false);
		expect(result.error).toContain('bullet point');
	});
});
