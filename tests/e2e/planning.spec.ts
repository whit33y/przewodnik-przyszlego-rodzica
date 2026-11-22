import { expect, test } from "@playwright/test";
import { axe, fillDate, loginAs } from "./helpers";

test("planning check-up logged out: four questions → blocking alert with a fix", async ({ page }) => {
  await page.goto("/planuje-dziecko");
  await expect(page.getByRole("heading", { name: "Cztery pytania" })).toBeVisible();
  await axe(page);
  await page.getByRole("button", { name: "Sprawdź" }).click();
  await expect(page.getByText("Popraw zaznaczone odpowiedzi")).toBeVisible();
  await page.getByRole("group", { name: "1. Jak pracujesz?" }).getByLabel("Umowa zlecenia").check();
  await page.getByRole("group", { name: /2\. Czy masz ubezpieczenie chorobowe/ }).getByLabel("Nie", { exact: true }).check();
  await fillDate(page, "3. Od kiedy pracujesz w tej formie?", "1", "3", "2025");
  await page.getByRole("group", { name: /4\. Czy masz zaległości/ }).getByLabel("Nie", { exact: true }).check();
  await page.getByRole("button", { name: "Sprawdź" }).click();
  await expect(page.getByRole("heading", { level: 2, name: /zasiłek macierzyński by nie przysługiwał/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Nie masz dobrowolnego ubezpieczenia chorobowego/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Co zabezpieczyć przed porodem" })).toBeVisible();
  await axe(page);
});

test("planning check-up logged out: employee with nothing to fix", async ({ page }) => {
  await page.goto("/planuje-dziecko?sprawdz=1&praca=employment&chorobowe=tak&od-d=1&od-m=1&od-y=2023&zaleglosci=nie");
  await expect(page.getByRole("heading", { level: 2, name: /zasiłek macierzyński by przysługiwał/ })).toBeVisible();
});

test("planning check-up as oliwia (zlecenie without sickness insurance)", async ({ page }) => {
  await loginAs(page, "oliwia");
  await page.goto("/planuje-dziecko");
  await expect(page.getByRole("heading", { level: 2, name: /by nie przysługiwał/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Nie masz dobrowolnego ubezpieczenia chorobowego/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Zapisz ten termin w moich danych" })).toBeVisible();
  await axe(page);
  // Another hypothetical date is a GET: nothing is saved until the user asks.
  await fillDate(page, "Hipotetyczny termin porodu", "1", "6", "2027");
  await page.getByRole("button", { name: "Przelicz" }).click();
  await expect(page.getByRole("heading", { level: 2, name: /Gdyby poród był 1 czerwca 2027/ })).toBeVisible();
  await page.goto("/sytuacja");
  await expect(page.getByText("Kiedy spodziewasz się porodu?")).toBeVisible();
});

test("planning check-up as lucja (business suspended around the due date)", async ({ page }) => {
  await loginAs(page, "lucja");
  await page.goto("/planuje-dziecko");
  await expect(page.getByRole("heading", { level: 2, name: /Gdyby poród był 10 kwietnia 2027/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Zawieszenie działalności w okolicy porodu/ })).toBeVisible();
  await axe(page);
});
