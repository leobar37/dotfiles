import fs from "node:fs";
import path from "node:path";
import type { FileAnalysis } from "./commits.js";

export function resolveLocalFile(localRoot: string, upstreamPath: string): string | null {
	for (const pkg of ["packages/ai", "packages/agent", "packages/coding-agent"]) {
		if (upstreamPath.startsWith(pkg + "/")) {
			return path.join(localRoot, upstreamPath);
		}
	}
	return null;
}

export function extractPackageAndRelative(upstreamPath: string): { packageName: string; relativePath: string } {
	for (const pkg of ["packages/coding-agent", "packages/agent", "packages/ai"]) {
		if (upstreamPath.startsWith(pkg + "/")) {
			return { packageName: pkg.replace("packages/", ""), relativePath: upstreamPath.slice(pkg.length + 1) };
		}
	}
	return { packageName: "unknown", relativePath: upstreamPath };
}

export function analyzeFile(
	localRoot: string,
	upstreamContent: string | null,
	upstreamPath: string,
): FileAnalysis {
	const localPath = resolveLocalFile(localRoot, upstreamPath);
	const { packageName, relativePath } = extractPackageAndRelative(upstreamPath);

	let localContent: string | null = null;
	let localSize = 0;
	let status: FileAnalysis["status"];

	if (localPath && fs.existsSync(localPath)) {
		localContent = fs.readFileSync(localPath, "utf-8");
		localSize = localContent.length;
		if (upstreamContent === null) {
			status = "deleted_upstream";
		} else if (normalizeContent(localContent) === normalizeContent(upstreamContent)) {
			status = "synced";
		} else {
			status = "diverged";
		}
	} else {
		if (upstreamContent === null) {
			status = "synced";
		} else {
			status = "missing_local";
		}
	}

	return {
		upstreamPath,
		localPath: localPath || "",
		packageName,
		relativePath,
		status,
		upstreamSize: upstreamContent?.length || 0,
		localSize,
		upstreamContent,
		localContent,
	};
}

function normalizeContent(content: string): string {
	return content.replace(/\r\n/g, "\n").replace(/\n+$/, "\n");
}

export function generateInlineDiff(upstream: string, local: string): string {
	const upstreamLines = upstream.split("\n");
	const localLines = local.split("\n");
	const maxLines = Math.max(upstreamLines.length, localLines.length);
	const out: string[] = [];
	let added = 0;
	let removed = 0;

	for (let i = 0; i < maxLines; i++) {
		const u = upstreamLines[i];
		const l = localLines[i];
		if (u === l) {
			out.push(` ${u ?? ""}`);
		} else if (u === undefined) {
			out.push(`+${l}`);
			added++;
		} else if (l === undefined) {
			out.push(`-${u}`);
			removed++;
		} else {
			out.push(`-${u}`);
			out.push(`+${l}`);
			added++;
			removed++;
		}
	}

	const header = `@@ -${localLines.length},${localLines.length} +${upstreamLines.length},${upstreamLines.length} @@ (-${removed}/+${added})`;
	if (out.length <= 40) {
		return [header, ...out].join("\n");
	}
	return [header, ...out.slice(0, 40), "... (truncated)"].join("\n");
}

export function generateGitDiff(upstream: string, local: string, contextLines = 3): string {
	const upstreamLines = upstream.split("\n");
	const localLines = local.split("\n");
	const out: string[] = [];
	let lastPrinted = -contextLines - 1;

	for (let i = 0; i < Math.max(upstreamLines.length, localLines.length); i++) {
		const u = upstreamLines[i];
		const l = localLines[i];
		if (u === l) continue;

		if (i - lastPrinted > contextLines * 2 + 1) {
			if (out.length > 0) out.push("...");
			lastPrinted = i;
		}

		const start = Math.max(0, i - contextLines);
		const end = Math.min(Math.max(upstreamLines.length, localLines.length), i + contextLines + 1);
		for (let j = start; j < end; j++) {
			if (j < lastPrinted) continue;
			const uj = upstreamLines[j];
			const lj = localLines[j];
			if (uj === lj) {
				out.push(` ${uj ?? ""}`);
			} else if (uj === undefined) {
				out.push(`+${lj}`);
			} else if (lj === undefined) {
				out.push(`-${uj}`);
			} else {
				out.push(`-${uj}`);
				out.push(`+${lj}`);
			}
		}
		lastPrinted = end;
	}

	return out.join("\n");
}
