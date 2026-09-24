---
name: social-publisher
description: |
  Publica y trackea videos y carruseles de marketing de Elena Tech (del
  manifiesto `apps/<producto>/app/public/marketing/manifest.json`) en Instagram
  y TikTok usando el navegador real del usuario vía relay CDP. Cubre el
  pipeline probado en producción: subida sin diálogo nativo, preflight local,
  recorte correcto para Reels (9:16) y carruseles (4:5), captions que sí
  persisten y tracking con `videos/cli/social-track.ts`. Úsala SIEMPRE que el
  usuario pida colgar/publicar/subir videos o carruseles a Instagram o TikTok,
  crear cuentas de marca, actualizar el estado de publicación en el manifiesto
  o preguntar qué assets faltan por publicar en alguna red.
  Keywords: instagram, tiktok, reels, carrusel, carousel, publicar video,
  publicar carrusel, social media, manifiesto marketing, social-track,
  theelena.tech, caption, hashtags, tiktokstudio, relay CDP, browser-cdp,
  omp, publicar reel.
---

# Social Publisher (Instagram + TikTok)

Pipeline probado en producción (jul-2026) para publicar los videos del
manifiesto de marketing en las cuentas de marca. Todo se hace con el
**navegador real del usuario** mediante el relay CDP — no hay APIs
oficiales involucradas, así que la guía está llena de trampas ya resueltas.
Síguela al pie de la letra: cada paso raro existe porque la vía obvia falló.

## Cuentas de marca

| Red       | Cuenta                                             | Email de acceso                           | Notas                                                     |
| --------- | -------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------- |
| Instagram | `@theelena.tech`                                   | theleobar37@gmail.com (Gmail `u/2`)       | Creada 2026-07-29. Bio sin link clickeable (mobile-only). |
| TikTok    | `@theelenasoftware` → renombrar a `@theelena.tech` | theelenasolutions@gmail.com (Gmail `u/3`) | Cuenta recuperada (tenía 3 videos viejos).                |

Las contraseñas las entrega el operador al usuario en el momento; no las
escribas en archivos del repo.

## Tracking en el manifiesto (obligatorio tras cada publicación)

El manifiesto `apps/<producto>/app/public/marketing/manifest.json` lleva un
campo `distribution` por asset (preservado al republicar gracias al patch en
`videos/cli/publish.ts`). Registra CADA publicación con la CLI:

> **Portada obligatoria al publicar a R2.** `bun videos/cli/publish.ts` exige
> `--cover <portada.png>`: un PNG de exactamente 1080x1920 (la portada
> aprobada del proyecto declarada en `social-cover.json` y renderizada con
> `bun videos/cli/render-social-covers.ts <producto>`). Ya NO se extrae
> ningún frame del video: sin cover explícita y válida el publish falla
> antes de tocar la red. Esa misma PNG es la que se selecciona como portada
> en Instagram (ver pipeline abajo).

```bash
# Marcar publicación (añade publishedAt automáticamente)
bun videos/cli/social-track.ts avileo/06-fiado-olvidado \
  --network instagram --status published \
  --url "https://www.instagram.com/theelena.tech/reel/<shortcode>/" \
  --media-id <id> --account @theelena.tech

# Tablero de avance (qué falta por red)
bun videos/cli/social-track.ts avileo --list
```

Flujo recomendado al publicar un lote: publicar en una red → marcar →
publicar en la otra → marcar. El manifiesto es la fuente de verdad del avance.

## Infraestructura: relay CDP

Las publicaciones se realizan mediante el navegador real del usuario a través
del relay CDP local `ws://127.0.0.1:9224/cdp`. Consulta la skill
`browser-cdp` para el health check, conexión, snapshots, interacción y
subida de archivos. No dependas de un daemon de automatización separado.

Usa sesiones separadas por red: `instagram-elena`, `tiktok-elena`,
`gmail-elena`, manteniendo el mismo grupo de pestañas durante cada tarea.

