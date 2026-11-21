# Review — Phase 0 (commit 8a5aad3)

Scope: code read against `01-phase-0-foundations.md` §12 and general UX/a11y practice. **Static review only**: I did not run the app, the build or a browser. Items marked *(verify)* are derived from the CSS and need a look at the stated width.

Overall: solid foundation. Shell prerender/stream split, token discipline, contrast gate, engine boundary and the health/params endpoints are as planned. One latent deploy blocker, a handful of real a11y/UX defects in form controls and navigation, the rest is polish.

## Verdict on the deliberate deviations

| # | Deviation | Verdict |
|---|---|---|
| 1 | Auth pages keep the full AppShell | **Accept.** Good anti-phishing argument. Condition: S3 below (banner enforced by a layout, not per page). |
| 2 | AppBar 64 px | **Accept.** Follow-up in S7 (scroll padding on desktop). |
| 3 | Icon-only login button under 420 px | **Accept as fallback**, but S5 removes the need for it. |
| 4 | `uppercase={false}` for brand names | **Accept.** |
| 5 | `useGrouping: "always"` | **Accept.** |

## Acceptance checklist status

| Item | Status |
|---|---|
| `verify` / build / e2e green | Reported green by implementer; not re-run. |
| Docker build and run, image contents | **Not done** — and will fail as written (B1). |
| Volume delete → re-seed | Not verified (depends on Docker). |
| Styleguide all states, axe at 375 / 1280 | Done per report. Dialog-open and menu-open states are not covered by axe (S14). |
| 320 px and 200% zoom | **Not tested** (S6, S14). |
| Keyboard focus visible on white / grey / dark | Looks right in CSS; no test. |
| Engine boundary (lint + test) | Done. Gaps in N8. |
| `(auth)` pages show the SYMULACJA banner | **Not yet** (S3). |
| No official logo in the repo | Scaffold leftovers remain in `public/` (N1). |
| Fixture schema frozen | In progress. |

## Blocker

**B1. Docker build fails on a clean clone.**
`Dockerfile:27-29` copies `data/cases`, `data/personas`, `data/content`. Only `data/params/2026-01-01.json` is tracked in git, and git does not keep empty directories, so `COPY --from=build /app/data/personas` (and `content`; `cases` until fixtures are committed) aborts the build.
Fix: replace lines 26–29 with a single `COPY --from=build /app/data ./data` (`data/runtime` is already excluded by `.dockerignore:12`). Docker is deferred to Phase 6, so this is not blocking today — but fix it now, it is one line.

## Should fix

**S1. Published parameters go stale after a redeploy.**
`src/app/api/v1/params/current/route.ts:4` is prerendered at build, when `params-repo.ts:14` deliberately reads the JSON files. The Railway volume survives deploys, so once the admin panel exists a redeploy serves file defaults from this endpoint while `/api/health` (dynamic) and the engine read the database.
Fix: `await connection()` at the top of the handler; keep `'use cache'` + tag on `getPublishedParams` so runtime calls stay cached. Rule for later phases: nothing that depends on published parameters may sit in the prerendered shell. Also make `version` (`params-repo.ts:31`) change when a set's content changes — append a short hash or `publishedAt`.

**S2. Missing `SESSION_PASSWORD` in production fails silently.**
`session.ts:39-43`: `password()` throws inside the `try`, so `getSession()` returns `{}` and every user just looks logged out; the first loud failure is a 500 on login.
Fix: move `const pw = password()` above the `try`; add a `session: "ok" | "misconfigured"` field to `/api/health` and return 503 when misconfigured.

**S3. SYMULACJA banner is not enforced on auth routes.**
`src/app/(auth)/logowanie/page.tsx:7` (and `zgoda`, `pobieranie`) render the stub without `SimBanner`.
Fix: add `src/app/(auth)/layout.tsx` that renders `<SimBanner/>` above `children`, so no auth screen can ship without it.

**S4. Secondary destinations are unreachable on desktop.**
`Shell.module.css:59` hides the menu button and tab bar from 960 px; `DesktopNav` gets only `appNav` (`AppShell.tsx:38`). `/wsparcie` has no link anywhere on desktop (not in the footer, not on the landing page); `/planuje-dziecko` and `/trudna-sytuacja` are reachable only from the landing page. Brief item (i) lives on `/wsparcie`.
Fix: add a right-aligned secondary group to the desktop nav ("Planuję dziecko", "Trudna sytuacja", "Wsparcie") and add all `secondaryNav` items to the footer (`nav.ts:34`).

**S5. Two controls open the same drawer on mobile.**
`MenuButton` (`AppShell.tsx:33`) and the "Więcej" tab (`NavLinks.tsx:52`) both open the menu. The hamburger costs 56 px of a 375 px header and is the reason the login label had to be hidden.
Fix: hide `.menuBtn` below 960 px (the tab bar is always present there) and drop it entirely, or keep it only for 600–959 px. Then show the "Zaloguj się" label from ~360 px.

