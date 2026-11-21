import { test } from "@playwright/test";
import { loginAs } from "./helpers";
test("shots", async ({ page }, info) => {
  test.skip(!process.env.SHOTS);
  const dir = "/private/tmp/claude-501/-Users-oskar-Library-Application-Support-Claude-scratch-workspaces-1380e745-470a-4525-8d1c-28eb9841b5e4-0f921390-3ccb-47fe-b40f-c1529296a38c-scratch-2026-11-21-3e4cac/a8c1e071-7ff4-4fc3-85ca-c7c39cfdce33/scratchpad/shots/" + info.project.name;
  await loginAs(page, "bartosz");
  for (const r of ["/sytuacja", "/uprawnienia", "/plan"]) {
    await page.goto(r);
    await page.waitForTimeout(800);
    await page.screenshot({ path: dir + r.replace("/", "-") + ".png", fullPage: true });
  }
  await page.goto("/sprawy/B2-13");
  await page.waitForTimeout(800);
  await page.screenshot({ path: dir + "-case.png", fullPage: true });
});
