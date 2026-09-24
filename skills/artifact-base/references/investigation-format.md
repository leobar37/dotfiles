# Investigation Format

Especificación del formato HTML para artifacts de tipo `investigation`.

## Objetivo

Generar un documento de estudio completo, legible y profundo que el usuario pueda leer y estudiar. No es un dashboard ni un resumen visual — es un **artículo largo de referencia**.

## Stack

- Tailwind CSS
- Alpine.js
- Lucide Icons
- Prism.js (syntax highlighting)

## Layout

### Estructura principal

```
<body>
  ├── Barra de progreso (fixed top, scroll-driven)
  ├── Contenedor principal (max-w-4xl, centrado)
  │   ├── Header (título, metadata, stats)
  │   ├── Tabla de contenido (sticky sidebar en desktop)
  │   └── Contenido secuencial
  │       ├── Resumen ejecutivo
  │       ├── Conceptos clave
  │       ├── Patrones detectados
  │       ├── Código y ejemplos
  │       ├── Comparativas
  │       ├── Diagramas (SVG inline)
  │       ├── Checklist de estudio
  │       └── Referencias
  └── Botón "copiar código" (float)
```

### Responsive

- **Desktop (lg+)**: TOC sticky en sidebar izquierda (240px), contenido a la derecha con offset
- **Mobile**: TOC colapsado en `<details>` expandable sobre el contenido

### Tipografía

- Contenedor: `max-w-4xl mx-auto`
- H1: `text-4xl font-bold tracking-tight`
- H2: `text-2xl font-semibold mt-12 mb-4`
- H3: `text-xl font-semibold mt-8 mb-3`
- Párrafos: `text-base leading-relaxed text-slate-300`
- Código inline: `bg-slate-800 rounded px-1.5 py-0.5 font-mono text-sm`

## Secciones obligatorias

### 1. Header

```html
<header class="border-b border-slate-700 bg-slate-950/90 sticky top-0 z-50">
  <div class="max-w-4xl mx-auto px-6 py-6">
    <!-- Badge del tipo -->
    <p class="mb-3 inline-flex rounded-full border border-purple-700 bg-purple-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-purple-200">
      Artifact · investigación
    </p>
    <!-- Título -->
    <h1 class="text-4xl font-bold tracking-tight text-white">[Título del tema]</h1>
    <!-- Descripción -->
    <p class="mt-3 text-lg muted">[Resumen en 1-2 frases]</p>
    <!-- Stats row -->
    <div class="mt-5 flex flex-wrap gap-4">
      <div class="card rounded-xl px-4 py-2">
        <span class="text-lg font-bold text-white">N</span>
        <span class="text-sm muted ml-1">fuentes</span>
      </div>
      <div class="card rounded-xl px-4 py-2">
        <span class="text-lg font-bold text-white">N</span>
        <span class="text-sm muted ml-1">patrones</span>
      </div>
      <div class="card rounded-xl px-4 py-2">
        <span class="text-lg font-bold text-white">N</span>
        <span class="text-sm muted ml-1">conceptos</span>
      </div>
      <div class="card rounded-xl px-4 py-2">
        <span class="text-lg font-bold text-white">N</span>
        <span class="text-sm muted ml-1">checkpoints</span>
      </div>
    </div>
  </div>
</header>
```

### 2. Barra de progreso

```html
<div x-data="{ scroll: 0 }"
     x-on:scroll.window="scroll = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100"
     class="fixed top-0 left-0 h-1 bg-purple-600 z-[60]"
     :style="`width: ${scroll}%`">
</div>
```

### 3. Tabla de contenido

```html
<nav class="sticky top-24 hidden lg:block w-60 shrink-0">
  <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Contenido</h4>
  <ul class="space-y-2 text-sm">
    <li><a href="#resumen" class="text-slate-400 hover:text-white transition">Resumen</a></li>
    <li><a href="#conceptos" class="text-slate-400 hover:text-white transition">Conceptos clave</a></li>
    <li><a href="#patrones" class="text-slate-400 hover:text-white transition">Patrones</a></li>
    <li><a href="#codigo" class="text-slate-400 hover:text-white transition">Código</a></li>
    <li><a href="#comparativas" class="text-slate-400 hover:text-white transition">Comparativas</a></li>
    <li><a href="#diagramas" class="text-slate-400 hover:text-white transition">Diagramas</a></li>
    <li><a href="#checklist" class="text-slate-400 hover:text-white transition">Checklist</a></li>
    <li><a href="#referencias" class="text-slate-400 hover:text-white transition">Referencias</a></li>
  </ul>
</nav>
```

