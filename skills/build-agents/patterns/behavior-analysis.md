# Behavior Analysis for Agent Creation

Guía para analizar comportamientos y patrones en el repositorio antes de crear agentes especializados.

---

## Principio Core

> **No crear agentes genéricos**. Siempre analizar el repositorio para inferir comportamientos específicos.

---

## Flujo de Análisis de Comportamientos

```
1. DETECTAR Dominio    → ¿Qué tipo de feature/paquete es?
2. BUSCAR Patrones     → ¿Qué patrones existen en el código?
3. INFERIR Reglas      → ¿Qué MUST/NEVER se derivan?
4. EXTRAER Ejemplos    → ¿Qué código de referencia usar?
5. GENERAR Agente      → Crear agente contextualizado
```

---

## Step 1: Detectar Dominio

### Búsqueda por Keywords en Request

| Keyword en Request | Dominio Inferido | Archivos a Buscar |
|-------------------|------------------|-------------------|
| "mensaje", "chat", "AI" | AI/LLM Integration | `*ai*.ts`, `*message*.ts`, `*chat*.ts` |
| "formulario", "form" | Form Handling | `*form*.tsx`, `*schema*.ts` |
| "tabla", "listado" | Data Tables | `*table*.tsx`, `*list*.tsx` |
| "autenticación", "login" | Auth | `*auth*.ts`, `*session*.ts` |
| "API", "endpoint" | Backend API | `*controller*.ts`, `*route*.ts` |
| "imagen", "media" | Media Handling | `*upload*.ts`, `*media*.ts` |

### Búsqueda por Dependencias

```bash
# Detectar stack de AI
grep -l "ai\|openai\|anthropic\|replicate" package.json

# Detectar frameworks
grep -l "react\|next\|elysia\|express" package.json
```

---

## Step 2: Buscar Patrones en Código

### 2.1 Comandos de Búsqueda

```bash
# Buscar servicios relacionados
rg -l "class.*Service" --glob "**/*.ts" | head -20

# Buscar patrones de función
rg "export (async )?function" --glob "**/ai/**/*.ts"

# Buscar interfaces/types
rg "interface|type.*=" --glob "**/types/**/*.ts"

# Buscar uso de dependencias específicas
rg "import.*from ['\"]ai['\"]" --glob "**/*.ts"
rg "generateText|generateObject|streamText" --glob "**/*.ts"
```

### 2.2 Archivos Clave por Dominio

#### AI/Message Generation
```
Buscar:
├── src/ai/              → Providers, config
├── src/services/ai/     → Services de AI
├── src/jobs/            → Background jobs
└── src/api/routes/ai*   → Endpoints
```

#### Form Handling
```
Buscar:
├── src/components/forms/    → Form components
├── src/schemas/             → Zod schemas
├── src/hooks/use*Form*      → Form hooks
└── src/lib/form-utils.ts    → Utilities
```

#### Data Tables
```
Buscar:
├── src/components/tables/   → Table components
├── src/hooks/use*Query*     → Data fetching
└── src/types/*List*         → List types
```

---

## Step 3: Inferir Reglas (MUST/NEVER)

### Análisis de Patrones Encontrados

Para cada patrón encontrado, determinar:

| Pregunta | Genera Regla |
|----------|--------------|
| ¿Siempre se usa X antes de Y? | **MUST**: Hacer X antes de Y |
| ¿Nunca se hace X directamente? | **NEVER**: Hacer X directamente |
| ¿Hay un wrapper/abstracción? | **MUST**: Usar el wrapper |
| ¿Hay error handling específico? | **MUST**: Seguir patrón de errores |
| ¿Hay validación consistente? | **MUST**: Validar con X |

### Ejemplo: Inferencia para AI Messages

Si encuentro este código:
```typescript
// Encontrado en src/services/ai/vision.service.ts
const { object } = await generateObject({
  model: openai("gpt-4o"),
  schema: ExtractedItemsSchema,  // ← Siempre usa schema Zod
  messages: [...],
  temperature: 0.1,              // ← Temperatura baja consistente
});
```

