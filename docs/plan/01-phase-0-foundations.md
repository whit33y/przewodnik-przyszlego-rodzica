# 01 — Phase 0: foundations and design system

Goal: a deployable skeleton with the design system, layout shell, stubbed routes, persistence, lint boundaries and one verification command. No domain logic. Parallel track: freeze the fixture schema on 10 pilot cases (procedure in `02-phase-1-engine.md` §7).

## 1. Stack and versions

| Package | Version | Note |
|---|---|---|
| next | 16.4.6 (scaffold in repo root) | App Router, Turbopack, `cacheComponents: true` + `partialPrefetching: true` kept as scaffolded — see §6a |
| react, react-dom | 19.3.x | |
| eslint-config-next | 16.4.6 | from the scaffold |
| typescript | ^5 (scaffold default) | stay on 5.x; no TS 7 experiment in this project |
| zod | 4.6.x | |
| drizzle-orm / drizzle-kit | 0.45.x / 0.31.x | |
| better-sqlite3 | 13.x | requires Node ≥22; native module |
| iron-session | 9.x | |
| @radix-ui/react-dialog, -tabs, -accordion, -popover | current | nothing else from Radix |
| vitest | 5.x | |
| @playwright/test, @axe-core/playwright | 1.65.x, 4.14.x | |
| eslint | ^9 (scaffold default) | flat config; add `typescript-eslint` type-aware rules and `jsx-a11y` |
| Node | 22 LTS in Docker; `"engines": { "node": ">=22" }` | local dev on 26 works |

No Tailwind, no component library, no state library (URL + server data + `useReducer` in the planner).

## 2. Repository layout

```text
.
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx                 # <html lang="pl">, font, skip link, AppShell
│  │  ├─ globals.css                # imports tokens.css, reset, base typography
│  │  ├─ page.tsx                   # landing (4 entries)
│  │  ├─ not-found.tsx, error.tsx
│  │  ├─ planuje-dziecko/page.tsx
│  │  ├─ trudna-sytuacja/page.tsx
│  │  ├─ wsparcie/page.tsx
│  │  ├─ o-serwisie/page.tsx
│  │  ├─ dostepnosc/page.tsx        # accessibility statement
│  │  ├─ (auth)/logowanie/page.tsx, zgoda/page.tsx, pobieranie/page.tsx
│  │  ├─ (app)/layout.tsx           # static; session check lives in streamed page content
│  │  ├─ (app)/sytuacja | uprawnienia | plan | kroki | wnioski /page.tsx
│  │  ├─ sprawy/page.tsx, sprawy/[id]/page.tsx
│  │  ├─ admin/page.tsx
│  │  ├─ styleguide/page.tsx        # component gallery, every state
│  │  └─ api/
│  │     ├─ health/route.ts
│  │     └─ v1/                     # empty in Phase 0 except params (read)
│  │        └─ params/current/route.ts
│  ├─ engine/                       # pure TS; Phase 1. Phase 0: index.ts + money.ts + dates.ts stubs
│  ├─ integrations/                 # Phase 2
│  ├─ server/
│  │  ├─ db/client.ts               # lazy singleton, runs migrations + seed on first use
│  │  ├─ db/schema.ts
│  │  ├─ session.ts                 # iron-session config
│  │  └─ params-repo.ts             # load sets from DB, fall back to data/params
│  ├─ ui/
│  │  ├─ tokens.css
│  │  ├─ components/<Name>/<Name>.tsx + <Name>.module.css
│  │  ├─ icons/                     # own inline SVG set (~20 icons)
│  │  └─ index.ts
│  ├─ content/pl.ts                 # message catalogue (typed keys)
│  └─ lib/                          # format.ts (PLN, dates, days), cx.ts
├─ data/
│  ├─ params/                       # effective-dated sets (Phase 1)
│  ├─ cases/<id>/{input,expected}.json
│  ├─ personas/*.json
│  └─ content/{charities,links}.json
├─ drizzle/                         # generated SQL migrations
├─ scripts/
│  ├─ check-contrast.mjs            # fails if any declared pair is below its target
│  ├─ validate-fixtures.ts
│  └─ hash-cases.mjs                # local only; reads docs/Sprawy, writes hashes into fixtures
├─ tests/
│  ├─ unit/  golden/  e2e/
├─ public/fonts/                    # only if not using next/font
├─ Dockerfile  .dockerignore  railway.json
├─ eslint.config.mjs  tsconfig.json  next.config.ts  vitest.config.ts  playwright.config.ts  drizzle.config.ts
├─ .env.example  README.md
└─ docs/                            # plans, digests, source material (never in the image)
```

