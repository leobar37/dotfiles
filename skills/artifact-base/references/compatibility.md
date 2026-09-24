# Compatibility Contract

Esta skill fue creada para extraer lógica común sin romper el uso actual.

## Invariantes (no romper)

1. Comandos públicos:
   - `/artifact`
   - `/artifact-study`
   - `/artifact-wireframe`

2. Entradas admitidas:
   - conversación actual
   - `$ARGUMENTS`
   - `@docs` / `docs`

3. Salida obligatoria:
   - `docs/artifacts/[slug]/index.html`

4. Reglas visuales base:
   - HTML simple, legible, responsive
   - SVG inline para diagramas
   - sin Mermaid en artifacts HTML

5. Notificación de resultado:
   - invocar `artifact refresh <slug>` para notificar al dashboard

## Política de evolución

- Cambios de comportamiento deben hacerse en esta skill, no duplicados en cada
  comando.
- Los comandos alias deben permanecer delgados y delegar en `artifact-base`.
- Cualquier cambio que altere invariantes requiere consentimiento explícito.
