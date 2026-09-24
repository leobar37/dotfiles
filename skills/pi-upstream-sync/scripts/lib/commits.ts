import type { CommitInfo } from "./git.js";

export const TARGET_PACKAGES = ["packages/ai", "packages/agent", "packages/coding-agent"];

export const IGNORED_PATH_PATTERNS = [
	/^CHANGELOG\.md$/,
	/^package\.json$/,
	/^npm-shrinkwrap\.json$/,
	/^examples\//,
];

export function isRelevantUpstreamPath(path: string): boolean {
	if (!TARGET_PACKAGES.some((pkg) => path.startsWith(pkg + "/"))) return false;
	const relative = path.replace(/^packages\/(ai|agent|coding-agent)\//, "");
	return !IGNORED_PATH_PATTERNS.some((pattern) => pattern.test(relative));
}

export interface AnalyzedCommit {
	commit: CommitInfo;
	files: FileAnalysis[];
	summary?: string;
	recommendation?: Recommendation;
}

export interface FileAnalysis {
	upstreamPath: string;
	localPath: string;
	packageName: string;
	relativePath: string;
	status: "synced" | "diverged" | "missing_local" | "deleted_upstream";
	upstreamSize: number;
	localSize: number;
	upstreamContent: string | null;
	localContent: string | null;
}

export interface Recommendation {
	level: "high" | "medium" | "low" | "none";
	reason: string;
}

export function classifyCommitSubject(subject: string): { packageName: string | null; type: string | null } {
	const match = subject.match(/^(feat|fix|chore|refactor|perf|test|docs|style|build|ci)(?:\(([^)]+)\))?:/i);
	if (!match) return { packageName: null, type: null };
	const [, type, scope] = match;
	let packageName: string | null = null;
	if (scope) {
		if (scope.includes("agent") && !scope.includes("coding-agent")) packageName = "agent";
		else if (scope.includes("coding-agent")) packageName = "coding-agent";
		else if (scope.includes("ai")) packageName = "ai";
	}
	return { packageName, type: type?.toLowerCase() || null };
}

export function inferRecommendation(commit: CommitInfo, files: FileAnalysis[]): Recommendation {
	const { type, packageName } = classifyCommitSubject(commit.subject);

	const relevantFiles = files.filter((f) => f.status !== "synced");
	if (relevantFiles.length === 0) {
		return { level: "none", reason: "All relevant files are already in sync locally." };
	}

	if (packageName === null && type === "fix") {
		const isOnlyChangelog = relevantFiles.every((f) => f.relativePath === "CHANGELOG.md");
		if (isOnlyChangelog) {
			return { level: "none", reason: "Only changelog update for a package not tracked locally." };
		}
	}

	const subjectLower = commit.subject.toLowerCase();

	if (type === "fix") {
		if (subjectLower.includes("security") || subjectLower.includes("trust") || subjectLower.includes("abort")) {
			return { level: "high", reason: "Bug fix affecting trust, security, or stability. Likely relevant." };
		}
		if (subjectLower.includes("tool") || subjectLower.includes("loop") || subjectLower.includes("execute")) {
			return { level: "high", reason: "Core agent execution fix. Check for stale events or race conditions." };
		}
		if (subjectLower.includes("overflow") || subjectLower.includes("context")) {
			return { level: "medium", reason: "Provider/overflow handling improvement." };
		}
		return { level: "medium", reason: "Bug fix that may affect local behavior." };
	}

	if (type === "feat") {
		if (subjectLower.includes("model") || subjectLower.includes("metadata") || subjectLower.includes("claude")) {
			return { level: "low", reason: "Model metadata update. Useful but not urgent." };
		}
		return { level: "medium", reason: "New feature or capability. Evaluate relevance." };
	}

	if (type === "refactor") {
		return { level: "low", reason: "Refactor. Review if it unblocks future upstream syncs." };
	}

	return { level: "low", reason: "Minor or maintenance change." };
}