**S6. Tab bar labels at 320 px.** *(verify)*
`Shell.module.css:25-26`: five columns of 64 px at 320 px; "Uprawnienia" at 12 px/600 is roughly 70–74 px wide and has no overflow handling, so it touches or overlaps its neighbours.
Fix: `short: "Prawa"` (or "Zasiłki") for that item in `nav.ts:29`; add `overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 2px` to `.tab` as a safety net.

**S7. Sticky chrome vs. small viewports and anchors.**
(a) `globals.css:12` sets `scroll-padding-top` to the AppBar height only; on desktop the sticky header is AppBar + 48 px nav, so anchor targets and focused fields scroll under the nav. (b) At 400% zoom (≈320×256 CSS px) or phone landscape, the sticky header plus fixed tab bar take 128 px of the viewport.
Fix: (a) `@media (min-width: 960px) { html { scroll-padding-top: calc(var(--appbar-h) + 48px + var(--space-4)); } }`. (b) `@media (max-height: 480px) { .header { position: static; } .tabbar { position: static; } }` and drop the matching bottom padding.

**S8. Stepper cannot be typed into.**
`Stepper.tsx:40-43` clamps on every keystroke: with `min=14`, typing "1" becomes 14 before the "8" arrives. The −/+ buttons also change the value silently for screen readers, and the unit is not part of the accessible name.
Fix: keep a local string draft, commit and clamp on blur/Enter; add a visually hidden `aria-live="polite"` output with value + unit; append the unit to the label or reference it with `aria-describedby`.

**S9. DateInput ignores external value changes.**
`Form.tsx:177` uses `defaultValue` while the component accepts `value`; a reset or a correction applied from outside leaves stale digits.
Fix: make the three inputs controlled from local state synced to `value`, or key the fieldset on `value`. Also give the first input `aria-describedby` for hint and error (description on `fieldset` is announced inconsistently), and set `aria-invalid` only on the offending part when known.

**S10. Notice does not expose its tone to screen readers.**
`Notice.tsx:40` — the icon is decorative and `toneWord` (line 17) is exported but never rendered, so "never colour-only" holds visually but a screen-reader user hears only the title.
Fix: render `<span className="visually-hidden">{toneWord[tone]}: </span>` before the title (with a `hideToneWord` prop for titles that already contain it). Same for the error text in `Field` / `ChoiceGroup` / `DateInput` ("Błąd: ").

**S11. Custom radios and checkboxes disappear in forced-colors mode.**
`Form.module.css:24-30` uses `appearance: none` and draws the mark with `background` / borders in fixed colours; Windows High Contrast removes backgrounds.
Fix: `@media (forced-colors: active) { .choice input { appearance: auto; } .choice:has(input:checked) { border-color: Highlight; } }`. Apply the same check to `.navLink::after`, `.tab::before`, `Steps .current .dot` (use `border` or `forced-color-adjust`).

**S12. External `TextLink` cannot wrap.**
`TextLink.tsx:16` sets `display: inline-flex`, which makes the whole link one unbreakable box — long link text overflows at 320 px.
Fix: keep the anchor inline; render the icon as an inline SVG with `vertical-align: -2px; margin-left: 4px`.

**S13. Copy: two phrases to change before anyone from ZUS reads them.**
(a) `page.tsx:41` and `README.md:5`: "Poznaj swoją decyzję z ZUS" promises a decision; the footer correctly says only ZUS or the payer decides. Use "Sprawdź, co Ci przysługuje z ZUS, zanim urodzi się dziecko". (b) `page.tsx:30`: "Spokojnie, krok po kroku" can read as "calm down" to a grieving parent. Use "Powiemy, co Ci przysługuje i co trzeba zrobić — bez pośpiechu."

**S14. E2E gaps against the acceptance list.**
`tests/e2e/shell.spec.ts` covers 375 and 1280 px only.
Add: (1) a 320×640 project asserting `document.documentElement.scrollWidth <= innerWidth` on every route; (2) menu drawer: open from "Więcej", axe with the dialog open, Escape closes, focus returns to the trigger; (3) tab-order smoke test (skip link → brand → nav → main → footer → tab bar); (4) styleguide: open the dialog and run axe.

**S15. UI → server boundary.**
`src/ui/shell/UserSlot.tsx:1,4` imports `@/server/*`; the lint rule (`eslint.config.mjs:35-38`) only forbids `@/integrations/*`.
Fix: move `UserSlot` to `src/app/_shell/UserSlot.tsx` (it is app wiring, not design system) and add `@/server/*` to the `src/ui/**` restriction.

**S16. Lint rules promised in the plan are missing.**
`eslint.config.mjs` has no `@typescript-eslint/no-floating-promises` (needs type-aware linting) and no full `jsx-a11y` recommended set (eslint-config-next enables only a few rules).
Fix: add `parserOptions.projectService: true` for `src/**` and enable `no-floating-promises` + `no-misused-promises`; spread `jsxA11y.flatConfigs.recommended`.

**S17. Logout redirect builds an absolute URL from `request.url`.**
`api/v1/auth/logout/route.ts:6` — behind Railway's proxy with `HOSTNAME=0.0.0.0`, `request.url` may carry the internal host.
Fix: `return new Response(null, { status: 303, headers: { Location: "/" } })`. Use the same pattern for the login redirects in Phase 2.