### 4. Resumen ejecutivo

Card grande con borde izquierdo púrpura:

```html
<section id="resumen" class="mb-12">
  <h2 class="text-2xl font-semibold text-white mb-4">Resumen ejecutivo</h2>
  <div class="rounded-2xl border-l-4 border-purple-600 bg-slate-900 p-6">
    <p class="text-base leading-relaxed text-slate-300">[Síntesis de 2-3 párrafos]</p>
  </div>
</section>
```

### 5. Conceptos clave

Cards en grid de 2 columnas:

```html
<section id="conceptos" class="mb-12">
  <h2 class="text-2xl font-semibold text-white mb-6">Conceptos clave</h2>
  <div class="grid gap-4 md:grid-cols-2">
    <div class="card rounded-2xl p-5">
      <h3 class="text-lg font-semibold text-white mb-2">[Concepto 1]</h3>
      <p class="text-sm muted">[Definición]</p>
    </div>
    <!-- Repetir -->
  </div>
</section>
```

### 6. Patrones detectados

Cada patrón con: nombre, descripción, cuándo usarlo, ejemplo, pros/contras:

```html
<section id="patrones" class="mb-12">
  <h2 class="text-2xl font-semibold text-white mb-6">Patrones detectados</h2>
  <div class="space-y-6">
    <div class="card rounded-2xl p-6">
      <div class="flex items-start justify-between mb-3">
        <h3 class="text-xl font-semibold text-white">[Patrón]</h3>
        <span class="pill rounded-full px-3 py-1 text-xs">[cuándo usar]</span>
      </div>
      <p class="text-sm muted mb-4">[Descripción]</p>
      <div class="grid gap-4 md:grid-cols-2">
        <div class="rounded-xl bg-emerald-950/30 border border-emerald-800 p-4">
          <h4 class="text-sm font-semibold text-emerald-300 mb-2">✓ Pros</h4>
          <ul class="text-sm text-slate-300 space-y-1">[lista]</ul>
        </div>
        <div class="rounded-xl bg-red-950/30 border border-red-800 p-4">
          <h4 class="text-sm font-semibold text-red-300 mb-2">✗ Contras</h4>
          <ul class="text-sm text-slate-300 space-y-1">[lista]</ul>
        </div>
      </div>
    </div>
  </div>
</section>
```

### 7. Código y ejemplos

Bloques con Prism.js y botón copiar:

```html
<section id="codigo" class="mb-12">
  <h2 class="text-2xl font-semibold text-white mb-6">Código y ejemplos</h2>
  <div class="space-y-6">
    <div class="card rounded-2xl overflow-hidden">
      <div class="flex items-center justify-between bg-slate-800 px-4 py-2">
        <span class="text-sm font-mono text-slate-400">[archivo.js]</span>
        <button @click="navigator.clipboard.writeText($refs.code.textContent)"
                class="text-xs text-slate-400 hover:text-white transition">
          Copiar
        </button>
      </div>
      <pre class="!mt-0 !rounded-none"><code class="language-javascript" x-ref="code">[código]</code></pre>
    </div>
  </div>
</section>
```

### 8. Comparativas

Tabla responsive:

```html
<section id="comparativas" class="mb-12">
  <h2 class="text-2xl font-semibold text-white mb-6">Comparativas</h2>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-slate-700">
          <th class="text-left py-3 px-4 font-semibold text-slate-300">Approach</th>
          <th class="text-left py-3 px-4 font-semibold text-slate-300">Pros</th>
          <th class="text-left py-3 px-4 font-semibold text-slate-300">Contras</th>
          <th class="text-left py-3 px-4 font-semibold text-slate-300">Cuándo usarlo</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-800">
        <tr>[fila]</tr>
      </tbody>
    </table>
  </div>
</section>
```

