import { expect, test } from "@playwright/test";
import { axe, fillDate, loginAs } from "./helpers";

test("the other parent is invited by link and joins with his own mObywatel", async ({ page }) => {
  await loginAs(page, "monika");
  const card = page.locator("section", { has: page.getByRole("heading", { name: "Drugi rodzic" }) });
  await expect(card.getByText("Poproś o zgodę")).toHaveCount(0);
  await page.waitForLoadState("networkidle");
  await card.getByRole("button", { name: "Utwórz link z zaproszeniem" }).click();
  await expect(card.getByText("Zaproszenie czeka na drugiego rodzica.")).toBeVisible();
  await expect(card.getByLabel("Link z zaproszeniem")).toHaveValue(/\/dolacz\//);
  await axe(page);

  await card.getByRole("link", { name: "Otwórz jako drugi rodzic (symulacja)" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Zaproszenie do wspólnego planu urlopów" })).toBeVisible();
  await expect(page.getByText(/nie Twoją historię zatrudnienia ani składek/)).toBeVisible();
  await axe(page);
  await page.getByRole("button", { name: "Zaloguj się przez mObywatel i dołącz (symulacja)" }).click();
  await expect(page.getByText("Dołączasz do wspólnego planu")).toBeVisible();

  await page.goto("/sytuacja");
  await expect(card.getByText("Ojciec")).toBeVisible();
  await page.goto("/kroki");
  await expect(page.getByText(/Drugi rodzic: wniosek o/).first()).toBeVisible();
});

test("an invalid invitation link says so", async ({ page }) => {
  await page.goto("/dolacz/niewazne");
  await expect(page.getByText("To zaproszenie jest nieważne albo wygasło")).toBeVisible();
});

test("after a live birth the hospital stay is asked, not read from e-zdrowie", async ({ page }) => {
  await loginAs(page, "monika");
  const q = page.locator(".question", { hasText: "Czy dziecko urodziło się przedwcześnie albo leżało w szpitalu?" });
  await expect(q).toBeVisible();
  await page.waitForLoadState("networkidle");
  await q.getByLabel("Urodziło się przed 37. tygodniem i leżało w szpitalu").check();
  await q.getByLabel("Ile dni dziecko było w szpitalu?").fill("25");
  await q.getByRole("button", { name: "Zapisz" }).click();
  await expect(q).toHaveCount(0);
});

test("adoption: the court date is asked, not taken from a registry", async ({ page }) => {
  await loginAs(page, "aleksandra");
  const q = page.locator(".question", { hasText: "Kiedy przyjęłaś lub przyjąłeś dziecko na wychowanie?" });
  await expect(q).toBeVisible();
  await expect(q.getByText(/postanowieniu sądu/)).toBeVisible();
  await page.waitForLoadState("networkidle");
  await fillDate(page, "Data przyjęcia dziecka", "2", "11", "2026");
  await fillDate(page, "Data urodzenia dziecka", "14", "5", "2023");
  await q.getByRole("button", { name: "Zapisz" }).click();
  await expect(q).toHaveCount(0);
  await expect(page.getByText("2 listopada 2026").first()).toBeVisible();
});
