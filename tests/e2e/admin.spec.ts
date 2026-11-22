import { expect, request as pwRequest, test, type APIRequestContext } from "@playwright/test";
import { axe, loginAs } from "./helpers";

/**
 * Admin panel (plan 06 §10). Shares one database with the other specs, so it runs once (desktop), serially,
 * and resets to the statutory sets before and after — the published list is global state.
 */
const PASSWORD = "e2e-admin";

async function adminApi(baseURL: string): Promise<APIRequestContext> {
  const ctx = await pwRequest.newContext({ baseURL });
  const r = await ctx.post("/api/v1/admin/login", { data: { password: PASSWORD } });
  expect(r.status()).toBe(200);
  return ctx;
}

async function reset(baseURL: string) {
  const ctx = await adminApi(baseURL);
  expect((await ctx.post("/api/v1/admin/params/reset", { data: { confirm: "PRZYWRÓĆ" } })).status()).toBe(200);
  await ctx.dispose();
}

test.describe.configure({ mode: "serial" });

test.describe("admin panel", () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "admin state is global: desktop only"));
  test.beforeAll(async ({}, info) => {
    if (info.project.name === "desktop") await reset(info.project.use.baseURL!);
  });
  test.afterAll(async ({}, info) => {
    if (info.project.name === "desktop") await reset(info.project.use.baseURL!);
  });

  test("API requires the admin cookie, rejects foreign origins and throttles guessing", async ({ request }) => {
    expect((await request.get("/api/v1/admin/params")).status()).toBe(401);
    expect((await request.post("/api/v1/admin/params/reset", { data: { confirm: "PRZYWRÓĆ" } })).status()).toBe(401);
    expect((await request.post("/api/v1/admin/login", { data: { password: PASSWORD }, headers: { Origin: "https://evil.example" } })).status()).toBe(403);
    const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await request.post("/api/v1/admin/login", { data: { password: `wrong-${i}` }, headers: { "X-Forwarded-For": ip } })).status());
    expect(statuses).toEqual([401, 401, 401, 401, 401, 429]);
    // the correct password is refused too while throttled
    expect((await request.post("/api/v1/admin/login", { data: { password: PASSWORD }, headers: { "X-Forwarded-For": ip } })).status()).toBe(429);
  });

  test("demo story: draft 70% → 75%, validation, regression, publish from 2027, planner uses it, audit, logout", async ({ page, request }) => {
    test.setTimeout(120_000);
    // Login: unreachable without the cookie, wrong password rejected, right one accepted.
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/logowanie$/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await axe(page);
    await page.getByLabel("Hasło administratora").fill("zle-haslo");
    await page.getByRole("button", { name: "Zaloguj do panelu" }).click();
    await expect(page.getByText("Nieprawidłowe hasło.")).toBeVisible();
    await page.getByLabel("Hasło administratora").fill(PASSWORD);
    await page.getByRole("button", { name: "Zaloguj do panelu" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { level: 1, name: "Parametry prawne kalkulatora" })).toBeVisible();
    await expect(page.getByText("● obowiązuje dziś")).toBeVisible();
    await axe(page);

    // New draft from the set in force today.
    await page.getByRole("button", { name: "Nowy szkic z obowiązującego" }).click();
    await expect(page).toHaveURL(/\/admin\/parametry\/ps-[0-9a-f]{8}$/);
    const draftId = page.url().split("/").at(-1)!;
    const rate = page.getByLabel(/^Zasiłek macierzyński za urlop rodzicielski/);
    await expect(rate).toHaveValue("70");
    await axe(page);

    // Validation error (server-side bound) mapped to the field.
    await rate.fill("150");
    await page.getByRole("button", { name: "Zapisz szkic" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Popraw 1 pole" })).toBeVisible();
    await expect(page.getByText("Najwyżej 100%.").first()).toBeVisible();
    await expect(rate).toHaveAttribute("aria-invalid", "true");

    // Fix it, set the effective date, save.
    await rate.fill("75");
    await page.locator('input[name="validFrom-d"]').fill("01");
    await page.locator('input[name="validFrom-m"]').fill("01");
    await page.locator('input[name="validFrom-y"]').fill("2027");
    await page.getByLabel("Nazwa zestawu").fill("Stan prawny 2027 — projekt e2e");
    await page.getByRole("button", { name: "Zapisz szkic" }).click();
    await expect(page.getByText("Szkic zapisany.")).toBeVisible();

    // Diff: exactly one changed parameter.
    await page.getByRole("link", { name: /Porównaj i sprawdź na 86 sprawach/ }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/parametry/${draftId}/porownanie$`));
    const diff = page.getByRole("table", { name: /Zmienione parametry \(1\)/ });
    await expect(diff).toContainText("Zasiłek macierzyński za urlop rodzicielski");
    await expect(diff).toContainText("70%");
    await expect(diff).toContainText("75%");
    await expect(page.getByRole("button", { name: "Opublikuj" })).toBeDisabled();

    // Regression.
    await page.getByRole("button", { name: "Sprawdź na 86 sprawach" }).click();
    await expect(page.getByText(/zgodność z rozstrzygnięciami ZUS: 86 → 86/)).toBeVisible({ timeout: 30_000 });
    const whatIf = page.getByRole("table", { name: /Symulacja — sprawy, które by się zmieniły/ });
    await expect(whatIf).toContainText("kwota brutto");
    await expect(whatIf.getByRole("link").first()).toHaveAttribute("href", /^\/sprawy\/B\d-\d{2}$/);
    const personas = page.getByRole("table", { name: /Przykładowe osoby/ });
    await expect(personas).toContainText(`→ ${draftId}`);
    await expect(personas).toContainText("(75%)");
    await axe(page);

    // Publish with typed confirmation.
    await page.getByRole("button", { name: "Opublikuj" }).click();
    const dialog = page.getByRole("dialog", { name: "Opublikować zestaw parametrów?" });
    await expect(dialog).toContainText("01.01.2027");
    await dialog.getByLabel("Wpisz datę wejścia w życie, aby potwierdzić").fill("02.01.2027");
    await dialog.getByRole("button", { name: "Opublikuj zestaw" }).click();
    await expect(dialog.getByText(/Wpisz datę wejścia w życie: 01\.01\.2027/)).toBeVisible();
    await dialog.getByLabel("Wpisz datę wejścia w życie, aby potwierdzić").fill("01.01.2027");
    await dialog.getByRole("button", { name: "Opublikuj zestaw" }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/parametry/${draftId}$`));
    await expect(page.getByText("Opublikowany", { exact: true }).first()).toBeVisible();

    // The public API serves the new list immediately (revalidateTag).
    const current = await (await request.get("/api/v1/params/current")).json();
    const published = current.sets.find((x: { id: string }) => x.id === draftId);
    expect(published).toMatchObject({ validFrom: "2027-01-01", rates: { parental: 7500 } });
    expect(current.sets.find((x: { id: string }) => x.id === "2026-01-01").rates.parental).toBe(7000);
    expect(current.version).toContain(draftId);

    // Published sets are immutable.
    expect((await page.request.put(`/api/v1/admin/params/${draftId}`, { data: { payload: published } })).status()).toBe(409);

    // Audit entries.
    await page.getByRole("link", { name: "Dziennik zmian" }).click();
    const log = page.getByRole("table", { name: /Wpisy dziennika/ });
    await expect(log.getByRole("row").filter({ hasText: "Publikacja" }).filter({ hasText: draftId })).toContainText("2027-01-01");
    await expect(log.getByRole("row").filter({ hasText: "Sprawdzenie na sprawach" }).filter({ hasText: draftId }).first()).toBeVisible();
    await expect(log.getByRole("row").filter({ hasText: "Nieudane logowanie" }).first()).toBeVisible();
    await axe(page);

    // Logout: back to the login page, admin pages unreachable again.
    await page.getByRole("button", { name: "Wyloguj z panelu" }).click();
    await expect(page).toHaveURL(/\/admin\/logowanie$/);
    await page.goto("/admin/dziennik");
    await expect(page).toHaveURL(/\/admin\/logowanie$/);
    expect((await page.request.get("/api/v1/admin/audit")).status()).toBe(401);

    // Planner: a 2027 due date gets the new set and 75% in the 100%/70% variant; the citizen cookie is separate.
    await loginAs(page, "magdalena");
    expect((await page.request.put("/api/v1/answers", { data: { expectedDate: "2027-03-12" } })).status()).toBe(200);
    const base = await (await page.request.post("/api/v1/evaluate", { data: { plan: null } })).json();
    expect(base.result.parameterSetId).toBe(draftId);
    const split = await (await page.request.post("/api/v1/evaluate", { data: { plan: { ...base.result.defaultPlan, rateOption: "split100_70" } } })).json();
    const parental = split.result.periods.find((p: { type: string; parent: string }) => p.type === "parental" && p.parent === "claimant");
    expect(parental.rateBps).toBe(7500);
    // …and the planner screen shows it once the 100%/70% option is chosen.
    await page.goto("/plan");
    await page.getByText("100% za urlop macierzyński, potem 70%").click();
    await expect(page.getByText(/\(75%/).first()).toBeVisible({ timeout: 15_000 });
  });
});
