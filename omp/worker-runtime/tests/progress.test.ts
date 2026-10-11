import { test, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { inspectPlan } from '../src/profile.ts';
import type { ReadCommand } from '../src/progress.ts';

let repo: string, plan: string;
let calls: string[][];
let mapping: { version: number; initiative: string; tasks: { phase: string; task: string; file: string }[] };
let version: string, missing: string, mismatch: string, unavailable: string;
const run: ReadCommand = (executable, args) => {
  calls.push([executable, ...args]);
  if (executable === 'git') return { status: 0, stdout: repo };
  if (executable === 'fixture-omp') return { status: 0, stdout: JSON.stringify({ models: [{ provider: 'fixture', id: 'model' }] }) };
  if (executable !== 'climier') throw new Error(`Unexpected executable: ${executable}`);
  if (args[0] === '--version') return { status: 0, stdout: version };
  expect(args.slice(0, 2)).toEqual(['--project', repo]);
  const command = args[2];
  if (unavailable === command) return { status: 1, stdout: '{"ok":false}' };
  if (command === 'initiatives') return { status: 0, stdout: JSON.stringify({ initiatives: [{ name: 'example' }] }) };
  if (command === 'show') {
    if (missing === args[3]) return { status: 0, stdout: '{"ok":false,"error":"not found"}' };
    return { status: 0, stdout: JSON.stringify({ node: { id: args[3], initiative: mismatch || 'example', kind: 'resolvable', subkind: 'task' } }) };
  }
  if (command === 'status') return { status: 0, stdout: '{}' };
  throw new Error(`Unexpected/mutating CLI command: ${command}`);
};

beforeEach(() => {
  repo = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'beta-progress-')));
  plan = path.join(repo, '.plans/example');
  fs.mkdirSync(path.join(plan, 'orchestration'), { recursive: true });
  fs.mkdirSync(path.join(plan, 'phases'));
  for (const name of ['goal.md', 'phase-index.md', 'phases/P-001-first.md']) fs.writeFileSync(path.join(plan, name), 'Static scope\n');
  fs.writeFileSync(path.join(plan, 'orchestration/models.yml'), 'setupVersion: 2\nmodelRoles:\n' + ['default', 'slow', 'plan', 'advisor', 'smol', 'tiny', 'commit'].map(role => `  ${role}: fixture/model\n`).join(''));
  fs.writeFileSync(path.join(repo, '.climier.json'), JSON.stringify({ version: 1, project_id: 'project-fixture' }));
  mapping = { version: 1, initiative: 'example', tasks: [
    { phase: 'P-001', task: 'T-example-feature', file: 'phases/P-001-first.md' },
    { phase: 'P-001', task: 'T-example-verify', file: 'phases/P-001-first.md' },
  ] };
  calls = []; version = '2.0.0'; missing = ''; mismatch = ''; unavailable = '';
});
afterEach(() => fs.rmSync(repo, { recursive: true, force: true }));

function inspect() {
  fs.writeFileSync(path.join(plan, 'orchestration/climier-plan.json'), JSON.stringify(mapping));
  return inspectPlan(plan, 'worker', 'fixture-omp', run);
}

test('multiple tasks per phase select Climier without tasks.md and only read state', () => {
  expect(inspect().progress).toEqual({ backend: 'climier', storage: 'local', projectId: 'project-fixture', initiative: 'example', taskCount: 2 });
  expect(calls.filter(call => call[0] === 'climier').map(call => call.slice(3))).toEqual([
    [], ['initiatives', '--all'], ['show', 'T-example-feature'], ['show', 'T-example-verify'], ['status', '--initiative', 'example', '--all'],
  ]);
  expect(fs.existsSync(path.join(plan, 'tasks.md'))).toBe(false);
});

test('remote metadata is supported without local task storage', () => {
  fs.writeFileSync(path.join(repo, '.climier.json'), JSON.stringify({ project_id: 'remote-project', backend: { type: 'remote', url: 'https://climier.example.test' } }));
  expect(inspect().progress).toMatchObject({ backend: 'climier', storage: 'remote', projectId: 'remote-project' });
});

test('absent mapping preserves Markdown path and does not query Climier', () => {
  fs.unlinkSync(path.join(repo, '.climier.json'));
  fs.writeFileSync(path.join(plan, 'tasks.md'), '- [ ] Task\n');
  expect(inspectPlan(plan, 'worker', 'fixture-omp', run).progress.backend).toBe('markdown');
  expect(calls.some(call => call[0] === 'climier')).toBe(false);
  fs.unlinkSync(path.join(plan, 'tasks.md'));
  expect(() => inspectPlan(plan, 'worker', 'fixture-omp', run)).toThrow('tasks.md');
});