**Reglas Inferidas**:
```markdown
### 1. Structured Output Pattern (MANDATORY)
**ALWAYS** use `generateObject` with Zod schema for structured responses.
**NEVER** use `generateText` when you need structured data.

### 2. Temperature Control (MANDATORY)
**ALWAYS** use low temperature (0.1-0.3) for extraction/analysis.
**ALWAYS** use higher temperature (0.7-0.9) for creative generation.
```

---

## Step 4: Extraer Ejemplos de Referencia

### Formato de Extracción

```markdown
**Reference**: `{path/to/file.ts}:{line_number}`

\`\`\`typescript
// CORRECT - Extraído de {filename}
{código real del proyecto}

// WRONG - Anti-patrón común
{código que evitar}
\`\`\`
```

### Criterios de Selección

1. **Archivo más reciente** → Representa práctica actual
2. **Más completo** → Incluye imports, types, error handling
3. **Con comentarios** → Explica intención
4. **Usado múltiples veces** → Es un patrón establecido

---

## Step 5: Matriz de Inferencia por Dominio

### AI/LLM Integration

| Patrón Encontrado | Regla Generada |
|-------------------|----------------|
| `generateObject` + Zod | MUST use structured output |
| `try/catch` en AI calls | MUST handle API errors |
| Jobs async para AI | MUST use background jobs for heavy ops |
| Rate limiting | MUST implement rate limits |
| Strategy pattern | SHOULD use strategies for models |

### Form Handling

| Patrón Encontrado | Regla Generada |
|-------------------|----------------|
| `useForm` + Zod | MUST use react-hook-form with Zod |
| `resolver: zodResolver` | MUST use zodResolver |
| Controlled inputs | MUST use Controller for custom inputs |
| Error messages in Spanish | MUST localize error messages |

### Data Tables

| Patrón Encontrado | Regla Generada |
|-------------------|----------------|
| `@tanstack/react-table` | MUST use TanStack Table |
| `useQuery` for data | MUST use TanStack Query |
| Column definitions | MUST define columns with types |
| Pagination pattern | MUST implement server pagination |

---

## Template de Output de Análisis

Después de analizar, generar este reporte:

```markdown
## Behavior Analysis: {domain}

### Archivos Analizados
- `{path1}` - {descripción}
- `{path2}` - {descripción}

### Patrones Detectados
1. **{Patrón 1}** - Usado en {N} archivos
   - Ejemplo: `{path}:{line}`
2. **{Patrón 2}** - Usado en {N} archivos
   - Ejemplo: `{path}:{line}`

### Reglas Inferidas
1. **MUST**: {regla 1}
2. **MUST**: {regla 2}
3. **NEVER**: {anti-patrón}

### Ejemplos de Referencia
- **Best example**: `{path}` - {por qué es el mejor}
- **Complete example**: `{path}` - {qué incluye}

### Stack Detectado
- Framework: {name}
- Libraries: {list}
- Patterns: {list}
```

---

## Comandos de Análisis Rápido

```bash
# Análisis completo de AI patterns
rg -l "generateText|generateObject|streamText" --glob "**/*.ts" | \
  xargs -I {} sh -c 'echo "=== {} ===" && head -50 {}'

# Encontrar todos los services
fd -e ts -p "service" | head -20

# Encontrar patterns de error handling
rg "catch|throw|Error" --glob "**/ai/**/*.ts" -A 2 -B 2

# Encontrar configuraciones
fd -e ts -p "config|provider" | head -10
```

---

## Checklist de Análisis

Antes de crear el agente, verificar:

- [ ] Busqué archivos relevantes al dominio
- [ ] Identifiqué al menos 3 patrones consistentes
- [ ] Extraje ejemplos reales del código
- [ ] Inferí reglas MUST/NEVER basadas en patrones
- [ ] Verifiqué que las reglas son consistentes en el codebase
- [ ] Identifiqué el archivo "golden example"
- [ ] Documenté el stack/dependencias usadas
