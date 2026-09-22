#!/bin/bash
# audit.sh — compara workstation (canon) vs target. Solo lectura, sin secretos.
# Uso: ./scripts/audit.sh [ssh_alias]   (default: vultr-dev)
set -u
TARGET="${1:-vultr-dev}"
echo "== AUDIT local (workstation) =="
echo "nvim: $(ls ~/.config/nvim/lua/*.lua 2>/dev/null | wc -l) ficheros lua"
echo "skills: $(ls ~/.agents/skills 2>/dev/null | wc -l) skills"
echo "factory-symlinks-rotos: $(find ~/.factory/skills -xtype l 2>/dev/null | wc -l)"
echo "opencode: $(ls ~/.config/opencode/agents 2>/dev/null | wc -l) agents / $(ls ~/.config/opencode/commands 2>/dev/null | wc -l) commands"
echo "pi-settings: $(test -f ~/.pi/agent/settings.json && echo present || echo missing)"
echo "omp-config: $(test -f ~/.omp/agent/config.yml && echo present || echo missing)"
echo ""
echo "== AUDIT remoto ($TARGET) =="
ssh -o ConnectTimeout=8 -o BatchMode=yes "$TARGET" '
  set -u
  echo "host=$(hostname) user=$(whoami)"
  for p in ~/.config/nvim/init.lua ~/.agents/skills ~/.factory/skills ~/.config/opencode/opencode.json ~/.pi/agent/settings.json ~/.omp/agent/config.yml; do
    if [ -e "$p" ]; then echo "EXISTS $p"; else echo "MISSING $p"; fi
  done
  echo "skills-count=$(ls ~/.agents/skills 2>/dev/null | wc -l)"
  for t in git bun omp herdr gh zsh nvim; do
    command -v "$t" >/dev/null 2>&1 && echo "tool=$t installed" || echo "tool=$t missing"
  done
'
