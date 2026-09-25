---
name: climier
description: "Execute large plans from planner using climier as task DAG + OMP RPC sessions as workers. Use when a plan has multiple phases, dependencies, or parallel agents — climier tracks what's ready/blocked/submitted/done while OMP workers do the coding. Covers the full loop: spawn workers, monitor with background watchers, steer mid-flight, validate with gates, accept/reject. Triggers on climier, task DAG, take/submit/accept, orchestrator workers, decision gates, ready/blocked tasks, stale claim."
---

# climier — Ejecutar planes grandes con agentes coordinados

**Cuándo usar**: `planner` produjo un plan con múltiples fases, dependencias
o unidades paralelas. climier es la capa de ejecución — el registro durable
del DAG que sobrevive sesiones, compactions y handoffs.

**Cuándo NO usar**: plan lineal sin dependencias (un todo basta), algo que
requiera ejecución/scheduling (climier solo registra estado).

## Flujo con planner

```
planner → .plans/<slug>/ (plan + fases + subagent prompts)
                ↓
         climier (tú registras las fases como tasks + gates)
                ↓
    spawn OMP workers por task (RPC, contract prompt)
                ↓
    workers hacen submit → tú validas (gate) → accept
```

## Setup (una vez por proyecto)

```bash
cd <repo>
climier init
climier add-initiative <nombre> --desc "..." --as orchestrator

# Gates = decisiones del operador que bloquean
climier add-gate G-go-launch --initiative <n> --title "Go" --purpose approval

# Tasks = fases del plan de planner
climier add-task T-m1-<slug> --initiative <n> \
  --title "..." --body "..." --acceptance "criterios binarios" \
  --blocked-by G-go-launch --as orchestrator
```

## Lanzar un worker

### 1. Take
```bash
climier take T-m1-<slug> --as <producto>:<meta>
```

### 2. Prompt del worker (estructura fija)
```
IDENTIDAD + ARCHIVOS (contrato → táctica → normativa)
CONTRATO verbatim (bloque del goal file)
REGLAS: auditar antes de done, budget ≠ done, nunca accept propio
CLIMIER: add-note para bloqueos, submit al terminar
```

### 3. Spawn por RPC (eval kernel)
```javascript
const WT = "<worktree>";
globalThis.m1 = Bun.spawn(["/home/leobar37/.bun/bin/omp", "--mode", "rpc", "--cwd", WT],
  { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
globalThis.m1buf = ""; globalThis.m1id = 0;
globalThis.m1send = (o) => {
  o.id = `m1-${++globalThis.m1id}`;
  globalThis.m1.stdin.write(JSON.stringify(o) + "\n");
  return o.id;
};
(async () => { const d = new TextDecoder();
  for await (const c of globalThis.m1.stdout) globalThis.m1buf += d.decode(c); })();
(async () => { const d = new TextDecoder();
  for await (const c of globalThis.m1.stderr) globalThis.m1buf += `[stderr] ${d.decode(c)}`; })();
globalThis.m1wait = async (re, ms = 15000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (re.test(globalThis.m1buf)) return true;
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
};

// Configurar:
globalThis.m1send({ type: "set_model", provider: "zai", modelId: "glm-5.3" });
globalThis.m1send({ type: "set_session_name", name: "<producto>:<meta>" });
globalThis.m1send({ type: "set_todos", phases: [...] });

// Prompt:
const txt = await Bun.file("/tmp/m1-prompt.txt").text();
globalThis.m1send({ type: "prompt", message: txt });
await globalThis.m1wait(/"type":"agent_start"/, 25000); // ✓ arrancó
```

⚠️ **NUNCA `sleep` >10s en celdas eval** — mata el kernel → cierra stdin del
worker → muere con exit 0 silencioso.

## Monitoreo: los dos despertadores

El coordinador no vive pendiente — **los background jobs lo despiertan**:

```bash
# WATCHER (async bash): despierta en submit o muerte
PID=$(pgrep -f "omp --mode rpc" | tail -1)
while ...; do
  climier show T-x | grep -q submitted && echo "SUBMITTED" && exit 0
  ! kill -0 $PID && echo "WORKER_DIED" && exit 1
  sleep 30
done

# TICKER (async bash): despierta cada 10 min
sleep 600 && echo "TICK"
```

Al despertar por TICK (rutina ≤1 min):
1. `climier status` + `history` (¿notas? ¿cambios?)
2. Kernel: `get_state` → streaming, contextUsage, todoPhases
3. Trim buffer a 2MB: `globalThis.m1buf = globalThis.m1buf.slice(-2_000_000)`
4. Una línea en bitácora + re-armar ticker

**Anti-atasco**: 2 ticks sin crecimiento de buffer → steer pidiendo status.

## Gate (validar, no confiar)

Reproducir TODOS los criterios del contrato personalmente:

```bash
bun run typecheck && bun run test  # etc...
```

```bash
# Pasó todo:
climier accept T-x --as coordinator   # → cascada: dependientes ready

# Falló algo:
climier reject T-x --reason "gap"     # → steer + reintentar
```

## Steering (cambios mid-flight)

```javascript
globalThis.m1send({ type: "steer", message: "CAMBIO: ... nueva instrucción ..." });
```

Worker consume steers en el próximo turno. Registrar enmienda en goal file.

## Recovery

| Escenario | Acción |
|---|---|
| Worker murió | Sesión persistió → re-spawn con `--continue` |
| Budget agotado | `climier release` + goal file `budget-limited` |
| Claim estancada | `climier release --as orchestrator` |
| Accept por error | `climier reopen --reason "..."` |

## Anti-patterns

| ❌ | ✅ |
|---|---|
| Accept sin reproducir gate | Correr comandos tú mismo |
| Sleep >10s en eval | Celdas cortas o bg jobs |
| Worker hace accept | Solo coordinador valida |
| Buffer como evidencia de done | Solo submit + tu gate |
| Merge sin permiso del operador | Esperar el go |
| `@file` en RPC (rechazado) | Paths como texto |

## Comandos esenciales

Ver [`references/commands.md`](./references/commands.md) para la referencia
completa del CLI. Los más usados:

| Comando | Para |
|---|---|
| `status` / `context <id>` | Ver qué está ready/blocked |
| `take <id> --as <agent>` | Claim atómico |
| `submit <id> --note "evidencia" --as <agent>` | Worker entrega |
| `accept <id> --as coordinator` | Validado → cascada |
| `reject <id> --reason "gap"` | Devuelto a open |
| `add-note <id> "texto"` | Canal de escalación mid-flight |
| `resolve G-x --choice --rationale` | Resolver un gate |
| `release <id>` | Liberar claim estancada |
