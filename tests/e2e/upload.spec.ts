import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

/** Uses the restricted source PDFs when present locally; skipped elsewhere (they are never in the image). */
const dir = path.join(process.cwd(), "docs", "Sprawy ");
const file = fs.existsSync(dir) ? fs.readdirSync(dir).find((f) => f.startsWith("[sprawa B2-13]")) : undefined;

test("dropping a known case PDF opens that case without uploading the file", async ({ page }) => {
  test.skip(!file, "source PDFs not available");
  const bodies: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") bodies.push(r.postData() ?? "");
  });
  await page.goto("/sprawy");
  await page.locator('input[type="file"]').setInputFiles(path.join(dir, file!));
  await expect(page).toHaveURL(/\/sprawy\/B2-13$/);
  expect(bodies.every((b) => b.length < 300 && !b.includes("%PDF"))).toBe(true);
});
