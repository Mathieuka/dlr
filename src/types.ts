/** A single timestamped constat/decision block. */
export interface Block {
	timestamp: Date;
	constats: string[];
	decisions: string[];
	/** The original markdown text of this block (without the timestamp header). */
	raw: string;
}

/** A parsed session file. */
export interface SessionFile {
	topic: string;
	created: string;
	tags: string[];
	blocks: Block[];
	/** The full file content. */
	raw: string;
}

/** Project metadata stored in meta.yaml. */
export interface ProjectMeta {
	name: string;
	createdAt: string;
}

/** Resolved paths for the current dlr context. */
export interface DlrPaths {
	/** ~/.dlr */
	root: string;
	/** ~/.dlr/projects/<name> */
	project: string;
	/** ~/.dlr/projects/<name>/sessions */
	sessions: string;
	projectName: string;
}
