#!/bin/bash
# sync.sh — empuja configs del repo hacia un target. NO toca secretos.
# Uso: ./scripts/sync.sh [ssh_alias] [modulo...]
# Módulos: nvim skills opencode pi omp shell  (default: todos menos omp/pi que son safe-only)
set -e
TARGET="${1:-vultr-dev}"; shift || true
MODULES="${*:-nvim skills opencode pi omp shell climier}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "target=$TARGET modules=$MODULES"
for m in $MODULES; do case "$m" in
  nvim)
    ssh "$TARGET" 'mkdir -p ~/.config/nvim/lua'
    rsync -av "$ROOT/nvim/init.lua" "$TARGET:~/.config/nvim/init.lua"
    rsync -av "$ROOT/nvim/lua/" "$TARGET:~/.config/nvim/lua/"
    ;;
  skills)
    ssh "$TARGET" 'mkdir -p ~/.agents/skills'
    # canon: skills/ del repo (versionado); meta local no se empuja
    rsync -av --delete --exclude '.skill-lock.json' --exclude 'canonical-list.txt' "$ROOT/skills/" "$TARGET:~/.agents/skills/"
    ;;
  opencode)
    ssh "$TARGET" 'mkdir -p ~/.config/opencode'
    rsync -av "$ROOT/opencode/agents/" "$TARGET:~/.config/opencode/agents/"
    rsync -av "$ROOT/opencode/commands/" "$TARGET:~/.config/opencode/commands/"
    [ -d "$ROOT/opencode/prompts" ] && rsync -av "$ROOT/opencode/prompts/" "$TARGET:~/.config/opencode/prompts/"
    echo "NOTA: opencode.json NO se copia automatico (revisar .safe y aplicar a mano)"
    ;;
  pi)
    ssh "$TARGET" 'mkdir -p ~/.pi/agent'
    rsync -av "$ROOT/pi/settings.json" "$TARGET:~/.pi/agent/settings.json"
    echo "NOTA: auth.json NUNCA se sincroniza (re-autenticar en el VPS)"
    ;;
  omp)
    # Solo prefs versionadas. NUNCA db, tokens ni broker.env.
    ssh "$TARGET" 'test -f ~/.omp/agent/config.yml && cp ~/.omp/agent/config.yml ~/.omp/agent/config.yml.bak.$(date +%Y%m%d-%H%M%S) && echo backed-up || echo no-previo'
    ssh "$TARGET" 'mkdir -p ~/.omp/agent'
    rsync -av "$ROOT/omp/config.safe.yml" "$TARGET:~/.omp/agent/config.yml"
    rsync -av "$ROOT/omp/models.yml" "$TARGET:~/.omp/agent/models.yml"
    rsync -av "$ROOT/omp/SYSTEM.md" "$TARGET:~/.omp/agent/SYSTEM.md"
    echo "NOTA: broker.env y auth manual por stdin, nunca via git"
    ;;
  shell)
    rsync -av "$ROOT/shell/.zshenv" "$TARGET:~/.zshenv"
    echo "NOTA: .zshrc/.bashrc solo como .safe en el repo; aplicar a mano si se desea"
    ;;
  climier)
    ssh "$TARGET" 'mkdir -p ~/code ~/.local/bin ~/.climier ~/.climier/projects'
    # Base 2.0.0 (rama local climier-2.0.0 en ~/code/climier) → dir estable remoto.
    # Se excluye .climier.json: el del workstation apunta a un backend remote y
    # bloquearía `migrate`/dispatch local en el remoto.
    rsync -av --delete --exclude '.git/' --exclude 'node_modules/' --exclude 'web/' --exclude '.plans/' --exclude '.climier.json' ~/code/climier/ "$TARGET:~/code/climier-stable/"
    printf '#!/bin/sh\nexport PATH="$HOME/.bun/bin:$PATH"\nexec "$HOME/code/climier-stable/bin/climier.ts" "$@"\n' | ssh "$TARGET" 'cat > ~/.local/bin/climier && chmod +x ~/.local/bin/climier'
    # Backend local + project_id propio de climier-stable (como en el workstation)
    printf '{\n  "version": 1,\n  "project_id": "b4e2c579bbb81669"\n}\n' | ssh "$TARGET" 'cat > ~/code/climier-stable/.climier.json'
    rsync -av ~/.climier/projects/ "$TARGET:~/.climier/projects/"
    # Nombres legibles para el board (parche local: <stateDir>/names.json)
    if [ -f ~/.climier/names.json ]; then rsync -av ~/.climier/names.json "$TARGET:~/.climier/names.json"; fi
    # El binario 2.0.0 no lee estado legacy (v2-v5): migrar lo que quede en el remoto
    ssh "$TARGET" 'export PATH="$HOME/.bun/bin:$PATH"; cd ~/code/climier-stable && "$HOME/code/climier-stable/bin/climier.ts" migrate --all >/dev/null 2>&1 && echo "  migrate: ok" || echo "  migrate: SKIP (revisar a mano)"'
    echo "NOTA: estado DAG workstation manda (canonical v1); requiere bun remoto"
    ;;
esac; done
echo "OK sync $TARGET"