### Subir un archivo SIN diálogo nativo (técnica clave)

Ni `upload` (CDP devuelve "Not allowed") ni los clics sintéticos abren el
file picker de forma usable. La vía que funciona en ambas plataformas:

1. Localiza el `<input type=file>` del composer (en IG aparece tras abrir
   "Nueva publicación"; en TikTok tras clic en "Seleccionar vídeo"). Asígnale
   un id con `evaluate`.
2. Pasa el video a base64, córtalo en chunks de ~1.5 MB y empújalos a
   `window.__chunks` con una llamada `evaluate` por chunk.
3. Ensambla el `File`, mételo en un `DataTransfer`, asigna `input.files` e
   **invoca directamente el `onChange` de React** del input (los eventos
   `change` sintéticos NO bastan):

```js
const key = Object.keys(input).find((k) => k.startsWith('__reactProps'));
const props = key ? input[key] : null;
props.onChange({
  target: input,
  currentTarget: input,
  persist() {},
  preventDefault() {},
  stopPropagation() {},
  nativeEvent: new Event('change'),
});
```

Señal de éxito: IG muestra la pantalla "Recortar"; TikTok muestra el editor
de TikTok Studio con la descripción prellenada. Si no reacciona a la primera,
repite la inyección (los chunks ya fueron consumidos: re-empújalos).

## Instagram (@theelena.tech)

### Pipeline por video

1. `navigate` a `instagram.com` → clic enlace "Nueva publicación".
2. Inyecta el video (técnica de arriba). Acepta el aviso "los videos se
   comparten como reels" si sale.
3. **CROP — la trampa del 1:1.** El composer recorta a CUADRADO por defecto.
   En la pantalla "Recortar": clic en el botón `button` cuyo
   `aria-label`/texto es "Seleccionar recorte" (es el segundo match si hay
   dos; el primero puede ser un div inerte) → aparecen opciones
   `Original / 1:1 / 9:16 / 16:9` → clic en span **"Original"**. Verifica con
   screenshot que el preview sea vertical completo. Sin esto el reel sale
   720x720.
4. **PORTADA — explícita aprobada, nunca un frame automático.** Antes del
   Share final, abre el control de portada del composer (icono/selector de
   portada sobre el preview del reel; el label exacto cambia entre
   versiones de IG web — localízalo por snapshot) y selecciona la portada
   explícita aprobada del proyecto: la misma PNG 1080x1920 que se subió a
   R2 con `publish --cover`. Si el composer solo ofrece elegir un frame del
   video, elige el frame que coincide con la portada aprobada; si ofrece
   subir imagen, sube la PNG directamente con la técnica de inyección de
   archivo. **Nunca** dejes la portada por defecto que IG elige solo.
   Verificación obligatoria antes de compartir: screenshot del preview
   donde se vea (a) el crop vertical completo y (b) la portada seleccionada
   aplicada. Sin esa evidencia visual no se hace el clic final.
5. "Siguiente" ×2 hasta la pantalla de caption. **NO escribas el caption
   aquí**: el editor Lexical del composer muestra el texto (y hasta el
   contador N/2200 sube) pero el request de publicación sale SIN caption —
   comprobado interceptando la red. Compartir directo (previa confirmación
   explícita del usuario, como en todo punto de riesgo de publicación).
6. Espera "Se ha compartido tu reel" → "Listo".

### Pipeline por carrusel en Instagram

Un carrusel no reutiliza el flujo de crop del Reel. Instagram fija el ratio de
**todo** el carrusel a partir del primer archivo y puede abrir el composer en
1:1 aunque los PNG sean 4:5. Si se comparte así, recorta todos los slides y el
daño no se puede corregir editando la publicación existente.

1. Renderiza todos los slides a **1080x1350 (4:5)**. No mezcles ratios ni
   resoluciones.
2. Ejecuta el preflight local antes de abrir Instagram:

