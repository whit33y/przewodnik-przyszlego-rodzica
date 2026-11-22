import { expect, test, type Page } from "@playwright/test";
import { answerPregnancy, axe, loginAs } from "./helpers";

/** Magdalena: due date 12 March 2027 from the e-zdrowie pregnancy card (typed in only if it were missing). */
async function magdalena(page: Page) {
  await loginAs(page, "magdalena");
  await page.goto("/sytuacja");
  await answerPregnancy(page);
}

const main = (page: Page) => page.locator("main#tresc");

test.describe("/kroki — Co i kiedy", () => {
  test("employee of a large employer: dated checklist, routing, registry rows", async ({ page }) => {
    await magdalena(page);
    await page.goto("/kroki");
    await expect(page.getByRole("heading", { level: 2, name: /Wnioski składasz u pracodawcy/ })).toBeVisible();
    await expect(page.getByText("zgłasza do ubezpieczenia ponad 20 osób")).toBeVisible();
    for (const h of ["Przed porodem", "Po urodzeniu dziecka", "Pierwsze 21 dni", "W trakcie urlopu", "Po urlopie"]) await expect(page.getByRole("heading", { level: 2, name: h })).toBeVisible();
    const mat = page.locator("li", { hasText: "Wniosek o urlop macierzyński" }).first();
    await expect(mat).toContainText("do 2 kwietnia 2027");
    await expect(mat).toContainText("Kto: Ty → pracodawca");
    await expect(mat.getByRole("link", { name: "Wypełnij wniosek" })).toHaveAttribute("href", "/wnioski/urlop-macierzynski");
    await expect(page.locator("li", { hasText: "Zwolnienie lekarskie (e-ZLA)" })).toContainText("Nie musisz");
    await expect(page.getByText("Liczone od dnia porodu.")).toBeVisible();
    for (const id of ["ubezpieczenie", "skladki", "dzialalnosc", "dowody", "zaswiadczenia", "pracodawca"]) await expect(page.locator(`section#${id}`)).toHaveCount(1);
    await axe(page);
  });

  test("self-employed with arrears: ZUS routing, fix link lands on #skladki, no leave applications", async ({ page }) => {
    await loginAs(page, "weronika");
    await page.goto("/kroki");
    await expect(page.getByRole("heading", { level: 2, name: /Wnioski składasz w ZUS/ })).toBeVisible();
    const now = page.locator("section", { has: page.getByRole("heading", { level: 2, name: "Do zrobienia teraz" }) });
    await expect(now).toContainText("Zaległość w składkach");
    await expect(page.locator("li", { hasText: "Wniosek o zasiłek macierzyński (ZAM) do ZUS" })).toContainText("przez PUE/eZUS lub na papierze");
    await now.getByRole("link", { name: "Jak spłacić zaległość" }).click();
    await expect(page).toHaveURL(/\/kroki#skladki$/);
    await expect(page.getByRole("heading", { level: 3, name: "Zaległości w składkach" })).toBeInViewport();
    await page.goto("/wnioski");
    await expect(page.getByText("Urlopu udziela pracodawca, a Ty nie masz umowy o pracę")).toBeVisible();
    await expect(main(page).getByRole("link", { name: "Zasiłek macierzyński — ZAM" })).toBeVisible();
    await axe(page);
  });

  test("father in a small firm: employer forwards Z-3, birth act from the registry", async ({ page }) => {
    await loginAs(page, "bartosz");
    await page.goto("/kroki");
    await expect(page.getByText(/nie więcej niż 20 osób/)).toBeVisible();
    const z3 = page.locator("li", { hasText: "Pracodawca przekazuje zaświadczenie Z-3 do ZUS" });
    await expect(z3).toContainText("Nie musisz nic robić");
    await expect(z3).toContainText("Kto: pracodawca → ZUS");
    await expect(page.locator("li", { hasText: "Odpis aktu urodzenia" }).first()).toContainText("Nie musisz — mamy to z rejestru stanu cywilnego");
    await expect(page.locator("li", { hasText: "Wniosek o urlop ojcowski" }).first()).toContainText(/do \d{1,2} stycznia 2027/);
  });

  test("calendar export is valid iCalendar without personal data", async ({ page }) => {
    await magdalena(page);
    await page.goto("/kroki");
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: "Dodaj terminy do kalendarza" }).click();
    expect((await download).suggestedFilename()).toBe("przewodnik-rodzica-terminy.ics");
    const res = await page.request.get("/api/v1/steps.ics");
    expect(res.headers()["content-type"]).toContain("text/calendar");
    const ics = await res.text();
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0")).toBe(true);
    expect(ics).toContain("DTSTART;VALUE=DATE:20270402");
    expect(ics).toContain("TRIGGER:-P3D");
    expect(ics).not.toContain("Magdalena");
  });

  test("loss persona: neutral checklist, no counters, no birth-certificate request", async ({ page }) => {
    await loginAs(page, "patrycja");
    await page.goto("/kroki");
    await expect(page.getByText("Poniżej jest tylko to, co niezbędne.")).toBeVisible();
    await expect(page.getByText("Zaświadczenie o urodzeniu martwego dziecka").first()).toBeVisible();
    const text = (await main(page).innerText()).toLowerCase();
    for (const w of ["gratulacje", "maluszek", "zostało", "niestety"]) expect(text).not.toContain(w);
    await expect(main(page).locator("a[href='/plan']")).toHaveCount(0);
    await page.goto("/wnioski");
    await expect(main(page).getByRole("link", { name: "Odpis aktu urodzenia (USC)" })).toHaveCount(0);
    await axe(page);
  });
});

