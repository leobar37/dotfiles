// traduccion.ts — English prompts for the agent, Spanish for me.
//
// Commands:
//   /tr-send [text]   Improves the text (translates ES→EN or corrects EN)
//                      via @tiny and SENDS it as the prompt. Source: args →
//                      editor draft.
//   /tr-explain       Detail for the LAST submitted prompt: translation,
//                      corrections and vocabulary (widget below the editor).
//   /tr-log [n]       Last n log entries (default 8).
//
// Principles: nothing runs on its own (the normal flow is never touched),
// fail-closed (if @tiny fails, /tr-send sends NOTHING: it reports and the
// original stays yours), and everything is logged to
// ~/.local/state/omp/traduccion.jsonl for studying.

import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

const MODEL_ROLE = "@tiny";
const LOG_PATH = `${process.env.HOME ?? ""}/.local/state/omp/traduccion.jsonl`;
const TIMEOUT_MS = 25_000;
const WIDGET_KEY = "traduccion";
const WIDGET_TTL_MS = 90_000;

/** Clips text with a UTF-8 ellipsis — one format for every widget line. */
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

/** Minimal pi-ai.completeSimple signature this extension needs. */
type CompleteSimple = (
  model: unknown,
  context: { systemPrompt: string[]; messages: { role: "user"; content: string; timestamp: number }[] },
  options?: { signal?: AbortSignal; apiKey?: string },
) => Promise<{ content: unknown }>;

interface UIContext {
  ui: {
    notify: (message: string, type?: string) => void;
    getEditorText?: () => string;
    setEditorText?: (text: string) => void;
    editor?: (title: string, prefill?: string) => Promise<string | undefined>;
    setWidget?: (key: string, lines: string[] | undefined, options?: { placement?: string }) => void;
  };
  models?: { resolve?: (spec: string) => unknown };
  modelRegistry?: unknown;
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

/** Last non-command prompt captured passively (for /tr-explain). */
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
  '"corrections":[{"from":"...","to":"...","why":"grammar|spelling|usage: brief"}],',
  '"vocab":[{"es":"...","en":"..."}],"note":"one line of advice in Spanish"}',
  "Corrections: real mistakes only (grammar, spelling, false friends), max 5.",
  "Vocab: max 5 ES→EN pairs worth remembering from this prompt.",
  "If input is Spanish: corrections stay empty; vocab carries the learning.",
].join(" ");

/** Guard: {type:"text", text:string} block of an AssistantMessage. */
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

/** Extracts the plain text of an AssistantMessage (type text blocks). */
export function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.filter(isTextBlock).map((b) => b.text).join("");
}

/** First balanced {...} in the text → defensive JSON.parse. */
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
          // JSON.parse succeeded + typeof object: minimal shape validated field by field below.
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

/** Text source for /tr-send: explicit args → editor draft. */
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
    `✉ sent (${ms}ms · ${model})`,
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

/** Full-detail text for the /tr-explain dialog — no clipping, scrolls. */
export function renderExplainText(original: string, d: ExplainDetail): string {
  const lines: string[] = [
    `Detected : ${d.detected}`,
    "",
    "Original:",
    ...wrap(original, 76).map((l) => `  ${l}`),
    "",
    "English:",
    ...wrap(d.result, 76).map((l) => `  ${l}`),
  ];
  if (d.corrections.length > 0) {
    lines.push("", "Corrections:");
    for (const c of d.corrections) {
      lines.push(`  • ${c.from} → ${c.to}${c.why ? ` (${c.why})` : ""}`);
    }
  }
  if (d.vocab.length > 0) {
    lines.push("", "Vocabulary:");
    for (const v of d.vocab) {
      lines.push(`  • ${v.es} = ${v.en}`);
    }
  }
  if (d.note) lines.push("", `💡 ${d.note}`);
  lines.push("", "(Esc to close — edits + Enter load the text into the composer)");
  return lines.join("\n");
}

/** Simple word wrap for dialog text. */
function wrap(text: string, max: number): string[] {
  if (!text) return ["(empty)"];
  const out: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (line && `${line} ${word}`.length > max) {
        out.push(line);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    out.push(line);
  }
  return out;
}

export const logLine = (entry: LogEntry): string => JSON.stringify(entry);

