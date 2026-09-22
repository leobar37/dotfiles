#!/bin/bash
# sync.sh — empuja configs del repo hacia un target. NO toca secretos.
# Uso: ./scripts/sync.sh [ssh_alias] [modulo...]
# Módulos: nvim skills opencode pi omp shell  (default: todos menos omp/pi que son safe-only)
set -e
TARGET="${1:-vultr-dev}"; shift || true
MODULES="${*:-nvim skills opencode pi omp shell}"
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
    # canon: ~/.agents/skills de la workstation (fuente viva, no el repo)
    rsync -av --delete ~/.agents/skills/ "$TARGET:~/.agents/skills/"
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
    echo "OMP es safe-only: revisar omp/config.safe.yml y aplicar a mano en el VPS."
    echo "broker.env NUNCA via git: copiar con: cat ~/.config/omp/broker.env | ssh $TARGET 'cat > ~/.config/omp/broker.env && chmod 600 ~/.config/omp/broker.env'"
    ;;
  shell)
    rsync -av "$ROOT/shell/.zshenv" "$TARGET:~/.zshenv"
    echo "NOTA: .zshrc/.bashrc solo como .safe en el repo; aplicar a mano si se desea"
    ;;
esac; done
echo "OK sync $TARGET"
