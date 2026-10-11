import * as fs from 'node:fs';
import path from 'node:path';
import { hasClimierMapping, inspectProgress, readCommand, type ReadCommand } from './progress.ts';
import { createHash } from 'node:crypto';
import { invariant, object, text, modelRole, MODEL_ROLES, validId, type ModelRole } from './common.ts';

export interface ModelSelection { profile: string; profileHash: string; role: ModelRole; model: string }

export function inspectPlan(input: string, role: string, executable: string, run: ReadCommand = readCommand, profile?: string) {
  const selectedRole = modelRole(role);
  const plan = fs.realpathSync(input);
  const selectedProfile = containedProfile(plan, profile ?? 'orchestration/models.yml');
  const requiredFiles = ['goal.md','phase-index.md'];
  if (!hasClimierMapping(plan)) requiredFiles.push('tasks.md');
  for (const name of requiredFiles) {
    const file = path.join(plan,name);
    invariant(fs.existsSync(file) && fs.statSync(file).isFile() && fs.statSync(file).size > 0, 'INVALID_PLAN', `Missing or empty plan file: ${name}`);
  }
  invariant(fs.statSync(path.join(plan,'phases')).isDirectory(), 'INVALID_PLAN', 'Missing phases directory');
  const git = run('git', ['-C', plan, 'rev-parse', '--show-toplevel']);
  invariant(git.status === 0, 'INVALID_REPO', 'Plan must belong to a Git checkout');
  const repo = fs.realpathSync(git.stdout.trim());
  const progress = inspectProgress(plan, repo, run);
  return { plan, repo, ...inspectModels(selectedProfile, selectedRole, executable, undefined, run), progress };
}

// Model routing is always an exact selection from the unchanged approved overlay.
// Configuration does not mutate or reinitialize the progress backend.
export function inspectModels(profile: string, role: string, executable: string | undefined, expectedHash?: string, run: ReadCommand = readCommand): ModelSelection {
  const selectedRole = modelRole(role);
  const raw = fs.readFileSync(profile,'utf8');
  const profileHash = createHash('sha256').update(raw).digest('hex');
  invariant(expectedHash === undefined || profileHash === expectedHash, 'PROFILE_CHANGED', 'Saved model profile changed; explicit new execution is required');
  const config = object(Bun.YAML.parse(raw));
  invariant(config.setupVersion === 2, 'INVALID_PROFILE', 'models.yml requires setupVersion: 2');
  invariant(Object.keys(config).every(key => ['setupVersion','modelRoles'].includes(key)), 'INVALID_PROFILE', 'Only model settings belong in models.yml');
  const roles = object(config.modelRoles);
  const required = MODEL_ROLES;
  invariant(Object.keys(roles).every(key => (required as readonly string[]).includes(key)), 'INVALID_PROFILE', 'Unknown model role');
  for (const key of required) invariant(typeof roles[key] === 'string' && /^[A-Za-z0-9_.-]+\/[^\s<>:]+$/.test(String(roles[key])), 'INVALID_PROFILE', `Unresolved or invalid modelRoles.${key}; ask the operator for missing choices`);
  // Offline launcher preview only; start/check always supply the native executable.
  if (executable === undefined) return { profile, profileHash, role: selectedRole, model: text(roles[selectedRole]) };
  const catalogs = new Map<string, Record<string, unknown>[]>();
  for (const key of required) {
    const selector = text(roles[key]); const slash = selector.indexOf('/');
    const provider = selector.slice(0,slash), id = selector.slice(slash+1);
    if (!catalogs.has(provider)) {
      const result = run(executable,['models',provider,'--json']);
      invariant(result.status === 0, 'CATALOG_ERROR', `Cannot read ${provider} model catalog`);
      const data = object(JSON.parse(result.stdout));
      invariant(Array.isArray(data.models), 'CATALOG_ERROR', 'Invalid models catalog');
      catalogs.set(provider,data.models.map(object));
    }
    invariant(catalogs.get(provider)?.some(model => model.provider === provider && model.id === id), 'MODEL_UNAVAILABLE', `Exact model unavailable: ${selector}; refusing substitution`);
  }
  return { profile, profileHash, role: selectedRole, model: text(roles[selectedRole]) };
}

