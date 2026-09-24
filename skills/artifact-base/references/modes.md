# Artifact Modes

Definición de sesgos por comando manteniendo la misma lógica base.

## `generic` (usado por `/artifact`)

- no forzar tutorial ni wireframe
- elegir automáticamente la representación visual más útil
- resolver ambigüedad con resumen visual por defecto

## `study` (usado por `/artifact-study`)

Preferencias adicionales:

- sesgo explicativo/pedagógico
- usar pasos, comparativas o SVG si mejora comprensión
- mantener salida compacta y escaneable
- no convertir en tutorial largo salvo pedido explícito

## `wireframe` (usado por `/artifact-wireframe`)

Preferencias adicionales:

- si el contenido describe UI/flujo de usuario, priorizar layouts, estados o
  pseudo-wireframes
- si no describe UI, no forzar pantallas
- mantener navegación visual simple y legible
- usar SVG inline para diagramas estructurales

## `investigation` (usado por `/investigation`)

Preferencias adicionales:

- **investigación web obligatoria**: usar `tavily-search` para múltiples queries sobre el tema
- **documento de estudio completo**: formato artículo largo con 8 secciones obligatorias
- **estructura**: Resumen ejecutivo → Conceptos clave → Patrones → Código → Comparativas → Diagramas → Checklist → Referencias
- **código real**: buscar ejemplos en GitHub con `gh_grep-searchGitHub` cuando aplique
- **checklist interactivo**: generado dinámicamente desde el contenido, persiste en localStorage
- **tabla de contenido sticky**: navegación lateral en desktop, colapsable en mobile
- **barra de progreso**: scroll-driven, muestra posición de lectura
- **múltiples fuentes**: mínimo 5-8 fuentes consultadas y citadas
- **detalles en**: `references/investigation-format.md`
