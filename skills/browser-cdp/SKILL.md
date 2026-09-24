---
name: browser-cdp
description: |
  Controla el navegador REAL del usuario (Brave/Chrome con sus sesiones
  iniciadas) vía el relay CDP local ws://127.0.0.1:9224/cdp desde scripts Bun.
  Use cuando una tarea requiera interactuar con sitios web logueados
  (Instagram, TikTok, LinkedIn, Gmail, YouTube Studio), subir archivos a un
  composer web o automatizar clicks/teclado de verdad. Keywords: navegador,
  browser, CDP, relay 9224, instagram, tiktok, publicar reel, subir video,
  file input, contenteditable, screenshot, dispatchMouseEvent, omp extensión.
---

# Browser CDP — navegador real vía relay

El relay expone un navegador Chrome ( headed, con sus sesiones logueadas)
como un endpoint WebSocket CDP en `ws://127.0.0.1:9224/cdp`. Es el **omp
browser relay**: el Chrome "for Testing" que el runtime omp mantiene vivo
(perfil `~/.omp/run/daemons/*/omp.browser.headed.profile`), NO el navegador
del usuario. Úsalo para automatización de navegador que necesite el relay
CDP, el dominio `Input` (teclado/mouse de verdad), `Page.captureScreenshot`,
inyección de archivos o esperas de estado largas.

## Health check y límites del relay (verificados 2026-09-04)

```bash
# ¿Vivo? Devuelve version del navegador detras del relay:
curl -s http://127.0.0.1:9224/json/version
```

- `Browser.getVersion` ✅ · `Target.createTarget` ✅ ·
  `Target.attachToTarget {flatten:true}` ✅ · `Target.setDiscoverTargets` ✅
  (solo anuncia tabs creados DESPUÉS de conectar).
- `Target.getTargets` ❌ (`wasn't found`) · `/json/list` ❌ (devuelve `[]`) ·
  `createBrowserContext` ❌. **No hay listado de tabs**: los targetIds
  conocidos (formato `PAGE...`) vienen del runtime omp o de un createTarget
  previo en la misma sesión — conserva el ID que te devuelve `openPage()`.
- `Target.createTarget` falla con `"No current window"` cuando el Chrome del
  relay no tiene ninguna ventana abierta. No lo fuerces: significa que hay
  que revivir el browser desde el runtime omp (o que la sesión con ventana
  activa terminó). Reintenta cuando haya una sesión omp con browser activo.

## Cliente reutilizable

NO reescribas el boilerplate del WebSocket. Usa/copia el cliente probado en
producción:

```
~/.agents/skills/browser-cdp/references/client.ts
```

Patrón de uso (script de ~15 líneas en tmp/ o scripts/):

```ts
import { connect } from "<ruta>/references/client.ts";

const c = await connect();                        // ws://127.0.0.1:9224/cdp
// Sin listado de tabs: crea uno propio o attacha a un targetId conocido.
const page = await c.openPage("https://www.instagram.com/"); // → conserva page.targetId
// const page = await c.attachPage("PAGE2013462250");        // ID de sesión previa
await page.evalJs(`document.body.innerText.slice(0,100)`);
await page.clickByText("Nueva publicación");      // click sintético (menús)
await page.realClick(x, y);                       // click REAL (persiste)
await page.typeText("texto con acentos áéí");     // Input.insertText (trusted)
await page.pressEnter();
await page.waitFor(`t.includes('Recortar')`, 40, 2000);   // polling cliente
const ok = await page.injectFile("/tmp/reel.mp4");        // inyección React onChange
const shot = await page.screenshot("/tmp/x.jpg");
```

## Reglas de oro (cada una costó una sesión de debug)

1. **RPC del relay: timeout ~20 s.** Cualquier `Runtime.evaluate` que espere
   dentro de la página más de eso revienta con `extension rpc 'send' timed
   out`. NUNCA esperes dentro de un evaluate: los `waitFor` son polling
   DESDE EL CLIENTE (evaluates cortos de chequeo cada 1–3 s).

2. **Click sintético vs click real.** `el.dispatchEvent(...)` (sintético)
   sirve para abrir menús, pulsar "Siguiente", navegar pantallas del
   composer. Pero para acciones cuyo efecto DEBE persistir en servidor
   ("Listo" al editar caption, "Compartir/Publicar"), el click sintético
   puede cerrar la UI sin guardar → usar `Input.dispatchMouseEvent` REAL
   (`page.realClick`). Regla práctica: verificación visual obligatoria con
   screenshot después, y si el cambio "no pegó", repetir con click real.

3. **Tipear de verdad.** `Input.insertText` inserta como tipeo real
   (acentos y emoji correctos). `execCommand('insertText')` aplan los
   `\n` y React lo toma distinto; para párrafos: `insertText(párrafo)` +
   `pressEnter()` por separado. El setter nativo de `value` + evento
   `input` solo para `<input>`/`<textarea>`; NUNCA para contenteditable.

4. **Apunta al elemento correcto.** `document.querySelector('textarea')` en
   una página de reel de Instagram agarra la CAJA DE COMENTARIOS, no el
   caption: el caption del diálogo "Editar información" es un
   `[role=dialog] [contenteditable="true"]`. Verifica siempre con el
   contador (`N/2200`) o con `innerText` del elemento antes de escribir.

5. **Inyección de archivos (input[type=file]).** El composer re-monta sus
   nodos: un input capturado antes puede quedar stale (inyección "ok" pero
   la app no reacciona). Si la inyección no prende: haz click en
   "Seleccionar del ordenador" para montar un input FRESCO e inyecta en el
   ÚLTIMO `input[type=file]` del DOM. Técnica: base64 en chunks de ~1.5 MB a
   `window.__chunks`, ensamblar `File`, `DataTransfer` → `input.files`, e
   invocar el `onChange` de React (ver `client.ts::injectFile` y la skill
   `social-publisher` para el snippet completo).

6. **NUNCA navegues mientras un share/upload está en vuelo.** Aborta el
   upload silenciosamente: la UI muestra diálogos de éxito prematuros y el
   post nunca aparece. Después del click de publicar, quédate en la página
   haciendo polling hasta la confirmación real.

7. **Diálogos de confirmación pueden colgar sin ser fallo.** En Instagram,
   el diálogo "Uso compartido" (usos del audio) se queda cargando para
   SEMPRE en reels sin audio — no indica fallo. La señal real de éxito: el
   texto "Se ha compartido tu reel" + el contador de publicaciones del
   perfil sube en 1 + el nuevo shortcode aparece primero en el grid.

8. **Screenshot antes de cada punto de riesgo.** Todo clic de
   publicar/guardar va precedido de evidencia visual (crop correcto,
   portada, caption completo) y seguido de verificación post-reload (la UI
   miente por optimistic update).


## Sesiones y tabs

- `Target.getTargets` lista las páginas abiertas; `Target.attachToTarget
  {targetId, flatten:true}` devuelve el `sessionId` para mandar comandos.
- Reutiliza el tab ya logueado de la red social (findPage por regex de URL)
  en vez de abrir uno nuevo.
- Un script = un propósito; el estado del composer no sobrevive entre
  navigations, así que diseña cada script para llegar a un hito verificable
  (p. ej. "llegar al share screen") y encadena scripts, no un monolito.
