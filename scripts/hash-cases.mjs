#!/usr/bin/env node
/**
 * LOCAL ONLY. Fills `source.pdfSha256` and `source.fileNameSha256` of every fixture so the
 * "upload a case" feature can recognise a dropped PDF by its hash alone (the file never leaves
 * the browser). Reads the restricted case files from `docs/Sprawy ` and the private ID → file map
 * from `.work/case-map.json` (gitignored). Name normalisation must match CaseBrowser.normaliseName.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pdfDir = path.join(root, "docs", "Sprawy ");
const mapFile = path.join(root, ".work", "case-map.json");
if (!fs.existsSync(mapFile) || !fs.existsSync(pdfDir)) {
  console.error("hash-cases: needs .work/case-map.json and docs/Sprawy  (local source material).");
  process.exit(1);
}
const map = JSON.parse(fs.readFileSync(mapFile, "utf8"));
const sha = (b) => createHash("sha256").update(b).digest("hex");
const normalise = (n) => n.normalize("NFC").toLowerCase().replace(/\.pdf$/, "").replace(/\s+/g, " ").trim();
const pdfs = fs.readdirSync(pdfDir).filter((f) => f.toLowerCase().endsWith(".pdf"));
const byHash = new Map();
for (const f of pdfs) {
  const h = sha(fs.readFileSync(path.join(pdfDir, f)));
  byHash.set(h, [...(byHash.get(h) ?? []), f]);
}

let updated = 0;
const missing = [];
for (const [id, fileRaw] of Object.entries(map)) {
  const inputPath = path.join(root, "data", "cases", id, "input.json");
  if (!fs.existsSync(inputPath)) continue;
  const base = String(fileRaw).replace(/\.txt$/, ".pdf");
  const file = pdfs.find((f) => f.normalize("NFC") === base.normalize("NFC")) ?? pdfs.find((f) => normalise(f) === normalise(base));
  if (!file) {
    missing.push(`${id} → ${base}`);
    continue;
  }
  const h = sha(fs.readFileSync(path.join(pdfDir, file)));
  const twins = byHash.get(h) ?? [file]; // byte-identical duplicates share one case
  const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  input.source = { ...(input.source ?? {}), pdfSha256: [h], fileNameSha256: twins.map((t) => sha(normalise(t))) };
  fs.writeFileSync(inputPath, JSON.stringify(input, null, 2) + "\n");
  updated++;
}
console.log(`hash-cases: ${updated} fixture(s) updated, ${pdfs.length} PDFs, ${byHash.size} unique.`);
if (missing.length) console.log(`not found:\n  ${missing.join("\n  ")}`);
