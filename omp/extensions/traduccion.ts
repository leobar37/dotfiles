// traduccion.ts — prompts en inglés para el agente, español para mí.
//
// Comandos:
//   /tr-send [texto]   Mejora el texto (traduce ES→EN o corrige EN) vía @tiny
//                      y LO ENVÍA como prompt. Fuente: args → draft del editor.
//   /tr-explain        Detalle del ÚLTIMO prompt enviado: traducción,
//                      correcciones y vocabulario (widget bajo el editor).
//   /tr-log [n]        Últimas n entradas del log (default 8).
//
// Principios: nada corre solo (el flujo normal nunca se toca), fail-open
// (si @tiny falla, /tr-send NO envía nada: avisa y el original queda en tu
// poder), y todo queda en ~/.local/state/omp/traduccion.jsonl para estudiar.

import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

const MODEL_ROLE = "@tiny";
const LOG_PATH = `${process.env.HOME ?? ""}/.local/state/omp/traduccion.jsonl`;
const TIMEOUT_MS = 25_000;
const WIDGET_KEY = "traduccion";
const WIDGET_TTL_MS = 90_000;

/** Trunca con elipsis UTF-8 — un solo formato para todas las líneas del widget. */
const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

export interface Correction {
  from: string;
  to: string;
  why?: string;
}
export interface VocabPair {
  es: string;
  en: string;
}
export interface ExplainDetail {
  detected: string;
  result: string;
  corrections: Correction[];
  vocab: VocabPair[];
  note: string;
}
export interface LogEntry {
  ts: number;
  kind: "send" | "explain" | "error";
  source?: string;
  original?: string;
  result?: string;
  detected?: string;
  corrections?: Correction[];
  vocab?: VocabPair[];
  ms?: number;
  model?: string;
  error?: string;
}

/** Firma mínima de pi-ai.completeSimple que esta extensión necesita. */
type CompleteSimple = (
  model: unknown,
  context: { systemPrompt: string[]; messages: { role: "user"; content: string; timestamp: number }[] },
  options?: { signal?: AbortSignal },
) => Promise<{ content: unknown }>;

interface UIContext {
  ui: {
    notify: (message: string, type?: string) => void;
    getEditorText?: () => string;
    setWidget?: (key: string, lines: string[] | undefined, options?: { placement?: string }) => void;
  };
  models?: { resolve?: (spec: string) => unknown };
  setTimeout?: (fn: () => void, ms: number) => unknown;
}

interface TraduccionAPI {
  registerCommand: (
    name: string,
    def: { description: string; handler: (args: string, ctx: UIContext) => Promise<void> | void },
  ) => void;
  sendUserMessage?: (content: string) => void;
  on?: (event: "input", handler: (event: { text: string; source: string }) => Promise<unknown> | unknown) => void;
}

/** Último prompt no-comando capturado pasivamente (para /tr-explain). */
let lastPrompt: { text: string; ts: number } | undefined;

const SEND_SYSTEM = [
  "You rewrite a coding-agent prompt in clear technical English.",
  "Input may be Spanish or imperfect English; preserve meaning exactly.",
  "Keep code identifiers, file paths, shell commands, URLs and numbers verbatim.",
  "Keep it a prompt, not an essay: same intent, natural developer English.",
  "Output ONLY the improved prompt text — no quotes, no markdown, no commentary.",
].join(" ");

const EXPLAIN_SYSTEM = [
  "You are an English teacher for a Spanish-speaking software developer.",
  "Given their prompt, return ONE JSON object and nothing else with fields:",
  '{"detected":"es|en","result":"the prompt in correct technical English",',
  '"corrections":[{"from":"...","to":"...","why":"grammar|spelling|usage: breve"}],',
  '"vocab":[{"es":"...","en":"..."}],"note":"una línea de consejo"}',
  "Corrections: real mistakes only (grammar, spelling, false friends), max 5.",
  "Vocab: max 5 ES→EN pairs worth remembering from this prompt.",
  "If input is Spanish: corrections stay empty; vocab carries the learning.",
].join(" ");

/** Guard: bloque {type:"text", text:string} de un AssistantMessage. */
function isTextBlock(block: unknown): block is { type: "text"; text: string } {
  return (
    typeof block === "object" &&
    block !== null &&
    "type" in block &&
    block.type === "text" &&
    "text" in block &&
    typeof block.text === "string"
  );
}

const isCorrection = (v: unknown): v is Correction =>
  typeof v === "object" &&
  v !== null &&
  "from" in v &&
  typeof v.from === "string" &&
  "to" in v &&
  typeof v.to === "string";

const isVocabPair = (v: unknown): v is VocabPair =>
  typeof v === "object" &&
  v !== null &&
  "es" in v &&
  typeof v.es === "string" &&
  "en" in v &&
  typeof v.en === "string";

