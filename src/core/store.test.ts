import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
	getDlrRoot,
	setDlrRootOverride,
	resolveProject,
	initProject,
	listSessionFiles,
	readSessionFile,
	writeSessionFile,
} from './store.js';

function makeTmpDir(): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), 'dlr-test-'));
}

describe('store', () => {
	let tmpDir: string;
	let dlrRoot: string;

	beforeEach(() => {
		tmpDir = makeTmpDir();
		dlrRoot = path.join(tmpDir, '.dlr');
		setDlrRootOverride(dlrRoot);
	});

	afterEach(() => {
		setDlrRootOverride(null);
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	describe('getDlrRoot', () => {
		it('creates the directory if missing', () => {
			expect(fs.existsSync(dlrRoot)).toBe(false);
			const result = getDlrRoot();
			expect(result).toBe(dlrRoot);
			expect(fs.existsSync(dlrRoot)).toBe(true);
		});
	});

	describe('initProject', () => {
		it('creates .dlr-project with correct content', () => {
			const cwd = path.join(tmpDir, 'myapp');
			fs.mkdirSync(cwd, { recursive: true });

			initProject(cwd, 'myapp');

			const content = fs.readFileSync(path.join(cwd, '.dlr-project'), 'utf-8');
			expect(content.trim()).toBe('myapp');
		});

		it('creates the full directory structure', () => {
			const cwd = path.join(tmpDir, 'myapp');
			fs.mkdirSync(cwd, { recursive: true });

			const paths = initProject(cwd, 'myapp');

			expect(fs.existsSync(paths.project)).toBe(true);
			expect(fs.existsSync(paths.sessions)).toBe(true);
		});

		it('creates meta.yaml with correct fields', () => {
			const cwd = path.join(tmpDir, 'myapp');
			fs.mkdirSync(cwd, { recursive: true });

			const paths = initProject(cwd, 'myapp');
			const metaPath = path.join(paths.project, 'meta.yaml');
			const content = fs.readFileSync(metaPath, 'utf-8');

			expect(content).toContain('name: myapp');
			expect(content).toContain('createdAt:');
		});

		it('is idempotent (running twice does not fail)', () => {
			const cwd = path.join(tmpDir, 'myapp');
			fs.mkdirSync(cwd, { recursive: true });

			initProject(cwd, 'myapp');
			expect(() => initProject(cwd, 'myapp')).not.toThrow();
		});
	});

	describe('resolveProject', () => {
		it('finds .dlr-project in current directory', () => {
			const cwd = path.join(tmpDir, 'myapp');
			fs.mkdirSync(cwd, { recursive: true });
			initProject(cwd, 'myapp');

			const result = resolveProject(cwd);
			expect(result).not.toBeNull();
			expect(result!.projectName).toBe('myapp');
		});

		it('finds .dlr-project in parent directory', () => {
			const cwd = path.join(tmpDir, 'myapp');
			fs.mkdirSync(cwd, { recursive: true });
			initProject(cwd, 'myapp');

			const child = path.join(cwd, 'src');
			fs.mkdirSync(child, { recursive: true });

			const result = resolveProject(child);
			expect(result).not.toBeNull();
			expect(result!.projectName).toBe('myapp');
		});

		it('finds .dlr-project in grandparent directory', () => {
			const cwd = path.join(tmpDir, 'myapp');
			fs.mkdirSync(cwd, { recursive: true });
			initProject(cwd, 'myapp');

			const grandchild = path.join(cwd, 'src', 'components');
			fs.mkdirSync(grandchild, { recursive: true });

			const result = resolveProject(grandchild);
			expect(result).not.toBeNull();
			expect(result!.projectName).toBe('myapp');
		});

		it('returns null when no .dlr-project exists', () => {
			const cwd = path.join(tmpDir, 'orphan');
			fs.mkdirSync(cwd, { recursive: true });

			const result = resolveProject(cwd);
			expect(result).toBeNull();
		});
	});

	describe('listSessionFiles', () => {
		it('returns empty array when no sessions', () => {
			const cwd = path.join(tmpDir, 'myapp');
			fs.mkdirSync(cwd, { recursive: true });
			const paths = initProject(cwd, 'myapp');

			expect(listSessionFiles(paths)).toEqual([]);
		});

		it('returns topics for existing files', () => {
			const cwd = path.join(tmpDir, 'myapp');
			fs.mkdirSync(cwd, { recursive: true });
			const paths = initProject(cwd, 'myapp');

			fs.writeFileSync(path.join(paths.sessions, 'planning.md'), '# test', 'utf-8');
			fs.writeFileSync(path.join(paths.sessions, 'auth-flow.md'), '# test', 'utf-8');

			const topics = listSessionFiles(paths);
			expect(topics.sort()).toEqual(['auth-flow', 'planning']);
		});
	});

	describe('readSessionFile', () => {
		it('returns null for non-existent file', () => {
			const cwd = path.join(tmpDir, 'myapp');
			fs.mkdirSync(cwd, { recursive: true });
			const paths = initProject(cwd, 'myapp');

			expect(readSessionFile(paths, 'nonexistent')).toBeNull();
		});

		it('returns content for existing file', () => {
			const cwd = path.join(tmpDir, 'myapp');
			fs.mkdirSync(cwd, { recursive: true });
			const paths = initProject(cwd, 'myapp');

			fs.writeFileSync(path.join(paths.sessions, 'planning.md'), 'hello world', 'utf-8');
			expect(readSessionFile(paths, 'planning')).toBe('hello world');
		});
	});

	describe('writeSessionFile', () => {
		it('creates the file if it does not exist', () => {
			const cwd = path.join(tmpDir, 'myapp');
			fs.mkdirSync(cwd, { recursive: true });
			const paths = initProject(cwd, 'myapp');

			writeSessionFile(paths, 'planning', 'new content');

			const filePath = path.join(paths.sessions, 'planning.md');
			expect(fs.existsSync(filePath)).toBe(true);
			expect(fs.readFileSync(filePath, 'utf-8')).toBe('new content');
		});

		it('overwrites existing content', () => {
			const cwd = path.join(tmpDir, 'myapp');
			fs.mkdirSync(cwd, { recursive: true });
			const paths = initProject(cwd, 'myapp');

			writeSessionFile(paths, 'planning', 'first');
			writeSessionFile(paths, 'planning', 'second');

			const filePath = path.join(paths.sessions, 'planning.md');
			expect(fs.readFileSync(filePath, 'utf-8')).toBe('second');
		});
	});
});
