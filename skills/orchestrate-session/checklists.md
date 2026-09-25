# Checklist — orchestrate-session

## Rollout (al montar un proyecto nuevo)

- [ ] Plan structured en `.plans/<slug>/` con goal observable (comandos + exit codes).
- [ ] `climier init` + initiative + gates **antes** que tasks + tasks en orden de dependencias.
- [ ] `acceptance` de cada task = `end_state`/`verification` de la fase, tal cual.
- [ ] Decisiones del operador escritas en los bodies de tasks y en el plan.
- [ ] Overlay `~/code/dotfiles/omp/profiles/<slug>.yml` con los 7 roles cubiertos
      (flash: commit/smol/tiny — pro: default/slow/plan/advisor).
- [ ] Model IDs verificados contra `~/code/dotfiles/omp/catalog.json` (anti fuzzy-match).
- [ ] `prompts/omp-session-bootstrap.md` con las reglas duras del proyecto.
- [ ] `prompts/goal-objective.txt`: UNA línea, arranca con `orchestrate`, DoD observable.
- [ ] `scripts/omp-session.sh` copiado del template y `bash -n` OK.
- [ ] `./scripts/omp-session.sh --print` muestra `/goal set orchestrate ...` como primera línea.

## Lanzamiento

- [ ] Status line de OMP muestra el modelo esperado (si no → parar, revisar fuzzy match).
- [ ] `climier status` consistente con el plan (ready/blocked/gates).
- [ ] El agente arrancó por la task READY (no por una bloqueada).

## Operación

- [ ] Cada submit lleva evidencia: comandos reproducidos + exit codes.
- [ ] Ningún accept sin reproducir el acceptance personalmente.
- [ ] Gates de gasto resueltos por el operador antes de cualquier submit pagado.
- [ ] Frontmatter `status` de las fases del plan al día.
