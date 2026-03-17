const KEBAB_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidTopic(topic: string): boolean {
	return KEBAB_RE.test(topic);
}
