#!/usr/bin/env bash
# Lanza una sesión OMP para ejecutar un plan con overlay de roles.
# El goal se inyecta de una vez al inicio (/goal set con la keyword "orchestrate").
#
# Uso:
#   ./scripts/omp-session.sh                  # sesión con goal automático
#   ./scripts/omp-session.sh "haz X"          # agrega una instrucción extra al prompt
#   ./scripts/omp-session.sh --no-goal        # sin goal automático
#   ./scripts/omp-session.sh --print          # imprime el prompt sin invocar omp
#
# Variables:
#   OMP_PROFILE   ruta al overlay (default: ~/code/dotfiles/omp/profiles/<slug>.yml)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROFILE="${OMP_PROFILE:-$HOME/code/dotfiles/omp/profiles/<slug>.yml}"
BOOTSTRAP_FILE="$REPO_ROOT/prompts/omp-session-bootstrap.md"
GOAL_FILE="$REPO_ROOT/prompts/goal-objective.txt"

PRINT_ONLY=0
WITH_GOAL=1
EXTRA=""
for arg in "$@"; do
  case "$arg" in
    --print) PRINT_ONLY=1 ;;
    --no-goal) WITH_GOAL=0 ;;
    *) EXTRA="$arg" ;;
  esac
done

if [[ ! -f "$PROFILE" ]]; then
  echo "error: no existe el overlay: $PROFILE" >&2
  exit 1
fi
if [[ ! -f "$BOOTSTRAP_FILE" ]]; then
  echo "error: no existe el prompt bootstrap: $BOOTSTRAP_FILE" >&2
  exit 1
fi
if [[ "$WITH_GOAL" -eq 1 && ! -f "$GOAL_FILE" ]]; then
  echo "error: no existe el objetivo del goal: $GOAL_FILE" >&2
  exit 1
fi

PROMPT=""

# 1. Goal de una vez: /goal set con el objetivo en una sola línea.
if [[ "$WITH_GOAL" -eq 1 ]]; then
  GOAL_OBJECTIVE="$(tr -d '\n' < "$GOAL_FILE")"
  PROMPT="/goal set ${GOAL_OBJECTIVE}"
fi

# 2. Bootstrap de la sesión (identidad, plan, reglas de climier).
if [[ -n "$PROMPT" ]]; then
  PROMPT="$PROMPT

$(cat "$BOOTSTRAP_FILE")"
else
  PROMPT="$(cat "$BOOTSTRAP_FILE")"
fi

# 3. Instrucción extra del operador.
if [[ -n "$EXTRA" ]]; then
  PROMPT="$PROMPT

## Instrucción adicional del operador
$EXTRA"
fi

if [[ "$PRINT_ONLY" -eq 1 ]]; then
  echo "=== profile: $PROFILE ==="
  echo "=== cwd:     $REPO_ROOT ==="
  echo "=== prompt ==="
  echo "$PROMPT"
  exit 0
fi

exec omp --config "$PROFILE" --cwd "$REPO_ROOT" "$PROMPT"
