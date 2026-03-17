import { execSync } from 'node:child_process';

export function getCurrentBranch(cwd: string): string | null {
	try {
		return execSync('git branch --show-current', {
			cwd,
			encoding: 'utf-8',
			stdio: ['pipe', 'pipe', 'pipe'],
		}).trim() || null;
	} catch {
		return null;
	}
}

const BRANCH_PREFIXES = /^(?:feat|fix|feature|bugfix|hotfix|chore|refactor|docs|test|ci|build|perf|style|revert)\//;

export function branchToTopic(branch: string): string {
	return branch
		.replace(BRANCH_PREFIXES, '')
		.replace(/[/_]/g, '-')
		.replace(/[^a-z0-9-]/g, '')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.toLowerCase();
}
