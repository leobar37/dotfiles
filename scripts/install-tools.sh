#!/bin/bash
# install-tools.sh — instala base faltante en el target (Debian/Ubuntu).
# Uso: ./scripts/install-tools.sh [ssh_alias]
# Pide sudo en el remoto. NO instala docker ni toca contenedores.
set -e
TARGET="${1:-vultr-dev}"
ssh -t "$TARGET" 'set -e
  sudo apt-get update && sudo apt-get install -y git zsh curl ca-certificates unzip neovim gh
  echo "--- bun ---"
  if ! command -v bun >/dev/null; then curl -fsSL https://bun.sh/install | bash; else echo "bun ya instalado"; fi
  echo "--- omp/herdr ---"
  echo "Instalar OMP/Herdr con el instalador oficial de Elena Tech en el VPS (no automatizado aqui)."
  zsh --version; git --version; nvim --version | head -1
'