### 9. Diagramas

SVG inline, centrados, con fallback:

```html
<section id="diagramas" class="mb-12">
  <h2 class="text-2xl font-semibold text-white mb-6">Arquitectura y flujos</h2>
  <div class="card rounded-2xl p-8 flex justify-center">
    <svg viewBox="0 0 600 400" class="w-full max-w-2xl h-auto">[SVG content]</svg>
  </div>
</section>
```

### 10. Checklist de estudio

Alpine.js + localStorage, generado dinámicamente:

```html
<section id="checklist" class="mb-12"
         x-data="{ items: [], completed: 0 }"
         x-init="items = JSON.parse(localStorage.getItem('study-checklist-[slug]') || '[]')">
  <h2 class="text-2xl font-semibold text-white mb-2">Checklist de estudio</h2>
  <p class="text-sm muted mb-6">Tu progreso: <span x-text="completed"></span>/<span x-text="items.length"></span> completado</p>

  <div class="space-y-3">
    <template x-for="(item, index) in items" :key="index">
      <label class="card flex items-start gap-4 rounded-xl p-4 cursor-pointer hover:bg-slate-800/50 transition">
        <input type="checkbox"
               x-model="item.done"
               x-on:change="completed = items.filter(i => i.done).length; localStorage.setItem('study-checklist-[slug]', JSON.stringify(items))"
               class="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-purple-600 focus:ring-purple-600">
        <div class="flex-1">
          <span class="text-sm text-slate-200" x-text="item.text"></span>
          <span class="text-xs text-slate-500 ml-2" x-text="item.section ? '#' + item.section : ''"></span>
        </div>
      </label>
    </template>
  </div>
</section>
```

**Items del checklist se generan automáticamente** desde el contenido:
- "Entiendo el concepto de [concepto X]"
- "Puedo explicar el patrón [patrón Y]"
- "He revisado el código de [sección]"
- "Entiendo las diferencias entre [A] y [B]"
- "Puedo describir el diagrama de [arquitectura/flujo]"
- "He leído las referencias principales"

### 11. Referencias

Lista de links con descripción:

```html
<section id="referencias" class="mb-12">
  <h2 class="text-2xl font-semibold text-white mb-6">Referencias</h2>
  <div class="space-y-3">
    <a href="[url]" target="_blank" rel="noopener"
       class="card flex items-center gap-4 rounded-xl p-4 hover:bg-slate-800/50 transition">
      <i data-lucide="external-link" class="w-4 h-4 text-slate-500"></i>
      <div>
        <span class="text-sm font-medium text-white">[Título]</span>
        <span class="text-xs text-slate-500 block">[breve descripción de qué aporta]</span>
      </div>
    </a>
  </div>
</section>
```

## Flujo de investigación (web)

Antes de generar el HTML, ejecutar:

1. **Búsqueda inicial** con `tavily-search`:
   - `"[tema] comprehensive guide"`
   - `"[tema] patterns best practices"`
   - `"[tema] code examples github"`
   - `"[tema] vs alternatives comparison"`
   - `"[tema] architecture diagram"`

2. **Extraer contenido** de las 5-8 URLs más relevantes con `tavily-extract`

3. **Sintetizar**:
   - Detectar patrones recurrentes
   - Identificar contradicciones entre fuentes
   - Encontrar consenso en best practices
   - Extraer código real de ejemplos

4. **Búsqueda de código** con `gh_grep_searchGitHub` si el tema involucra código

5. **Generar checklist items** basados en:
   - Conceptos detectados → "Entiendo el concepto de X"
   - Patrones → "Puedo explicar el patrón X"
   - Secciones de código → "He revisado el ejemplo de X"
   - Comparativas → "Entiendo la diferencia entre A y B"
   - Diagramas → "Puedo describir el diagrama de X"

## Convenciones finales

- Código en inglés, explicaciones en español
- Sin glassmorphism, fondos sólidos y alto contraste
- Interactividad mínima pero útil (scroll, copiar, checklist)
- Diseño limpio y escaneable
- Responsive mobile-first