Path alias: `@/*` → `src/*`.

## 3. `package.json` scripts

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "typecheck": "tsc --noEmit",
  "lint": "eslint . --max-warnings 0",
  "tokens:check": "node scripts/check-contrast.mjs",
  "fixtures:validate": "tsx scripts/validate-fixtures.ts",
  "test": "vitest run --dir tests/unit",
  "test:golden": "vitest run --dir tests/golden",
  "test:e2e": "playwright test",
  "db:generate": "drizzle-kit generate",
  "verify": "npm run typecheck && npm run lint && npm run tokens:check && npm run fixtures:validate && npm run test && npm run test:golden",
  "verify:full": "npm run verify && npm run build && npm run test:e2e"
}
```

`verify` is the gate after every phase; `verify:full` before each review. No CI.

## 4. Design tokens (`src/ui/tokens.css`)

Light theme only. All ratios computed with the WCAG 2.1 formula; `scripts/check-contrast.mjs` re-checks the pairs below on every `verify`.

```css
:root {
  /* surfaces and lines */
  --surface: #ffffff;
  --surface-alt: #f2f2f2;
  --line: #c4c4c4;            /* decorative only */
  --line-strong: #6e6e6e;     /* form controls, outlined buttons */
  --line-soft: #e6e6e6;

  /* text */
  --ink: #1b1b1b;
  --ink-muted: #595959;

  /* brand: green replaces gov.pl blue */
  --primary: #00693e;
  --primary-hover: #00522f;
  --primary-strong: #003b22;  /* large dark areas, focus ring */
  --primary-soft: #e6f1eb;    /* selected row, hover tint */
  --on-primary: #ffffff;
  --accent-red: #d4213d;      /* AppBar vertical rule only */
  --focus: #003b22;
  --focus-on-dark: #ffffff;

  /* status: never solid, never colour-only */
  --positive: #3d6b00;  --positive-bg: #eef5dc;
  --info: #0052a5;      --info-bg: #eef4fb;
  --caution: #8a4b00;   --caution-bg: #fff1d6;
  --negative: #b3122e;  --negative-bg: #fce8eb;
  --neutral: #3f4a5a;   --neutral-bg: #eceff3;

  /* simulation marking */
  --sim-bg: #ffd54a;  --sim-ink: #1b1b1b;

  /* timeline categories (each also has a pattern and a label) */
  --tl-maternity: #00693e;
  --tl-supplementary: #5b3e99;
  --tl-parental: #0052a5;
  --tl-paternity: #8a4b00;
  --tl-loss: #3f4a5a;

  /* type */
  --font-sans: "Open Sans", "Segoe UI", Roboto, system-ui, sans-serif;
  --fs-display: 30px; --lh-display: 38px;
  --fs-h1: 24px; --lh-h1: 32px;
  --fs-h2: 20px; --lh-h2: 28px;
  --fs-h3: 18px; --lh-h3: 26px;
  --fs-body-lg: 18px; --lh-body-lg: 28px;
  --fs-body: 16px; --lh-body: 24px;
  --fs-small: 14px; --lh-small: 20px;   /* labels, captions, badges only */

  /* space, radius, size, shadow */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-5: 24px; --space-6: 32px; --space-7: 48px;
  --radius-xs: 2px; --radius-sm: 4px; --radius-lg: 16px; --radius-full: 9999px;
  --touch-min: 48px; --appbar-h: 56px; --tabbar-h: 64px; --content-max: 1120px;
  --shadow-bar: 0 1px 0 #e6e6e6, 0 2px 6px rgba(0,0,0,.06);
  --shadow-sheet: 0 -4px 16px rgba(0,0,0,.12);
}
```

### Contrast table

Targets: text 4.5:1, UI component boundaries and focus indicators 3:1.

| Foreground | Background | Ratio | Target | Use |
|---|---|---|---|---|
| `--on-primary` #ffffff | `--primary` #00693e | 6.80 | 4.5 | primary button label |
| #ffffff | `--primary-hover` #00522f | 9.34 | 4.5 | hover / pressed |
| #ffffff | `--primary-strong` #003b22 | 12.74 | 4.5 | dark hero band |
| `--primary` | `--surface` | 6.80 | 4.5 | links, outlined button |
| `--primary` | `--surface-alt` | 6.07 | 4.5 | links on grey |
| `--primary` | `--primary-soft` | 5.87 | 4.5 | selected item label |
| `--ink` | `--surface` / `--surface-alt` / `--primary-soft` | 17.22 / 15.39 / 14.88 | 4.5 | body text |
| `--ink-muted` | `--surface` / `--surface-alt` / `--primary-soft` | 7.00 / 6.26 / 6.05 | 4.5 | captions, source badges |
| `--line-strong` #6e6e6e | `--surface-alt` | 4.55 | 3 | field border (higher on white) |
| `--focus` #003b22 | `--surface` / `--surface-alt` | 12.74 / 11.38 | 3 | focus ring |
| `--focus-on-dark` #ffffff | `--primary` | 6.80 | 3 | focus ring on dark bands |
| `--accent-red` | `--surface` | 5.14 | 3 | AppBar rule |
| `--positive` | `--surface` / `--positive-bg` | 6.36 / 5.67 | 4.5 | "Przysługuje" icon, bar, word |
| `--info` | `--surface` / `--info-bg` | 7.64 / 6.90 | 4.5 | notices |
| `--caution` | `--surface` / `--caution-bg` | 6.80 / 6.09 | 4.5 | warnings |
| `--negative` | `--surface` / `--negative-bg` | 6.90 / 5.88 | 4.5 | "Nie przysługuje", errors |
| `--neutral` | `--surface` / `--neutral-bg` | 8.98 / 7.79 | 4.5 | "Nie dotyczy", unknown |
| `--ink` | every status `-bg` | ≥14.67 | 4.5 | body text inside status blocks |
| `--sim-ink` | `--sim-bg` | 12.20 | 4.5 | SYMULACJA banner |
| #ffffff | `--tl-maternity` / `-supplementary` / `-parental` / `-paternity` / `-loss` | 6.80 / 8.10 / 7.64 / 6.80 / 8.98 | 4.5 | timeline block labels |
| `--line` #c4c4c4 | `--surface` | 1.74 | none | decorative dividers only — never the sole boundary of a control |

### Green brand vs. status — the rules

1. Brand green is **solid and interactive**: filled buttons, underlined links, the active tab. Nothing else is solid green.
2. Status is **tinted and static**: `-bg` tint + 4px left bar + icon + a word ("Przysługuje", "Uwaga", "Nie przysługuje", "Informacja"). Status blocks are never clickable as a whole; actions inside them are ordinary buttons or links.
3. Positive status uses olive `--positive`, a different hue from the brand, and always carries ✓ and the word. Brand and positive green have near-equal luminance (1.07:1), so the difference is carried by form and icon, never by colour alone.
4. Red appears twice with different shapes: the 4×24 px AppBar rule (brand) and negative status (tint + ✕ + word). Form errors use negative with an icon and text linked by `aria-describedby`.
5. Focus: 3px solid `--focus` outline with 2px offset in the surface colour; on dark bands `--focus-on-dark`. Never removed, never colour-shift only.

## 5. Components (Phase 0 set)

All in `src/ui/components`. Server-component-safe unless marked (client).

| Component | Props sketch | Notes |
|---|---|---|
| `AppBar` | `{ title; sub?; nav?: NavItem[]; userSlot?: ReactNode; backHref? }` | Red vertical rule + two-line wordmark (text only). Desktop: horizontal nav. Mobile: title + menu button. |
| `TabBar` (client) | `{ items: {href; label; icon}[] }` | Mobile only (<960px), `nav` with `aria-current="page"`, 64px, safe-area padding. Uses `usePathname` in a small client leaf so the bar itself prerenders. |
| `Skeleton`, `CardSkeleton`, `DataRowSkeleton` | `{ lines?; height? }` | Suspense fallbacks; see §6a. |
| `Footer` | `{ links: {href; label}[] }` | Accessibility statement, "O serwisie", simulation disclaimer. |
| `SkipLink` | — | First focusable element. |
| `Button` | `{ variant: 'primary'|'secondary'|'text'; size?: 'md'|'lg'; block?; href?; loading?; icon? } & ButtonHTMLAttributes` | Primary: uppercase, 700, 0.02em, min-height 48px. Renders `<a>` when `href`. |
| `Link` | `{ href; external? }` | Always underlined; external adds visually hidden "(otwiera się w nowej karcie)". |
| `Card` | `{ as?; heading?; headingLevel?: 2|3|4; footer? }` | Flat, 1px `--line`, 4px radius, no shadow. |
| `Notice` | `{ tone: 'info'|'positive'|'caution'|'negative'|'neutral'; title; children; role?: 'status'|'alert' }` | Tint + bar + icon + title word. |
| `StatusBadge` | `{ tone; label }` | Small inline version; icon + word. |
| `SourceBadge` | `{ source: SourceId; asOf?: string; overridden?: boolean }` | "z ZUS · stan na 12.11.2026". |
| `SimBanner` / `SimBadge` | `{ text? }` | Persistent amber strip on auth screens; small badge in AppBar. |
| `Field` | `{ label; hint?; error?; required?; children }` | Wires `id`, `aria-describedby`, `aria-invalid`. |
| `TextInput`, `DateInput`, `Select`, `Checkbox`, `RadioGroup` | native props | `DateInput` is three text fields (day, month, year) per gov practice; no custom calendar in Phase 0. |
| `Stepper` (client) | `{ value; min; max; step?; unit: 'tygodnie'|'dni'; onChange; label }` | −/+ buttons 48px, numeric input between. |
| `Steps` | `{ items: {title; body?; state: 'done'|'current'|'todo'; date?}[] }` | Ordered list; state as text too. |
| `DataRow` | `{ label; value; source?: ReactNode; action?: ReactNode }` | The "sourced datum" row for `/sytuacja`. |
| `Dialog` (client) | Radix wrapper `{ title; description?; open; onOpenChange }` | Bottom sheet on mobile, centred on desktop. |
| `Tabs`, `Accordion` (client) | Radix wrappers | |
| `PageHeader` | `{ eyebrow?; title; lead? }` | One `h1` per page. |
| `Money`, `DateText`, `Days` | `{ value }` | `Intl` formatting; `Money` takes grosze. |
| `Icon` | `{ name; size?: 20|24; label? }` | `aria-hidden` unless `label`. |

Deferred to later phases: `Timeline`, `TraceDrawer`, `AlertCard`, `ComparisonTable`, `FileDrop`.

## 6. Layout shell

- **Breakpoints:** `<600` mobile, `600–959` tablet, `≥960` desktop. Content column `max-width: var(--content-max)`, side padding 16px (24px from 600).
- **Mobile/tablet:** sticky AppBar (56px) → `main` → TabBar fixed bottom (64px + safe area); `main` has matching bottom padding. Footer sits above the TabBar inside the scroll.
- **Desktop:** AppBar with wordmark left, nav centre, user/login right; no TabBar; footer full width.
- **Landmarks:** `header`, `nav[aria-label]`, `main#tresc`, `footer`. Skip link targets `#tresc`.
- **Route groups:** `(auth)` uses a bare shell with `SimBanner` and no nav; `(app)` pages require a session — checked in the streamed content component, not in the layout (§6a).
- **Motion:** transitions ≤150 ms, all disabled under `prefers-reduced-motion`.
- **Zoom:** layouts hold at 200% zoom and 320 px width without horizontal scroll.

