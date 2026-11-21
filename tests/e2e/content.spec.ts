import { expect, test } from "@playwright/test";
import { axe, loginAs } from "./helpers";

const contentRoutes = ["/trudna-sytuacja", "/o-serwisie", "/dostepnosc"];

for (const route of contentRoutes) {
  test(`${route} has one h1 and no axe violations`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("h1")).toHaveCount(1);
    await axe(page);
  });
}

test.describe("/trudna-sytuacja — the quiet path", () => {
  test("lists every situation in order and follows the tone guide", async ({ page }) => {
    await page.goto("/trudna-sytuacja");
    const main = page.locator("main#tresc");
    const ids = ["martwe-urodzenie", "poronienie", "smierc-dziecka", "wczesniak", "za-zyciem", "choroba-matki"];
    for (const id of ids) {
      const section = main.locator(`section#${id}`);
      await expect(section).toBeVisible();
      await expect(section.getByRole("heading", { level: 3, name: "Z kim możesz porozmawiać" })).toBeVisible();
      await expect(section.getByText("Możesz wrócić do tego później.")).toBeVisible();
      const orgs = await section.locator("ul[aria-labelledby$='-rozmowa'] > li").count();
      expect(orgs).toBeGreaterThanOrEqual(2);
      expect(orgs).toBeLessThanOrEqual(3);
      expect(await section.locator("ol > li").count()).toBeLessThanOrEqual(4);
    }
    const text = (await main.innerText()).toLowerCase();
    for (const word of ["gratulacje", "maluszek", "niestety", "!"]) expect(text).not.toContain(word);
    // The miscarriage copy must not claim a 22-week threshold.
    expect(text).not.toMatch(/22\.? tyg/);
    expect(text).toContain("bez względu na to, w którym tygodniu ciąży");
    // Funeral grant comes from the parameter set.
    await expect(main.locator("#martwe-urodzenie")).toContainText("7 000 zł");
  });

  test("has no planner link, no buttons and no personal strip without a session", async ({ page }) => {
    await page.goto("/trudna-sytuacja");
    const main = page.locator("main#tresc");
    await expect(main.locator("a[href^='/plan']")).toHaveCount(0);
    await expect(main.locator("button")).toHaveCount(0);
    await expect(page.getByTestId("loss-strip")).toHaveCount(0);
  });

  test("shows the personal strip for a loss persona (Patrycja)", async ({ page }) => {
    await loginAs(page, "patrycja");
    await page.goto("/trudna-sytuacja");
    const strip = page.getByTestId("loss-strip");
    await expect(strip).toBeVisible();
    await expect(strip).toContainText("8 tygodni");
    await expect(strip).toContainText("4 stycznia 2027");
    await expect(strip.getByRole("link", { name: "Informacje dla Twojej sytuacji" })).toHaveAttribute("href", "#martwe-urodzenie");
    await expect(page.locator("main#tresc a[href^='/plan']")).toHaveCount(0);
    await axe(page);
  });

  test("shows no strip when the session shows no loss", async ({ page }) => {
    await loginAs(page, "magdalena");
    await page.goto("/trudna-sytuacja");
    await expect(page.locator("section#martwe-urodzenie")).toBeVisible();
    await expect(page.getByTestId("loss-strip")).toHaveCount(0);
  });
});

test.describe("/o-serwisie", () => {
  test("requirement map covers a–j and every link resolves", async ({ page, request }) => {
    await page.goto("/o-serwisie");
    const rows = page.locator("table tbody tr");
    for (const id of ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "sim-login", "sim-debt", "sim-ezla", "sim-pue", "sim-forms", "sim-usc"]) {
      await expect(page.locator(`tr[data-req="${id}"] a`).first()).toBeVisible();
    }
    expect(await rows.count()).toBeGreaterThanOrEqual(16);
    const links = await page.locator("table tbody td li").evaluateAll((lis) =>
      lis.map((li) => ({ href: li.querySelector("a")!.getAttribute("href")!, coming: li.textContent!.includes("w przygotowaniu") })),
    );
    const unique = [...new Map(links.map((l) => [l.href, l])).values()];
    for (const { href, coming } of unique) {
      if (coming) continue; // built by another workstream; linked ahead of time
      const res = await request.get(href);
      expect(res.status(), href).toBe(200);
    }
  });

  test("shows the ten simulated registries and the golden-test totals", async ({ page }) => {
    await page.goto("/o-serwisie");
    await expect(page.getByRole("heading", { level: 2, name: /10 symulowanych rejestrów/ })).toBeVisible();
    await expect(page.getByTestId("case-totals")).toContainText("86 z 86");
    await expect(page.getByRole("link", { name: "deklaracji dostępności" })).toHaveAttribute("href", "/dostepnosc");
  });
});

test("/dostepnosc is a full accessibility statement", async ({ page }) => {
  await page.goto("/dostepnosc");
  const main = page.locator("main#tresc");
  await expect(main).toContainText("częściowo zgodny");
  await expect(main).toContainText("21 listopada 2026");
  await expect(main.getByRole("heading", { name: "Procedura wnioskowo-skargowa" })).toBeVisible();
  await expect(main.getByRole("heading", { name: "Rzecznik Praw Obywatelskich" })).toBeVisible();
});
