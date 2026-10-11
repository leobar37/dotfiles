import * as fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { invariant, object } from './common.ts';

export type ReadCommand = (executable: string, args: string[]) => { status: number | null; stdout: string };
export const readCommand: ReadCommand = (executable, args) => spawnSync(executable, args, {
  encoding: 'utf8', timeout: 30000, maxBuffer: 8 * 1024 * 1024,
});

export function hasClimierMapping(plan: string): boolean {
  // lstat also selects broken symlinks: a damaged mapping must never select Markdown.
  try { fs.lstatSync(path.join(plan, 'orchestration/climier-plan.json')); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
}

function contained(root: string, file: string): boolean {
  const relative = path.relative(root, file);
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

export function inspectProgress(plan: string, repo: string, run: ReadCommand = readCommand) {
  if (!hasClimierMapping(plan)) return { backend: 'markdown' as const };
  const fail = (condition: unknown, message: string) => invariant(condition, 'INVALID_PROGRESS', message);
  const mapping = object(JSON.parse(fs.readFileSync(path.join(plan, 'orchestration/climier-plan.json'), 'utf8')));
  fail(mapping.version === 1 && Object.keys(mapping).every(key => ['version', 'initiative', 'tasks'].includes(key)), 'Invalid Climier mapping schema');
  const initiative = mapping.initiative;
  fail(typeof initiative === 'string' && /^[a-z0-9][a-z0-9_-]*$/.test(initiative), 'Invalid initiative slug');
  fail(Array.isArray(mapping.tasks) && mapping.tasks.length > 0, 'Map every executable planned unit before readiness');
  const phases = fs.realpathSync(path.join(plan, 'phases'));
  fail(contained(plan, phases), 'Phases directory escapes plan');
  const ids = new Set<string>();
  const files = new Set<string>();
  for (const value of mapping.tasks as unknown[]) {
    const item = object(value);
    fail(Object.keys(item).length === 3 && Object.keys(item).every(key => ['phase', 'task', 'file'].includes(key)), 'Mapping contains only phase, task and file; never status');
    fail(typeof item.phase === 'string' && /^P-\d{3}$/.test(item.phase), 'Invalid phase ID');
    fail(typeof item.task === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(item.task), 'Invalid exact task ID');
    const task = item.task as string;
    fail(!ids.has(task), `Duplicate task ID: ${task}`);
    ids.add(task);
    fail(typeof item.file === 'string' && /^phases\/.+\.md$/.test(item.file) && !item.file.split('/').some(part => part === '..' || part === '.' || part === '') && !item.file.includes('\\'), 'Task file must be a contained relative phases/*.md path');
    const file = fs.realpathSync(path.join(plan, item.file as string));
    fail(contained(plan, file) && contained(phases, file), 'Task file escapes plan phases');
    fail(path.basename(item.file as string).startsWith(`${item.phase}-`), 'Task file does not match phase ID');
    fail(fs.statSync(file).isFile() && fs.statSync(file).size > 0, 'Missing or empty task file');
    files.add(file);
  }
  // Every static phase/task brief must participate. Multiple units may share a brief.
  for (const entry of fs.readdirSync(phases, { recursive: true, withFileTypes: true })) {
    if (entry.name.endsWith('.md')) {
      const file = fs.realpathSync(path.join(entry.parentPath, entry.name));
      fail(files.has(file), `Unmapped phase/task brief: ${entry.name}`);
    }
  }
  const metadata = object(JSON.parse(fs.readFileSync(path.join(repo, '.climier.json'), 'utf8')));
  fail(typeof metadata.project_id === 'string' && metadata.project_id.trim().length > 0, 'Missing Climier project_id; setup must be explicitly authorized');
  const storage = metadata.backend === undefined ? 'local' : object(metadata.backend).type;
  fail(storage === 'local' || storage === 'remote', 'Unsupported Climier backend');
  const version = run('climier', ['--version']);
  fail(version.status === 0 && /^2\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(version.stdout.trim()), 'Climier 2.x is required; no automatic migration');
  const cli = (...args: string[]) => {
    const result = run('climier', ['--project', repo, ...args]);
    fail(result.status === 0, `Climier read failed (${args[0]}); inspect backend/auth/state, never initialize or fall back`);
    const data = object(JSON.parse(result.stdout));
    fail(data.ok !== false, `Climier reported an error (${args[0]})`);
    return data;
  };
  const catalog = cli('initiatives', '--all');
  fail(Array.isArray(catalog.initiatives) && catalog.initiatives.some(value => object(value).name === initiative), `Initiative not registered: ${initiative}`);
  for (const id of ids) {
    const node = object(cli('show', id).node);
    fail(node.id === id && node.initiative === initiative && node.kind === 'resolvable' && node.subkind === 'task', `Mapped task identity/kind/initiative mismatch: ${id}`);
  }
  cli('status', '--initiative', initiative as string, '--all');
  return { backend: 'climier' as const, storage, projectId: metadata.project_id, initiative, taskCount: ids.size };
}