test('invalid mapped task never falls back to an existing Markdown ledger', () => {
  fs.writeFileSync(path.join(plan, 'tasks.md'), '- [x] Task\n');
  missing = 'T-example-verify';
  expect(inspect).toThrow('Climier reported an error');
  missing = ''; mismatch = 'other-initiative';
  expect(inspect).toThrow('identity/kind/initiative mismatch');
});

for (const unsupported of ['1.9.0', '3.0.0', '2.x', '']) test(`unsupported version ${JSON.stringify(unsupported)} fails closed`, () => {
  version = unsupported;
  expect(inspect).toThrow('Climier 2.x');
  expect(calls.filter(call => call[0] === 'climier')).toHaveLength(1);
});

test('unregistered initiative fails closed', () => {
  mapping.initiative = 'missing-initiative';
  expect(inspect).toThrow('Initiative not registered');
});

for (const command of ['initiatives', 'show', 'status']) test(`backend/auth failure in ${command} fails closed`, () => {
  unavailable = command;
  expect(inspect).toThrow('Climier read failed');
});

test('missing or malformed project metadata never initializes', () => {
  fs.unlinkSync(path.join(repo, '.climier.json'));
  expect(inspect).toThrow();
  fs.writeFileSync(path.join(repo, '.climier.json'), '{}');
  expect(inspect).toThrow('project_id');
  expect(calls.some(call => call[0] === 'climier')).toBe(false);
});

test('mapping schema, unique IDs, exact phase IDs and complete brief coverage are mandatory', () => {
  mapping.version = 2;
  expect(inspect).toThrow('schema');
  mapping.version = 1;
  mapping.tasks[1]!.task = mapping.tasks[0]!.task;
  expect(inspect).toThrow('Duplicate task');
  mapping.tasks[1]!.task = 'T-example-verify';
  mapping.tasks[1]!.phase = 'P-002';
  expect(inspect).toThrow('does not match');
  mapping.tasks[1]!.phase = 'P-001';
  fs.writeFileSync(path.join(plan, 'phases/P-002-next.md'), 'Unmapped work');
  expect(inspect).toThrow('Unmapped phase/task brief');
});

test('empty mapping and status fields are rejected', () => {
  mapping.tasks = [];
  expect(inspect).toThrow('every executable');
  mapping.tasks = [{ phase: 'P-001', task: 'T-example', file: 'phases/P-001-first.md', status: 'done' } as typeof mapping.tasks[number]];
  expect(inspect).toThrow('never status');
});

test('traversal, symlink escapes and dangling mappings cannot select Markdown', () => {
  mapping.tasks[0]!.file = 'phases/../goal.md';
  expect(inspect).toThrow('contained relative');
  mapping.tasks[0]!.file = 'phases/P-001-escape.md';
  fs.symlinkSync(path.join(plan, 'goal.md'), path.join(plan, 'phases/P-001-escape.md'));
  expect(inspect).toThrow('escapes');
  const mappingPath = path.join(plan, 'orchestration/climier-plan.json');
  fs.unlinkSync(mappingPath);
  fs.symlinkSync(path.join(repo, 'nonexistent'), mappingPath);
  fs.writeFileSync(path.join(plan, 'tasks.md'), 'Legacy ledger');
  expect(() => inspectPlan(plan, 'worker', 'fixture-omp', run)).toThrow();
  expect(calls.some(call => call[0] === 'fixture-omp')).toBe(false);
});

test('exact ID and task kind are checked rather than trusting a successful show', () => {
  fs.writeFileSync(path.join(plan, 'orchestration/climier-plan.json'), JSON.stringify(mapping));
  for (const patch of [{ id: 'another-id' }, { kind: 'knowledge' }, { subkind: 'gate' }]) {
    const wrongNode: ReadCommand = (executable, args) => {
      const result = run(executable, args);
      if (executable === 'climier' && args[2] === 'show') {
        const data = JSON.parse(result.stdout);
        Object.assign(data.node, patch);
        return { status: 0, stdout: JSON.stringify(data) };
      }
      return result;
    };
    expect(() => inspectPlan(plan, 'worker', 'fixture-omp', wrongNode)).toThrow('identity/kind/initiative mismatch');
  }
});

test('malformed mapping does not fall back, and unavailable CLI cannot pass', () => {
  const file = path.join(plan, 'orchestration/climier-plan.json');
  fs.writeFileSync(path.join(plan, 'tasks.md'), 'Legacy');
  fs.writeFileSync(file, '{');
  expect(() => inspectPlan(plan, 'worker', 'fixture-omp', run)).toThrow();
  fs.writeFileSync(file, JSON.stringify(mapping));
  const unavailableCLI: ReadCommand = (executable, args) => executable === 'climier'
    ? { status: null, stdout: '' } : run(executable, args);
  expect(() => inspectPlan(plan, 'worker', 'fixture-omp', unavailableCLI)).toThrow('Climier 2.x');
});
