# Flujo por-video: proyecto Remotion propio + limpieza basada en silencio

Metodología para producir un video de YouTube nuevo en `videos-youtube`. Estrenada en
`videos/video-fable/` (2026-07). Cada video vive en `videos/<slug>/` con su **propio
proyecto Remotion autocontenido** y scripts locales. Preferir este patrón sobre los
scripts globales `src/scripts/*` cuando el video tiene varios clips o quiere animaciones
mejores que las simples de intros/transiciones antiguas.

## Arquitectura: híbrido FFmpeg + Remotion

No hacer toda la edición dentro de Remotion. Recortar cientos de micro-cortes con
`<OffthreadVideo>` glitchea el audio y el render se vuelve lentísimo. En su lugar:

1. **FFmpeg** produce `body_clean.mp4` = clips unidos con muletillas/pausas cortadas
   (según una EDL). Audio continuo, sin glitches.
2. **Remotion** toma ese cuerpo limpio como pista base y le superpone animaciones:
   intro, lower-thirds de temas, barra de progreso, flashes de transición.

Esto respeta la regla del repo: cuerpo continuo, overlays encima (no tarjetas
full-screen entre temas salvo pedido explícito).

## Estructura de un proyecto por-video

```
videos/<slug>/
├─ video.json               # manifest (soporta campo extra "clips" para multi-clip)
├─ source/                  # clips crudos (mover aquí; NO modificar los originales)
├─ assets/
│  ├─ transcript.json       # palabras + segmentos por clip, con offset global
│  ├─ edl.json              # cortes (silence-based), con tags safe/risky
│  └─ topics.json           # temas en línea de tiempo ORIGINAL
├─ scripts/                 # transcribe · build-edl · cut-body · detect-topics · build-overlays
├─ renders/                 # body_clean.mp4, sample_*, <slug>_final.mp4
├─ qa/                      # stills + snippets de puntos dudosos
└─ remotion/                # proyecto Remotion propio
   ├─ package.json, tsconfig.json, remotion.config.ts
   ├─ public/               # body.mp4 (COPIA, no symlink) + overlays.json
   └─ src/                  # index.ts, Root.tsx, VideoFable.tsx, components/, theme.ts
```

## Limpieza de muletillas: usar SILENCIO REAL, no Whisper

Aprendizaje clave: **Whisper limpia el texto** y no transcribe fielmente las muletillas
habladas (eh, tartamudeos, arranques falsos), y sus timestamps por palabra son
imprecisos. Cortar palabras por su timestamp de Whisper produce cortes que caen en voz
y suenan chocados.

Estrategia correcta (`build-edl.ts`):
- Detectar silencios con `ffmpeg silencedetect=noise=-32dB:d=0.25` por clip.
- **Pausas**: recortar solo el exceso de silencios largos (`> minPauseCut`, def 0.8s),
  dejando `keepSil` (def 0.35s) de respiración. Los bordes del corte quedan dentro del
  silencio por construcción.
- **Bordes**: recortar silencio inicial/final de cada clip (deja `edgeKeep`).
- **Muletillas** (`este`, `o sea`): cortar solo si ambos bordes **snapean a un silencio**
  cercano (`snapWin`); si no hay silencio a los lados, dejar la muletilla.
- **Validar SIEMPRE** antes de renderizar: 0 bordes de corte fuera de silencio.
- Aterrizar la EDL en keeps y descartar fragmentos < `minKeep`.

Regla de oro: es preferible dejar una muletilla que meter un corte que corte una palabra.
El usuario avisó explícitamente que borrar muletillas a ciegas arruina el video → probar
con una muestra (`cut-body.ts --sample clip:inicio:fin`) antes del render completo.

## Multi-clip

- `transcribe.ts`: extrae audio por clip, Whisper `verbose_json` con
  `timestamp_granularities: ["word","segment"]`, guarda `duration` + `offset` acumulado.
- `cut-body.ts`: un solo `filter_complex` con los N clips como inputs; por cada keep,
  `trim`/`atrim` + `setpts`/`asetpts`, luego `concat=n=K:v=1:a=1`. Re-encode
  (libx264 crf 18, yuv420p, aac). Copiar el resultado a `remotion/public/body.mp4`.

## Temas y overlays

- `detect-topics.ts`: GPT-4o-mini agrupa en 5-8 temas con títulos MUY cortos (2-4
  palabras) para lower-thirds, en la línea ORIGINAL global.
- `build-overlays.ts`: mapea los tiempos ORIGINALES a la línea LIMPIA restando lo removido
  por la EDL, y escribe `remotion/public/overlays.json` (con `bodyDurationSec`).
- La composición Remotion lee `overlays.json` (import JSON) y posiciona lower-thirds.

## Remotion: notas prácticas

- Renderizar desde la raíz del repo para reutilizar `node_modules` (react, remotion,
  @remotion/cli, @remotion/google-fonts ya instalados):
  `bunx remotion render videos/<slug>/remotion/src/index.ts VideoFable <out> --public-dir=videos/<slug>/remotion/public`
- **`public/body.mp4` debe ser copia real, NO symlink**: al empaquetar `public` en un
  bundle temporal, Remotion no sigue symlinks → 404 al cargar el video.
- Duración: `Root.tsx` calcula `durationInFrames = (INTRO_SEC + bodyDurationSec) * fps`.
- Validar diseño barato con stills: `bunx remotion still ... --frame=N`.
- Fuentes: `@remotion/google-fonts/Inter` → `loadFont()`.

## QA antes de subir

- ffprobe: 1920×1080, h264 + aac, duración ~ (intro + body).
- Muestrear las uniones (joins) del `body_clean`: medir `volumedetect` en ±0.12s; si el
  mean supera ~-24dB puede ser un corte de voz → inspeccionar snippet.
- Requerir 0 voiceCutoffFailures; documentar cualquier join marginal en `qa/`.
- No modificar uploads viejos; subir corregido como video nuevo.

## Reglas del usuario (recordar)

- Muletillas frecuentes: `este`, `o sea`; `entonces` es su conector natural (NO borrarlo en masa).
- Ser inteligente al evaluar: probar muestras, no borrar a ciegas.
- Mejores animaciones que las simples de antes → invertir en el proyecto Remotion.
- Miniaturas: seguir `prompts/youtube-thumbnail-avatar.md` (avatar a la derecha, ≤6 palabras).
