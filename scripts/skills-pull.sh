#!/bin/bash
# skills-pull.sh — trae ~/.agents/skills (workstation, donde se editan) al repo.
# Uso: ./scripts/skills-pull.sh
# Flujo: editas en ~/.agents/skills → pull → commit → sync al VPS.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
rsync -av --delete --exclude '.skill-lock.json' --exclude 'canonical-list.txt' \
  ~/.agents/skills/ "$ROOT/skills/"
cp ~/.agents/.skill-lock.json "$ROOT/skills/.skill-lock.json" 2>/dev/null || true
ls "$ROOT/skills/" | grep -v -e canonical-list.txt -e .skill-lock.json | sort > "$ROOT/skills/canonical-list.txt"
echo "OK pull: $(ls "$ROOT/skills/" | grep -vc -e canonical-list.txt -e .skill-lock.json) skills"
git -C "$ROOT" status --short skills/ | head -10
