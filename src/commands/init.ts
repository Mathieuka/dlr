import fs from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import { initProject } from '../core/store.js';
import { AGENTS_SNIPPET } from '../core/agent_snippet.js';
import { findAgentsFiles, hasExistingDlrSection, appendDlrSection, createAgentsFile } from '../core/agents_file.js';
import { askYesNo, askChoice, type ChoiceItem } from '../core/prompt.js';

const KEBAB_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function registerInitCommand(program: Command): void {
	program
		.command('init')
		.description('Link the current directory to a dlr project')
		.option('-n, --name <name>', 'Override the project name (defaults to directory name)')
		.action(async (options: { name?: string }) => {
			const cwd = process.cwd();

			const dlrProjectFile = path.join(cwd, '.dlr-project');
			const isReinit = fs.existsSync(dlrProjectFile);

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

			initProject(cwd, projectName);

			if (isReinit) {
				process.stdout.write(`✓ Regenerated .dlr-project in current directory\n`);
			} else {
				process.stdout.write(`✓ Created .dlr-project in current directory\n`);
			}
			process.stdout.write(
				`✓ Project '${projectName}' ready in ~/.dlr/projects/${projectName}\n`,
			);

			addToGitignore(cwd);

			await handleAgentsFile(cwd);

			process.stdout.write('\n✅ Installation complete!\n');
			process.stdout.write('\nThe .dlr-project file links this directory to your dlr project.\n');
			process.stdout.write('It is local and gitignored — each contributor runs `dlr init` on their own machine.\n');
			process.stdout.write(`\nRestart your agent session, then ask it to run \`dlr persist ${projectName}\` at the end of your next session.\n`);
		});
}

function addToGitignore(cwd: string): void {
	const gitignorePath = path.join(cwd, '.gitignore');

	if (!fs.existsSync(gitignorePath)) {
		fs.writeFileSync(gitignorePath, '.dlr-project\n', 'utf-8');
		process.stdout.write('✓ Created .gitignore with .dlr-project\n');
		return;
	}

	const content = fs.readFileSync(gitignorePath, 'utf-8');
	if (content.includes('.dlr-project')) {
		return;
	}

	const separator = content.endsWith('\n') ? '' : '\n';
	fs.writeFileSync(gitignorePath, `${content}${separator}.dlr-project\n`, 'utf-8');
	process.stdout.write('✓ Added .dlr-project to .gitignore\n');
}

async function handleAgentsFile(cwd: string): Promise<void> {
	const found = findAgentsFiles(cwd);

	if (found.length === 0) {
		const defaultPath = path.join(cwd, 'AGENTS.md');
		const create = await askYesNo(`No AGENTS.md found. Create ${defaultPath}?`);
		if (create) {
			createAgentsFile(defaultPath, AGENTS_SNIPPET);
			process.stdout.write(`✓ Created ${defaultPath} with DLR section\n`);
		} else {
			process.stdout.write('\nAdd this to your agent config manually:\n');
			process.stdout.write('────────────────────────────────────────────────────\n\n');
			process.stdout.write(AGENTS_SNIPPET);
			process.stdout.write('\n\n────────────────────────────────────────────────────\n');
		}
		return;
	}

	const withoutDlr = found.filter((f) => !hasExistingDlrSection(f));
	const withDlr = found.filter((f) => hasExistingDlrSection(f));

	if (withoutDlr.length === 0) {
		for (const f of withDlr) {
			process.stdout.write(`ℹ DLR section already present in ${f} — update manually if needed.\n`);
		}
		process.stdout.write('\nLatest snippet:\n');
		process.stdout.write('────────────────────────────────────────────────────\n\n');
		process.stdout.write(AGENTS_SNIPPET);
		process.stdout.write('\n\n────────────────────────────────────────────────────\n');
		return;
	}

	if (withoutDlr.length === 1 && withDlr.length === 0) {
		const confirm = await askYesNo(`Append DLR section to ${withoutDlr[0]}?`);
		if (confirm) {
			appendDlrSection(withoutDlr[0]!, AGENTS_SNIPPET);
			process.stdout.write(`✓ Appended DLR section to ${withoutDlr[0]}\n`);
		}
		return;
	}

	const choices: ChoiceItem[] = found.map((f) => {
		const hasDlr = hasExistingDlrSection(f);
		return {
			value: f,
			disabled: hasDlr ? 'DLR section already present' : false,
		};
	});

	const selected = await askChoice('Append DLR section to:', choices);

	for (const filePath of selected) {
		appendDlrSection(filePath, AGENTS_SNIPPET);
		process.stdout.write(`✓ Appended DLR section to ${filePath}\n`);
	}
}
