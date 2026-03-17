import { describe, it, expect } from 'vitest';
import { branchToTopic } from './git.js';

describe('branchToTopic', () => {
	it('strips feat/ prefix', () => {
		expect(branchToTopic('feat/auth-flow')).toBe('auth-flow');
	});

	it('strips fix/ prefix', () => {
		expect(branchToTopic('fix/login-bug')).toBe('login-bug');
	});

	it('strips feature/ prefix', () => {
		expect(branchToTopic('feature/new-dashboard')).toBe('new-dashboard');
	});

	it('strips bugfix/ prefix', () => {
		expect(branchToTopic('bugfix/null-pointer')).toBe('null-pointer');
	});

	it('strips hotfix/ prefix', () => {
		expect(branchToTopic('hotfix/critical-fix')).toBe('critical-fix');
	});

	it('strips chore/ prefix', () => {
		expect(branchToTopic('chore/update-deps')).toBe('update-deps');
	});

	it('strips refactor/ prefix', () => {
		expect(branchToTopic('refactor/store-module')).toBe('store-module');
	});

	it('keeps main as-is', () => {
		expect(branchToTopic('main')).toBe('main');
	});

	it('keeps develop as-is', () => {
		expect(branchToTopic('develop')).toBe('develop');
	});

	it('replaces slashes with dashes', () => {
		expect(branchToTopic('user/john/my-branch')).toBe('user-john-my-branch');
	});

	it('removes invalid characters', () => {
		expect(branchToTopic('feat/my_branch@v2')).toBe('my-branchv2');
	});

	it('collapses multiple dashes', () => {
		expect(branchToTopic('feat/my--branch')).toBe('my-branch');
	});

	it('trims leading and trailing dashes', () => {
		expect(branchToTopic('feat/-my-branch-')).toBe('my-branch');
	});

	it('handles simple branch names', () => {
		expect(branchToTopic('planning')).toBe('planning');
	});
});
