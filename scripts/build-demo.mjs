// Gera dist-demo/index.html: o checkout inteiro num único arquivo, sem servidor.
import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const result = await build({
  entryPoints: [path.join(root, "src/demo/main.tsx")],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  alias: { "@": path.join(root, "src") },
  define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" },
  target: "es2020",
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const css = readFileSync(path.join(root, "src/app/globals.css"), "utf8");
const demoCss = `
.demo-grid { display: grid; gap: 16px; max-width: 1100px; margin: 0 auto; padding-block: 16px 48px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); grid-template-columns: minmax(0, 560px) minmax(0, 1fr); align-items: start; }
.demo-bar { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; padding: 12px 16px; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); }
.demo-bar label { margin: 0; }
.demo-bar select { width: auto; padding: 8px; }
.demo-log { position: sticky; top: 16px; max-height: calc(100vh - 32px); overflow: auto; }
.demo-log h2 { font-size: 1.05rem; margin: 0 0 4px; }
.demo-log details { border-top: 1px solid var(--border); padding: 8px 0; }
.demo-log summary { cursor: pointer; font-weight: 600; font-size: .9rem; }
.demo-log pre { background: var(--bg); padding: 8px; border-radius: 6px; margin-top: 6px; }
@media (max-width: 860px) { .demo-grid { grid-template-columns: minmax(0, 1fr); } .demo-log { position: static; max-height: none; } }
`;
const html = `<title>Checkout Cotação PV</title>
<style>${css}${demoCss}</style>
<div id="root"></div>
<script>${js}</script>
`;
mkdirSync(path.join(root, "dist-demo"), { recursive: true });
writeFileSync(path.join(root, "dist-demo/index.html"), html);
console.log(`dist-demo/index.html (${(html.length / 1024).toFixed(0)} KB)`);