/**
 * Runtime import of pi-ai: the package only exists inside the omp process
 * (omp's global install), not in this repo — a static import would break
 * `bun test` here. Deliberate platform exception for the literal specifier.
 */
async function loadCompleteSimple(): Promise<CompleteSimple> {
  const mod: unknown = await import("@oh-my-pi/pi-ai");
  // Guard + cast to a name: the real signature is wider; we only use this subset.
  if (typeof mod === "object" && mod !== null && "completeSimple" in mod) {
    const fn = (mod as Record<string, unknown>).completeSimple;
    if (typeof fn === "function") return fn as CompleteSimple;
  }
  throw new Error("pi-ai does not expose completeSimple");
}

/** Fallback AuthStorage bound to ~/.omp/agent/agent.db (see resolveApiKey). */
let fallbackAuthStorage: { getApiKey: (provider: string) => Promise<string | undefined> } | undefined;

/**
 * API key for a provider. Prefers the live session registry's AuthStorage
 * (omp's own instance: OAuth refresh via its broker, runtime overrides) and
 * falls back to opening the credential db directly. completeSimple bypasses
 * omp's credential pipeline, so the key must be resolved here.
 */
async function resolveApiKey(ctx: UIContext, provider: string): Promise<string | undefined> {
  const registry = ctx.modelRegistry as
    | { authStorage?: { getApiKey: (p: string) => Promise<string | undefined> } }
    | undefined;
  const live = await registry?.authStorage?.getApiKey(provider);
  if (live) return live;
  fallbackAuthStorage ??= await openFallbackAuthStorage();
  return fallbackAuthStorage?.getApiKey(provider);
}

async function openFallbackAuthStorage(): Promise<{ getApiKey: (p: string) => Promise<string | undefined> } | undefined> {
  try {
    const mod: unknown = await import("@oh-my-pi/pi-ai");
    if (typeof mod === "object" && mod !== null && "AuthStorage" in mod) {
      const AuthStorage = (mod as Record<string, unknown>).AuthStorage;
      if (typeof AuthStorage === "function") {
        return await (AuthStorage as {
          create: (dbPath: string) => Promise<{ getApiKey: (p: string) => Promise<string | undefined> }>;
        }).create(`${process.env.HOME ?? ""}/.omp/agent/agent.db`);
      }
    }
  } catch {
    /* no fallback: the missing-key error below reports it */
  }
  return undefined;
}

/** Provider id of a resolved model ("openai-codex/gpt-6-luna" → "openai-codex"). */
function modelProvider(model: object): string {
  if ("provider" in model && typeof model.provider === "string" && model.provider) return model.provider;
  if ("id" in model && typeof model.id === "string" && model.id.includes("/")) return model.id.split("/")[0];
  return "";
}

