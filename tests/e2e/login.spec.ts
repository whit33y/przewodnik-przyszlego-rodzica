import { expect, test } from "@playwright/test";
import { axe, loginAs } from "./helpers";

test("mObywatel login → situation, data already fetched", async ({ page }) => {
  await page.goto("/logowanie");
  await expect(page.getByText("SYMULACJA").first()).toBeVisible();
  await axe(page);
  await page.getByRole("button", { name: /Aplikacja mObywatel/ }).click();
  await expect(page.getByText(/Kod ważny jeszcze/)).toBeVisible();
  await axe(page);
  await page.getByRole("button", { name: "Potwierdzam (symulacja)" }).click();
  await expect(page.getByText(/Po zalogowaniu pobierzemy dane o Tobie/)).toBeVisible();
  await axe(page);
  await page.locator('input[name="personaId"][value="magdalena"]').check();
  await page.getByRole("button", { name: "Zaloguj" }).click();
  await expect(page).toHaveURL(/\/sytuacja/);
  await expect(page.getByRole("heading", { name: "Ubezpieczenie" })).toBeVisible();
  // due date, number of babies and "Za życiem" come from the e-zdrowie pregnancy card — not asked
  await expect(page.getByText("12 marca 2027").first()).toBeVisible();
  for (const q of ["Kiedy spodziewasz się porodu?", "Ile dzieci się spodziewasz?", "Czy lekarz wydał zaświadczenie „Za życiem”?"]) await expect(page.getByText(q)).toHaveCount(0);
  await page.getByText("Skąd mamy te dane?").click();
  await expect(page.getByText(/karta ciąży: przewidywana data porodu/)).toBeVisible();
  await axe(page);
  await expect(page.getByText("Symulacja").first()).toBeVisible();
});

test("old consent and progress URLs land on the situation", async ({ page }) => {
  await loginAs(page, "magdalena");
  for (const r of ["/zgoda", "/pobieranie"]) {
    await page.goto(r);
    await expect(page).toHaveURL(/\/sytuacja/);
  }
});

test("answering the due date removes the question", async ({ page }) => {
  await loginAs(page, "oliwia");
  const q = page.locator(".question", { hasText: "Kiedy spodziewasz się porodu?" });
  await q.getByLabel("Dzień").fill("12");
  await q.getByLabel("Miesiąc").fill("3");
  await q.getByLabel("Rok").fill("2027");
  await q.getByRole("button", { name: "Zapisz" }).click();
  await expect(page.getByText("Kiedy spodziewasz się porodu?")).toHaveCount(0);
  await expect(page.getByText("12 marca 2027").first()).toBeVisible();
});

test("correction is marked and can be undone", async ({ page }) => {
  await loginAs(page, "bartosz");
  await page.goto("/sytuacja");
  await page.getByRole("button", { name: /Popraw — Liczba ubezpieczonych/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await axe(page);
  await page.getByRole("dialog").getByLabel("Poprawna wartość").selectOption("true");
  await page.getByRole("button", { name: "Zapisz poprawkę" }).click();
  await expect(page.getByText(/Zgłoszenie do ZUS ma numer PUE-/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("poprawione przez Ciebie — ZUS zweryfikuje").first()).toBeVisible();
  await page.getByRole("button", { name: "Cofnij poprawkę" }).first().click();
  await expect(page.getByText("poprawione przez Ciebie — ZUS zweryfikuje")).toHaveCount(0);
});

test("logout returns to anonymous header", async ({ page }) => {
  await loginAs(page, "oliwia");
  await page.goto("/");
  await page.getByRole("button", { name: "Wyloguj" }).click();
  await expect(page.getByRole("link", { name: /Zaloguj się/ }).first()).toBeVisible();
});
