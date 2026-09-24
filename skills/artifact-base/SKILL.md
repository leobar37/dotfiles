---
name: artifact-base
description: |
  Shared logic for generating visual HTML artifacts from conversation, prompt,
  or @docs and saving output to docs/artifacts/[slug]/index.html. Use when
  running artifact, artifact-study, artifact-wireframe, visual summary, HTML
  explainers, UI flow artifacts, or docs-to-visual-page workflows. Keywords:
  artifact, artifact-study, artifact-wireframe, html visual, docs artifacts,
  svg inline.
---

# Artifact Base

Skill base compartida para `/artifact`, `/artifact-study` y
`/artifact-wireframe`.

## Misión

Convertir información (conversación, prompt o `@docs`) en una página HTML visual
útil, legible y rápida de escanear.

El resultado debe guardarse siempre en:

- `docs/artifacts/[slug]/index.html`

## Contrato de Compatibilidad

Esta skill existe para separar lógica compartida **sin cambiar la interfaz** de
los comandos existentes.

Debe preservar:

- comandos de entrada (`/artifact`, `/artifact-study`, `/artifact-wireframe`)
- uso de conversación + `$ARGUMENTS` + `@docs`
- salida en `docs/artifacts/[slug]/index.html`
- notificación de refresh al dashboard via `artifact refresh`
- sesgos por alias (genérico, explicativo, UI)

Más detalle en `references/compatibility.md`.

## Modos

La skill soporta cuatro modos:

- `generic`
- `study`
- `wireframe`
- `investigation`

Los sesgos por modo están definidos en `references/modes.md`.

## Flujo Compartido

### 1) Detectar fuente principal

Prioridad:

1. Conversación actual
2. `$ARGUMENTS` como foco/lente
3. `@docs` o `docs` si aparece
4. Proyecto actual solo si aporta contexto útil

Reglas clave:

- `$ARGUMENTS` no reemplaza automáticamente el contexto
- si el prompt es corto/genérico, usarlo como lente sobre la conversación
- solo cambiar tema principal si `$ARGUMENTS` lo pide explícitamente

### 2) Resumir y estructurar

- identificar ideas principales
- eliminar ruido y repetición
- detectar relaciones, pasos, comparaciones o estados
- completar huecos razonables solo si mejora comprensión

### 2.5) Investigación web (solo modo `investigation`)

Antes de cualquier generación, realizar investigación exhaustiva:

1. **Búsquedas con `tavily-search`**:
   - `"[tema] comprehensive guide"`
   - `"[tema] patterns best practices"`
   - `"[tema] code examples github"`
   - `"[tema] vs alternatives comparison"`
   - `"[tema] architecture diagram"`

2. **Extraer contenido** de las 5-8 URLs más relevantes con `tavily-extract`

3. **Sintetizar hallazgos**:
   - detectar patrones recurrentes entre fuentes
   - identificar contradicciones y consenso
   - extraer best practices acordadas
   - encontrar código real de ejemplos

4. **Búsqueda de código** con `gh_grep-searchGitHub` si el tema involucra implementación

5. **Generar checklist items** desde el contenido sintetizado

Más detalle en `references/investigation-format.md`.

### 3) Elegir representación visual

Elegir automáticamente el formato más útil:

- resumen visual
- comparativa
- explicación
- flujo
- arquitectura
- pseudo-wireframe (solo cuando aplique)

### 4) Generar HTML

Stack permitido:

- Tailwind CSS
- Alpine.js
- Lucide Icons
- Prism.js (solo si hay código)

Convenciones:

- explicaciones en español
- código en inglés si aparece
- responsive
- alto contraste y fondos sólidos
- interactividad ligera útil
- diseño limpio y escaneable
- sin glassmorphism

### 5) Diagramas

Si hay diagramas en artifacts HTML:

- usar SVG inline por defecto
- no usar Mermaid

### 6) Guardar y notificar

Siempre:

1. guardar en `docs/artifacts/[slug]/index.html`
2. invocar `artifact refresh <slug>` para notificar al dashboard:

```bash
artifact refresh <slug>
```

Esto lanza un evento SSE que el dashboard recibe y usa para invalidar la cache de React Query, provocando un reload automático.

**Cuando el usuario diga "abrelo", "muestramelo", "abrir", "ver", "mostrar":**
- El dashboard ya se actualiza automáticamente via SSE
- Confirmar al usuario: "Dashboard actualizado con el nuevo artifact"

### 7) Output al usuario

Entregar siempre:

- tema generado
- ubicación del archivo
- confirmación de recarga en dashboard
- formato visual elegido
- secciones incluidas
