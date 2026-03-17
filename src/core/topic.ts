import { getCurrentBranch, branchToTopic } from './git.js';

const KEBAB_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidTopic(topic: string): boolean {
	return KEBAB_RE.test(topic);
}

export type ResolveTopicResult =
	| { ok: true; topic: string; fromBranch: boolean }
	| { ok: false; error: string };

export function resolveTopic(explicit: string | undefined, cwd: string): ResolveTopicResult {
	if (explicit !== undefined) {
		if (!isValidTopic(explicit)) {
			return { ok: false, error: `Invalid topic "${explicit}". Topics must be kebab-case (e.g., "auth-flow", "planning").` };
		}
		return { ok: true, topic: explicit, fromBranch: false };
	}

	const branch = getCurrentBranch(cwd);
	if (branch === null) {
		return { ok: false, error: 'No topic provided and not in a git repository. Provide a topic explicitly.' };
	}

	const topic = branchToTopic(branch);
	if (!isValidTopic(topic)) {
		return { ok: false, error: `Could not derive a valid topic from branch "${branch}". Provide a topic explicitly.` };
	}

	return { ok: true, topic, fromBranch: true };
}
