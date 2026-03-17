export interface ValidationResult {
	valid: boolean;
	error?: string;
	constats: number;
	decisions: number;
}

function countBullets(content: string, sectionHeader: string): number {
	const lines = content.split('\n');
	let inSection = false;
	let count = 0;

	for (const line of lines) {
		if (line.trim().startsWith('### ')) {
			inSection = line.trim().toLowerCase() === sectionHeader.toLowerCase();
			continue;
		}
		if (inSection && /^\s*-\s+\S/.test(line)) {
			count++;
		}
	}

	return count;
}

export function validateBlockContent(content: string): ValidationResult {
	const trimmed = content.trim();

	if (trimmed.length === 0) {
		return { valid: false, error: 'No content received on stdin.', constats: 0, decisions: 0 };
	}

	const hasConstatSection = /^### Constat$/m.test(trimmed);
	const hasDecisionSection = /^### Decision$/m.test(trimmed);

	if (!hasConstatSection && !hasDecisionSection) {
		return {
			valid: false,
			error: 'Content must contain at least one "### Constat" or "### Decision" section.',
			constats: 0,
			decisions: 0,
		};
	}

	const constats = countBullets(trimmed, '### Constat');
	const decisions = countBullets(trimmed, '### Decision');

	if (constats === 0 && decisions === 0) {
		return {
			valid: false,
			error: 'Sections must contain at least one bullet point (- item).',
			constats: 0,
			decisions: 0,
		};
	}

	return { valid: true, constats, decisions };
}