## 6a. Rendering model under Cache Components (Next 16)

The scaffold defaults stay on. Design rule: **the shell prerenders, the persona streams.**

| Layer | Rendering | How |
|---|---|---|
| `layout.tsx`, AppBar wordmark and nav, TabBar, Footer, page headings, static copy, landing, `/styleguide`, `/dostepnosc`, `/wsparcie` | Prerendered into the static shell | No `cookies()` / `headers()` / `searchParams` anywhere in these components. |
| User slot in the AppBar (name + SimBadge or "Zaloguj") | Streams | `<Suspense fallback={<UserSlotSkeleton/>}><UserSlot/></Suspense>`; `UserSlot` calls `getSession()`. |
| `(app)` pages (`/sytuacja`, `/uprawnienia`, `/plan`, `/kroki`, `/wnioski`) | Static `PageHeader` + streamed body | `page.tsx` is synchronous and renders `<Suspense fallback={<…Skeleton/>}><…Content/></Suspense>`; only `…Content` reads the session. The redirect to `/logowanie` happens inside the streamed component. |
| Reference data that is the same for everyone (published parameter set, case list, charities) | Cached | Loader functions with `'use cache'` + a tag (`params`, `cases`, `content`); admin publish calls `revalidateTag`. |
| `/sprawy/[id]` | Shell + cached case | `generateStaticParams` over fixture IDs; `params` awaited inside the cached loader. |

