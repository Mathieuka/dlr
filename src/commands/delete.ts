import type { Command } from 'commander';
import { resolveProject, deleteSessionFile, deleteProject } from '../core/store.js';
import { isValidTopic } from '../core/topic.js';

export function registerDeleteCommand(program: Command): void {
	const deleteCmd = program
		.command('delete')
		.description('Delete a topic or project (destructive)');

	deleteCmd
		.command('topic <name>')
		.description('Delete a topic session file')
		.option('--confirm', 'Required flag to confirm destructive action')
		.action((name: string, options: { confirm?: boolean }) => {
			if (!options.confirm) {
				process.stderr.write(
					'Error: --confirm flag is required for destructive actions.\n',
				);
				process.exitCode = 1;
				return;
			}

			if (!isValidTopic(name)) {
				process.stderr.write(
					`Error: Invalid topic "${name}". Topics must be kebab-case.\n`,
				);
				process.exitCode = 1;
				return;
			}

			const paths = resolveProject(process.cwd());
			if (!paths) {
				process.stderr.write("Error: No dlr project found. Run 'dlr init' first.\n");
				process.exitCode = 1;
				return;
			}

			const deleted = deleteSessionFile(paths, name);
			if (!deleted) {
				process.stderr.write(`Error: No session found for topic '${name}'.\n`);
				process.exitCode = 1;
				return;
			}

			process.stdout.write(`✓ Deleted topic '${name}'\n`);
		});

	deleteCmd
		.command('project <name>')
		.description('Delete a project from the dlr store')
		.option('--confirm', 'Required flag to confirm destructive action')
		.action((name: string, options: { confirm?: boolean }) => {
			if (!options.confirm) {
				process.stderr.write(
					'Error: --confirm flag is required for destructive actions.\n',
				);
				process.exitCode = 1;
				return;
			}

			const deleted = deleteProject(name);
			if (!deleted) {
				process.stderr.write(`Error: No project found with name '${name}'.\n`);
				process.exitCode = 1;
				return;
			}

			process.stdout.write(`✓ Deleted project '${name}' from store\n`);
		});
}
