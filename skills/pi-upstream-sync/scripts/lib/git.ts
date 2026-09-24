import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export interface CloneResult {
	dir: string;
	isFresh: boolean;
}

export function ensureFreshClone(url: string, ref: string): CloneResult {
	const tmpBase = os.tmpdir();
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const dir = path.join(tmpBase, `pi-upstream-sync-${timestamp}`);

	if (fs.existsSync(dir)) {
		fs.rmSync(dir, { recursive: true, force: true });
	}

	fs.mkdirSync(dir, { recursive: true });

	execSync(`git clone --depth 50 --branch ${ref} --single-branch ${url} .`, {
		cwd: dir,
		stdio: ["ignore", "ignore", "pipe"],
		encoding: "utf-8",
	});

	return { dir, isFresh: true };
}

export function getRecentCommits(
	repoDir: string,
	subpaths: string[],
	limit: number,
): CommitInfo[] {
	const recordSep = "\x1e";
	const unitSep = "\x1f";
	const format = `%H${unitSep}%ad${unitSep}%an${unitSep}%s${unitSep}%b${recordSep}`;
	const paths = subpaths.map((p) => `-- ${p}`).join(" ");
	const cmd = `git log --format=format:'${format}' -n ${limit} ${paths}`;

	const result = execSync(cmd, {
		cwd: repoDir,
		encoding: "utf-8",
		maxBuffer: 50 * 1024 * 1024,
	});

	const rawBlocks = result.split(recordSep).map((b) => b.trim()).filter((b) => b.length > 0);

	return rawBlocks.map((block) => {
		const parts = block.split(unitSep);
		const sha = parts[0] ?? "";
		const date = parts[1] ?? "";
		const author = parts[2] ?? "";
		const subject = parts[3] ?? "";
		const body = parts.slice(4).join(unitSep).trim();
		return {
			sha: sha.trim(),
			date: date.trim(),
			author: author.trim(),
			subject: subject.trim(),
			body,
		};
	});
}

export interface CommitInfo {
	sha: string;
	date: string;
	author: string;
	subject: string;
	body: string;
}

export function getChangedFiles(repoDir: string, sha: string): string[] {
	const parent = `${sha}^`;
	const cmd = ["git", "diff-tree", "--no-commit-id", "--name-only", "-r", parent, sha];
	const result = execSync(cmd.join(" "), {
		cwd: repoDir,
		encoding: "utf-8",
	});
	return result
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l.length > 0);
}

export function getFileContentAtCommit(
	repoDir: string,
	sha: string,
	filePath: string,
): string | null {
	try {
		return execSync(`git show ${sha}:${filePath}`, {
			cwd: repoDir,
			encoding: "utf-8",
			maxBuffer: 20 * 1024 * 1024,
		});
	} catch {
		return null;
	}
}

export function getHeadCommit(repoDir: string): string {
	return execSync("git rev-parse HEAD", {
		cwd: repoDir,
		encoding: "utf-8",
	}).trim();
}

export function getHeadTag(repoDir: string): string | null {
	const result = spawnSync("git", ["describe", "--tags", "--exact-match", "HEAD"], {
		cwd: repoDir,
		encoding: "utf-8",
	});
	if (result.status !== 0) return null;
	return result.stdout.trim() || null;
}
