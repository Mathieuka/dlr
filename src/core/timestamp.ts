function pad(n: number): string {
	return n.toString().padStart(2, '0');
}

export function generateTimestamp(date: Date = new Date()): string {
	const y = date.getFullYear();
	const m = pad(date.getMonth() + 1);
	const d = pad(date.getDate());
	const h = pad(date.getHours());
	const min = pad(date.getMinutes());
	return `${y}-${m}-${d} ${h}:${min}`;
}

export function generateTimestampHeader(date: Date = new Date()): string {
	return `## ${generateTimestamp(date)}`;
}

const TIMESTAMP_RE = /^## (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})$/;

export function parseTimestamp(header: string): Date | null {
	const match = TIMESTAMP_RE.exec(header.trim());
	if (!match) return null;
	const [, datePart, timePart] = match;
	const [year, month, day] = datePart!.split('-').map(Number);
	const [hours, minutes] = timePart!.split(':').map(Number);
	return new Date(year!, month! - 1, day!, hours!, minutes!);
}

export function generateISOTimestamp(date: Date = new Date()): string {
	const y = date.getFullYear();
	const m = pad(date.getMonth() + 1);
	const d = pad(date.getDate());
	const h = pad(date.getHours());
	const min = pad(date.getMinutes());
	const s = pad(date.getSeconds());

	const offsetMin = -date.getTimezoneOffset();
	const sign = offsetMin >= 0 ? '+' : '-';
	const absOffset = Math.abs(offsetMin);
	const oh = pad(Math.floor(absOffset / 60));
	const om = pad(absOffset % 60);

	return `${y}-${m}-${d}T${h}:${min}:${s}${sign}${oh}:${om}`;
}
