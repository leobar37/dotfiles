# Platform Detection & Conversion

Guía para detectar la plataforma objetivo (OpenCode vs Claude Code) y convertir entre formatos.

---

## Detección Automática de Plataforma

### Orden de Detección

```
1. Verificar directorio existente
   ├─ .opencode/agent/  → OpenCode
   ├─ .claude/agents/   → Claude Code
   └─ Ambos existen     → Preguntar o usar ambos

2. Si no existe ninguno
   ├─ Verificar herramienta en uso (contexto)
   └─ Preguntar al usuario
```

### Comandos de Detección

```bash
# Detectar OpenCode
[ -d ".opencode/agent" ] && echo "OpenCode detected"

# Detectar Claude Code
[ -d ".claude/agents" ] && echo "Claude Code detected"

# Detectar ambos
[ -d ".opencode/agent" ] && [ -d ".claude/agents" ] && echo "Both platforms"
```

---

## Comparación de Formatos

### Estructura de Frontmatter

| Campo | OpenCode | Claude Code | Notas |
|-------|----------|-------------|-------|
| **Identificador** | (nombre de archivo) | `name: agent-name` | Claude Code requiere `name` explícito |
| **Descripción** | `description:` | `description:` | Igual en ambos |
| **Herramientas** | `tools: { write: true }` | `tools: Read, Write` | Formato diferente |
| **Modelo** | No soportado | `model: inherit` | Solo Claude Code |
| **Modo** | `mode: all\|primary\|subagent` | No soportado | Solo OpenCode |
| **Temperatura** | `temperature: 0.2` | No soportado | Solo OpenCode |
| **Permisos** | `permission: { edit: ask }` | No soportado | Solo OpenCode |

### Ubicación de Archivos

| Plataforma | Directorio | Naming |
|------------|------------|--------|
| OpenCode | `.opencode/agent/` | `{project}-{package}-developer.md` |
| Claude Code | `.claude/agents/` | `{agent-name}.md` (kebab-case) |

---

## Mapeo de Tools

### OpenCode → Claude Code

```yaml
# OpenCode format
tools:
  write: true
  edit: true
  bash: false
  read: true  # implicit

# Converts to Claude Code
tools: Read, Write, Edit, Grep, Glob
```

### Tabla de Conversión

| OpenCode Tool | Claude Code Tool |
|---------------|------------------|
| `read: true` (implicit) | `Read` |
| `write: true` | `Write` |
| `edit: true` | `Edit` |
| `bash: true` | `Bash` |
| (no equivalent) | `Grep` |
| (no equivalent) | `Glob` |
| (no equivalent) | `Task` |
| (no equivalent) | `WebFetch` |
| (no equivalent) | `WebSearch` |
| (no equivalent) | `List` |

### Lógica de Conversión

```typescript
// OpenCode → Claude Code
function convertToolsToClaudeCode(openCodeTools: object): string {
  const tools = ['Read', 'Grep', 'Glob']; // Always included
  
  if (openCodeTools.write) tools.push('Write');
  if (openCodeTools.edit) tools.push('Edit');
  if (openCodeTools.bash) tools.push('Bash');
  
  return tools.join(', ');
}

// Claude Code → OpenCode
function convertToolsToOpenCode(claudeTools: string): object {
  const toolList = claudeTools.split(',').map(t => t.trim());
  
  return {
    write: toolList.includes('Write'),
    edit: toolList.includes('Edit'),
    bash: toolList.includes('Bash'),
  };
}
```

---

## Templates de Conversión

### OpenCode → Claude Code

**Input (OpenCode)**:
```markdown
---
description: Expert in API development. Creates endpoints. Use for backend.
mode: all
temperature: 0.2
tools:
  write: true
  edit: true
  bash: false
---

# API Developer

You are an expert...
```

**Output (Claude Code)**:
```markdown
---
name: api-developer
description: |
  Expert in API development. Creates endpoints. Use for backend.
  Keywords: api, backend, endpoints.
tools: Read, Write, Edit, Grep, Glob
model: inherit
---

# API Developer

You are an expert...
```

### Claude Code → OpenCode

**Input (Claude Code)**:
```markdown
---
name: code-reviewer
description: |
  Code review specialist. Analyzes code quality.
  Keywords: review, quality, security.
tools: Read, Grep, Glob, Bash
model: inherit
---

# Code Reviewer

You are a senior code reviewer...
```

**Output (OpenCode)**:
```markdown
---
description: Code review specialist. Analyzes code quality. Keywords: review, quality, security.
mode: all
temperature: 0.2
tools:
  write: false
  edit: false
  bash: true
---

# Code Reviewer

You are a senior code reviewer...
```

---

## Flujo de Decisión

```
Usuario pide: "Crea un agente para X"
          │
          ▼
    ┌─────────────┐
    │ Detectar    │
    │ plataformas │
    └─────────────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
Solo OpenCode  Solo Claude Code
    │           │
    ▼           ▼
Crear en      Crear en
.opencode/    .claude/
    │           │
    └─────┬─────┘
          │
          ▼
    ┌─────────────┐
    │ Ambos       │
    │ detectados  │
    └─────────────┘
          │
          ▼
    ┌─────────────┐
    │ Crear en    │
    │ AMBOS       │
    │ formatos    │
    └─────────────┘
```

---

## Uso Recomendado por Plataforma

### OpenCode - Ideal para:
- Agentes de **mantenimiento** de paquetes
- Agentes con **scope específico** (un directorio)
- Cuando necesitas **control de temperatura**
- Cuando necesitas **modos** (primary/subagent)

### Claude Code - Ideal para:
- Tareas **largas y complejas**
- Agentes de **análisis y planning**
- Cuando necesitas **selección de modelo** (opus para tareas complejas)
- Agentes que **delegan** a otros (Task tool)

---

## Generación Dual

Cuando se detectan ambas plataformas, generar ambos archivos:

```bash
# Estructura resultante
project/
├── .opencode/
│   └── agent/
│       └── project-api-developer.md    # OpenCode format
└── .claude/
    └── agents/
        └── api-developer.md            # Claude Code format
```

### Contenido Sincronizado

El **system prompt** (contenido después del frontmatter) debe ser **idéntico** en ambos.
Solo el frontmatter cambia según la plataforma.

---

## Checklist de Conversión

- [ ] Detecté la(s) plataforma(s) existente(s)
- [ ] Convertí el frontmatter correctamente
- [ ] Mapeé las tools al formato correcto
- [ ] Mantuve el system prompt idéntico
- [ ] Usé el naming convention correcto
- [ ] Coloqué el archivo en el directorio correcto
- [ ] Si hay ambos, generé ambas versiones
