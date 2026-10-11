#!/usr/bin/env bash
# Installs beta code only. No services, workers, credentials or task state are copied.
set -euo pipefail
umask 077
export PATH="$HOME/.bun/bin:$PATH"
SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$HOME/.local/share/omp-worker-runtime-beta"
BIN="$HOME/.local/bin/workerctl-beta"
command -v bun >/dev/null 2>&1 || { echo 'Bun is required' >&2; exit 1; }
bun -e 'const [a,b,c]=Bun.version.split(".").map(x=>parseInt(x,10)); if(a<1 || (a===1 && (b<3 || (b===3 && c<14))) || typeof Bun.YAML?.parse!=="function" || typeof Promise.withResolvers!=="function") {console.error("Bun >=1.3.14 with YAML and Promise.withResolvers is required"); process.exit(1)}'
if [[ -e "$BIN" ]] && ! grep -q 'omp-worker-runtime-beta managed launcher' "$BIN"; then
  echo "Refusing to replace unrelated executable: $BIN" >&2; exit 1
fi
check_idle() {
  if [[ -f "$DEST/src/workerctl.ts" ]]; then
    bun "$DEST/src/workerctl.ts" list | bun -e '
const data=JSON.parse(await Bun.stdin.text());
if(data.ok!==true || !Array.isArray(data.result) || data.result.some(w=>w.error || w.supervisorAlive || w.workerAlive || !["stopped","failed","interrupted"].includes(w.lifecycle))) {
 console.error("Active or unknown beta workers prevent runtime replacement. Stop/reconcile them explicitly first.");process.exit(1);
}'
  fi
}
check_idle
mkdir -p "$HOME/.local/share" "$HOME/.local/bin"
STAGE="$(mktemp -d "$HOME/.local/share/omp-worker-runtime-beta.new.XXXXXX")"
trap 'if [[ -d "$STAGE" ]]; then rm -rf "$STAGE"; fi' EXIT
mkdir "$STAGE/src"
cp "$SOURCE/package.json" "$STAGE/package.json"
cp "$SOURCE/README.md" "$STAGE/README.md"
for file in common.ts profile.ts progress.ts feedback.ts rpc.ts guard.ts supervisor.ts workerctl.ts; do
  cp "$SOURCE/src/$file" "$STAGE/src/$file"
done
bun "$STAGE/src/workerctl.ts" --help >/dev/null
check_idle
BACKUP=""
if [[ -e "$DEST" ]]; then
  [[ -d "$DEST" && ! -L "$DEST" ]] || { echo 'Refusing an unexpected runtime destination' >&2; exit 1; }
  mkdir -p "$HOME/.local/share/omp-worker-runtime-beta.backups"
  BACKUP="$(mktemp -d "$HOME/.local/share/omp-worker-runtime-beta.backups/release.XXXXXX")"
  [[ ! -e "$BIN" ]] || cp "$BIN" "$BACKUP/workerctl-beta"
  mv "$DEST" "$BACKUP/runtime"
fi
if ! mv "$STAGE" "$DEST"; then
  [[ -z "$BACKUP" ]] || mv "$BACKUP/runtime" "$DEST"
  exit 1
fi
cat > "$BIN.new" <<'SH'
#!/usr/bin/env bash
# omp-worker-runtime-beta managed launcher
set -euo pipefail
export PATH="$HOME/.bun/bin:$PATH"
exec bun "${OMP_WORKER_RUNTIME:-$HOME/.local/share/omp-worker-runtime-beta}/src/workerctl.ts" "$@"
SH
chmod 755 "$BIN.new"
mv "$BIN.new" "$BIN"
printf 'Installed beta runtime: %s\nCLI: %s\nBackup: %s\nNo service or worker was started.\n' "$DEST" "$BIN" "${BACKUP:-not needed (first install)}"
