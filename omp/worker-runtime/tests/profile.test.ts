import { test, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { containedProfile, inspectWorkerProfile, materializeWorkerProfile } from '../src/profile.ts';
import { MODEL_ROLES } from '../src/common.ts';
import type { ReadCommand } from '../src/progress.ts';

let root: string, plan: string, parent: string;
const yaml = (model = 'head') => 'setupVersion: 2\nmodelRoles:\n' + MODEL_ROLES.map(role => `  ${role}: fixture/${role === 'smol' ? 'worker' : model}\n`).join('');
const catalog: ReadCommand = (executable, args) => {
  expect(executable).toBe('fixture-omp');
  expect(args).toEqual(['models', 'fixture', '--json']);
  return { status: 0, stdout: JSON.stringify({ models: [{ provider: 'fixture', id: 'head' }, { provider: 'fixture', id: 'worker' }] }) };
};
const inspect = (id: string | undefined = 'feature-a', profile?: string, role = 'default') => inspectWorkerProfile(plan, id, profile, role, 'fixture-omp', catalog);
const destination = () => path.join(plan, 'orchestration/workers/feature-a/models.yml');
beforeEach(() => {
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'worker-profile-')));
  plan = path.join(root, 'plan with spaces');
  fs.mkdirSync(path.join(plan, 'orchestration'), { recursive: true });
  parent = path.join(plan, 'orchestration/models.yml');
  fs.writeFileSync(parent, yaml());
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

test('read-only selection inherits the coordinator while preserving every explicit role', () => {
  const selected = inspect();
  expect(selected).toMatchObject({ profile: destination(), sourceProfile: parent, profileExists: false, role: 'default', model: 'fixture/head' });
  expect(fs.existsSync(path.join(plan, 'orchestration/workers'))).toBe(false);
  expect(inspect('feature-a', undefined, 'worker')).toMatchObject({ role: 'smol', model: 'fixture/worker' });
  expect(inspect('feature-a', undefined, 'slow').model).toBe('fixture/head');
  const saved = materializeWorkerProfile(plan, selected);
  expect(fs.readFileSync(saved.profile, 'utf8')).toBe(yaml());
  expect(saved.profileHash).toBe(createHash('sha256').update(yaml()).digest('hex'));
  expect(fs.statSync(saved.profile).mode & 0o777).toBe(0o600);
  expect(fs.readFileSync(parent, 'utf8')).toBe(yaml());
});

test('explicit plan-relative source changes selection without rewriting its roles or source', () => {
  const custom = path.join(plan, 'orchestration/approved.yml');
  fs.writeFileSync(custom, yaml('worker'));
  const selected = inspect('feature-a', 'orchestration/approved.yml');
  expect(selected.model).toBe('fixture/worker');
  expect(selected.sourceProfile).toBe(custom);
  materializeWorkerProfile(plan, selected);
  expect(fs.readFileSync(destination(), 'utf8')).toBe(yaml('worker'));
  expect(fs.readFileSync(parent, 'utf8')).toBe(yaml());
  expect(fs.readFileSync(custom, 'utf8')).toBe(yaml('worker'));
});

test('existing snapshot is authoritative and never overwritten by changed parent or explicit source', () => {
  materializeWorkerProfile(plan, inspect());
  const before = fs.statSync(destination()).mtimeMs;
  fs.writeFileSync(parent, yaml('worker'));
  const selected = inspect();
  expect(selected.sourceProfile).toBe(destination());
  expect(selected.profileExists).toBe(true);
  expect(selected.model).toBe('fixture/head');
  materializeWorkerProfile(plan, selected);
  expect(fs.statSync(destination()).mtimeMs).toBe(before);
  expect(() => inspect('feature-a', parent)).toThrow('snapshot exists with different content');
  expect(fs.readFileSync(destination(), 'utf8')).toBe(yaml());
  expect(inspect('feature-b').model).toBe('fixture/worker');
});

