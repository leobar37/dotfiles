#!/usr/bin/env node
import path from "node:path";
import fs from "node:fs";
import {
	ensureFreshClone,
	getChangedFiles,
	getFileContentAtCommit,
	getHeadCommit,
	getHeadTag,
	getRecentCommits,
} from "./lib/git.js";
import { TARGET_PACKAGES, inferRecommendation, isRelevantUpstreamPath, type AnalyzedCommit, type FileAnalysis } from "./lib/commits.js";
import { analyzeFile } from "./lib/diff.js";
import { generateMarkdownReport } from "./lib/report.js";

interface Args {
	localRoot: string;
	upstreamUrl: string;
	upstreamRef: string;
	limit: number;
	output?: string;
	includeDiffs: boolean;
}

function parseArgs(): Args {
	const args = process.argv.slice(2);
	let localRoot = process.cwd();
	let upstreamUrl = "https://github.com/earendil-works/pi";
	let upstreamRef = "main";
	let limit = 30;
	let output: string | undefined;
	let includeDiffs = false;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--local" || arg === "-l") {
			localRoot = path.resolve(args[++i]);
		} else if (arg === "--upstream" || arg === "-u") {
			upstreamUrl = args[++i];
		} else if (arg === "--ref" || arg === "-r") {
			upstreamRef = args[++i];
		} else if (arg === "--limit" || arg === "-n") {
			limit = parseInt(args[++i], 10);
		} else if (arg === "--output" || arg === "-o") {
			output = args[++i];
		} else if (arg === "--diff" || arg === "-d") {
			includeDiffs = true;
		} else if (!arg.startsWith("-")) {
			localRoot = path.resolve(arg);
		}
	}

	return { localRoot, upstreamUrl, upstreamRef, limit, output, includeDiffs };
}

function validateWorkspace(localRoot: string): void {
	for (const pkg of TARGET_PACKAGES) {
		const pkgPath = path.join(localRoot, pkg);
		if (!fs.existsSync(pkgPath)) {
			throw new Error(`Workspace missing expected package: ${pkgPath}`);
		}
	}
}

async function main(): Promise<void> {
	const args = parseArgs();
	validateWorkspace(args.localRoot);

	console.error(`Cloning ${args.upstreamUrl}@${args.upstreamRef}...`);
	const { dir: upstreamDir } = ensureFreshClone(args.upstreamUrl, args.upstreamRef);

	const headSha = getHeadCommit(upstreamDir);
	const headTag = getHeadTag(upstreamDir);

	console.error(`HEAD is ${headSha.slice(0, 12)}${headTag ? ` (${headTag})` : ""}`);
	console.error(`Analyzing last ${args.limit} commits touching ${TARGET_PACKAGES.join(", ")}...`);

	const commits = getRecentCommits(upstreamDir, TARGET_PACKAGES, args.limit);
	const analyzed: AnalyzedCommit[] = [];

	for (const commit of commits) {
		const files = getChangedFiles(upstreamDir, commit.sha)
			.filter((f) => TARGET_PACKAGES.some((pkg) => f.startsWith(pkg + "/")))
			.filter((f) => isRelevantUpstreamPath(f));

		const fileAnalyses: FileAnalysis[] = [];
		for (const upstreamPath of files) {
			const upstreamContent = getFileContentAtCommit(upstreamDir, commit.sha, upstreamPath);
			const analysis = analyzeFile(args.localRoot, upstreamContent, upstreamPath);
			fileAnalyses.push(analysis);
		}

		const recommendation = inferRecommendation(commit, fileAnalyses);
		analyzed.push({ commit, files: fileAnalyses, recommendation });
	}

	const report = generateMarkdownReport(
		args.localRoot,
		args.upstreamUrl,
		args.upstreamRef,
		headSha,
		headTag,
		analyzed,
		args.includeDiffs,
	);

	if (args.output) {
		fs.writeFileSync(args.output, report, "utf-8");
		console.error(`Report written to ${args.output}`);
	}

	console.log(report);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
