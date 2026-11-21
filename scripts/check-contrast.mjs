#!/usr/bin/env node
/**
 * WCAG 2.1 contrast gate. Reads src/ui/tokens.css, resolves the declared pairs and fails
 * if any pair is below its target (4.5 for text, 3 for UI boundaries / focus indicators).
 */
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.join(process.cwd(), "src/ui/tokens.css"), "utf8");
const tokens = Object.fromEntries([...css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2]]));

const TEXT = 4.5;
const UI = 3;
/** [foreground, background, target, use] — tokens or literal hex. */
const pairs = [
  ["on-primary", "primary", TEXT, "primary button label"],
  ["on-primary", "primary-hover", TEXT, "primary button hover"],
  ["on-primary", "primary-strong", TEXT, "dark hero band"],
  ["primary", "surface", TEXT, "links, outlined button"],
  ["primary", "surface-alt", TEXT, "links on grey"],
  ["primary", "primary-soft", TEXT, "selected item label"],
  ["primary-hover", "primary-soft", TEXT, "secondary button hover"],
  ["ink", "surface", TEXT, "body text"],
  ["ink", "surface-alt", TEXT, "body text on grey"],
  ["ink", "primary-soft", TEXT, "body text on selection"],
  ["ink", "surface-sunken", TEXT, "text on pressed grey"],
  ["ink-muted", "surface", TEXT, "captions"],
  ["ink-muted", "surface-alt", TEXT, "captions on grey"],
  ["ink-muted", "primary-soft", TEXT, "captions on selection"],
  ["line-strong", "surface", UI, "field border"],
  ["line-strong", "surface-alt", UI, "field border on grey"],
  ["focus", "surface", UI, "focus ring"],
  ["focus", "surface-alt", UI, "focus ring on grey"],
  ["focus", "primary-soft", UI, "focus ring on selection"],
  ["focus-on-dark", "primary-strong", UI, "focus ring on dark band"],
  ["focus-on-dark", "primary", UI, "focus ring on green"],
  ["accent-red", "surface", UI, "AppBar rule"],
  ["positive", "surface", TEXT, "positive status"],
  ["positive", "positive-bg", TEXT, "positive notice"],
  ["info", "surface", TEXT, "info status"],
  ["info", "info-bg", TEXT, "info notice"],
  ["caution", "surface", TEXT, "caution status"],
  ["caution", "caution-bg", TEXT, "caution notice"],
  ["negative", "surface", TEXT, "negative status / errors"],
  ["negative", "negative-bg", TEXT, "negative notice"],
  ["neutral", "surface", TEXT, "neutral status"],
  ["neutral", "neutral-bg", TEXT, "neutral notice"],
  ["ink", "positive-bg", TEXT, "text inside notices"],
  ["ink", "info-bg", TEXT, "text inside notices"],
  ["ink", "caution-bg", TEXT, "text inside notices"],
  ["ink", "negative-bg", TEXT, "text inside notices"],
  ["ink", "neutral-bg", TEXT, "text inside notices"],
  ["sim-ink", "sim-bg", TEXT, "SYMULACJA banner"],
  ["on-primary", "tl-maternity", TEXT, "timeline label"],
  ["on-primary", "tl-supplementary", TEXT, "timeline label"],
  ["on-primary", "tl-parental", TEXT, "timeline label"],
  ["on-primary", "tl-paternity", TEXT, "timeline label"],
  ["on-primary", "tl-loss", TEXT, "timeline label"],
  ["on-dark-muted", "primary-strong", TEXT, "eyebrow / notes on dark band"],
  ["on-dark-soft", "primary-strong", TEXT, "lead text on dark band"],
  ["on-dark-accent", "primary-strong", UI, "icons on dark band"],
  ["primary-strong", "on-primary", TEXT, "on-dark filled button label"],
];

const hex = (v) => (v.startsWith("#") ? v : tokens[v]);
function lum(h) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

let failed = 0;
const rows = pairs.map(([fg, bg, target, use]) => {
  const f = hex(fg);
  const b = hex(bg);
  if (!f || !b) {
    failed++;
    return `✗ unknown token in pair ${fg} / ${bg}`;
  }
  const r = ratio(f, b);
  const ok = r >= target;
  if (!ok) failed++;
  return `${ok ? "✓" : "✗"} ${r.toFixed(2).padStart(5)} ≥ ${target}  ${fg} on ${bg}  (${use})`;
});
// Raw hex colours outside tokens.css bypass the gate.
const srcRoot = path.join(process.cwd(), "src");
const offenders = fs
  .readdirSync(srcRoot, { recursive: true })
  .map(String)
  .filter((f) => /\.(css|tsx)$/.test(f) && !f.endsWith("tokens.css"))
  .filter((f) => /#[0-9a-fA-F]{6}\b/.test(fs.readFileSync(path.join(srcRoot, f), "utf8").replace(/url\("data:[^"]+"\)/g, "").replace(/themeColor:\s*"#[0-9a-fA-F]{6}"/g, "")));
for (const f of offenders) {
  failed++;
  rows.push(`✗ raw hex colour in src/${f} — use a token`);
}
if (process.argv.includes("--verbose") || failed) console.log(rows.join("\n"));
if (failed) {
  console.error(`\n${failed} contrast pair(s) below WCAG 2.1 AA target.`);
  process.exit(1);
}
console.log(`tokens:check — ${pairs.length} pairs pass WCAG 2.1 AA.`);
