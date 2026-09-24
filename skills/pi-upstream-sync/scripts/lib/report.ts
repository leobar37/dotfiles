import type { AnalyzedCommit, FileAnalysis, Recommendation } from "./commits.js";
import { generateGitDiff } from "./diff.js";

export function generateMarkdownReport(
	localRoot: string,
	upstreamUrl: string,
	upstreamRef: string,
	headSha: string,
	headTag: string | null,
	commits: AnalyzedCommit[],
	includeDiffs = false,
): string {
	const relevant = commits.filter(
		(c) => c.files.some((f) => f.status !== "synced") && c.recommendation?.level !== "none",
	);
	const synced = commits.filter(
		(c) => c.files.every((f) => f.status === "synced") || c.recommendation?.level === "none",
	);

	const lines: string[] = [];

	lines.push(`# Upstream Sync Report`);
	lines.push("");
	lines.push(`- **Upstream**: ${upstreamUrl}@${upstreamRef}`);
	lines.push(`- **HEAD**: \`${headSha.slice(0, 12)}\`${headTag ? ` (${headTag})` : ""}`);
	lines.push(`- **Local workspace**: \`${localRoot}\``);
	lines.push(`- **Commits analyzed**: ${commits.length}`);
	lines.push(`- **Commits with divergences**: ${relevant.length}`);
	lines.push(`- **Already in sync**: ${synced.length}`);
	lines.push("");

	if (relevant.length === 0) {
		lines.push("No divergences found. Local core packages appear to be in sync with upstream.");
		return lines.join("\n");
	}

	lines.push("## Summary by priority");
	lines.push("");

	const high = relevant.filter((c) => c.recommendation?.level === "high");
	const medium = relevant.filter((c) => c.recommendation?.level === "medium");
	const low = relevant.filter((c) => c.recommendation?.level === "low" || c.recommendation?.level === "none");

	lines.push(`- **High priority**: ${high.length}`);
	lines.push(`- **Medium priority**: ${medium.length}`);
	lines.push(`- **Low / none**: ${low.length}`);
	lines.push("");

	for (const level of ["high", "medium", "low"] as const) {
		const group = relevant.filter((c) => c.recommendation?.level === level || (level === "low" && (c.recommendation?.level === "none" || c.recommendation?.level === "low")));
		if (group.length === 0) continue;

		lines.push(`### ${capitalize(level)} priority`);
		lines.push("");
		for (const c of group) {
			const firstLine = c.commit.subject;
			lines.push(`- [\`${c.commit.sha.slice(0, 8)}\`] ${firstLine}`);
		}
		lines.push("");
	}

	lines.push("## Detailed analysis");
	lines.push("");

	const grouped = groupByPackage(relevant);
	for (const [pkg, pkgCommits] of Object.entries(grouped)) {
		lines.push(`### ${pkg}`);
		lines.push("");

		for (const c of pkgCommits) {
			const rec = c.recommendation || { level: "low", reason: "No recommendation." };
			lines.push(`#### \`${c.commit.sha.slice(0, 8)}\` — ${c.commit.subject}`);
			lines.push("");
			lines.push(`- **Date**: ${c.commit.date}`);
			lines.push(`- **Author**: ${c.commit.author}`);
			lines.push(`- **Priority**: ${rec.level}`);
			lines.push(`- **Recommendation**: ${rec.reason}`);
			lines.push("");

			const tableRows = c.files
				.filter((f) => f.status !== "synced")
				.map((f) => `| \`${f.relativePath}\` | ${f.status} | ${f.localSize} → ${f.upstreamSize} |`);

			if (tableRows.length > 0) {
				lines.push("| File | Status | Size (local → upstream) |");
				lines.push("|------|--------|------------------------|");
				lines.push(...tableRows);
				lines.push("");
			}

			if (includeDiffs) {
				for (const f of c.files.filter((f) => f.status === "diverged")) {
					if (!f.upstreamContent || !f.localContent) continue;
					const diff = generateGitDiff(f.upstreamContent, f.localContent);
					if (!diff.trim()) continue;
					lines.push(`<details>`);
					lines.push(`<summary>Diff: \`${f.relativePath}\`</summary>`);
					lines.push("");
					lines.push("```diff");
					lines.push(diff);
					lines.push("```");
					lines.push("</details>");
					lines.push("");
				}
			}

			if (c.commit.body) {
				lines.push("**Body:**");
				lines.push("");
				lines.push(c.commit.body);
				lines.push("");
			}
		}
	}

	return lines.join("\n");
}

function groupByPackage(commits: AnalyzedCommit[]): Record<string, AnalyzedCommit[]> {
	const map: Record<string, AnalyzedCommit[]> = {};
	for (const c of commits) {
		const pkg = c.files.find((f) => f.status !== "synced")?.packageName || "unknown";
		if (!map[pkg]) map[pkg] = [];
		map[pkg].push(c);
	}
	return map;
}

function capitalize(s: string): string {
	return s[0].toUpperCase() + s.slice(1);
}
