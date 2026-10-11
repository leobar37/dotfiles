#!/usr/bin/env bash
# Freeze the installed runtime and create an independent local experimental copy.
# Never invokes workerctl, starts workers, or reads/writes existing worker state.
set -euo pipefail
umask 077
if [[ $# -ne 0 ]]; then
  echo 'Usage: setup-channels.sh (uses installed runtime under $HOME; no source deployment)' >&2
  exit 2
fi
exec python3 - <<'PY'
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import stat
import tempfile


def fail(message):
    raise SystemExit(message)


def safe_path(path, kind=None):
    # Check all existing components, including dangling symlinks and HOME.
    for component in reversed((path, *path.parents)):
        if component.is_symlink():
            fail(f"Refusing symlink: {component}")
        if component.exists() and component != path and not component.is_dir():
            fail(f"Not a directory: {component}")
    if path.exists():
        info = path.stat()
        if info.st_uid != os.getuid():
            fail(f"Refusing unowned path: {path}")
        if kind == "dir" and not stat.S_ISDIR(info.st_mode):
            fail(f"Not a directory: {path}")
        if kind == "file" and (not stat.S_ISREG(info.st_mode) or info.st_nlink != 1):
            fail(f"Not a regular, unlinked file: {path}")


def inventory(root):
    safe_path(root, "dir")
    if not root.is_dir():
        fail(f"Missing runtime: {root}")
    result = {}
    for path in sorted(root.rglob("*")):
        safe_path(path)
        if path.is_dir():
            continue
        safe_path(path, "file")
        result[path.relative_to(root).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    return result


def assert_inventory(path, expected):
    if inventory(path) != expected:
        fail(f"Runtime hashes differ; refusing to overwrite: {path}")


def copy_runtime(source, target, expected):
    if target.exists() and any(target.iterdir()):
        assert_inventory(target, expected)
        return
    stage = Path(tempfile.mkdtemp(prefix=f".{target.name}.", dir=target.parent))
    try:
        shutil.copytree(source, stage, dirs_exist_ok=True, symlinks=True)
        assert_inventory(stage, expected)
        assert_inventory(source, expected)
        # Only a missing or previously checked empty directory can be replaced.
        safe_path(target, "dir")
        if target.exists():
            target.rmdir()
        stage.rename(target)
    finally:
        if stage.exists():
            shutil.rmtree(stage)


def atomic_file(path, data, mode):
    safe_path(path, "file")
    fd, name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(name, mode)
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


home = Path(os.environ["HOME"])
if not home.is_absolute() or ".." in home.parts:
    fail("HOME must be an absolute path without '..'")
installed = home / ".local/share/omp-worker-runtime-beta"
root = home / ".local/share/omp-worker-runtime"
releases = root / "releases"
experimental = home / ".local/share/omp-worker-runtime-experimental"
experimental_home = home / ".local/state/omp-workers-experimental"
bin_dir = home / ".local/bin"
beta_bin = bin_dir / "workerctl-beta"
experimental_bin = bin_dir / "workerctl-experimental"
receipt = root / "channels.json"
backup_root = root / "backups"
for directory in (installed, root, releases, experimental, experimental_home, bin_dir, backup_root):
    safe_path(directory, "dir")
for file in (beta_bin, experimental_bin, receipt, root / ".setup.lock"):
    safe_path(file, "file")
if not installed.is_dir():
    fail(f"Install the beta runtime first: {installed}")
root.mkdir(parents=True, exist_ok=True, mode=0o700)
# Serialize this setup; do not coordinate with or modify live supervisor locks.
with (root / ".setup.lock").open("a") as lock:
    fcntl.flock(lock, fcntl.LOCK_EX)
    files = inventory(installed)
    for required in ("package.json", "src/workerctl.ts", "src/supervisor.ts", "src/guard.ts"):
        if required not in files:
            fail(f"Incomplete installed runtime: missing {required}")
    version = json.loads((installed / "package.json").read_text())["version"]
    if not isinstance(version, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9.+-]*", version):
        fail("Unsafe runtime version")
    digest = hashlib.sha256(json.dumps(files, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    release = releases / f"{version}-{digest}"
    safe_path(release, "dir")
    record = {"schema": 1, "version": version, "sha256": digest, "release": str(release), "files": files}
    managed = receipt.exists()
    if managed and json.loads(receipt.read_text()) != record:
        fail("Installed runtime or channel receipt changed; refusing to repin or replace experimental code")
    if release.exists():
        assert_inventory(release, files)
    if experimental.exists() and any(experimental.iterdir()):
        if not managed:
            fail(f"Refusing nonempty experimental installation without matching receipt: {experimental}")
        assert_inventory(experimental, files)
    if experimental_home.exists():
        # Inspect only the top level. Never adopt existing stable/foreign state.
        if not managed and any(experimental_home.iterdir()):
            fail(f"Refusing nonempty experimental state on first setup: {experimental_home}")
        if stat.S_IMODE(experimental_home.stat().st_mode) != 0o700:
            fail(f"Experimental state must already have mode 700: {experimental_home}")
    original_beta = b'''#!/usr/bin/env bash
# omp-worker-runtime-beta managed launcher
set -euo pipefail
export PATH="$HOME/.bun/bin:$PATH"
exec bun "${OMP_WORKER_RUNTIME:-$HOME/.local/share/omp-worker-runtime-beta}/src/workerctl.ts" "$@"
'''
    beta = f'''#!/usr/bin/env bash
# omp-worker-runtime-beta managed launcher
# Frozen by setup-channels.sh; OMP_WORKER_RUNTIME explicitly bypasses the pin.
set -euo pipefail
export PATH="$HOME/.bun/bin:$PATH"
default_runtime={shlex.quote(str(release))}
exec bun "${{OMP_WORKER_RUNTIME:-$default_runtime}}/src/workerctl.ts" "$@"
'''.encode()
    experiment = f'''#!/usr/bin/env bash
# omp-worker-runtime-experimental managed launcher
# Explicit OMP_WORKER_HOME/OMP_EXPERIMENTAL_RUNTIME overrides bypass isolation.
# OMP_WORKER_RUNTIME is intentionally ignored by this launcher.
set -euo pipefail
export PATH="$HOME/.bun/bin:$PATH"
export OMP_WORKER_HOME="${{OMP_WORKER_HOME:-$HOME/.local/state/omp-workers-experimental}}"
default_runtime={shlex.quote(str(experimental))}
exec bun "${{OMP_EXPERIMENTAL_RUNTIME:-$default_runtime}}/src/workerctl.ts" "$@"
'''.encode()
    desired = {beta_bin: beta, experimental_bin: experiment}
    previous = {}
    for path, content in desired.items():
        if path.exists():
            previous[path] = path.read_bytes()
            allowed = (original_beta, content) if path == beta_bin else (content,)
            if previous[path] not in allowed:
                fail(f"Refusing unrelated or modified launcher: {path}")
    changed = {path: content for path, content in desired.items() if previous.get(path) != content}
    backup = None
    if changed:
        backup_root.mkdir(parents=True, exist_ok=True, mode=0o700)
        backup = Path(tempfile.mkdtemp(prefix="setup-", dir=backup_root))
        # Back up every existing wrapper before replacing either one.
        for path, content in previous.items():
            shutil.copy2(path, backup / path.name)
            if (backup / path.name).read_bytes() != content:
                fail(f"Launcher changed while backing up: {path}")
    releases.mkdir(parents=True, exist_ok=True, mode=0o700)
    copy_runtime(installed, release, files)
    copy_runtime(release, experimental, files)
    experimental_home.mkdir(parents=True, exist_ok=True, mode=0o700)
    bin_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    # Receipt also permits safe continuation if a later launcher write fails.
    if not managed:
        atomic_file(receipt, (json.dumps(record, indent=2, sort_keys=True) + "\n").encode(), 0o600)
    for path, content in changed.items():
        safe_path(path, "file")
        if (path.read_bytes() if path.exists() else None) != previous.get(path):
            fail(f"Launcher changed during setup: {path}")
        atomic_file(path, content, 0o755)
    print(json.dumps({"version": version, "sha256": digest, "release": str(release),
                      "installed_untouched": str(installed), "experimental": str(experimental),
                      "experimental_home": str(experimental_home), "launchers": [str(p) for p in desired],
                      "backup": str(backup) if backup else None, "receipt": str(receipt),
                      "workers_started": False}, indent=2))
PY
