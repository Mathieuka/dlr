import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CLI = path.resolve('dist/cli.js');

function makeTmpDir(): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), 'dlr-integ-'));
}

function run(
	cmd: string,
	opts: { cwd: string; env?: Record<string, string>; input?: string },
): { stdout: string; stderr: string; exitCode: number } {
	try {
		const stdout = execSync(cmd, {
			cwd: opts.cwd,
			env: { ...process.env, HOME: opts.env?.HOME ?? os.homedir(), ...opts.env },
			input: opts.input,
			encoding: 'utf-8',
			stdio: ['pipe', 'pipe', 'pipe'],
		});
		return { stdout, stderr: '', exitCode: 0 };
	} catch (err: unknown) {
		const e = err as { stdout?: string; stderr?: string; status?: number };
		return {
			stdout: e.stdout ?? '',
			stderr: e.stderr ?? '',
			exitCode: e.status ?? 1,
		};
	}
}

describe('integration', () => {
	let tmpDir: string;
	let homeDir: string;
	let projectDir: string;

	beforeEach(() => {
		tmpDir = makeTmpDir();
		homeDir = path.join(tmpDir, 'home');
		projectDir = path.join(tmpDir, 'project');
		fs.mkdirSync(homeDir, { recursive: true });
		fs.mkdirSync(projectDir, { recursive: true });
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	const env = () => ({ HOME: homeDir });
	const nodeCmd = (args: string) => `node ${CLI} ${args}`;

	const VALID_BLOCK = `### Constat
- observation one

### Decision
- choice made`;

	it('full workflow: init → persist → reflect → verify content matches', () => {
		run(nodeCmd('init --name test-proj'), { cwd: projectDir, env: env() });

		run(nodeCmd('persist planning'), {
			cwd: projectDir,
			env: env(),
			input: VALID_BLOCK,
		});

		const { stdout, exitCode } = run(nodeCmd('reflect planning'), {
			cwd: projectDir,
			env: env(),
		});

		expect(exitCode).toBe(0);
		expect(stdout).toContain('observation one');
		expect(stdout).toContain('choice made');
		expect(stdout).toContain('topic: planning');
	});

	it('full workflow: init → persist twice → reflect --last 1 → only last block', () => {
		run(nodeCmd('init --name test-proj'), { cwd: projectDir, env: env() });

		run(nodeCmd('persist planning'), {
			cwd: projectDir,
			env: env(),
			input: `### Constat\n- first observation`,
		});

		run(nodeCmd('persist planning'), {
			cwd: projectDir,
			env: env(),
			input: `### Constat\n- second observation`,
		});

		const { stdout } = run(nodeCmd('reflect planning --last 1'), {
			cwd: projectDir,
			env: env(),
		});

		expect(stdout).toContain('second observation');
		expect(stdout).not.toContain('first observation');
	});

	it('full workflow: init → persist to 2 topics → log → both appear sorted', () => {
		run(nodeCmd('init --name test-proj'), { cwd: projectDir, env: env() });

		run(nodeCmd('persist planning'), {
			cwd: projectDir,
			env: env(),
			input: `### Constat\n- planning obs`,
		});

		run(nodeCmd('persist auth-flow'), {
			cwd: projectDir,
			env: env(),
			input: `### Decision\n- auth choice`,
		});

		const { stdout, exitCode } = run(nodeCmd('log'), {
			cwd: projectDir,
			env: env(),
		});

		expect(exitCode).toBe(0);
		expect(stdout).toContain('planning');
		expect(stdout).toContain('auth-flow');
	});

	it('full workflow: init → persist to 2 topics → topics → both listed', () => {
		run(nodeCmd('init --name test-proj'), { cwd: projectDir, env: env() });

		run(nodeCmd('persist planning'), {
			cwd: projectDir,
			env: env(),
			input: `### Constat\n- planning obs`,
		});

		run(nodeCmd('persist auth-flow'), {
			cwd: projectDir,
			env: env(),
			input: `### Decision\n- auth choice`,
		});

		const { stdout, exitCode } = run(nodeCmd('topics'), {
			cwd: projectDir,
			env: env(),
		});

		expect(exitCode).toBe(0);
		expect(stdout).toContain('planning');
		expect(stdout).toContain('auth-flow');
		expect(stdout).toContain('1 block');
	});

	it('persist without init → exit code 1, helpful error', () => {
		const { stderr, exitCode } = run(nodeCmd('persist planning'), {
			cwd: projectDir,
			env: env(),
			input: VALID_BLOCK,
		});

		expect(exitCode).toBe(1);
		expect(stderr).toContain('dlr init');
	});

	it('reflect non-existent topic → exit code 1, error on stderr', () => {
		run(nodeCmd('init --name test-proj'), { cwd: projectDir, env: env() });

		const { stderr, exitCode } = run(nodeCmd('reflect nonexistent'), {
			cwd: projectDir,
			env: env(),
		});

		expect(exitCode).toBe(1);
		expect(stderr).toContain('nonexistent');
	});

	it('persist with invalid stdin (no sections) → exit code 1', () => {
		run(nodeCmd('init --name test-proj'), { cwd: projectDir, env: env() });

		const { stderr, exitCode } = run(nodeCmd('persist planning'), {
			cwd: projectDir,
			env: env(),
			input: 'just some text without sections',
		});

		expect(exitCode).toBe(1);
		expect(stderr).toContain('Constat');
	});

	it('persist with empty stdin → exit code 1', () => {
		run(nodeCmd('init --name test-proj'), { cwd: projectDir, env: env() });

		const { stderr, exitCode } = run(nodeCmd('persist planning'), {
			cwd: projectDir,
			env: env(),
			input: '',
		});

		expect(exitCode).toBe(1);
		expect(stderr).toContain('No content');
	});

	it('init twice in same directory → idempotent success', () => {
		run(nodeCmd('init --name test-proj'), { cwd: projectDir, env: env() });

		const { stdout, exitCode } = run(nodeCmd('init --name test-proj'), {
			cwd: projectDir,
			env: env(),
		});

		expect(exitCode).toBe(0);
		expect(stdout).toContain('Regenerated .dlr-project');
	});

	it('timestamp is auto-generated (not in stdin, appears in file)', () => {
		run(nodeCmd('init --name test-proj'), { cwd: projectDir, env: env() });

		run(nodeCmd('persist planning'), {
			cwd: projectDir,
			env: env(),
			input: `### Constat\n- observation`,
		});

		const { stdout } = run(nodeCmd('reflect planning'), {
			cwd: projectDir,
			env: env(),
		});

		expect(stdout).toMatch(/## \d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
	});

	it('session file has correct frontmatter on first persist', () => {
		run(nodeCmd('init --name test-proj'), { cwd: projectDir, env: env() });

		run(nodeCmd('persist planning'), {
			cwd: projectDir,
			env: env(),
			input: `### Constat\n- observation`,
		});

		const { stdout } = run(nodeCmd('reflect planning'), {
			cwd: projectDir,
			env: env(),
		});

		expect(stdout).toContain('topic: planning');
		expect(stdout).toContain('created:');
		expect(stdout).toContain('tags: []');
	});

	it('init without --name uses directory name as project name', () => {
		const namedDir = path.join(tmpDir, 'my-cool-project');
		fs.mkdirSync(namedDir, { recursive: true });

		const { stdout, exitCode } = run(nodeCmd('init'), {
			cwd: namedDir,
			env: env(),
		});

		expect(exitCode).toBe(0);
		expect(stdout).toContain('my-cool-project');
	});

	it('init with --name uses the provided name', () => {
		const { stdout, exitCode } = run(nodeCmd('init --name custom-name'), {
			cwd: projectDir,
			env: env(),
		});

		expect(exitCode).toBe(0);
		expect(stdout).toContain('custom-name');
	});

	it('undo without --confirm → exit code 1', () => {
		run(nodeCmd('init --name test-proj'), { cwd: projectDir, env: env() });
		run(nodeCmd('persist planning'), {
			cwd: projectDir,
			env: env(),
			input: `### Constat\n- observation`,
		});

		const { stderr, exitCode } = run(nodeCmd('undo planning'), {
			cwd: projectDir,
			env: env(),
		});

		expect(exitCode).toBe(1);
		expect(stderr).toContain('--confirm');
	});

	it('undo --confirm removes the last block', () => {
		run(nodeCmd('init --name test-proj'), { cwd: projectDir, env: env() });

		run(nodeCmd('persist planning'), {
			cwd: projectDir,
			env: env(),
			input: `### Constat\n- first observation`,
		});

		run(nodeCmd('persist planning'), {
			cwd: projectDir,
			env: env(),
			input: `### Constat\n- second observation`,
		});

		const { stdout, exitCode } = run(nodeCmd('undo planning --confirm'), {
			cwd: projectDir,
			env: env(),
		});

		expect(exitCode).toBe(0);
		expect(stdout).toContain('Removed 1 block');

		const { stdout: reflected } = run(nodeCmd('reflect planning'), {
			cwd: projectDir,
			env: env(),
		});

		expect(reflected).toContain('first observation');
		expect(reflected).not.toContain('second observation');
	});

	it('undo --last 2 --confirm removes multiple blocks', () => {
		run(nodeCmd('init --name test-proj'), { cwd: projectDir, env: env() });

		run(nodeCmd('persist planning'), {
			cwd: projectDir,
			env: env(),
			input: `### Constat\n- first`,
		});

		run(nodeCmd('persist planning'), {
			cwd: projectDir,
			env: env(),
			input: `### Constat\n- second`,
		});

		const { stdout, exitCode } = run(nodeCmd('undo planning --last 2 --confirm'), {
			cwd: projectDir,
			env: env(),
		});

		expect(exitCode).toBe(0);
		expect(stdout).toContain('Removed 2 blocks');
		expect(stdout).toContain('0 remaining');
	});

	it('delete topic without --confirm → exit code 1', () => {
		run(nodeCmd('init --name test-proj'), { cwd: projectDir, env: env() });
		run(nodeCmd('persist planning'), {
			cwd: projectDir,
			env: env(),
			input: `### Constat\n- observation`,
		});

		const { stderr, exitCode } = run(nodeCmd('delete topic planning'), {
			cwd: projectDir,
			env: env(),
		});

		expect(exitCode).toBe(1);
		expect(stderr).toContain('--confirm');
	});

	it('delete topic --confirm removes the topic', () => {
		run(nodeCmd('init --name test-proj'), { cwd: projectDir, env: env() });
		run(nodeCmd('persist planning'), {
			cwd: projectDir,
			env: env(),
			input: `### Constat\n- observation`,
		});

		const { stdout, exitCode } = run(nodeCmd('delete topic planning --confirm'), {
			cwd: projectDir,
			env: env(),
		});

		expect(exitCode).toBe(0);
		expect(stdout).toContain("Deleted topic 'planning'");

		const { exitCode: reflectCode } = run(nodeCmd('reflect planning'), {
			cwd: projectDir,
			env: env(),
		});
		expect(reflectCode).toBe(1);
	});

	it('delete project --confirm removes the project from store', () => {
		run(nodeCmd('init --name test-proj'), { cwd: projectDir, env: env() });

		const { stdout, exitCode } = run(nodeCmd('delete project test-proj --confirm'), {
			cwd: projectDir,
			env: env(),
		});

		expect(exitCode).toBe(0);
		expect(stdout).toContain("Deleted project 'test-proj'");
	});
});
