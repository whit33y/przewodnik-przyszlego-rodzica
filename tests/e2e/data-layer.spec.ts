import { expect, test } from "@playwright/test";
import { axe, fillDate, loginAs, tabTo } from "./helpers";

test("manual mode end to end: questions → situation → entitlements (with an honest caution)", async ({ page }) => {
  await page.goto("/bez-logowania");
  await page.getByRole("button", { name: "Zaczynam" }).click();
  await expect(page).toHaveURL(/\/sytuacja/);
  await expect(page.getByRole("heading", { name: "Powiedz nam o swojej sytuacji" })).toBeVisible();
  await axe(page);
  await fillDate(page, "Przewidywana data porodu", "12", "3", "2027");
  await fillDate(page, "Od kiedy trwa umowa?", "1", "2", "2024");
  await page.getByLabel(/Przeciętne miesięczne wynagrodzenie brutto/).fill("6500");
  await page.getByRole("button", { name: "Zapisz i sprawdź" }).click();
  await expect(page.getByRole("heading", { name: "Ubezpieczenie" })).toBeVisible();
  await expect(page.getByText("podane przez Ciebie").first()).toBeVisible();
  // Not read in manual mode → said so, never "Brak zwolnień".
  await expect(page.getByText("Nie pobraliśmy tych danych").first()).toBeVisible();
  await expect(page.getByText(/Brak zwolnień/)).toHaveCount(0);
  await axe(page);
  await page.goto("/uprawnienia");
  await expect(page.getByRole("heading", { level: 2, name: /masz prawo do zasiłku macierzyńskiego/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Liczymy na podstawie Twoich odpowiedzi/ })).toBeVisible();
  await axe(page);
});

test("a registry that does not answer: honest notice, the missing fact is asked, retry brings the data", async ({ page }) => {
  await loginAs(page, "lucja");
  const notice = page.getByText("Nie udało się pobrać danych z rejestru „ZUS — rozliczenia składek”");
  await expect(notice).toBeVisible();
  await expect(page.getByText("Czy masz zaległości w składkach ZUS?")).toBeVisible();
  await expect(page.getByText(/Brak zaległości/)).toHaveCount(0);
  await axe(page);
  await page.goto("/uprawnienia");
  await expect(page.getByRole("heading", { name: /Nie sprawdziliśmy wszystkich rejestrów/ })).toBeVisible();
  await expect(page.getByText(/nic w pobranych danych nie blokuje/)).toHaveCount(0);
  await page.goto("/sytuacja");
  await page.getByRole("button", { name: "Spróbuj ponownie" }).first().click();
  await expect(page).toHaveURL(/\/sytuacja/);
  await expect(notice).toHaveCount(0);
  await expect(page.getByText("Czy masz zaległości w składkach ZUS?")).toHaveCount(0);
});

test("father: verdict about paternity and his own 9 weeks, readable “Dlaczego?”", async ({ page }) => {
  await loginAs(page, "bartosz");
  await page.goto("/uprawnienia");
  await expect(page.getByRole("heading", { level: 2, name: /urlopu ojcowskiego i 9 tygodni urlopu rodzicielskiego/ })).toBeVisible();
  await page.getByRole("button", { name: /Dlaczego\? — Zasiłek macierzyński — urlop ojcowski/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/Urlop ojcowski \(Ty\) od 23 stycznia 2027/)).toBeVisible();
  await expect(dialog.getByText("Szczegóły techniczne").first()).toBeVisible();
  await expect(dialog.getByText(/Urlop macierzyński \(drugi rodzic\)/)).toHaveCount(0);
  await axe(page);
});

test("case login: situation and entitlements from a sample case; pre-event alerts on the case page", async ({ page }) => {
  await page.goto("/sprawy/B2-10");
  const early = page.locator("section", { has: page.getByRole("heading", { name: "Co aplikacja pokazałaby wcześniej" }) });
  await expect(early.getByText("W dniu porodu nie będziesz mieć ubezpieczenia chorobowego")).toBeVisible();
  await axe(page);
  await page.getByRole("button", { name: "Zaloguj jako ta osoba" }).click();
  await expect(page).toHaveURL(/\/sytuacja/);
  await expect(page.getByText("Przeglądasz dane z przykładowej sprawy ZUS")).toBeVisible();
  await expect(page.getByText("Nie pobraliśmy tych danych")).toHaveCount(0);
  await page.goto("/uprawnienia");
  await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
  await axe(page);
});

test("keyboard-only login: provider → confirm → profile → situation", async ({ page }) => {
  await page.goto("/logowanie");
  await page.waitForLoadState("networkidle");
  await tabTo(page, /Aplikacja mObywatel/);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Potwierdź logowanie" })).toBeFocused();
  await tabTo(page, /Potwierdzam \(symulacja\)/);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Wybierz profil testowy" })).toBeFocused();
  await tabTo(page, /Profil testowy|Aleksandra/);
  await page.keyboard.press("ArrowDown");
  await tabTo(page, /^\s*Zaloguj\s*$/);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/sytuacja/);
});

test("login methods unavailable in the simulation are listed, not offered as buttons", async ({ page }) => {
  await page.goto("/logowanie");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("button", { name: /Profil zaufany/ })).toHaveCount(0);
  await tabTo(page, /Metody niedostępne w symulacji/);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listitem").filter({ hasText: "Profil zaufany" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Zaloguj się do Przewodnika Rodzica" })).toBeVisible();
});
