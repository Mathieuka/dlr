import fs from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import { initProject } from '../core/store.js';
import { AGENTS_SNIPPET } from '../core/agent_snippet.js';

const KEBAB_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function registerInitCommand(program: Command): void {
	program
		.command('init')
		.description('Link the current directory to a dlr project')
		.option('-n, --name <name>', 'Override the project name (defaults to directory name)')
		.action((options: { name?: string }) => {
			const cwd = process.cwd();

			const dlrProjectFile = path.join(cwd, '.dlr-project');
			if (fs.existsSync(dlrProjectFile)) {
				process.stderr.write('Error: Project already initialized in this directory.\n');
				process.exitCode = 1;
				return;
			}

			let projectName = options.name ?? path.basename(cwd);

			if (options.name !== undefined && options.name.trim() === '') {
				process.stderr.write('Error: --name cannot be empty.\n');
				process.exitCode = 1;
				return;
			}

			projectName = projectName
				.toLowerCase()
				.replace(/\s+/g, '-')
				.replace(/[^a-z0-9-]/g, '');

			if (!KEBAB_RE.test(projectName)) {
				process.stderr.write(
					`Error: Could not derive a valid project name from "${path.basename(cwd)}". Use --name to provide one.\n`,
				);
				process.exitCode = 1;
				return;
			}

			const paths = initProject(cwd, projectName);

			process.stdout.write(`✓ Created .dlr-project in current directory\n`);
			process.stdout.write(
				`✓ Initialized project '${projectName}' in ~/.dlr/projects/${projectName}\n`,
			);
			process.stdout.write(`⚠ Add .dlr-project to your .gitignore\n`);
			process.stdout.write(`\n`);
			process.stdout.write(
				`Add the following to your AGENTS.md (or equivalent):\n`,
			);
			process.stdout.write(`────────────────────────────────────────────────────\n`);
			process.stdout.write(`\n`);
			process.stdout.write(AGENTS_SNIPPET);
			process.stdout.write(`\n\n`);
			process.stdout.write(`────────────────────────────────────────────────────\n`);
		});
}
