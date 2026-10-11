// traduccion.test.ts — helpers puros de la extensión omp/extensions/traduccion.ts.
// El import de @oh-my-pi/pi-ai es lazy (solo dentro de callTiny): estos tests
// corren en el repo sin ese paquete instalado.
import { describe, expect, test } from "bun:test";
import {
  extractText,
  logLine,
  parseDetail,
  pickSource,
  renderExplainLines,
  renderExplainText,
  renderSendLines,
  type LogEntry,
} from "../extensions/traduccion.ts";

describe("extractText", () => {
  test("string directo", () => {
    expect(extractText("hola")).toBe("hola");
  });
  test("bloques text mezclados con thinking/toolcall", () => {
    const content = [
      { type: "thinking", thinking: "..." },
      { type: "text", text: "Deploy " },
      { type: "tool_call", id: "t1" },
      { type: "text", text: "the worker" },
    ];
    expect(extractText(content)).toBe("Deploy the worker");
  });
  test("ignora text no-string y shapes raras", () => {
    expect(extractText([{ type: "text", text: 42 }, null, { type: "text" }])).toBe("");
  });
});

describe("parseDetail", () => {
  test("JSON limpio completo", () => {
    const raw = JSON.stringify({
      detected: "es",
      result: "Deploy the worker",
      corrections: [{ from: "proces", to: "process", why: "spelling" }],
      vocab: [{ es: "desplegar", en: "deploy" }],
      note: "OK",
    });
    const d = parseDetail(raw);
    expect(d.detected).toBe("es");
    expect(d.result).toBe("Deploy the worker");
    expect(d.corrections).toEqual([{ from: "proces", to: "process", why: "spelling" }]);
    expect(d.vocab).toEqual([{ es: "desplegar", en: "deploy" }]);
    expect(d.note).toBe("OK");
  });
  test("JSON envuelto en prosa/markdown", () => {
    const raw = '```json\n{"detected":"en","result":"Fix the parser"}\n```';
    const d = parseDetail(raw);
    expect(d.detected).toBe("en");
    expect(d.result).toBe("Fix the parser");
  });
  test("llaves anidadas balanceadas", () => {
    const raw = 'prefix {"detected":"es","result":"a {b} c","corrections":[{"from":"x","to":"y"}]} suffix';
    const d = parseDetail(raw);
    expect(d.result).toBe("a {b} c");
    expect(d.corrections).toHaveLength(1);
  });
  test("sin JSON: fallback al texto completo", () => {
    const d = parseDetail("solo texto plano");
    expect(d.detected).toBe("?");
    expect(d.result).toBe("solo texto plano");
    expect(d.corrections).toEqual([]);
  });
  test("JSON inválido: fallback", () => {
    const d = parseDetail('{"detected":"es","result": truncado');
    expect(d.detected).toBe("?");
    expect(d.result).toBe('{"detected":"es","result": truncado');
  });
  test("campos corruptos se descartan, no explotan", () => {
    const raw = JSON.stringify({
      detected: 7,
      result: ["array?"],
      corrections: [{ from: "ok", to: 1 }, { from: "bueno", to: "good" }],
      vocab: "no-array",
    });
    const d = parseDetail(raw);
    expect(d.detected).toBe("?");
    expect(d.result).toBe("");
    expect(d.corrections).toEqual([{ from: "bueno", to: "good" }]);
    expect(d.vocab).toEqual([]);
  });
});

describe("renderExplainText", () => {
  test("full detail, no clipping, all sections", () => {
    const text = renderExplainText("arregla el bug del parser en src/cli.ts", {
      detected: "es",
      result: "Fix the parser bug in src/cli.ts",
      corrections: [],
      vocab: [{ es: "arreglar", en: "fix" }],
      note: "buen trabajo",
    });
    expect(text).toContain("Detected : es");
    expect(text).toContain("arregla el bug del parser en src/cli.ts");
    expect(text).toContain("Fix the parser bug in src/cli.ts");
    expect(text).toContain("• arreglar = fix");
    expect(text).toContain("💡 buen trabajo");
    expect(text).toContain("Esc to close");
  });
  test("long original wraps without losing words", () => {
    const long = Array.from({ length: 30 }, (_, i) => `palabra${i}`).join(" ");
    const text = renderExplainText(long, { detected: "?", result: "", corrections: [], vocab: [], note: "" });
    const body = text.split("\n").filter((l) => l.startsWith("  "));
    expect(body.join(" ").replace(/\s+/g, " ")).toContain("palabra29");
  });
});

describe("pickSource", () => {
  test("args ganan", () => {
    expect(pickSource(" deploy ya ", "draft")).toEqual({ text: "deploy ya", source: "args" });
  });
  test("draft del editor si no hay args", () => {
    expect(pickSource("   ", "  deploy el worker  ")).toEqual({ text: "deploy el worker", source: "editor" });
  });
  test("undefined si no hay nada", () => {
    expect(pickSource("", undefined)).toBeUndefined();
    expect(pickSource("", "   ")).toBeUndefined();
  });
});

describe("renderSendLines / renderExplainLines", () => {
  test("send: par ES→EN + receipt", () => {
    const lines = renderSendLines("despliega el worker", "Deploy the worker", 812, "gpt-6-luna");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("🇪🇸");
    expect(lines[1]).toContain("🇬🇧 Deploy the worker");
    expect(lines[2]).toContain("812ms");
  });
  test("explain: respeta tope de 10 líneas", () => {
    const detail = {
      detected: "en",
      result: "Fix the parser",
      corrections: Array.from({ length: 6 }, (_, i) => ({ from: `f${i}`, to: `t${i}`, why: "w" })),
      vocab: Array.from({ length: 6 }, (_, i) => ({ es: `es${i}`, en: `en${i}` })),
      note: "nota",
    };
    expect(renderExplainLines("orig", detail).length).toBeLessThanOrEqual(10);
  });
  test("explain vacío muestra el original", () => {
    const lines = renderExplainLines("despliega", { detected: "?", result: "", corrections: [], vocab: [], note: "" });
    expect(lines.some((l) => l.includes("despliega"))).toBe(true);
  });
});

describe("logLine", () => {
  test("serializa entrada completa en una línea JSON", () => {
    const entry: LogEntry = { ts: 1, kind: "send", source: "args", original: "a", result: "b", ms: 5, model: "m" };
    const line = logLine(entry);
    expect(line).not.toContain("\n");
    expect(JSON.parse(line)).toEqual(entry);
  });
});
