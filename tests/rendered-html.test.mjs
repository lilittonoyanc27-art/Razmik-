import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the complete Football Puzzle game", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Football Puzzle — Aprende Español<\/title>/i);
  assert.match(html, /Arma la jugada/);
  assert.match(html, /Puzzle de 9 piezas/);
  assert.match(html, /ENTRENAMIENTO DE ESPAÑOL/);
  assert.match(html, /PREGUNTA[^<]*<!-- -->1/);
  assert.match(html, /Situaciones reales/);
  assert.match(html, /og\.png/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("ships all requested game content and assets", async () => {
  const [page, data, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);
  assert.equal((data.match(/^¿/gm) ?? []).length, 60);
  assert.match(page, /PointerEvent/);
  assert.match(page, /speechSynthesis/);
  assert.match(page, /localStorage/);
  assert.match(page, /Experto/);
  assert.match(page, /64/);
  assert.match(layout, /summary_large_image/);
  await Promise.all([
    access(new URL("../public/photos/foto-1.png", import.meta.url)),
    access(new URL("../public/photos/foto-2.png", import.meta.url)),
    access(new URL("../public/photos/foto-3.png", import.meta.url)),
    access(new URL("../public/og.png", import.meta.url)),
  ]);
});
