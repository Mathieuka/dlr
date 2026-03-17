import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { DlrPaths } from '../types.js';

let dlrRootOverride: string | null = null;

export function setDlrRootOverride(root: string | null): void {
	dlrRootOverride = root;
}

export function getDlrRoot(): string {
	const root = dlrRootOverride ?? path.join(os.homedir(), '.dlr');
	if (!fs.existsSync(root)) {
		fs.mkdirSync(root, { recursive: true });
	}
	return root;
}

export function resolveProject(cwd: string): DlrPaths | null {
	let dir = path.resolve(cwd);

	while (true) {
		const candidate = path.join(dir, '.dlr-project');
		if (fs.existsSync(candidate)) {
			const projectName = fs.readFileSync(candidate, 'utf-8').trim().split('\n')[0]!;
			const root = getDlrRoot();
			const project = path.join(root, 'projects', projectName);
			return {
				root,
				project,
				sessions: path.join(project, 'sessions'),
				projectName,
			};
		}

		const parent = path.dirname(dir);
		if (parent === dir) {
			return null;
		}
		dir = parent;
	}
}

export function initProject(cwd: string, projectName: string): DlrPaths {
	const dlrProjectFile = path.join(cwd, '.dlr-project');
	fs.writeFileSync(dlrProjectFile, projectName + '\n', 'utf-8');

	const root = getDlrRoot();
	const project = path.join(root, 'projects', projectName);
	const sessions = path.join(project, 'sessions');

	fs.mkdirSync(sessions, { recursive: true });

	const metaPath = path.join(project, 'meta.yaml');
	if (!fs.existsSync(metaPath)) {
		const meta = `name: ${projectName}\ncreatedAt: ${new Date().toISOString()}\n`;
		fs.writeFileSync(metaPath, meta, 'utf-8');
	}

	return { root, project, sessions, projectName };
}

export function listSessionFiles(paths: DlrPaths): string[] {
	if (!fs.existsSync(paths.sessions)) {
		return [];
	}
	return fs
		.readdirSync(paths.sessions)
		.filter((f) => f.endsWith('.md'))
		.map((f) => f.replace(/\.md$/, ''));
}

export function readSessionFile(paths: DlrPaths, topic: string): string | null {
	const filePath = path.join(paths.sessions, `${topic}.md`);
	if (!fs.existsSync(filePath)) {
		return null;
	}
	return fs.readFileSync(filePath, 'utf-8');
}

export function writeSessionFile(paths: DlrPaths, topic: string, content: string): void {
	const filePath = path.join(paths.sessions, `${topic}.md`);
	fs.writeFileSync(filePath, content, 'utf-8');
}

export function deleteSessionFile(paths: DlrPaths, topic: string): boolean {
	const filePath = path.join(paths.sessions, `${topic}.md`);
	if (!fs.existsSync(filePath)) return false;
	fs.unlinkSync(filePath);
	return true;
}

export function deleteProject(projectName: string): boolean {
	const root = getDlrRoot();
	const projectDir = path.join(root, 'projects', projectName);
	if (!fs.existsSync(projectDir)) return false;
	fs.rmSync(projectDir, { recursive: true, force: true });
	return true;
}
