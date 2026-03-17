import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
	findAgentsFiles,
	hasExistingDlrSection,
	appendDlrSection,
	createAgentsFile,
} from './agents_file.js';

function makeTmpDir(): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), 'dlr-agents-test-'));
}

function touch(filePath: string, content = '# AGENTS\n'): void {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, content, 'utf-8');
}

describe('findAgentsFiles', () => {
	let tmpDir: string;
	let fakeHome: string;
	let cwd: string;

	beforeEach(() => {
		tmpDir = makeTmpDir();
		fakeHome = path.join(tmpDir, 'home');
		cwd = path.join(tmpDir, 'project');
		fs.mkdirSync(fakeHome, { recursive: true });
		fs.mkdirSync(cwd, { recursive: true });
		vi.spyOn(os, 'homedir').mockReturnValue(fakeHome);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it('finds AGENTS.md at project root', () => {
		touch(path.join(cwd, 'AGENTS.md'));

		const result = findAgentsFiles(cwd);

		expect(result).toEqual([path.join(cwd, 'AGENTS.md')]);
	});

	it('finds AGENTS.md in subdirectories', () => {
		touch(path.join(cwd, 'docs', 'AGENTS.md'));

		const result = findAgentsFiles(cwd);

		expect(result).toEqual([path.join(cwd, 'docs', 'AGENTS.md')]);
	});

	it('finds AGENTS.md in hidden directories like .github/', () => {
		touch(path.join(cwd, '.github', 'AGENTS.md'));

		const result = findAgentsFiles(cwd);

		expect(result).toEqual([path.join(cwd, '.github', 'AGENTS.md')]);
	});

	it('finds AGENTS.md up to depth 3', () => {
		touch(path.join(cwd, 'a', 'b', 'c', 'AGENTS.md'));

		const result = findAgentsFiles(cwd);

		expect(result).toEqual([path.join(cwd, 'a', 'b', 'c', 'AGENTS.md')]);
	});

	it('does not find AGENTS.md beyond depth 3', () => {
		touch(path.join(cwd, 'a', 'b', 'c', 'd', 'AGENTS.md'));

		const result = findAgentsFiles(cwd);

		expect(result).toEqual([]);
	});

	it('ignores node_modules/', () => {
		touch(path.join(cwd, 'node_modules', 'some-pkg', 'AGENTS.md'));

		const result = findAgentsFiles(cwd);

		expect(result).toEqual([]);
	});

	it('ignores .git/', () => {
		touch(path.join(cwd, '.git', 'AGENTS.md'));

		const result = findAgentsFiles(cwd);

		expect(result).toEqual([]);
	});

	it('finds AGENTS.md in ~/.config/*/AGENTS.md', () => {
		touch(path.join(fakeHome, '.config', 'opencode', 'AGENTS.md'));

		const result = findAgentsFiles(cwd);

		expect(result).toEqual([path.join(fakeHome, '.config', 'opencode', 'AGENTS.md')]);
	});

	it('finds AGENTS.md in ~/.cursor/AGENTS.md', () => {
		touch(path.join(fakeHome, '.cursor', 'AGENTS.md'));

		const result = findAgentsFiles(cwd);

		expect(result).toEqual([path.join(fakeHome, '.cursor', 'AGENTS.md')]);
	});

	it('finds AGENTS.md in ~/.claude/AGENTS.md', () => {
		touch(path.join(fakeHome, '.claude', 'AGENTS.md'));

		const result = findAgentsFiles(cwd);

		expect(result).toEqual([path.join(fakeHome, '.claude', 'AGENTS.md')]);
	});

	it('finds AGENTS.md in ~/AGENTS.md', () => {
		touch(path.join(fakeHome, 'AGENTS.md'));

		const result = findAgentsFiles(cwd);

		expect(result).toEqual([path.join(fakeHome, 'AGENTS.md')]);
	});

	it('returns results in priority order: cwd > config > cursor > claude > home', () => {
		touch(path.join(cwd, 'AGENTS.md'));
		touch(path.join(fakeHome, '.config', 'opencode', 'AGENTS.md'));
		touch(path.join(fakeHome, '.cursor', 'AGENTS.md'));
		touch(path.join(fakeHome, '.claude', 'AGENTS.md'));
		touch(path.join(fakeHome, 'AGENTS.md'));

		const result = findAgentsFiles(cwd);

		expect(result).toEqual([
			path.join(cwd, 'AGENTS.md'),
			path.join(fakeHome, '.config', 'opencode', 'AGENTS.md'),
			path.join(fakeHome, '.cursor', 'AGENTS.md'),
			path.join(fakeHome, '.claude', 'AGENTS.md'),
			path.join(fakeHome, 'AGENTS.md'),
		]);
	});

	it('deduplicates results', () => {
		touch(path.join(cwd, 'AGENTS.md'));

		const result = findAgentsFiles(cwd);
		const unique = [...new Set(result)];

		expect(result).toEqual(unique);
	});

	it('returns empty array when no files found', () => {
		const result = findAgentsFiles(cwd);

		expect(result).toEqual([]);
	});

	it('handles missing ~/.config directory gracefully', () => {
		const result = findAgentsFiles(cwd);

		expect(result).toEqual([]);
	});

	it('finds multiple AGENTS.md in different config dirs', () => {
		touch(path.join(fakeHome, '.config', 'opencode', 'AGENTS.md'));
		touch(path.join(fakeHome, '.config', 'claude', 'AGENTS.md'));

		const result = findAgentsFiles(cwd);

		expect(result).toContain(path.join(fakeHome, '.config', 'opencode', 'AGENTS.md'));
		expect(result).toContain(path.join(fakeHome, '.config', 'claude', 'AGENTS.md'));
	});
});

describe('hasExistingDlrSection', () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = makeTmpDir();
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it('returns true when DLR section marker is present', () => {
		const filePath = path.join(tmpDir, 'AGENTS.md');
		fs.writeFileSync(filePath, '# Agents\n\n## DLR — Decision Log & Reflect\n\nSome content\n');

		expect(hasExistingDlrSection(filePath)).toBe(true);
	});

	it('returns false when DLR section marker is absent', () => {
		const filePath = path.join(tmpDir, 'AGENTS.md');
		fs.writeFileSync(filePath, '# Agents\n\nSome content\n');

		expect(hasExistingDlrSection(filePath)).toBe(false);
	});
});

describe('appendDlrSection', () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = makeTmpDir();
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it('appends snippet to existing content with separator', () => {
		const filePath = path.join(tmpDir, 'AGENTS.md');
		fs.writeFileSync(filePath, '# Existing content\n');

		appendDlrSection(filePath, '## DLR Section');

		const content = fs.readFileSync(filePath, 'utf-8');
		expect(content).toBe('# Existing content\n\n## DLR Section\n');
	});

	it('appends snippet to empty file without extra separator', () => {
		const filePath = path.join(tmpDir, 'AGENTS.md');
		fs.writeFileSync(filePath, '');

		appendDlrSection(filePath, '## DLR Section');

		const content = fs.readFileSync(filePath, 'utf-8');
		expect(content).toBe('## DLR Section\n');
	});
});

describe('createAgentsFile', () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = makeTmpDir();
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it('creates file with header comment and snippet', () => {
		const filePath = path.join(tmpDir, 'AGENTS.md');

		createAgentsFile(filePath, '## DLR Section');

		const content = fs.readFileSync(filePath, 'utf-8');
		expect(content).toContain('Generated by dlr init');
		expect(content).toContain('## DLR Section');
	});
});