```bash
bun videos/cli/publish-carousel.ts <producto>/<slug> \
  --images <directorio-con-los-png> --check
```

Debe terminar en PASS y confirmar cantidad, orden y `1080x1350`. Un contact
sheet no sustituye esta comprobación. 3. Abre "Nueva publicación" y selecciona **Publicación**, no Reel. Inyecta o
elige los PNG en orden numérico (`01.png`, `02.png`, ...). 4. En la pantalla **Recortar**, abre "Seleccionar recorte" y elige **4:5 /
Retrato / Original vertical** según el label disponible. Después lee el
estado real del control (`aria-pressed`, `aria-selected`, checkmark o label
activo) vía snapshot/evaluate y guarda screenshot. Si no puedes demostrar
que 4:5 está seleccionado, **detén el flujo**: un preview que “parece”
vertical no es evidencia suficiente. 5. Recorre visualmente **todos** los slides dentro del composer. Verifica que
cada titular esté completo, que el contador marque el total esperado y que
el segundo slide sea legible. Guarda screenshot del primer, segundo y último
slide, más cualquier slide visualmente denso. 6. Antes de "Compartir", vuelve al primer slide y revalida el estado 4:5 del
control. Solo presenta el Share al usuario cuando existen el PASS local, la
evidencia del ratio y la revisión completa. El paso final requiere
confirmación explícita del usuario. 7. Tras publicar, abre la URL pública, desliza por todos los slides y verifica
que ninguno esté cortado. Solo entonces ejecuta `social-track.ts`.

**Regla de recuperación:** si una publicación ya salió cuadrada/cortada, no se
edita ni se re-suben imágenes dentro del post. Preserva URL/media ID para
auditoría, prepara un repost 4:5, pide aprobación explícita para archivar o
eliminar la publicación defectuosa y otra aprobación en el Share del reemplazo.
Nunca borres ni republiques por cuenta propia.

### Caption que SÍ persiste

**Vía 1 (primera opción, probada 2026-09-04): edición UI con input trusted.**
El diálogo "Editar información" SÍ guarda el caption si el texto entra como
tipeo real (dominio CDP `Input`) y el cierre es con click real:

1. Página del reel → menú `...` → `Editar` → diálogo "Editar información".
2. El campo caption es un `[contenteditable="true"]` DENTRO del diálogo. La
   `textarea` de la página es la CAJA DE COMENTARIOS — nunca la uses.
   Verifica con el contador `N/2200` antes de escribir.
3. Click real dentro del campo, `Ctrl+A` + `Backspace` (limpia el caption
   actual), y por CADA párrafo: `Input.insertText(párrafo)` + `Enter` vía CDP.
   `execCommand('insertText')` aplana los saltos de línea (queda todo en un
   párrafo) y los fills de value no funcionan en contenteditable.
4. Click REAL (`Input.dispatchMouseEvent`) en "Listo". El click sintético
   cierra el diálogo SIN guardar.
5. Verificación obligatoria con reload de la página pública (la UI miente
   por optimistic update): el caption con párrafos y hashtags debe verse en
   `innerText`.

Cliente listo: skill global `browser-cdp` → `references/client.ts`
(`page.realClick`, `page.typeText`, `page.pressEnter`).

**Vía 2 (fallback): API edit_media directa.** Si la edición UI no pegara,
llama al endpoint interno desde la página del reel. Ojo: con eventos
SINTÉTICOS el `edit_media` de la UI no envía `caption_text` (interceptado:
el body solo lleva `coauthor_invites`, `usertags`, `jazoest`, `fb_dtsg`) —
por eso la vía 1 exige input trusted. Para la API:

1. Abre la página del reel (`/theelena.tech/reel/<shortcode>/`). Extrae el
   media id del HTML: primer match de `"media_id":"(\d+)"`.
2. POST form-encoded (el body JSON también funciona pero el form-encoded es
   el formato nativo; puede devolver 500 y aun así aplicar — verifica siempre
   con el GET de info):