Rules for the implementer:

1. **Session access goes through one helper**, `src/server/session.ts → getSession()`: marked `'use cache: private'`, reads `cookies()`, calls iron-session `unsealData`. Writes (login, logout, overrides) happen only in route handlers via `getIronSession(cookies(), …)`.
2. Any component that calls `getSession()`, `cookies()`, `headers()` or reads `searchParams` must sit under a `<Suspense>` boundary — otherwise the build fails. Keep those reads in leaf `…Content` components, never in layouts.
3. **Skeletons are part of the design system**: `Skeleton` (`{ lines?; height? }`), `CardSkeleton`, `DataRowSkeleton`. Same dimensions as the loaded content to avoid layout shift; `aria-busy="true"` on the region, no shimmer under `prefers-reduced-motion`.
4. **GET route handlers are prerendered at build unless they read runtime data.** `/api/health` must call `await connection()` first so it reports the live DB. Session- or query-dependent GETs read `cookies()` / `request` (which makes them dynamic). Reference GETs (`/api/v1/params/current`, later `/api/v1/cases`) deliberately stay cacheable and use the same tagged loaders.
5. `export const instant = false` is an escape hatch for a single route during development only; none may remain at the end of a phase (grep check in the acceptance list).
6. SQLite access is server-only and never runs at build time for request data; the parameter seed read used by cached loaders falls back to `data/params/*.json`, so `next build` works with no database present (as in the Docker build stage).