/** Extrae el texto plano de un AssistantMessage (bloques type text). */
export function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.filter(isTextBlock).map((b) => b.text).join("");
}

/** Primera llave balanceada {...} del texto → JSON.parse defensivo. */
export function parseDetail(raw: string): ExplainDetail {
  const fallback = (text: string): ExplainDetail => ({
    detected: "?",
    result: text,
    corrections: [],
    vocab: [],
    note: "",
  });
  const start = raw.indexOf("{");
  if (start === -1) return fallback(raw.trim());
  let depth = 0;
  for (let i = start; i < raw.length; i++) {
    if (raw[i] === "{") depth++;
    else if (raw[i] === "}") {
      depth--;
      if (depth === 0) {
        let o: Record<string, unknown>;
        try {
          const parsed: unknown = JSON.parse(raw.slice(start, i + 1));
          if (typeof parsed !== "object" || parsed === null) return fallback(raw.trim());
          // JSON.parse exitoso + typeof object: shape mínima se valida abajo campo a campo.
          o = parsed as Record<string, unknown>;
        } catch {
          return fallback(raw.trim());
        }
        return {
          detected: typeof o.detected === "string" ? o.detected : "?",
          result: typeof o.result === "string" ? o.result : "",
          corrections: Array.isArray(o.corrections) ? o.corrections.filter(isCorrection) : [],
          vocab: Array.isArray(o.vocab) ? o.vocab.filter(isVocabPair) : [],
          note: typeof o.note === "string" ? o.note : "",
        };
      }
    }
  }
  return fallback(raw.trim());
}

/** Fuente de texto para /tr-send: args explícitos → draft del editor. */
export function pickSource(
  args: string,
  editorText: string | undefined,
): { text: string; source: "args" | "editor" } | undefined {
  const a = args.trim();
  if (a) return { text: a, source: "args" };
  const e = (editorText ?? "").trim();
  if (e) return { text: e, source: "editor" };
  return undefined;
}

export function renderSendLines(original: string, english: string, ms: number, model: string): string[] {
  return [
    `🇪🇸 ${clip(original, 70)}`,
    `🇬🇧 ${clip(english, 70)}`,
    `✉ enviado (${ms}ms · ${model})`,
  ];
}

export function renderExplainLines(original: string, d: ExplainDetail): string[] {
  const lines = [`🗣 ${d.detected} · 🇬🇧 ${clip(d.result, 60)}`];
  for (const c of d.corrections.slice(0, 4)) {
    lines.push(`✏ ${clip(c.from, 24)} → ${clip(c.to, 24)} (${clip(c.why ?? "", 30)})`);
  }
  for (const v of d.vocab.slice(0, 4)) {
    lines.push(`📖 ${clip(v.es, 24)} = ${clip(v.en, 30)}`);
  }
  if (d.note) lines.push(`💡 ${clip(d.note, 80)}`);
  if (lines.length < 2) lines.push(`🇪🇸 ${clip(original, 70)}`);
  return lines.slice(0, 10);
}

export const logLine = (entry: LogEntry): string => JSON.stringify(entry);

/**
 * Import en runtime de pi-ai: el paquete solo existe dentro del proceso omp
 * (instalación global de omp), no en este repo — un import estático rompería
 * `bun test` aquí. Excepción de plataforma, specifier literal consciente.
 */
async function loadCompleteSimple(): Promise<CompleteSimple> {
  const mod: unknown = await import("@oh-my-pi/pi-ai");
  // Guard + cast a nombre: la firma real es más amplia; solo usamos este subset.
  if (typeof mod === "object" && mod !== null && "completeSimple" in mod) {
    const fn = (mod as Record<string, unknown>).completeSimple;
    if (typeof fn === "function") return fn as CompleteSimple;
  }
  throw new Error("pi-ai no expone completeSimple");
}

/** Llama a @tiny con system+user, sin contexto de sesión ni tools. */
async function callTiny(ctx: UIContext, system: string, user: string): Promise<{ text: string; model: string }> {
  const model = ctx.models?.resolve?.(MODEL_ROLE);
  if (!model) throw new Error(`no se pudo resolver ${MODEL_ROLE} (revisa modelRoles en config.yml)`);
  const completeSimple = await loadCompleteSimple();
  let modelId = MODEL_ROLE;
  if (typeof model === "object" && model !== null && "id" in model && typeof model.id === "string") {
    modelId = model.id;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const reply = await completeSimple(
      model,
      { systemPrompt: [system], messages: [{ role: "user", content: user, timestamp: Date.now() }] },
      { signal: ctrl.signal },
    );
    return { text: extractText(reply?.content).trim(), model: modelId };
  } finally {
    clearTimeout(timer);
  }
}

function appendLog(entry: LogEntry): void {
  try {
    mkdirSync(dirname(LOG_PATH), { recursive: true });
    appendFileSync(LOG_PATH, `${logLine(entry)}\n`);
  } catch {
    /* log best-effort: nunca rompe el comando */
  }
}

