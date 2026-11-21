import { expect, test } from "@playwright/test";
import { axe, loginAs } from "./helpers";

test("mObywatel login → consent → fetch → situation", async ({ page }) => {
  await page.goto("/logowanie");
  await expect(page.getByText("SYMULACJA").first()).toBeVisible();
  await axe(page);
  await page.getByRole("button", { name: /Aplikacja mObywatel/ }).click();
  await expect(page.getByText(/Kod ważny jeszcze/)).toBeVisible();
  await axe(page);
  await page.getByRole("button", { name: "Potwierdzam (symulacja)" }).click();
  await axe(page);
  await page.locator('input[name="personaId"][value="magdalena"]').check();
  await page.getByRole("button", { name: "Zaloguj" }).click();
  await expect(page).toHaveURL(/\/zgoda/);
  await axe(page);
  await page.getByRole("button", { name: "Zaznacz wszystkie" }).click();
  await page.getByRole("button", { name: "Pobierz dane" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Gotowe" })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/e-zdrowie \(P1\)” nie odpowiada/)).toBeVisible();
  await axe(page);
  await page.getByRole("link", { name: "Dalej" }).click();
  await expect(page).toHaveURL(/\/sytuacja/);
  await expect(page.getByRole("heading", { name: "Ubezpieczenie" })).toBeVisible();
  await expect(page.getByText("Kiedy spodziewasz się porodu?")).toBeVisible();
  await axe(page);
  // header shows the persona
  await expect(page.getByText("Symulacja").first()).toBeVisible();
});

test("answering the due date removes the question", async ({ page }) => {
  await loginAs(page, "magdalena");
  await page.goto("/sytuacja");
  await page.getByLabel("Dzień").fill("12");
  await page.getByLabel("Miesiąc").fill("3");
  await page.getByLabel("Rok").fill("2027");
  await page.locator(".question", { hasText: "Kiedy spodziewasz się porodu?" }).getByRole("button", { name: "Zapisz" }).click();
  await expect(page.getByText("Kiedy spodziewasz się porodu?")).toHaveCount(0);
  await expect(page.getByText("12 marca 2027")).toBeVisible();
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
