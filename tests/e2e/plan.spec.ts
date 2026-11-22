import { expect, test, type Page } from "@playwright/test";
import { answerPregnancy, axe, loginAs } from "./helpers";

async function withDueDate(page: Page, persona: string) {
  await loginAs(page, persona);
  await page.goto("/sytuacja");
  await answerPregnancy(page);
  await page.goto("/plan");
  await expect(page.getByRole("heading", { name: "Podsumowanie" })).toBeVisible();
}

test("default plan for an employee is valid and accessible", async ({ page }) => {
  await withDueDate(page, "magdalena");
  await expect(page.getByRole("heading", { level: 3, name: /Urlop macierzyński/ }).first()).toBeVisible();
  await expect(page.locator('[data-invalid]')).toHaveCount(0);
  await axe(page);
});

test("preset and length change recalculate the plan", async ({ page }) => {
  await withDueDate(page, "magdalena");
  await page.getByRole("button", { name: /Łączę urlop z pracą/ }).click();
  // Half-time work: same total, spread over twice as many weeks at a reduced monthly amount.
  await expect(page.getByText(/wydłuża go o/)).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("pomniejszone o pracę", { exact: false }).first()).toBeVisible();
});

test("too long parental leave shows a violation with a working fix", async ({ page }) => {
  await withDueDate(page, "magdalena");
  const row = page.locator("li[data-type='parental']").first();
  const input = row.getByRole("textbox", { name: "Długość" });
  await input.fill("60");
  await input.press("Enter");
  const fix = row.getByRole("button", { name: /Skróć/ });
  await expect(fix).toBeVisible({ timeout: 10000 });
  await fix.click();
  await expect(row.locator("[data-invalid]")).toHaveCount(0);
  await expect(page.locator("li[data-invalid]")).toHaveCount(0, { timeout: 10000 });
});

test("father sees both lanes and his 9 weeks", async ({ page }) => {
  await loginAs(page, "bartosz");
  await page.goto("/plan");
  await expect(page.getByRole("heading", { name: /Drugi rodzic/ }).first()).toBeVisible();
  await expect(page.getByText("9 tygodni tylko dla tego rodzica").first()).toBeVisible();
  await axe(page);
});

test("case opens the claim as filed in the planner", async ({ page }) => {
  await page.goto("/sprawy/B2-13");
  await page.getByRole("button", { name: "Zaloguj jako ta osoba" }).click();
  await page.goto("/plan");
  await expect(page.getByText("Plan z akt sprawy")).toBeVisible();
});

test("loss persona sees no planner", async ({ page }) => {
  await loginAs(page, "patrycja");
  await page.goto("/plan");
  await expect(page.getByText("Plan urlopów nie jest teraz potrzebny")).toBeVisible();
});