**S18. Keep the simulated login out of search engines.**
`layout.tsx:15` has no `robots` metadata. A page that looks like a government login, on a public URL, should not be indexed.
Fix: `robots: { index: false, follow: false }` in the root metadata and an `app/robots.ts` that disallows everything.

**S19. Hero colours bypass the token system.**
`page.module.css:3,5,11,13,16` and `page.tsx:74` use literal `#cfe6d8`, `#e8f3ec`, `#9fd3b3`; the contrast script duplicates two of them by hand (`check-contrast.mjs:59-60`) and misses the third. The hero buttons are restyled by position (`page.module.css:7-10`).
Fix: add `--on-dark-muted`, `--on-dark-soft`, `--on-dark-accent` tokens and pairs; add `onDark` to `Button` instead of `a:first-child` / `a:nth-child(2)` selectors. Add a grep step to `tokens:check` that fails on raw hex colours outside `tokens.css`.

**S20. PII scan skips short names.**
`validate-fixtures.ts:15` drops tokens under 4 characters, so three-letter first names are never checked; matching is substring-based, so longer tokens can false-positive.
Fix: keep tokens ≥3 characters and match with Unicode word boundaries (`(?<![\p{L}])token(?![\p{L}])`, flag `iu`).

**S21. Session freshness after login (design note for Phase 2).**
`session.ts:36` caches `getSession()` privately in the browser. Logout is safe because it is a full form POST + redirect. Login must follow the same pattern (form POST → 303), not `fetch` + `router.push`, or the header keeps showing "Zaloguj się". Add an e2e assertion for it in Phase 2.

## Nits

- **N1.** `public/next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg` are scaffold leftovers (third-party marks). Delete.
- **N2.** `Button.module.css:28` — `sm` is 40 px high; it is used for the only header actions (`UserSlot.tsx:10,23`). Keep the visual size but extend the hit area to 48 px (`::after { inset: -4px 0 }`) or use `md` in the header.
- **N3.** `Dialog.tsx:24,28` — `aria-describedby={description ? undefined : undefined}` is dead code, and the fallback `Description` repeats the title to screen readers. Pass `aria-describedby={undefined}` and omit the fallback. `Dialog.module.css:2` references an undefined `--surface-raised`.
- **N4.** `Skeleton.tsx:5` — `aria-live` on every skeleton announces "Wczytywanie…" once per block. Use one `role="status"` per page region; keep the blocks `aria-hidden`.
- **N5.** `UserSlot.tsx:17,19,32`, `dostepnosc/page.tsx:8,11`, `error.tsx:14`, `Format.tsx` — inline styles; move to modules. `UserSlotSkeleton` (120 px) should match the real slot width to avoid a shift.
- **N6.** `globals.css:40` — `h1` stays 24 px on desktop; consider 30–32 px from 960 px for hierarchy against the 20 px `h2`.
- **N7.** `Tabs.module.css:1` — `overflow-x: auto` clips the focus outline of the first/last trigger and hides the scrollbar; use `outline-offset: -3px` on `.trigger` and a fade edge when scrollable.
- **N8.** `engine-boundary.test.ts:13` — misses side-effect imports (`import "x"`), `require()` and dynamic `import()`. Add those patterns.
- **N9.** `health/route.ts:11` — `npm_package_version` is unset under `node server.js`; import the version from `package.json` or inject `APP_VERSION` at build.
- **N10.** `db/client.ts:40-45` — wrap the seed in a transaction so a crash cannot leave a half-seeded table (which `n > 0` would then treat as seeded).
- **N11.** `next.config.ts:15` — document in the README why `script-src 'unsafe-inline'` is used (nonces are incompatible with a prerendered shell); add `object-src 'none'` and `Strict-Transport-Security`.
- **N12.** `package.json:23` — `@radix-ui/react-popover` is installed but unused; remove until needed (the README says dialog, tabs, accordion).
- **N13.** `playwright.config.ts:15` — `next start` with `output: "standalone"` is not what ships; run `node .next/standalone/server.js` (with static assets copied) so e2e exercises the production entry point.
- **N14.** `dostepnosc/page.tsx` — add the elements a Polish accessibility statement is expected to have: conformance status, date prepared, contact, complaint procedure (placeholders are fine).
- **N15.** `error.tsx:12` — "Twoje dane nie zostały utracone" is a claim the error page cannot know. Say "Spróbuj ponownie za chwilę."
- **N16.** `SourceBadge.tsx:5-16` — `SourceId` will need `zus-postepowania` and a case-file source in Phase 2; make this type the single source of truth shared with `src/integrations`.
- **N17.** `DataRow.tsx:13` — `aria-label` on a bare `<dl>` is not reliably announced; label the surrounding `Card` heading instead.
- **N18.** `AppShell.tsx:37` + `nav.ts:38` — "Panel administracyjny" in the public footer is fine for the jury; make sure `/admin` and `/styleguide` carry `robots: noindex` even if S18 is not applied globally.
