# Przewodnik Rodzica — Zasiłkowy Przewodnik Przyszłego Rodzica

Entry for **HackNation 2026**, ZUS challenge *„Zasiłkowy Przewodnik Przyszłego Rodzica”*.

> **Know what ZUS will grant you, before the baby is born.** The parent logs in through mObywatel (simulated). We pull what ZUS, CEIDG and the civil registry already know and ask only about plans. The service returns three things:
> - a **verdict**: will you be entitled on your due date, and why;
> - a **plan**: both parents' leave on one timeline, with the amount in złoty;
> - a **route**: which document, to whom, and by which date.
>
> Every number can be traced to an article of law and to the admin-managed parameter it came from.

## What is in it

| Screen | What it does | Brief item |
|---|---|---|
| `/logowanie` → `/sytuacja` | Simulated login.gov.pl / mObywatel. Signing in reads all 10 simulated registries at once: no consent screen, no progress screen | mObywatel, ZUS data |
| `/sytuacja` | Every value with its source ("z ZUS", "z CEIDG", "z e-ZLA"…) and "Skąd mamy te dane?"; asks only plans no registry knows (contract end, other parent); a registry that does not answer becomes a question with "Spróbuj ponownie"; corrections never delete the original and can be reported to PUE/eZUS | individual situation |
| `/uprawnienia` | Verdict on the day of birth, pregnancy benefits (incl. "nie przysługuje"), who pays (employer vs ZUS), alerts with deadlines and fixes, "Dlaczego?" trace with legal basis | a, g, h |
| `/plan` | One integrated calculator: both parents on a timeline, presets, part-time work, 81,5% vs 100/70% comparison, cash-flow per month, what-if (children, „Za życiem", hospital stay, adoption) | b, c, d, e, j |
| `/planuje-dziecko` | Readiness check-up months ahead: what to secure so the benefit is not refused | h |
| `/kroki`, `/wnioski` | Dated checklist, leave applications per the regulation, ZAM/ZAS-53 data sheets, USC birth-certificate request, PUE question (all simulated sending) | g, simulations |
| `/trudna-sytuacja`, `/wsparcie` | Quiet path for loss, preterm, illness; purely charitable organisations; official links | a, i |
| `/sprawy` | Jury mode: pick or drop any of the 86 ZUS case PDFs (hashed in the browser) and compare our result with ZUS's decision field by field | f, testing |
| `/admin` | Effective-dated legal parameters: draft → regression on all 86 cases → publish | admin panel |
| `/api/docs` | REST API documentation (OpenAPI 3.1 at `/api/openapi.json`) | REST |

## Accuracy against real ZUS decisions

The engine re-adjudicates all 86 sample cases (`npm run test:golden`):

- **86 / 86** outcomes (granted / refused / partial) match ZUS;
- **424 / 424** printed leave dates and day counts match;
- **268 / 268** printed amounts (base, rate, daily, payments) match to the grosz;
- **12 / 12** refusals would have been flagged *before the birth* by the alert replay;
- 5 documented divergences where the case file does not explain ZUS's decision (shown on the case page).

## Demo script (3 minutes)

1. **Start → "Zaloguj się"** → mObywatel → confirm → profile *Magdalena* → "Zaloguj". Insurance, pay, sick notes and the employer are already there (from ZUS); one grouped question asks what no registry holds: due date (12.03.2027), number of babies, "Za życiem".
2. **Twoja sytuacja:** source badges everywhere, "Skąd mamy te dane?"; two questions left (contract end, other parent); correct a value → "poprawione przez Ciebie — ZUS zweryfikuje". *Łucja* shows a registry that does not answer: the missing fact becomes a question until "Spróbuj ponownie".
3. **Uprawnienia:** "masz prawo do zasiłku macierzyńskiego", employer pays, "Dlaczego?" shows each step with the article of law.
4. **Plan:** preset "Łączę urlop z pracą na pół etatu" → leave doubles, monthly amount halves; switch 81,5% ↔ 100/70%; set parental leave to 60 weeks → violation with a one-click fix.
5. **Log out → profile *Weronika*** (self-employed): arrears of 312,40 zł block the payment, with the repayment deadline. *Oliwia* / **Planuję dziecko**: no voluntary sickness insurance — fix it months before.
6. **Przykładowe sprawy:** drop a PDF from the ZUS set → case opens → "Wynik zgodny z rozstrzygnięciem ZUS"; a refusal case shows the alert the app would have raised earlier.
7. **Admin:** change the parental rate 70% → 75% in a draft → run on 86 cases → publish from 2027-01-01 → the planner uses it.

## Run locally

```bash
npm ci
cp .env.example .env.local   # set SESSION_PASSWORD (≥32 chars) and ADMIN_PASSWORD
npm run dev                  # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run verify` | typecheck, lint, contrast gate, fixture validation, unit tests, golden tests |
| `npm run verify:full` | `verify` plus production build plus Playwright e2e (375 px and 1280 px, axe-core on every screen) |
| `npm run test:golden` | re-adjudicates every sample ZUS case and compares the result with ZUS's actual decision |

Requires Node ≥ 22.

## Architecture in ten lines

1. **One Next.js 16 service** (App Router, TypeScript strict), with Cache Components and Partial Prefetching enabled. The static shell prerenders, and persona-dependent content streams in behind `<Suspense>`.
2. **REST API** under `/api/v1/*` (route handlers, zod-validated). The UI uses the same endpoints.
3. **Rules engine** in `src/engine`: pure TypeScript with no framework, I/O or clock (lint-enforced), so it is deterministic.
4. **Explainable output**: `evaluate(facts, plan, params)` returns entitlements, periods, amounts, payer, documents, deadlines, risks and a reasoning trace, with a legal citation on every step.
5. **Effective-dated parameter sets** (`data/params/*.json`): the engine picks the set in force on the day the right arises. The admin panel publishes new versions.
6. **Simulated integrations** (`src/integrations/*`): login.gov.pl/mObywatel, ZUS account, payer, contribution balance, e-ZLA, benefits paid, CEIDG, KRS and the civil registry. Medical facts (due date, prematurity, "Za życiem") are asked, because no registry holds them yet. Each sits behind an interface, ready to be replaced by a real adapter.
7. **Sourced data**: each value carries its source ("z ZUS", "z CEIDG"…). A user correction is stored as an override and never deletes the original.
8. **Sample cases** (`data/cases/*`): anonymised fixtures extracted from the 86 ZUS case files, plus golden tests and a public scoreboard.
9. **Own design system** (`src/ui`): the gov.pl visual language in a green theme. CSS tokens and CSS Modules, with Radix used only for dialog, tabs and accordion. WCAG 2.1 AA contrast is checked by `npm run tokens:check`.
10. **SQLite** (better-sqlite3 + Drizzle) on a Railway volume, for parameter versions, audit log, content and simulated submissions.

### Why SQLite on a volume

The demo runs as a single service with no network dependency. If the volume is empty, the database re-seeds itself from the statutory defaults in the repo, and calculations fall back to the JSON parameter files if the database is unavailable. The Drizzle schema uses only Postgres-portable types, so moving to Railway Postgres is mechanical. Trade-off: one replica.

## Deploy to Railway

1. Create a service from this repository. `railway.json` selects the Dockerfile build and the `/api/health` healthcheck.
2. Add a **volume** mounted at `/data`.
3. Set the variables `SESSION_PASSWORD` and `ADMIN_PASSWORD`. `DATABASE_PATH` defaults to `/data/app.db`.

The container runs as root because Railway mounts volumes root-owned.

## Source material and personal data

The ZUS sample case files are provided **for HackNation use only and must not be copied or distributed**.

- The PDFs under `docs/` are **never served by the app**: `docs/`, `*.pdf` and the working folder `.work/` are excluded from the Docker image by `.dockerignore`.
- `data/cases/*` contains only **anonymised structured fixtures**: no names (not even abbreviated), PESEL, addresses, employer names or document numbers. `npm run fixtures:validate` enforces a PII scan.
- The case list in the app shows scenario titles and internal IDs only.
- "Upload a case" hashes the PDF **in the browser**. Only the SHA-256 is sent to the server, and the file never leaves the juror's computer.

## Simulation notice

Logging in with mObywatel / login.gov.pl and every registry query are **simulated**. These screens carry a permanent "SYMULACJA" banner and use no official logos or emblems. The service does not connect to real systems.

## Use of AI

- **At runtime: none.** No feature calls an AI model, so every result is reproducible and auditable.
- **During development:** AI coding assistants helped write code and transcribe the scanned sample cases into structured fixtures. Each fixture is validated automatically and checked against the source page.

## Third-party components

Photo on the home and login pages: Kateryna Hliznitsova, [Unsplash](https://unsplash.com/photos/a-person-standing-in-a-field-N_6OpdOXcxo) (Unsplash License) · Next.js, React (MIT) · Radix UI primitives (MIT) · Drizzle ORM (Apache-2.0) · better-sqlite3 (MIT) · zod (MIT) · iron-session (MIT) · Open Sans font (OFL-1.1, self-hosted via `next/font`) · Vitest, Playwright, axe-core (MIT / Apache-2.0 / MPL-2.0, dev only).

## Documentation

- `docs/digest/` covers the challenge brief, domain rules and the sample cases, digested.
- `docs/plan/` holds the master plan and the detailed phase plans.
