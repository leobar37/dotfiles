---
name: orchestrate-session
description: Monta el workflow estándar de ejecución de planes: plan de planner → DAG en climier → sesión OMP con overlay de modelos (pro=tareas pesadas, flash=fáciles) y goal automático /goal set con la keyword "orchestrate". Use when the user asks to launch, run or execute a plan with climier, set up an OMP execution session, create a model-role overlay, or inject a goal at session start. Keywords: orchestrate, climier, ejecutar plan, sesión OMP, overlay de modelos, goal automático, task DAG, workers.
---

# orchestrate-session — estándar de ejecución de planes

Estandariza el pasaje **plan → ejecución supervisada**:
`planner` produce un plan structured en `.plans/<slug>/` → `climier` registra el DAG
durable (tasks + gates) → una sesión OMP se lanza con overlay de modelos e inyecta el
goal de una vez (keyword `orchestrate`).

Caso de referencia implementado: `~/code/video-maker` (plan `extract-video-pipeline`).

## Requisitos

- Plan structured válido en `.plans/<slug>/` (goal.md + phase-index.md + phases/*.md) — crear con la skill `planner` si no existe.
- `climier` instalado (`climier --help`).
- `omp` instalado y un overlay de modelos en `~/code/dotfiles/omp/profiles/`.
- El DoD del goal debe ser **observable** (comandos + exit codes), nunca "listo para producción".

## Paso 1 — Sembrar el DAG en climier

```bash
cd <repo>
climier init                                    # idempotente
climier add-initiative <slug> --desc "<qué y dónde vive el plan>" --as orchestrator
# Gates ANTES que tasks (el bloqueador debe existir primero):
climier add-gate G-<nombre> --initiative <slug> --title "..." --purpose approval --as orchestrator
# Tasks = fases del plan, en orden de dependencias:
climier add-task T-<fase> --initiative <slug> --title "..." \
  --body "Leer .plans/<slug>/phases/<archivo>.md y ejecutarlo completo. <decisiones del operador>" \
  --acceptance "<criterios binarios: comandos + exit codes>" \
  --blocked-by "<T-padre>" --as orchestrator      # --blocked-by "" si no tiene
```

Reglas:
- Un task por fase goal-unit del plan; `--acceptance` = el `end_state`/`verification` del frontmatter de la fase, tal cual.
- Bloqueadores primero (si no, `INVALID_EDGE_TARGET`). `add-task` exige `--blocked-by` siempre.
- Gates para todo lo que requiere decisión humana (gasto real, merge, deploy).
- Las decisiones del operador (alcance, arquitectura) van EN el body del task, no solo en el plan.

## Paso 2 — Overlay de modelos OMP

Crear `~/code/dotfiles/omp/profiles/<slug>.yml` (ver `templates/overlay.yml`):

```yaml
setupVersion: 2
modelRoles:
  commit:  <provider>/<mimo-flash>:high   # chores
  smol:    <provider>/<mimo-flash>:high   # tareas fáciles
  tiny:    <provider>/<mimo-flash>:high
  default: <provider>/<mimo-pro>          # modelo de la sesión
  slow:    <provider>/<mimo-pro>          # fases pesadas / debugging
  plan:    <provider>/<mimo-pro>          # planificación
  advisor: <provider>/<mimo-pro>          # arquitectura
```

⚠️ **Trampa verificada (fuzzy match silencioso)**: `omp --model` hace fuzzy match. Si el
provider o el modelo no existen en `catalog.json`, resuelve **otro modelo sin avisar**
(caso real: `xiaomi-plain/mimo-v2.6-pro` → cargó `DeepSeek-V4-Pro`). SIEMPRE verificar que
`<provider>/<modelo>` exista en `~/code/dotfiles/omp/catalog.json` antes de usarlo, y
confirmar la status line al iniciar la sesión.

⚠️ El overlay aplica **solo por run** (`omp --config ...`): `config list` no lo muestra y
una sesión abierta no se entera de los cambios. Relanzar para aplicar.

## Paso 3 — Prompts de la sesión

- `prompts/omp-session-bootstrap.md` (ver template): identidad del orquestador, ubicación
  del plan y del DAG, y las reglas duras:
  1. Flujo por task: `take` → ejecutar la fase completa → **reproducir personalmente el
     acceptance** → `submit` con evidencia (comandos + exit codes) → esperar validación.
  2. Nunca "done" sin reproducir los comandos de verificación; buffer/promesa ≠ done.
  3. Presupuesto ≠ done; agotado → `release` + `budget-limited`.
  4. Bloqueos vía `add-note`; gasto real solo con el gate resuelto.
  5. Prohibiciones del proyecto (imports prohibidos, secretos, etc.) explícitas.
- `prompts/goal-objective.txt` (ver template): **una sola línea**, arrancando con la
  keyword **`orchestrate`** (sin signos ni brackets), con el DoD observable del goal.

## Paso 4 — Script lanzador

`scripts/omp-session.sh` (ver `templates/omp-session.sh`): arma el prompt e invoca

```bash
omp --config "$OMP_PROFILE" --cwd "$REPO_ROOT" "$PROMPT"
```

- Inyecta `/goal set <objetivo>` **como primera línea** del prompt (el goal corre de una vez).
- Flags: `--print` (preview sin invocar omp), `--no-goal` (entrar sin goal), arg libre
  (instrucción extra del operador). Env: `OMP_PROFILE` sobreescribible.

## Paso 5 — Verificar antes de lanzar

```bash
bash -n scripts/omp-session.sh                 # sintaxis
./scripts/omp-session.sh --print | head -3     # primera línea: /goal set orchestrate ...
grep -o '<provider>/<modelo>' ~/code/dotfiles/omp/catalog.json   # IDs existentes
```

Al lanzar: revisar que la status line muestre el modelo esperado. Si no, **parar** (ver trampa fuzzy).

## Paso 6 — Operar la ejecución

```bash
climier status            # ready / blocked / gates
climier context T-<id>    # qué toca hacer
```

Workflow por task: `take` → ejecutar → reproducir acceptance → `submit --note "<evidencia>"`.
La validación (accept/reject) es del coordinador/operador: **reproducir los comandos
personalmente** antes de `accept`. `reject --reason` devuelve a open para reintentar.

## Anti-patterns

| ❌ | ✅ |
|---|---|
| Accept sin reproducir el gate | Correr los comandos uno mismo |
| Model IDs inventados (fuzzy match) | Verificar en catalog.json + status line |
| Goal en texto libre multilínea | Una línea que arranca con `orchestrate` |
| Tasks antes que sus gates/bloqueadores | initiative → gates → tasks en orden |
| Decisiones del operador solo en el aire | Escritas en body del task y en el plan |
| Gasto real sin gate | `G-*` de aprobación resuelto primero |

## Templates

- `templates/overlay.yml` — overlay de roles (flash=fácil, pro=pesado).
- `templates/omp-session-bootstrap.md` — prompt de sesión con reglas.
- `templates/goal-objective.txt` — objetivo `/goal set` con keyword `orchestrate`.
- `templates/omp-session.sh` — lanzador con goal automático.

## Checklist de rollout

Ver `checklists.md`.