/** Calls @tiny with system+user only — no session context, no tools. */
async function callTiny(ctx: UIContext, system: string, user: string): Promise<{ text: string; model: string }> {
  const model = ctx.models?.resolve?.(MODEL_ROLE);
  if (!model || typeof model !== "object") {
    throw new Error(`could not resolve ${MODEL_ROLE} (check modelRoles in config.yml)`);
  }
  const completeSimple = await loadCompleteSimple();
  let modelId = MODEL_ROLE;
  if ("id" in model && typeof model.id === "string") modelId = model.id;
  const provider = modelProvider(model);
  const apiKey = provider ? await resolveApiKey(ctx, provider) : undefined;
  if (!apiKey) {
    throw new Error(`no credential for provider "${provider}" — run omp /login for it`);
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const reply = await completeSimple(
      model,
      { systemPrompt: [system], messages: [{ role: "user", content: user, timestamp: Date.now() }] },
      { signal: ctrl.signal, apiKey },
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
    /* best-effort log: never breaks the command */
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

/**
 * Full-screen scrollable dialog via ui.editor; falls back to the editor
 * widget in hosts without dialogs (RPC/headless). If the user edits the text
 * and presses Enter, the edited text lands in the composer (Esc = just close).
 */
async function showDetail(ctx: UIContext, fullText: string, widgetLines: string[]): Promise<void> {
  if (typeof ctx.ui.editor === "function") {
    const edited = await ctx.ui.editor("traduccion", fullText);
    if (typeof edited === "string" && edited.trim() && edited.trim() !== fullText.trim()) {
      ctx.ui.setEditorText?.(edited.trim());
    }
    return;
  }
  showWidget(ctx, widgetLines);
}

export default function traduccion(pi: TraduccionAPI): void {
  // Passive capture of the last real prompt (not commands). NO return value:
  // zero interference with normal dispatch — never modifies or blocks anything.
  pi.on?.("input", (event) => {
    const t = event.text.trim();
    if (t && !t.startsWith("/")) lastPrompt = { text: t, ts: Date.now() };
  });

  pi.registerCommand("tr-send", {
    description: "Translate/fix the prompt into English via @tiny and send it. Args: text (default: editor draft)",
    handler: async (args, ctx) => {
      const src = pickSource(args, ctx.ui.getEditorText?.());
      if (!src) {
        ctx.ui.notify("tr-send: type the text after the command or leave a draft in the editor", "warn");
        return;
      }
      ctx.ui.notify(`tr-send: improving with ${MODEL_ROLE}…`, "info");
      const t0 = Date.now();
      try {
        const { text: en, model } = await callTiny(ctx, SEND_SYSTEM, src.text);
        if (!en) throw new Error("empty response from @tiny");
        const ms = Date.now() - t0;
        pi.sendUserMessage?.(en);
        showWidget(ctx, renderSendLines(src.text, en, ms, model));
        appendLog({ ts: Date.now(), kind: "send", source: src.source, original: src.text, result: en, ms, model });
      } catch (err) {
        // Contract: improve AND send. No improvement, no silent Spanish send.
        const msg = err instanceof Error ? err.message : String(err);
        ctx.ui.notify(`tr-send: NOTHING was sent (${msg}); send the original yourself if you want`, "error");
        appendLog({ ts: Date.now(), kind: "error", source: src.source, original: src.text, error: msg, ms: Date.now() - t0 });
      }
    },
  });

  pi.registerCommand("tr-explain", {
    description: "Detail for the last prompt: translation, corrections and vocabulary (full-screen dialog)",
    handler: async (_args, ctx) => {
      if (!lastPrompt) {
        ctx.ui.notify("tr-explain: no previous prompt in this session yet", "warn");
        return;
      }
      ctx.ui.notify(`tr-explain: analyzing with ${MODEL_ROLE}…`, "info");
      const t0 = Date.now();
      try {
        const { text: raw, model } = await callTiny(ctx, EXPLAIN_SYSTEM, lastPrompt.text);
        const detail = parseDetail(raw);
        await showDetail(ctx, renderExplainText(lastPrompt.text, detail), renderExplainLines(lastPrompt.text, detail));
        appendLog({
          ts: Date.now(), kind: "explain", source: "last", original: lastPrompt.text,
          result: detail.result, detected: detail.detected, corrections: detail.corrections,
          vocab: detail.vocab, ms: Date.now() - t0, model,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        ctx.ui.notify(`tr-explain: failed (${msg})`, "error");
        appendLog({ ts: Date.now(), kind: "error", source: "last", original: lastPrompt.text, error: msg, ms: Date.now() - t0 });
      }
    },
  });

  pi.registerCommand("tr-log", {
    description: "Last entries of traduccion.jsonl (full-screen dialog). Args: [n] (default 8)",
    handler: (args, ctx) => {
      const n = Math.max(1, Math.min(20, Number.parseInt(args.trim(), 10) || 8));
      const rows = readLogTail(n);
      if (rows.length === 0) {
        ctx.ui.notify(`tr-log: ${LOG_PATH} empty or missing`, "warn");
        return;
      }
      const lines = rows.map((r) => {
        let e: LogEntry;
        try {
          const parsed: unknown = JSON.parse(r);
          if (typeof parsed !== "object" || parsed === null) throw new Error("not an object");
          e = parsed as LogEntry; // boundary: line written by appendLog, known shape
        } catch {
          return clip(r, 76);
        }
        const when = new Date(e.ts).toISOString().slice(5, 16).replace("T", " ");
        if (e.kind === "error") return `${when} ✕ ${e.error ?? "?"}`;
        return `${when} ${e.kind === "send" ? "✉" : "🗣"} ${clip(e.original ?? "", 28)} → ${clip(e.result ?? "", 34)}`;
      });
      showDetail(ctx, lines.join("\n"), lines);
    },
  });
}
