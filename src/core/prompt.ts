import { confirm, checkbox } from '@inquirer/prompts';

export function askYesNo(question: string): Promise<boolean> {
	return confirm({ message: question, default: false });
}

export interface ChoiceItem {
	value: string;
	disabled?: boolean | string;
}

export async function askChoice(
	question: string,
	choices: ChoiceItem[],
): Promise<string[]> {
	return checkbox({
		message: question,
		choices: choices.map((c) => ({
			name: c.value,
			value: c.value,
			disabled: c.disabled,
		})),
	});
}