test('source mutation after preflight fails before creating directories', () => {
  const selected = inspect();
  fs.writeFileSync(parent, yaml('worker'));
  expect(() => materializeWorkerProfile(plan, selected)).toThrow('changed since preflight');
  expect(fs.existsSync(path.join(plan, 'orchestration/workers'))).toBe(false);
});

test('a concurrent destination creator is not overwritten', () => {
  const selected = inspect();
  fs.mkdirSync(path.dirname(destination()), { recursive: true });
  fs.writeFileSync(destination(), yaml('worker'));
  expect(() => materializeWorkerProfile(plan, selected)).toThrow('changed since preflight');
  expect(fs.readFileSync(destination(), 'utf8')).toBe(yaml('worker'));
});

test('source paths reject lexical and symlink escapes before any materialization', () => {
  const outside = path.join(root, 'outside.yml');
  fs.writeFileSync(outside, yaml());
  fs.symlinkSync(outside, path.join(plan, 'orchestration/escape.yml'));
  for (const source of [outside, '../outside.yml', 'orchestration/escape.yml']) {
    expect(() => inspect('feature-a', source)).toThrow('plan');
  }
  expect(fs.existsSync(path.join(plan, 'orchestration/workers'))).toBe(false);
  expect(fs.readFileSync(outside, 'utf8')).toBe(yaml());
});

test('snapshot directory and file symlinks are rejected including in-plan links', () => {
  const elsewhere = path.join(plan, 'elsewhere');
  fs.mkdirSync(elsewhere);
  const workers = path.join(plan, 'orchestration/workers');
  fs.symlinkSync(elsewhere, workers);
  expect(() => inspect()).toThrow('must not contain symlinks');
  expect(fs.readdirSync(elsewhere)).toEqual([]);
  fs.unlinkSync(workers);
  fs.mkdirSync(path.dirname(destination()), { recursive: true });
  fs.symlinkSync(parent, destination());
  expect(() => inspect()).toThrow('must not contain symlinks');
});

test('a replaced destination ancestor is revalidated before writing', () => {
  const selected = inspect();
  const outside = path.join(root, 'outside');
  fs.mkdirSync(outside);
  fs.symlinkSync(outside, path.join(plan, 'orchestration/workers'));
  expect(() => materializeWorkerProfile(plan, selected)).toThrow('symlinks');
  expect(fs.readdirSync(outside)).toEqual([]);
});

test('contained source symlinks work, missing and dangling sources fail without effects', () => {
  const link = path.join(plan, 'orchestration/linked.yml');
  fs.symlinkSync(parent, link);
  expect(inspect('feature-a', link).model).toBe('fixture/head');
  fs.unlinkSync(link);
  fs.symlinkSync(path.join(root, 'missing.yml'), link);
  expect(() => inspect('feature-a', link)).toThrow();
  expect(() => inspect('feature-a', 'missing.yml')).toThrow();
  expect(fs.existsSync(destination())).toBe(false);
});

test('offline preview uses identical selection without invoking catalogs', () => {
  const forbidden: ReadCommand = () => { throw new Error('Offline preview queried a process'); };
  const preview = inspectWorkerProfile(plan, 'feature-a', undefined, 'smol', undefined, forbidden);
  expect(preview).toMatchObject({ model: 'fixture/worker', profileExists: false, profile: destination() });
  expect(fs.existsSync(destination())).toBe(false);
  expect(inspectWorkerProfile(plan, undefined, undefined, 'default', undefined, forbidden).profile).toBe(parent);
});

test('invalid IDs, undeclared models and unsupported inheritance macros fail closed', () => {
  expect(() => inspect('../escape')).toThrow('Worker ID');
  expect(() => inspect('feature-a', undefined, 'inherit')).toThrow();
  fs.writeFileSync(parent, yaml().replaceAll('fixture/head', 'fixture/unknown'));
  expect(() => inspect()).toThrow('Exact model unavailable');
  fs.writeFileSync(parent, 'inherit: parent\n' + yaml());
  expect(() => inspect()).toThrow('Only model settings');
  expect(() => containedProfile(plan, plan)).toThrow('inside the plan');
  expect(fs.existsSync(destination())).toBe(false);
});
