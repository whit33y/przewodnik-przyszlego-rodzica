import { expect, test } from "@playwright/test";
import { answerPregnancy, axe, loginAs } from "./helpers";

test("employee with due date: entitled, employer pays", async ({ page }) => {
  await loginAs(page, "magdalena");
  await answerPregnancy(page);
  await expect(page.getByText("12 marca 2027").first()).toBeVisible();
  await page.goto("/uprawnienia");
  await expect(page.getByRole("heading", { level: 2, name: /masz prawo do zasiłku macierzyńskiego/ })).toBeVisible();
  await expect(page.getByText(/Twój pracodawca/)).toBeVisible();
  await axe(page);
  await page.getByRole("button", { name: /Dlaczego\? — Zasiłek macierzyński — urlop macierzyński/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await axe(page);
});

test("self-employed with arrears: payment withheld with a deadline", async ({ page }) => {
  await loginAs(page, "weronika");
  await page.goto("/uprawnienia");
  await expect(page.getByText(/Zaległość w składkach/).first()).toBeVisible();
  await axe(page);
});

test("stillbirth: calm variant, no planner CTA", async ({ page }) => {
  await loginAs(page, "patrycja");
  await page.goto("/uprawnienia");
  await expect(page.getByText(/8 tygodni zasiłku macierzyńskiego/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Ułóż plan urlopów" })).toHaveCount(0);
  await axe(page);
});

test("jury: case list, case page and login as case", async ({ page }) => {
  await page.goto("/sprawy");
  await expect(page.getByRole("heading", { name: "Lista spraw" })).toBeVisible();
  await axe(page);
  await page.getByRole("link", { name: /B2-13/ }).click();
  await expect(page.getByRole("heading", { name: "Rozstrzygnięcie ZUS" })).toBeVisible();
  await axe(page);
  await page.getByRole("button", { name: "Zaloguj jako ta osoba" }).click();
  await expect(page).toHaveURL(/\/sytuacja/);
  await expect(page.getByText("Przeglądasz dane z przykładowej sprawy ZUS")).toBeVisible();
});

test("unknown PDF hash falls back gracefully", async ({ page }) => {
  await page.goto("/sprawy");
  await page.locator('input[type="file"]').setInputFiles({ name: "inny.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") });
  await expect(page.getByText("Nie rozpoznaliśmy pliku")).toBeVisible();
});
