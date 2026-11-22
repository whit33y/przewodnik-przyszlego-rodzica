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

test("“Wpiszę dane samodzielnie” switches to manual entry instead of an empty situation", async ({ page }) => {
  await page.goto("/logowanie");
  await page.getByRole("button", { name: /Aplikacja mObywatel/ }).click();
  await page.getByRole("button", { name: "Potwierdzam (symulacja)" }).click();
  await page.locator('input[name="personaId"][value="magdalena"]').check();
  await page.getByRole("button", { name: "Zaloguj" }).click();
  await page.getByRole("button", { name: "Wpiszę dane samodzielnie" }).click();
  await expect(page).toHaveURL(/\/sytuacja/);
  await expect(page.getByRole("heading", { name: "Powiedz nam o swojej sytuacji" })).toBeVisible();
  await expect(page.getByText(/Nie znaleźliśmy żadnego tytułu/)).toHaveCount(0);
});

test("partial consent without ZUS – konto: the missing facts become questions, nothing is assumed", async ({ page }) => {
  await loginAs(page, "magdalena", { consents: ["mobywatel", "zus-ezla"] });
  await page.getByRole("link", { name: "Dalej" }).click();
  await expect(page).toHaveURL(/\/sytuacja/);
  const insurance = page.locator("section", { has: page.getByRole("heading", { name: "Ubezpieczenie" }) });
  await expect(insurance.getByText("Nie pobraliśmy tych danych")).toBeVisible();
  await expect(insurance.getByRole("group", { name: "Jak pracujesz?" })).toBeVisible();
  await expect(page.getByText("Kiedy spodziewasz się porodu?")).toBeVisible();
  await expect(page.getByText(/Brak zaległości/)).toHaveCount(0);
  await axe(page);
  await page.goto("/uprawnienia");
  await expect(page.getByText("Brakuje kilku informacji")).toBeVisible();
});

test("declined ZUS – saldo for a business: arrears asked, /uprawnienia never claims nothing blocks payment", async ({ page }) => {
  await loginAs(page, "weronika", { consents: ["mobywatel", "zus-konto", "zus-platnik", "zus-ezla", "zus-swiadczenia", "zus-postepowania", "ceidg", "krs", "rsc", "ezdrowie"] });
  await page.goto("/sytuacja");
  await expect(page.getByText("Czy masz zaległości w składkach ZUS?")).toBeVisible();
  await page.goto("/uprawnienia");
  await expect(page.getByRole("heading", { name: /Nie sprawdziliśmy wszystkich rejestrów/ })).toBeVisible();
  await expect(page.getByText("ZUS — rozliczenia składek", { exact: true })).toBeVisible();
  await expect(page.getByText(/nic w pobranych danych nie blokuje/)).toHaveCount(0);
  await axe(page);
});

test("scripted outage: retry the unavailable registry, then its data arrives", async ({ page }) => {
  await loginAs(page, "magdalena");
  const notice = page.getByText(/e-zdrowie \(P1\)” nie odpowiada/);
  await expect(notice).toBeVisible();
  await page.waitForLoadState("networkidle"); // the retry button needs hydration
  await page.getByRole("button", { name: "Spróbuj ponownie" }).click();
  await expect(notice).toHaveCount(0, { timeout: 10000 });
  await expect(page.getByRole("status").filter({ hasText: /Gotowe\. Pobrano dane z 11 z 11/ })).toBeVisible({ timeout: 10000 });
  await page.getByRole("link", { name: "Dalej" }).click();
  await expect(page.getByText("12 marca 2027")).toBeVisible();
  await expect(page.getByText("Kiedy spodziewasz się porodu?")).toHaveCount(0);
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

test("keyboard-only login: provider → confirm → profile → consent", async ({ page }) => {
  await page.goto("/logowanie");
  await page.waitForLoadState("networkidle");
  await tabTo(page, /Aplikacja mObywatel/);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Potwierdź logowanie w aplikacji mObywatel" })).toBeFocused();
  await tabTo(page, /Potwierdzam \(symulacja\)/);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Wybierz profil testowy" })).toBeFocused();
  await tabTo(page, /Profil testowy|Aleksandra/);
  await page.keyboard.press("ArrowDown");
  await tabTo(page, /^\s*Zaloguj\s*$/);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/zgoda/);
  await page.waitForLoadState("networkidle");
  await tabTo(page, /Zaznacz wszystkie/);
  await page.keyboard.press("Enter");
  await tabTo(page, /Pobierz dane/);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/pobieranie/);
});

test("disabled login providers stay focusable and explain why", async ({ page }) => {
  await page.goto("/logowanie");
  await page.waitForLoadState("networkidle");
  await tabTo(page, /Profil zaufany/);
  await expect(page.getByRole("button", { name: /Profil zaufany/ })).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Wybierz sposób logowania" })).toBeVisible();
});
