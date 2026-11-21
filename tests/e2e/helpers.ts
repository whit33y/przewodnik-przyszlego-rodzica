import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function axe(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(50);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

export async function loginAs(page: Page, persona: string, opts: { allConsents?: boolean } = {}) {
  await page.goto("/logowanie");
  await page.getByRole("button", { name: /Aplikacja mObywatel/ }).click();
  await page.getByRole("button", { name: "Potwierdzam (symulacja)" }).click();
  await page.locator(`input[name="personaId"][value="${persona}"]`).check();
  await page.getByRole("button", { name: "Zaloguj" }).click();
  await expect(page).toHaveURL(/\/zgoda/);
  if (opts.allConsents !== false) await page.getByRole("button", { name: "Zaznacz wszystkie" }).click();
  await page.getByRole("button", { name: "Pobierz dane" }).click();
  await expect(page).toHaveURL(/\/pobieranie/);
  await expect(page.getByRole("status").filter({ hasText: "Gotowe" })).toBeVisible({ timeout: 15000 });
}

