import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function axe(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(50);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

/**
 * Login through the simulated node. Signing in reads every registry at once and lands on /sytuacja. By default it then
 * answers the grouped pregnancy question (due date 12.03.2027) when it is shown — pass `{ pregnancy: false }` to keep it.
 */
export async function loginAs(page: Page, persona: string, opts: { pregnancy?: boolean } = {}) {
  await page.goto("/logowanie");
  await page.getByRole("button", { name: /Aplikacja mObywatel/ }).click();
  await page.getByRole("button", { name: "Potwierdzam (symulacja)" }).click();
  await page.locator(`input[name="personaId"][value="${persona}"]`).check();
  await page.getByRole("button", { name: "Zaloguj" }).click();
  await expect(page).toHaveURL(/\/sytuacja/);
  if (opts.pregnancy !== false) await answerPregnancy(page);
}

/** Answers the grouped "about the pregnancy" question on /sytuacja when it is shown (no registry holds these facts). */
export async function answerPregnancy(page: Page, d = "12", m = "3", y = "2027") {
  await expect(page.locator("#postep")).toBeVisible(); // the situation has streamed in
  const q = page.locator(".question", { has: page.getByRole("group", { name: "Przewidywana data porodu" }) });
  if (!(await q.count())) return;
  // React has hydrated the question once its button carries a fiber key (networkidle never settles with prefetching).
  await page.waitForFunction(() => {
    const b = [...document.querySelectorAll(".question button")].at(-1);
    return Boolean(b && Object.keys(b).some((k) => k.startsWith("__react")));
  });
  await fillDate(page, "Przewidywana data porodu", d, m, y);
  await q.getByRole("button", { name: "Zapisz" }).click();
  await expect(q).toHaveCount(0);
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
