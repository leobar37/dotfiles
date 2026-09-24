/**
 * Cliente CDP mínimo y probado para el relay del navegador real.
 * Endpoint: ws://127.0.0.1:9224/cdp (extensión Kimi/omp).
 *
 * Uso:
 *   import { connect } from "./client.ts";
 *   const c = await connect();
 *   const page = await c.findPage(/instagram\.com/) ?? await c.attachPage("<targetId>");
 *   await page.evalJs("document.title");
 *
 * Reglas que este cliente ya aplica por ti:
 * - send() con timeout (el relay mata RPCs >~20 s: nunca hagas evaluate largo).
 * - waitFor() hace polling DESDE EL CLIENTE con evaluates cortos.
 * - realClick()/typeText()/pressEnter() usan el dominio Input (trusted).
 */

export interface CdpClient {
  send: (method: string, params?: Record<string, unknown>, sessionId?: string, timeoutMs?: number) => Promise<any>;
  close: () => void;
  /** Tabs conocidos vía Target.setDiscoverTargets (el relay NO implementa Target.getTargets). */
  listPages: () => Promise<Array<{ targetId: string; url: string; title: string }>>;
  /** Busca un tab ya abierto por regex de URL; null si no está. */
  findPage: (urlRe: RegExp) => Promise<CdpPage | null>;
  /** Crea un tab nuevo (Target.createTarget) y lo devuelve adjunto. */
  openPage: (url: string) => Promise<CdpPage>;
  attachPage: (targetId: string) => Promise<CdpPage>;
}

export interface CdpPage {
  targetId: string;
  sessionId: string;
  /** Evaluate corto (returnByValue). Lanza con el detalle si la página revienta. */
  evalJs: <T = unknown>(expression: string) => Promise<T>;
  /** Click REAL (Input.dispatchMouseEvent) — para acciones que deben persistir. */
  realClick: (x: number, y: number) => Promise<void>;
  /** Tipeo real (Input.insertText): acentos/emoji correctos. */
  typeText: (text: string) => Promise<void>;
  pressEnter: () => Promise<void>;
  /** Click SINTÉTICO por texto exacto (dispatchEvent). Para menús/navegación. */
  clickByText: (text: string) => Promise<"ok" | "no">;
  /** Polling desde el cliente: `check` corre como `const t = document.body.innerText; return (${check});` */
  waitFor: (check: string, tries?: number, stepMs?: number) => Promise<string>;
  navigate: (url: string) => Promise<void>;
  screenshot: (path: string, quality?: number) => Promise<void>;
  /** Inyecta un archivo en el ÚLTIMO input[type=file] visible (o en el que pases). */
  injectFile: (filePath: string, mime?: string, inputSelector?: string) => Promise<string>;
}

const FIRE_SYNTHETIC = `['pointerover','pointerdown','mousedown','pointerup','mouseup','click'].forEach(type =>
  __EL__.dispatchEvent(new (type.startsWith('pointer') ? PointerEvent : MouseEvent)(type, { bubbles: true, cancelable: true, view: window })));`;