```js
const csrf = (document.cookie.match(/csrftoken=([^;]+)/) || [])[1];
const dtsg = (document.documentElement.innerHTML.match(/"DTSGInitialData"[^}]*"token":"([^"]+)"/) ||
  [])[1];
const params = new URLSearchParams();
params.set('caption_text', caption);
params.set('coauthor_invites', '{"added":[],"in":[],"removed":[]}');
params.set('usertags', '{"added":[],"in":[],"removed":[]}');
params.set('jazoest', '22725');
params.set('fb_dtsg', dtsg);
await fetch(`/api/v1/media/${mediaId}/edit_media/`, {
  method: 'POST',
  credentials: 'include',
  headers: {
    'X-CSRFToken': csrf,
    'X-IG-App-ID': '936619743392459',
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: params.toString(),
});
```

3. **Verificación en dos niveles** (la UI miente por actualización
   optimista): (a) `GET /api/v1/media/{id}/info/` → `items[0].caption.text`
   debe contener el caption; (b) recarga la página pública del reel y busca
   el texto + hashtags en `innerText`. Ojo: en la respuesta JSON los
   acentos/emoji vienen escapados como `\uXXXX` — busca substrings ASCII.

### Lo que NO se puede desde web (derivar al móvil del usuario)

- Link clickeable en bio (campo "Sitio web" deshabilitado; el Centro de
  cuentas Meta tampoco lo tiene). Mientras tanto, URL como texto en la bio.
- Quitar reels del grid del feed (no hay toggle "share to feed" en web ni
  "quitar del perfil" en el menú web).
- Fijar (pin) un reel al perfil.
- Programar publicaciones (requiere cuenta profesional).

### Lecciones reel 13 (2026-09-04, sesión real con relay CDP omp)

- **El share se confirma por 3 señales, no por diálogos.** El diálogo "Uso
  compartido" que sale tras Compartir se queda CARGANDO PARA SIEMPRE en reels
  sin audio (lista usos del audio y no hay) — no es fallo. La confirmación
  real: (a) texto "Se ha compartido tu reel", (b) el contador de
  publicaciones del perfil sube en 1, (c) el nuevo shortcode aparece primero
  en el grid. Verifica las tres.
- **NUNCA navegues mientras el share está en vuelo.** Navegar a los pocos
  segundos de Compartir aborta el upload silenciosamente: la UI puede llegar
  a mostrar diálogos de éxito y el reel NO se publica. Después de Compartir,
  quédate en la página haciendo polling (cliente, pasos de 3s) hasta la
  confirmación; cierra el diálogo con su propia X/Listo.
- **Input[type=file] stale tras re-montaje.** Si el composer se descartó o
  React re-montó, el input capturado antes queda inerte: la inyección reporta
  "injected" pero la app no reacciona (se queda en "Arrastra fotos..."). Si
  pasa: click en "Seleccionar del ordenador" para montar un input FRESCO e
  inyecta en el ÚLTIMO `input[type=file]` del DOM.
- **Caption al publicar: NO confiar en el composer.** Publica vacío y agrega
  el caption después con la sección "Caption que SÍ persiste" de arriba
  (edición UI con input trusted, verificada con reload). En reel 13 el
  composer además avisó "El vídeo no tiene audio" (la inyección vía CDP no
  expone la pista AAC al uploader); IG publicó igual como "Audio original".
- **Infraestructura usada en esta máquina:** el canal es el relay CDP omp
  `ws://127.0.0.1:9224/cdp` con la skill global `browser-cdp` (cliente
  reutilizable + reglas de RPC 20s/polling/clicks reales). Si el relay
  responde "No current window", el Chrome del relay no tiene ventanas: hay
  que revivirlo desde el runtime omp, no forzar createTarget.

## TikTok (@theelenasoftware → @theelena.tech)

### Pipeline por video

1. `navigate` a `tiktok.com/tiktokstudio/upload` → clic "Seleccionar vídeo"
   (crea el `<input type=file accept="video/*">`) → inyecta el video.