test.describe("/wnioski", () => {
  test("maternity application: pre-filled, one A4 page in print, handed to the employer and marked done", async ({ page, browserName }) => {
    await magdalena(page);
    await page.goto("/wnioski/urlop-macierzynski");
    await expect(page.getByRole("heading", { level: 1, name: "Wniosek o urlop macierzyński" })).toBeVisible();
    const doc = page.locator("article");
    await expect(doc).toContainText("Przewidywana data porodu to 12.03.2027");
    await expect(doc).toContainText("Magdalena K.");
    await expect(doc.getByRole("checkbox", { name: /81,5%/ })).toBeChecked();
    await expect(doc.getByRole("checkbox", { name: /bezpośrednio po urlopie macierzyńskim/ })).toBeChecked();
    await expect(doc.getByLabel("Pracodawca (nazwa i adres)")).toHaveValue("");
    await axe(page);

    await page.emulateMedia({ media: "print" });
    await expect(page.locator("header").first()).toBeHidden();
    await expect(page.getByRole("button", { name: "Oznacz jako przekazany pracodawcy" })).toBeHidden();
    await axe(page);
    if (browserName === "chromium") {
      const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: false });
      const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
      expect(pages).toBe(1);
    }
    await page.emulateMedia({ media: "screen" });

    await doc.getByLabel("Pracodawca (nazwa i adres)").fill("Przykładowa firma");
    await expect(page.getByText(/Nie mamy połączenia z Twoim pracodawcą/)).toBeVisible();
    await page.getByRole("button", { name: "Oznacz jako przekazany pracodawcy" }).click();
    await expect(page).toHaveURL(/\/wnioski\/wyslane\/PRAC-\d{4}-[0-9A-F]{6}$/);
    await expect(page.getByText("Zapisaliśmy, że przekazujesz wniosek pracodawcy")).toBeVisible();
    const number = page.url().split("/").pop()!;
    await expect(main(page)).toContainText("Pracodawca");

    await page.goto("/kroki");
    const step = page.locator("li", { hasText: "Wniosek o urlop macierzyński" }).first();
    await expect(step).toContainText("Przekazano pracodawcy");
    await expect(step).toContainText(number);
    await page.reload();
    await expect(page.locator("li", { hasText: "Wniosek o urlop macierzyński" }).first()).toContainText(number);

    await page.goto("/wnioski");
    await expect(page.locator("#wyslane-lista")).toContainText(number);
    await expect(page.locator("li", { hasText: "Urlop macierzyński" }).first()).toContainText("Przekazano");
  });

  test("parental application is pre-filled from the plan", async ({ page }) => {
    await magdalena(page);
    await page.goto("/wnioski/urlop-rodzicielski");
    const doc = page.locator("article");
    await expect(doc).toContainText("od 30.07.2027");
    await expect(doc).toContainText("1. część");
    await expect(doc.getByRole("checkbox", { name: /Drugi rodzic dziecka nie zamierza/ })).toBeChecked();
  });

  test("part-time parental plan yields the combining application with working time", async ({ page }) => {
    await magdalena(page);
    await page.goto("/plan");
    await page.getByRole("button", { name: /Łączę urlop z pracą/ }).click();
    await expect(page.getByText(/wydłuża go o/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Zapisano")).toBeVisible({ timeout: 10000 });
    await page.goto("/wnioski");
    await page.getByRole("link", { name: "Łączenie urlopu z pracą" }).click();
    await expect(page.locator("article")).toContainText("Wymiar czasu pracy");
    await expect(page.locator("article")).toContainText("1/2 etatu");
  });

  test("ZAM sheet values match the plan and can be copied", async ({ page }) => {
    await magdalena(page);
    await page.goto("/wnioski/zam");
    await expect(page.getByRole("heading", { level: 1, name: /Dane do wniosku o zasiłek macierzyński/ })).toBeVisible();
    await expect(main(page)).toContainText("od 12.03.2027 do 29.07.2027");
    await expect(main(page)).toContainText("81,5% podstawy wymiaru przez cały okres");
    await expect(page.getByRole("button", { name: /Kopiuj: Okres — urlop macierzyński/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /zus\.pl/ })).toHaveAttribute("href", /^https:\/\/www\.zus\.pl\//);
    await axe(page);
  });

  test("USC copy request is disabled before the birth is registered", async ({ page }) => {
    await magdalena(page);
    await page.goto("/wnioski/odpis-aktu-urodzenia");
    await expect(page.getByText("ZUS nie wymaga odpisu — pobiera dane z rejestru.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Wyślij do urzędu stanu cywilnego (symulacja)" })).toBeDisabled();
  });

  test("USC copy request is enabled after registration and can be sent", async ({ page }) => {
    await loginAs(page, "monika");
    await page.goto("/wnioski/odpis-aktu-urodzenia");
    await page.getByRole("radio", { name: /Odpis zupełny/ }).check();
    await axe(page);
    await page.getByRole("button", { name: "Wyślij do urzędu stanu cywilnego (symulacja)" }).click();
    await expect(page).toHaveURL(/\/wnioski\/wyslane\/USC-/);
    await expect(main(page)).toContainText("Urząd stanu cywilnego");
  });

  test("PUE question gets a confirmation number", async ({ page }) => {
    await loginAs(page, "weronika");
    await page.goto("/wnioski/pytanie-pue");
    await page.getByLabel("Temat").selectOption("Składki i ubezpieczenie");
    await page.getByLabel("Treść pytania").fill("Czy po spłacie zaległości zasiłek zostanie wypłacony za cały okres?");
    await axe(page);
    await page.getByRole("button", { name: "Wyślij pytanie (symulacja)" }).click();
    await expect(page).toHaveURL(/\/wnioski\/wyslane\/PUE-/);
    await expect(page.getByText(/w ciągu 7 dni/)).toBeVisible();
    await page.goto("/wnioski");
    await expect(page.locator("#wyslane-lista")).toContainText("Zadaj pytanie w ZUS");
  });

  test("submissions API: JSON round trip", async ({ page }) => {
    await magdalena(page);
    const post = await page.request.post("/api/v1/submissions", { data: { kind: "zam", payload: { fields: { note: "test" } } } });
    expect(post.status()).toBe(201);
    const { id } = (await post.json()) as { id: string };
    const list = (await (await page.request.get("/api/v1/submissions")).json()) as { submissions: { id: string }[] };
    expect(list.submissions.map((s) => s.id)).toContain(id);
    const blocked = await page.request.post("/api/v1/submissions", { data: { kind: "odpis-aktu-urodzenia" } });
    expect(blocked.status()).toBe(409);
    const steps = (await (await page.request.get("/api/v1/steps")).json()) as { groups: { group: string }[] };
    expect(steps.groups.map((g) => g.group)).toContain("first21Days");
  });
});
