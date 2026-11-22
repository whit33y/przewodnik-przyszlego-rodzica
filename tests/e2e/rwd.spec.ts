import { expect, test, type Page } from "@playwright/test";
import { loginAs } from "./helpers";

/** WCAG 1.4.10 Reflow: content works at 320 CSS px without horizontal scrolling. */
test.use({ viewport: { width: 320, height: 640 } });

async function noHorizontalScroll(page: Page, route: string) {
  await page.goto(route);
  await page.waitForLoadState("networkidle");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `${route} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
}

const publicRoutes = ["/", "/logowanie", "/bez-logowania", "/planuje-dziecko", "/trudna-sytuacja", "/wsparcie", "/o-serwisie", "/dostepnosc", "/sprawy", "/sprawy/B2-13", "/api/docs", "/styleguide"];

test("public pages reflow at 320 px", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "viewport is fixed by this file");
  for (const r of publicRoutes) await noHorizontalScroll(page, r);
});

test("signed-in pages reflow at 320 px", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "viewport is fixed by this file");
  await loginAs(page, "bartosz");
  for (const r of ["/sytuacja", "/uprawnienia", "/plan"]) await noHorizontalScroll(page, r);
});
