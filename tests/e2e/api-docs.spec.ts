import { expect, test } from "@playwright/test";
import { axe } from "./helpers";

test("OpenAPI document lists the public API", async ({ request }) => {
  const res = await request.get("/api/openapi.json");
  expect(res.status()).toBe(200);
  const doc = await res.json();
  expect(doc.openapi).toBe("3.1.0");
  for (const p of ["/api/v1/evaluate", "/api/v1/plan", "/api/v1/cases/{id}/compare", "/api/v1/integrations/{source}"]) expect(Object.keys(doc.paths)).toContain(p);
});

test("API docs page renders and is accessible", async ({ page }) => {
  await page.goto("/api/docs");
  await expect(page.getByRole("heading", { level: 1, name: "Dokumentacja API" })).toBeVisible();
  const op = page.locator("details", { hasText: "Policz uprawnienia i zasiłek" });
  await op.locator("summary").click();
  await expect(op.getByText("Treść żądania")).toBeVisible();
  await axe(page);
});
