/**
 * Fixture gate. Phase 0: JSON shape + PII scan. Phase 1 adds the zod schema and date sanity checks.
 * The private name list (.work/names.txt) is read at validation time only and never committed.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "data", "cases");
const namesFile = path.join(process.cwd(), ".work", "names.txt");
const names = fs.existsSync(namesFile)
  ? fs
      .readFileSync(namesFile, "utf8")
      .split(/\r?\n/)
      .map((n) => n.trim())
      .filter((n) => n.length >= 4)
  : [];

const piiPatterns: [RegExp, string][] = [
  [/(?<![\d.])\d{11}(?![\d.])/, "11-digit number (PESEL?)"],
  [/(?<![\d.])\d{10}(?![\d.])/, "10-digit number (NIP/phone?)"],
  [/\d{26}/, "bank account"],
  [/\b\d{2}-\d{3}\b/, "postcode"],
  [/[\w.+-]+@[\w-]+\.[\w.]+/, "e-mail"],
  [/\bul\.\s/i, "street"],
];

let errors = 0;
let count = 0;
if (fs.existsSync(root)) {
  for (const id of fs.readdirSync(root).filter((d) => fs.statSync(path.join(root, d)).isDirectory())) {
    for (const file of ["input.json", "expected.json"]) {
      const p = path.join(root, id, file);
      if (!fs.existsSync(p)) {
        console.error(`✗ ${id}: missing ${file}`);
        errors++;
        continue;
      }
      const text = fs.readFileSync(p, "utf8");
      let json: { id?: string };
      try {
        json = JSON.parse(text);
      } catch (e) {
        console.error(`✗ ${id}/${file}: invalid JSON (${(e as Error).message})`);
        errors++;
        continue;
      }
      if (json.id !== id) {
        console.error(`✗ ${id}/${file}: id "${json.id}" does not match folder`);
        errors++;
      }
      const scan = text.replace(/"[a-f0-9]{64}"/g, '""'); // hashes are not PII
      for (const [re, what] of piiPatterns) {
        if (re.test(scan)) {
          console.error(`✗ ${id}/${file}: possible PII — ${what}`);
          errors++;
        }
      }
      const lower = scan.toLowerCase();
      for (const n of names) {
        if (lower.includes(n.toLowerCase())) {
          console.error(`✗ ${id}/${file}: contains a token from the private name list`);
          errors++;
          break;
        }
      }
    }
    count++;
  }
}
if (errors) {
  console.error(`\nfixtures:validate — ${errors} problem(s) in ${count} case(s).`);
  process.exit(1);
}
console.log(`fixtures:validate — ${count} case(s) OK${names.length ? "" : " (private name list not present: name scan skipped)"}.`);