export function inspectSavedModel(profile: string, model: string, role: string | undefined, executable: string, expectedHash: string) {
  // v0.1 manifests did not store a role. Infer only an exact YAML entry, never a model.
  const raw = fs.readFileSync(profile, 'utf8');
  invariant(createHash('sha256').update(raw).digest('hex') === expectedHash, 'PROFILE_CHANGED', 'Saved model profile changed; explicit new execution is required');
  const roles = object(object(Bun.YAML.parse(raw)).modelRoles);
  const selected = role ?? MODEL_ROLES.find(key => roles[key] === model);
  invariant(selected, 'MODEL_UNAVAILABLE', 'Saved model is not declared in the approved profile');
  const result = inspectModels(profile, selected, executable, expectedHash);
  invariant(result.model === model, 'MODEL_MISMATCH', 'Saved role does not resolve to saved model');
  return result;
}

/** Resolve relative paths against the plan, rejecting lexical and symlink escapes. */
export function containedProfile(plan: string, input: string, snapshot = false): string {
  const root = fs.realpathSync(plan), candidate = path.resolve(root, input);
  invariant(candidate.startsWith(root + path.sep), 'UNSAFE_PROFILE_PATH', 'Profile must be inside the plan');
  let current = root;
  for (const part of path.relative(root, candidate).split(path.sep)) {
    current = path.join(current, part);
    let stat: fs.Stats;
    try { stat = fs.lstatSync(current); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw error; }
    invariant(!snapshot || !stat.isSymbolicLink(), 'UNSAFE_PROFILE_PATH', 'Worker snapshot paths must not contain symlinks');
    const real = fs.realpathSync(current);
    invariant(real.startsWith(root + path.sep), 'UNSAFE_PROFILE_PATH', 'Profile symlink escapes the plan');
  }
  return candidate;
}

export interface WorkerProfile extends ModelSelection { sourceProfile: string; profileExists: boolean }

/** Read-only preview. An existing worker snapshot wins over later parent edits. */
export function inspectWorkerProfile(plan: string, id: string | undefined, profile: string | undefined, role: string, executable: string | undefined, run: ReadCommand = readCommand): WorkerProfile {
  const destination = id === undefined ? undefined : containedProfile(plan, `orchestration/workers/${validId(id)}/models.yml`, true);
  const exists = destination !== undefined && fs.existsSync(destination);
  const source = containedProfile(plan, profile ?? (exists ? destination! : 'orchestration/models.yml'));
  const selected = inspectModels(source, role, executable, undefined, run);
  if (exists && source !== destination) {
    const saved = inspectModels(destination!, role, executable, undefined, run);
    invariant(saved.profileHash === selected.profileHash, 'PROFILE_EXISTS', 'Worker snapshot exists with different content; choose a fresh worker ID, never overwrite it');
  }
  return { ...selected, profile: destination ?? source, sourceProfile: source, profileExists: exists };
}

/** Create-only snapshot, after all read-only preflight and ownership checks. */
export function materializeWorkerProfile(plan: string, selected: WorkerProfile): ModelSelection {
  const destination = containedProfile(plan, selected.profile, true);
  const source = containedProfile(plan, selected.sourceProfile);
  const raw = fs.readFileSync(source);
  const hash = createHash('sha256').update(raw).digest('hex');
  invariant(hash === selected.profileHash, 'PROFILE_CHANGED', 'Profile changed since preflight');
  if (!fs.existsSync(destination)) {
    invariant(!selected.profileExists, 'PROFILE_CHANGED', 'Worker snapshot disappeared since preflight');
    fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
    containedProfile(plan, destination, true);
    // Exclusive creation rejects a concurrent creator instead of clobbering its choices.
    const fd = fs.openSync(destination, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
    try { fs.writeFileSync(fd, raw); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  }
  const savedHash = createHash('sha256').update(fs.readFileSync(destination)).digest('hex');
  invariant(savedHash === selected.profileHash, 'PROFILE_CHANGED', 'Worker snapshot changed since preflight');
  return { profile: destination, profileHash: savedHash, role: selected.role, model: selected.model };
}