function readLogTail(n: number): string[] {
  try {
    return readFileSync(LOG_PATH, "utf8").trim().split("\n").slice(-n);
  } catch {
    return [];
  }
}

function showWidget(ctx: UIContext, lines: string[]): void {
  ctx.ui.setWidget?.(WIDGET_KEY, lines, { placement: "belowEditor" });
  ctx.setTimeout?.(() => ctx.ui.setWidget?.(WIDGET_KEY, undefined), WIDGET_TTL_MS);
}

export default function traduccion(pi: TraduccionAPI): void {
  // Captura pasiva del último prompt real (no comandos). SIN return: cero
  // interferencia con el dispatch normal — nunca modifica ni bloquea nada.
  pi.on?.("input", (event) => {
    const t = event.text.trim();
    if (t && !t.startsWith("/")) lastPrompt = { text: t, ts: Date.now() };
  });

  pi.registerCommand("tr-send", {
    description: "Traduce/corrige el prompt al inglés vía @tiny y lo envía. Args: texto (default: draft del editor)",
    handler: async (args, ctx) => {
      const src = pickSource(args, ctx.ui.getEditorText?.());
      if (!src) {
        ctx.ui.notify("tr-send: escribe el texto después del comando o deja un draft en el editor", "warn");
        return;
      }
      ctx.ui.notify(`tr-send: mejorando con ${MODEL_ROLE}…`, "info");
      const t0 = Date.now();
      try {
        const { text: en, model } = await callTiny(ctx, SEND_SYSTEM, src.text);
        if (!en) throw new Error("respuesta vacía de @tiny");
        const ms = Date.now() - t0;
        pi.sendUserMessage?.(en);
        showWidget(ctx, renderSendLines(src.text, en, ms, model));
        appendLog({ ts: Date.now(), kind: "send", source: src.source, original: src.text, result: en, ms, model });
      } catch (err) {
        // Contrato: mejorar Y enviar. Sin mejora no hay envío silencioso en ES.
        const msg = err instanceof Error ? err.message : String(err);
        ctx.ui.notify(`tr-send: NO se envió nada (${msg}); envía el original a mano si quieres`, "error");
        appendLog({ ts: Date.now(), kind: "error", source: src.source, original: src.text, error: msg, ms: Date.now() - t0 });
      }
    },
  });

  pi.registerCommand("tr-explain", {
    description: "Detalle del último prompt: traducción, correcciones y vocabulario (widget bajo el editor)",
    handler: async (_args, ctx) => {
      if (!lastPrompt) {
        ctx.ui.notify("tr-explain: aún no hay prompt previo en esta sesión", "warn");
        return;
      }
      ctx.ui.notify(`tr-explain: analizando con ${MODEL_ROLE}…`, "info");
      const t0 = Date.now();
      try {
        const { text: raw, model } = await callTiny(ctx, EXPLAIN_SYSTEM, lastPrompt.text);
        const detail = parseDetail(raw);
        showWidget(ctx, renderExplainLines(lastPrompt.text, detail));
        appendLog({
          ts: Date.now(), kind: "explain", source: "last", original: lastPrompt.text,
          result: detail.result, detected: detail.detected, corrections: detail.corrections,
          vocab: detail.vocab, ms: Date.now() - t0, model,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        ctx.ui.notify(`tr-explain: falló (${msg})`, "error");
        appendLog({ ts: Date.now(), kind: "error", source: "last", original: lastPrompt.text, error: msg, ms: Date.now() - t0 });
      }
    },
  });

  pi.registerCommand("tr-log", {
    description: "Últimas entradas de traduccion.jsonl. Args: [n] (default 8)",
    handler: (args, ctx) => {
      const n = Math.max(1, Math.min(10, Number.parseInt(args.trim(), 10) || 8));
      const rows = readLogTail(n);
      if (rows.length === 0) {
        ctx.ui.notify(`tr-log: ${LOG_PATH} vacío o inexistente`, "warn");
        return;
      }
      const lines = rows.map((r) => {
        let e: LogEntry;
        try {
          const parsed: unknown = JSON.parse(r);
          if (typeof parsed !== "object" || parsed === null) throw new Error("no-object");
          e = parsed as LogEntry; // boundary: línea escrita por appendLog, forma conocida
        } catch {
          return clip(r, 76);
        }
        const when = new Date(e.ts).toISOString().slice(5, 16).replace("T", " ");
        if (e.kind === "error") return `${when} ✕ ${e.error ?? "?"}`;
        return `${when} ${e.kind === "send" ? "✉" : "🗣"} ${clip(e.original ?? "", 28)} → ${clip(e.result ?? "", 34)}`;
      });
      showWidget(ctx, lines);
    },
  });
}