## 7. Routes in Phase 0

Every route in §2 renders `PageHeader` + a "w przygotowaniu" notice, so navigation, shell and a11y can be tested end to end. Real content in Phase 0: `/` (landing with four entry cards), `/styleguide`, `/dostepnosc`, `/api/health`, `/api/v1/params/current`.

`GET /api/health` → `200 { status: "ok", version, commit, db: "ok", paramsVersion }`; `503` if the DB cannot be opened. It calls `await connection()` before touching the DB so it is never prerendered (route segment `dynamic` config is not used with Cache Components).

## 8. Persistence

`src/server/db/schema.ts` (Drizzle, SQLite dialect, Postgres-portable types only: `text`, `integer`, JSON stored as text):

| Table | Columns |
|---|---|
| `parameter_sets` | `id`, `valid_from` (ISO date), `status` (`draft`/`published`/`archived`), `label`, `payload` (JSON), `created_at`, `published_at`, `author` |
| `audit_log` | `id`, `at`, `actor`, `action`, `entity`, `entity_id`, `diff` (JSON) |
| `content_items` | `id`, `kind` (`charity`/`link`/`text`), `payload` (JSON), `updated_at` |
| `submissions` | `id`, `session_id`, `kind`, `payload` (JSON), `created_at` |

`db/client.ts`: opens `DATABASE_PATH` (default `./data/runtime/app.db`), sets WAL, applies migrations from `drizzle/`, and seeds `parameter_sets` from `data/params/*.json` when the table is empty. If the DB is unavailable, `params-repo` serves the JSON files directly, so calculations never depend on the volume.

## 9. Lint rules and boundaries (`eslint.config.mjs`)

1. `src/engine/**`: `no-restricted-imports` with patterns `next`, `next/*`, `react`, `react-dom`, `node:*`, `fs`, `path`, `better-sqlite3`, `drizzle-orm*`, `zod`, `@/server/*`, `@/integrations/*`, `@/ui/*`, `@/app/*`, `@/content/*`, `@/lib/*`. Only relative imports inside `src/engine` are allowed.
2. `src/engine/**`: `no-restricted-syntax` for `new Date()` without arguments, `Date.now()`, `Math.random()`; `no-restricted-globals` for `process`, `fetch`.
3. `src/ui/**`: no imports from `@/server/*` or `@/integrations/*`.
4. `src/integrations/**`: may import `@/engine` types only (`import type`).
5. Repo-wide: `@typescript-eslint/no-explicit-any`, `no-floating-promises`, `consistent-type-imports`, `jsx-a11y` recommended, `eqeqeq`.
6. Backstop test `tests/unit/engine-boundary.test.ts`: reads every file in `src/engine` and fails on any non-relative import specifier.

## 10. Docker and Railway

