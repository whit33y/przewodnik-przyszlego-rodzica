import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function axe(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(50);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

/** Login through the simulated node. `consents`: undefined → "Zaznacz wszystkie"; a list → only those sources. */
export async function loginAs(page: Page, persona: string, opts: { allConsents?: boolean; consents?: string[] } = {}) {
  await page.goto("/logowanie");
  await page.getByRole("button", { name: /Aplikacja mObywatel/ }).click();
  await page.getByRole("button", { name: "Potwierdzam (symulacja)" }).click();
  await page.locator(`input[name="personaId"][value="${persona}"]`).check();
  await page.getByRole("button", { name: "Zaloguj" }).click();
  await expect(page).toHaveURL(/\/zgoda/);
  await page.waitForLoadState("networkidle"); // consent boxes are controlled: wait for hydration
  if (opts.consents) {
    for (const s of opts.consents) await page.locator(`input[name="sources"][value="${s}"]`).check();
  } else if (opts.allConsents !== false) await page.getByRole("button", { name: "Zaznacz wszystkie" }).click();
  await page.getByRole("button", { name: "Pobierz dane" }).click();
  await expect(page).toHaveURL(/\/pobieranie/);
  await expect(page.getByRole("status").filter({ hasText: "Gotowe" })).toBeVisible({ timeout: 15000 });
}

/** Fills a gov.pl three-field date (DateInput) found by its legend. */
export async function fillDate(page: Page, legend: string | RegExp, d: string, m: string, y: string) {
  const group = page.getByRole("group", { name: legend });
  await group.getByLabel("Dzień").fill(d);
  await group.getByLabel("Miesiąc").fill(m);
  await group.getByLabel("Rok").fill(y);
}

/** Presses Tab until the focused element's accessible text matches (keyboard-only navigation). */
export async function tabTo(page: Page, name: RegExp, max = 60) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const text = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return "";
      const label = el.id ? document.querySelector(`label[for="${el.id}"]`)?.textContent : null;
      return [el.getAttribute("aria-label"), label, el.closest("label")?.textContent, el.textContent].filter(Boolean).join(" ");
    });
    if (name.test(text)) return;
  }
  throw new Error(`Could not reach ${name} with Tab`);
}