export async function connect(url = "ws://127.0.0.1:9224/cdp"): Promise<CdpClient> {
  const ws = new WebSocket(url);
  let seq = 0;
  const pending = new Map<number, { res: (v: any) => void; rej: (e: Error) => void; t: Timer }>();

  await new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onerror = () => reject(new Error("no se pudo conectar al relay " + url));
  });

  // Registro de tabs vía Target.targetCreated (setDiscoverTargets).
  // El relay no implementa Target.getTargets ni /json/list: descubrimiento = eventos.
  const targets = new Map<string, { targetId: string; url: string; title: string }>();

  ws.onmessage = (ev) => {
    const msg = JSON.parse(String(ev.data));
    if (msg.method === "Target.targetCreated" && msg.params?.targetInfo) {
      const info = msg.params.targetInfo;
      if (info.type === "page") {
        targets.set(info.targetId, { targetId: info.targetId, url: info.url, title: info.title });
      }
      return;
    }
    if (msg.method === "Target.targetInfoChanged" && msg.params?.targetInfo) {
      const info = msg.params.targetInfo;
      if (targets.has(info.targetId)) {
        targets.set(info.targetId, { targetId: info.targetId, url: info.url, title: info.title });
      }
      return;
    }
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id)!;
      clearTimeout(p.t);
      pending.delete(msg.id);
      msg.error ? p.rej(new Error(msg.error.message)) : p.res(msg.result);
    }
  };

  const send = (method: string, params: Record<string, unknown> = {}, sessionId?: string, timeoutMs = 20000) =>
    new Promise<any>((res, rej) => {
      const id = ++seq;
      const t = setTimeout(() => {
        pending.delete(id);
        rej(new Error(`timeout ${method} (${timeoutMs}ms)`));
      }, timeoutMs);
      pending.set(id, { res, rej, t });
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });

  const listPages = async () => {
    if (targets.size === 0) {
      // Discovery encendido una vez por proceso. OJO: el relay no emite
      // targetCreated por tabs que ya existían antes de conectar (comportamiento
      // observado), así que esto NO es un listado completo — combina con
      // attachPage(targetId conocido) u openPage().
      await send("Target.setDiscoverTargets", { discover: true }).catch(() => {});
      await new Promise((r) => setTimeout(r, 1500));
    }
    return [...targets.values()];
  };

  const openPage = async (url: string) => {
    const r = await send("Target.createTarget", { url });
    const targetId = r.targetId as string;
    targets.set(targetId, { targetId, url, title: "" });
    return attachPage(targetId);
  };

  const attachPage = async (targetId: string): Promise<CdpPage> => {
    const at = await send("Target.attachToTarget", { targetId, flatten: true });
    const sessionId = at.sessionId as string;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const evalJs = async <T = unknown>(expression: string): Promise<T> => {
      const r = await send("Runtime.evaluate", { expression, returnByValue: true }, sessionId);
      if (r.exceptionDetails) {
        throw new Error("page JS error: " + JSON.stringify(r.exceptionDetails).slice(0, 300));
      }
      return r.result?.value as T;
    };

    const realClick = async (x: number, y: number) => {
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 }, sessionId);
      await sleep(60);
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 }, sessionId);
    };

    const typeText = async (text: string) => {
      await send("Input.insertText", { text }, sessionId);
    };

    const pressEnter = async () => {
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 }, sessionId);
      await sleep(80);
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 }, sessionId);
    };

    const clickByText = async (text: string): Promise<"ok" | "no"> => {
      const res = await evalJs<"ok" | "no">(`(() => {
        const cands = [...document.querySelectorAll('button, [role=button], [role=menuitem], span, div, a')].filter(e => {
          const t = (e.childElementCount === 0 ? (e.textContent ?? '') : (e.innerText ?? '')).trim();
          if (t !== ${JSON.stringify(text)}) return false;
          const r = e.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
        if (!cands.length) return 'no';
        let el = cands[cands.length - 1];
        el = el.closest('[role=menuitem], [role=button], button, a') ?? el;
        ${FIRE_SYNTHETIC.replaceAll("__EL__", "el")}
        return 'ok';
      })()`);
      await sleep(300);
      return res;
    };

    const waitFor = async (check: string, tries = 30, stepMs = 2000) => {
      for (let i = 0; i < tries; i++) {
        await sleep(stepMs);
        const ok = await evalJs<boolean>(`(() => { const t = document.body.innerText; return (${check}); })()`).catch(() => false);
        if (ok) return `listo en ${((i + 1) * stepMs / 1000).toFixed(0)}s`;
      }
      return "timeout";
    };

    const navigate = async (navUrl: string) => {
      await send("Page.navigate", { url: navUrl }, sessionId);
      await sleep(4000);
    };

    const screenshot = async (path: string, quality = 78) => {
      const { writeFileSync } = await import("node:fs");
      const shot = await send("Page.captureScreenshot", { format: "jpeg", quality }, sessionId);
      writeFileSync(path, Buffer.from(shot.data, "base64"));
    };

    const injectFile = async (filePath: string, mime = "video/mp4", inputSelector?: string) => {
      const { readFileSync, statSync } = await import("node:fs");
      const fileName = filePath.split("/").pop()!;
      const b64 = readFileSync(filePath).toString("base64");
      const CHUNK = 1_500_000;
      await evalJs(`window.__chunks = []; window.__fname = ${JSON.stringify(fileName)}; window.__fmime = ${JSON.stringify(mime)}; "ok"`);
      for (let i = 0; i < b64.length; i += CHUNK) {
        await evalJs(`window.__chunks.push(${JSON.stringify(b64.slice(i, i + CHUNK))}); "ok"`);
      }
      const sizeMb = (statSync(filePath).size / 1e6).toFixed(1);
      const result = await evalJs<string>(`(() => {
        const inputs = [...document.querySelectorAll('input[type=file]')];
        const input = ${inputSelector ? `document.querySelector(${JSON.stringify(inputSelector)})` : "inputs[inputs.length - 1]"};
        if (!input) return 'no-input';
        const bin = atob(window.__chunks.join(''));
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const file = new File([bytes], window.__fname, { type: window.__fmime });
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        const key = Object.keys(input).find((k) => k.startsWith('__reactProps'));
        const props = key ? input[key] : null;
        if (!props || !props.onChange) return 'no-react-props';
        props.onChange({ target: input, currentTarget: input, persist() {}, preventDefault() {}, stopPropagation() {}, nativeEvent: new Event('change') });
        return 'injected';
      })()`);
      return `${result} (${fileName}, ${sizeMb}MB, ${Math.ceil(b64.length / CHUNK)} chunks)`;
    };

    return { targetId, sessionId, evalJs, realClick, typeText, pressEnter, clickByText, waitFor, navigate, screenshot, injectFile };
  };

    const findPage = async (urlRe: RegExp) => {
    const pages = await listPages();
    const hit = pages.find((p) => urlRe.test(p.url));
    return hit ? attachPage(hit.targetId) : null;
  };

  return { send, close: () => ws.close(), listPages, findPage, openPage, attachPage };
};

// Si se corre directo: health check rápido (lista tabs abiertas).
if (import.meta.main) {
  const c = await connect();
  const pages = await c.listPages();
  console.log(JSON.stringify(pages.map((p) => ({ id: p.targetId, url: p.url.slice(0, 80) })), null, 1));
  c.close();
  process.exit(0);
}