`next.config.ts`: `output: "standalone"`, `serverExternalPackages: ["better-sqlite3"]`, `poweredByHeader: false`, security headers (CSP without inline scripts beyond Next's nonce, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'`).

```dockerfile
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 DATABASE_PATH=/data/app.db
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/data/params ./data/params
COPY --from=build /app/data/cases ./data/cases
COPY --from=build /app/data/personas ./data/personas
COPY --from=build /app/data/content ./data/content
COPY --from=build /app/drizzle ./drizzle
EXPOSE 3000
CMD ["node", "server.js"]
```

Notes: Debian slim (glibc) so better-sqlite3 uses its prebuilt binary; verify the native module lands in `.next/standalone/node_modules` and add an explicit copy if tracing misses it. The container runs as root because Railway mounts volumes root-owned; documented in the README.

`.dockerignore`: `.git`, `node_modules`, `.next`, `docs`, `.work`, `tests`, `playwright-report`, `test-results`, `data/runtime`, `*.db`, `.env*`, `*.pdf`. This is what guarantees the sample PDFs and OCR text never reach the image.

`railway.json`:

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": { "builder": "DOCKERFILE", "dockerfilePath": "Dockerfile" },
  "deploy": {
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 60,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3,
    "numReplicas": 1
  }
}
```

Volume mounted at `/data`. Env (`.env.example`): `SESSION_PASSWORD` (≥32 chars), `ADMIN_PASSWORD`, `DATABASE_PATH`, `APP_COMMIT`.

## 11. README sections to write in Phase 0

Run locally; `npm run verify`; architecture in 10 lines; why SQLite on a volume (single service, self-healing seed, Postgres-portable schema); **source-material note** (ZUS case files are for HackNation only: not served by the app, excluded from the image, fixtures contain no personal data, the case list shows scenario titles and IDs); simulation note; AI declaration; third-party licences (Next, React, Radix, Drizzle, better-sqlite3, zod, iron-session, Open Sans — all MIT/ISC/OFL).

## 12. Acceptance checklist

- [ ] `npm ci && npm run verify:full` passes on a clean clone.
- [ ] `next build` output shows the shell of every stubbed route prerendered; a demo `(app)` page streams a session-dependent block behind a skeleton; `cacheComponents` and `partialPrefetching` are still `true`; no `export const instant = false` in `src/`.
- [ ] `/api/health` is dynamic (reports a changed DB state without rebuild); `/api/v1/params/current` is served from the tagged cache and changes after `revalidateTag('params')`.
- [ ] `docker build` succeeds; `docker run -p 3000:3000 -v $(pwd)/tmpdata:/data` serves `/` and `/api/health` returns `200` with `db: "ok"`.
- [ ] Deleting the volume and restarting re-seeds parameters; health stays green.
- [ ] `docker run … ls /app` shows no `docs`, `.work` or `*.pdf`.
- [ ] `/styleguide` shows every component in every state (default, hover, focus, disabled, error, loading) and passes axe with zero violations at 375 px and 1280 px.
- [ ] `tokens:check` passes for every pair in §4; adding a failing pair makes `verify` fail.
- [ ] Every stubbed route renders inside the shell with exactly one `h1`; skip link works; tab order is AppBar → main → footer → TabBar.
- [ ] Keyboard only: all interactive elements reachable, focus ring visible on white, grey and dark green.
- [ ] 320 px width and 200% zoom: no horizontal scroll on `/` and `/styleguide`.
- [ ] Importing `react` (or calling `new Date()`) inside `src/engine` fails `npm run lint` and the boundary test.
- [ ] `(auth)` pages show the SYMULACJA banner; no official logo or emblem anywhere in the repo.
- [ ] README sections in §11 exist.
- [ ] Fixture schema v1 committed with 10 pilot cases passing `fixtures:validate`.

## 13. Risks

| Risk | Mitigation |
|---|---|
| Cache Components build errors from stray runtime reads | One `getSession()` helper, reads only in `…Content` leaves, skeleton per page; the acceptance step checks the build output. |
| iron-session inside `'use cache: private'` | Use `unsealData` on the raw cookie value (read-only); never call `session.save()` outside route handlers. |
| better-sqlite3 not traced into the standalone output | Acceptance step runs the built image; explicit `COPY` of the module as fallback. |
| Design-system gold-plating | Phase 0 ships the §5 list only; new components arrive with the phase that needs them. |
| Open Sans loading | `next/font/google` downloads at build time and self-hosts; if the build host is offline, commit the WOFF2 files under `public/fonts` (OFL). |