2. Espera el editor: pre-llena "Descripción" con el NOMBRE DEL ARCHIVO.
3. **Caption — truco filename-prefijo.** El editor (Slate) pelea todo: los
   fills se desincronizan, `execCommand delete` borra parcial y luego
   desincroniza, y cada `paste` añade otra copia. La vía limpia y rápida:
   nombra el archivo subido como la PRIMERA FRASE del caption (sin «»¿?) y
   pega el RESTO detrás. Ej.: archivo `Tu cliente dejó de volver.mp4` →
   prefill "Tu cliente dejó de volver" → pegas
   " y no lo notaste. Avileo conecta… #hashtags". Cero borrado.
4. Pegar con ClipboardEvent + `clipboardData` forzado (los
   `new ClipboardEvent('paste',{clipboardData})` llegan null si no se
   redefine la propiedad):

```js
ce.focus();
const range = document.createRange();
range.selectNodeContents(ce);
range.collapse(false);
const sel = window.getSelection();
sel.removeAllRanges();
sel.addRange(range);
await new Promise((r) => setTimeout(r, 500)); // Slate necesita sync de selección
const dt = new DataTransfer();
dt.setData('text/plain', texto);
const ev = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
Object.defineProperty(ev, 'clipboardData', { value: dt });
ce.dispatchEvent(ev);
```

Verifica head+tail y longitud exacta esperada antes de seguir. 5. Presenta al usuario el video, caption, cuenta y visibilidad finales; pide
confirmación explícita en ese punto de riesgo. 6. Solo después de esa confirmación, haz clic en "Publicar". Confirma en
`tiktokstudio/content` que el contador "Publicaciones: N" sube en 1.

### Notas TikTok

- El video nuevo queda "Contenido en revisión" / "Solo yo" unos minutos;
  TikTok lo pasa a público solo. No re-publiques por impaciencia.
- TikTok Studio SÍ tiene programación ("Cuándo publicar → Programación").
- El registro de cuenta nueva dispara captcha slider anti-bot: pide al
  usuario que lo arrastre manual (no intentes resolverlo: riesgo de flag).
- Los formularios de perfil de TikTok web (nombre, username, bio) no aceptan
  input sintético y fallan con "Hubo un problema": el rename/bio se hace
  manual o desde la app.

## Estándar de captions y hashtags (investigación jul-2026)

- Máximo **5 hashtags** por post (límite duro de IG desde dic-2025); mix
  1-2 amplios + 3-4 nicho (10K-500K posts). En el caption, no en comentarios.
- **Keyword principal en la primera oración** (el buscador la pondera más).
- CTA de compartir/guardar en el texto (sends > likes para el algoritmo).
- Mismo caption en IG y TikTok salvo el ajuste filename-prefijo de TikTok.
- Secuencia acordada de los 8 videos de Avileo: 06 → 05 → 01 → 03 → 04 →
  02 → 08 → 07 (dolor/storytelling primero, features pro al final).

## Checklist final por publicación

- [ ] Preflight local del tipo de asset en PASS
- [ ] Reel: video vertical COMPLETO (`Original`) y portada explícita aprobada
      (1080x1920), con screenshot antes del Share
- [ ] Carrusel: todos los PNG 1080x1350, estado 4:5 demostrado vía
      snapshot/evaluate y cada slide revisado; primer, segundo y último slide
      documentados antes del Share
- [ ] Caption verificado en servidor (IG: página recargada tras edición UI, o
      info API como fallback) o en contador del editor (TikTok)
- [ ] Página pública recargada muestra caption + hashtags y, si aplica, todos
      los slides sin recortes
- [ ] Post-Share sin navegación hasta las 3 señales de confirmación
      ("Se ha compartido" + contador +1 + shortcode en el grid)
- [ ] `social-track.ts` ejecutado para la red correspondiente
- [ ] `<producto> --list` refleja el avance
