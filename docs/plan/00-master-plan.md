# 00 — Master plan: Zasiłkowy Przewodnik Przyszłego Rodzica

Status: **v2**. Inputs: `docs/digest/01`, `02`, `03`. Detailed phase plans: `01-phase-0-foundations.md`, `02-phase-1-engine.md`.

**Changelog v1 → v2**
- Phases reordered: login + mock systems + jury mode merged into one data-layer phase (a sample case *is* a persona). Seven phases, 0–6.
- New 7th journey "Planuję dziecko" (pre-pregnancy check-up), visible on the landing page.
- **Alerts** are a first-class engine output, modelled on the 12 refusal/problem causes in digest 03 §2.
- Golden-test matching redefined in three tiers (outcome / duration / amount) driven by per-field evidence.
- Repo/PDF stance: no history rewrite; PDFs never reach the image or the app; fixtures and case list carry no names.
- Simulated login is permanently marked "SYMULACJA", neutral wordmarks only.
- Planner gets a read-only SVG timeline (click to select a block) on top of the form-first editor.
- Stack pinned: Next 16.4 (Cache Components + partial prefetching on), React 19, TypeScript 5, zod 4, Vitest 5, Playwright 1.65, Drizzle 0.45 + better-sqlite3 13, iron-session 9, ESLint 9, Node 22.
- Facts from digest 03 folded in: 1 000 zł floor confirmed, historic parameter sets needed (2024–2026), supplementary leave in force from 19.03.2025, 5-part limit shared by both parents.

## 1. Vision and core insight

**Insight.** ZUS learns about a birth only after it happens, so nobody can verify entitlement or amount beforehand. In the 86 sample cases, all 12 refusals had causes that were visible in state registers weeks or months earlier: no sickness insurance on the decisive day (4), employment ZUS did not recognise (4), contribution debt (3), the shared 5-part limit (1). Another ~20 cases stalled on a missing or wrong document.

**Product.** A "plan + verify" service that starts before pregnancy. The parent logs in with mObywatel (simulated), we pull what ZUS, CEIDG and the civil registry already hold, ask only about plans, and return:

1. a **verdict** — "on your due date you will / will not be entitled, because…";
2. **alerts** — each with a severity, a date and a fix ("your sickness insurance ends on X, your parental part starts on Y — re-register by X");
3. a **plan** — both parents' leave on one timeline, weeks and złoty live;
4. a **route** — which form, to whom, by which date.

Every number is explainable down to the article and the parameter used. The same engine re-adjudicates ZUS's own sample cases in front of the jury.

**Positioning line:** "Decyzja ZUS, zanim urodzi się dziecko."

## 2. Information architecture and journeys

### Screens

| Route | Purpose |
|---|---|
| `/` | Landing with four entries: "Planuję dziecko", "Jestem w ciąży / mamy dziecko" (login), "Policz bez logowania", "Trudna sytuacja". |
| `/planuje-dziecko` | Pre-pregnancy check-up (works logged-in or with 4 manual questions). |
| `/logowanie` → `/zgoda` → `/pobieranie` | Simulated login.gov.pl-style picker → mObywatel confirm → consent per registry → per-source fetch checklist. |
| `/sytuacja` | Sourced data cards + the few questions no system can answer. |
| `/uprawnienia` | Verdict per benefit, including explicit "nie przysługuje, bo…", plus the alert list. |
| `/plan` | The integrated calculator/planner. |
| `/kroki` | "Co, gdzie, kiedy": dated checklist, documents, employer-vs-ZUS routing, `.ics` export. |
| `/wnioski` | Simulated forms: leave applications (our design, per RW), ZAM / ZAS-53 / ZAS-55, USC birth-certificate copy, PUE/eZUS question. |
| `/wsparcie`, `/trudna-sytuacja` | Charities by situation; the quiet path. |
| `/sprawy`, `/sprawy/[id]` | Jury mode. |
| `/admin` | Legal parameters, content, regression run. |
| `/o-serwisie` | Requirement-to-screen map, AI declaration, data-handling note. |

Mobile: AppBar + 5-item tab bar (Start · Plan · Kroki · Wnioski · Więcej). Desktop: AppBar with horizontal nav, two-column plan view.

### The integrated calculator ("Plan rodzicielski")

One screen, one engine call, options instead of separate calculators (brief b–f, j).

- **Scenario bar**: birth / adoption / non-professional foster; number of children; "Za życiem"; premature or hospitalised; combining with work.
- **Form-first editor**: each leave block is a row (type, parent, start, length via steppers, work fraction). This is the only way to edit.
- **Visual timeline** (SVG, read-only): two lanes on a week axis anchored at the birth date. Clicking or focusing a block selects its row. The mother's 14 mandatory weeks are locked, each parent's 9 reserved weeks are hatched, part-time blocks show their extension. Each block type has a colour, a pattern and a text label. No drag-and-drop.
- **Live summary**: exact date ranges and day counts per leave (inclusive counting), pool and parts counters across both parents, monthly household cash-flow, **100/70 vs 81.5** side by side with the 21-day countdown.
- **Violations come from the engine**: "matka musi wykorzystać 14 tygodni (KP art. 180 §4)", "to byłaby 6. część — limit jest wspólny dla obojga rodziców".
- "Dlaczego tyle?" opens the reasoning trace for any amount.

### Journeys

1. **Planuję dziecko.** A check-up, not a calculator: "If a child were born 9–12 months from now…". Output is the alert list. JDG on ulga na start → no insurance at all; voluntary *chorobowe* not joined on a zlecenie; debt above 48,06 zł; preferential base → benefit under 1 000 zł; a recent base increase diluted by Art. 48a; a new job at a tiny fraction → expect a ZUS verification and keep proof of real work. Each alert has a "do this by" date.
2. **Pregnant employee.** Login → data fetched (employment, 12 monthly bases, e-ZLA code B) → asked only for due date and plans. Verdict, base, payer. Plans 20 + 32 weeks, compares 81.5, adds partner's 9 weeks → dated steps → generated leave application.
3. **Self-employed with debt risk.** Amber verdict: insured, but arrears block payment until repaid and the right expires after 6 months. Also warned: do not suspend the business near the due date; re-register after maternity benefit before a separately claimed parental part.
4. **Father.** His rights first: 14 days before the child is 12 months old, his 9 weeks at 70% of his base, takeover after week 14. Partner data needs her simulated consent, or his estimate.
5. **Adoption / foster.** Scenario switch replaces due date with "date child taken into care" and child's age; age limits, 9-week minimum, court documents. Professional foster family: explicit "no entitlement".
6. **Stillbirth / child death — quiet path.** Reachable from the landing page and triggered automatically when the registry shows it. No planner, no congratulatory copy. One calm page: 8 weeks at 100%, funeral grant, which certificate to ask the doctor for when no registry act exists, who files where, support organisations, "możesz wrócić do tego później".
7. **Jury: test a sample case.** `/sprawy` → pick by scenario or drop the PDF → "zaloguj jako sprawa B4-7" loads the case as system data → the normal `/sytuacja` and `/uprawnienia` screens plus a comparison panel: our result beside the ZUS outcome, field by field, each labelled *verified against file* or *not stated in file*. "Otwórz w planerze" continues into the product.

## 3. Data layer: mock systems, personas, cases

One shape feeds everything: `persona = { identity, systems: { …one block per mock system } }`. A demo persona and a sample case are the same thing; a case additionally has `expected.json`. The data layer turns a persona into engine `Facts` plus a provenance map (fact path → source), so the engine stays free of UI concerns.

| Mock system | Returns | Drives |
|---|---|---|
| login.gov.pl / mObywatel (simulated) | identity, birth year, sex | identity, age ≥50 rule |
| ZUS – konto ubezpieczonego | titles with codes and dates, sickness-insurance mode and start (= ZUA receipt date), monthly bases, working time, scheme | gate, waiting periods, base |
| ZUS – płatnik | payer, insured count on 30 Nov | who pays |
| ZUS – saldo składek | arrears on a date (own or payer's account), repayment date, simulated certificate | arrears rule |
| ZUS – e-ZLA | sick notes with codes | sick pay / benefit split, 270-day tracker |
| ZUS – świadczenia | benefits paid, parental parts and weeks used by **both** parents | pools, 5-part limit |
| ZUS – postępowania | insurance-validity decisions | refusal for non-recognised title |
| CEIDG / KRS | business status and suspensions; employer liquidation | gate, Art. 30 |
| Rejestr Stanu Cywilnego / PESEL | children, births, stillbirth annotation, other parent | event facts |
| e-zdrowie (P1) — optional | due date, gestational week, weight, hospital stays | pre-birth leave, supplementary leave |

Adapters sit behind interfaces in `src/integrations/*`, are served through `/api/v1/integrations/*`, and simulate latency and one "source unavailable" state that degrades to manual entry.

**Source badges and corrections.** Every displayed value carries its badge ("z ZUS", "z CEIDG", "z rejestru stanu cywilnego", "podane przez Ciebie"). A correction never deletes the original: it adds an override, the badge flips to "podane przez Ciebie — ZUS zweryfikuje", the engine recomputes, and "Zgłoś niezgodność do ZUS" creates a simulated PUE query.

**We never ask** for identity, employer, salary, insurance history, payer size, debt, sick notes or registered births. **We ask only** for the due date (if not in e-health), plans (dates, split, rate option, part-time), "Za życiem" (a statement suffices), adoption/foster facts, expected changes (contract ending, business suspension), and the other parent's consent or an estimate.

**Simulation marking.** The login screens carry a persistent "SYMULACJA — to nie jest prawdziwe logowanie" banner; the app shows a small "Dane symulowane" badge next to the user name. No official logos or emblems: neutral wordmarks ("Login — symulacja", "mObywatel (symulacja)").

**Sample cases.**
- Fixtures: `data/cases/<id>/input.json` (persona + claim) and `expected.json`. The engine's types cannot reach `expected`.
- Upload: SHA-256 computed in the browser; only the hash is sent. Fallback: hash of the normalised file name (so no name fragments are stored), then manual pick.
- The list shows scenario titles and internal IDs only.
- PDFs are never served: `docs/` and `.work/` are excluded by `.dockerignore`; a README note records the restriction.

## 4. Architecture

**One Next.js 16 service** (App Router, React 19, TypeScript strict, Turbopack, Cache Components on: the shell prerenders, persona-dependent content streams behind Suspense). REST route handlers under `/api/v1/*`, validated with zod 4, OpenAPI generated from the same schemas at `/api/docs`. The UI consumes the same endpoints.

**Rules engine — `src/engine`, pure TypeScript, no imports outside itself (lint + test enforced).**

```ts
evaluate(facts: Facts, plan: Plan | null, params: ParameterSet[]): Result
```

`Result` carries insurance checks, entitlements with reason codes, dated periods with base/rate/daily/gross, pool and part counters, payer routing, documents, deadlines, **alerts**, violations and a trace (`ruleId`, inputs, output, citation, parameter keys). Stages: params → insurance → event → lengths → allocation → rate → base → amount → gating → routing → alerts → outcome.

- Parameter sets are effective-dated; the engine uses the set in force on the day the right arises. Sets for 2024–2026 are needed because the cases use minimum wages from several years.
- Uncertain interpretations are boolean parameters; sample cases set the defaults.
- Money in grosze, dates as ISO day strings, no clock access (`asOf` is an input).

**Alerts.** `{ code, severity: info | warning | high | blocking, onDate, deadline, fix, citation }`. Codes mirror digest 03 §2: title likely to be verified, not insured on the decisive day, gap before a separately claimed part, voluntary insurance not joined, business suspended, arrears (own or payer's account) with the 6-month expiry date, 21-day rate deadline, day-count errors, shared parts limit, top-up statement, low or diluted base, paternity expiry. A test asserts that every refused sample case raises its alert from pre-event data alone.

**Persistence.** SQLite (better-sqlite3 + Drizzle) on a Railway volume: parameter versions, content, audit log, simulated submissions. Seeded from `data/params/*.json`, so an empty DB self-heals. Schema kept Postgres-portable (no SQLite-only types; JSON as text). Rationale goes in the README.

**Auth simulation.** iron-session cookie holding persona ID and overrides. Admin: password from an env var, given to the jury in the submission.

**Design system.** Own tokens (CSS custom properties) + CSS Modules + own components; Radix only for dialog, tabs, accordion, popover. Open Sans self-hosted. Primary `#00693e` (6.80:1 on white). Green is reserved for interaction and is always solid; status is never solid and never colour-only (tint + 4px bar + icon + word). Positive status uses a distinct olive `#3d6b00`. Full palette with ratios in the Phase 0 plan.

**Testing.** Vitest: rule unit tests, worked examples E1–E10, personas P1–P12, golden tests over all fixtures, alert-recall test, property tests. Playwright + axe at 375 px and 1280 px. `npm run verify` = typecheck + lint + token contrast + fixture validation + unit + golden.

**Golden matching.**

| Tier | Applies to | Rule |
|---|---|---|
| Outcome | all 86 | granted / refused / partial and reason code must match |
| Duration | cases where the file states it | days per leave type must match |
| Amount | cases where base and/or daily/monthly amount is printed | match to the grosz |

Each expected field carries `evidence: printed | inferred | absent`; only `printed` is asserted, `inferred` is reported.

**i18n.** Polish only, plain language, one message catalogue as the seam for later languages.

**AI.** None at runtime. Declared: AI assistance during development (code, OCR-based transcription of cases into fixtures, each checked).

## 5. Phases

| # | Goal and scope | Acceptance | Risk |
|---|---|---|---|
| **0 Foundations + design system** | Scaffold, tokens, core components, layout shell, stubbed routes, SQLite + seed, Dockerfile, Railway config, health check, lint boundaries. Fixture schema frozen on 10 pilot cases. | Deployable image; styleguide page axe-clean; contrast script passes; `npm run verify` green. | Schema churn — pilot first. |
| **1 Engine + fixtures + golden tests** | Types, parameter sets 2024–2026, all stages, alerts, trace; 86 fixtures; golden harness. | Outcome tier 86/86 (documented divergences ≤5); duration and amount tiers 100% of asserted fields; alert recall on all refusals. | Benefit-base edge cases; timebox per slice. |
| **2 Data layer** | Mock systems + REST, simulated login and consent, `/sytuacja` with badges and corrections, manual mode, `/uprawnienia` with alerts, `/planuje-dziecko`, **and `/sprawy` jury mode with comparison panel and scoreboard**. | 12 personas and 86 cases load through the same path; any sample PDF resolves in <2 s with nothing uploaded; no question asked that a system answers. | Mock realism creep — fixed adapter list. |
| **3 Planner** | `/plan`: form editor, SVG timeline, scenarios, both parents, 81.5 comparison, part-time, cash-flow, trace drawer. | Brief b–f, j each reachable in ≤3 interactions; keyboard-complete; usable at 375 px. | Timeline polish — ship rows first. |
| **4 Guidance + forms + quiet path** | `/kroki`, documents, routing, `.ics`; leave applications, ZAM/ZAS-53/ZAS-55, USC request, PUE question; charities, links; quiet path. | Each persona gets a correct dated checklist; forms pre-filled from sourced data; quiet path reviewed for tone. | Charity curation — ≤12, editable. |
| **5 Admin** | Parameter versions (draft → publish with `validFrom`), diff, audit log, content, **"run all cases against this draft"**. | A draft change shows its regression impact before publishing; reset to defaults works. | Nested tables — forms generated from zod. |
| **6 Polish, a11y, deploy** | WCAG pass (keyboard, screen reader, 200% zoom, reduced motion), RWD, error states, README, screenshots, demo script. | Playwright + axe green; cold deploy from clean clone. | Late regressions — feature freeze. |

**Cut line:** admin content editing → ZAS-53 → cash-flow chart → P1 mock. Never cut: engine correctness, alerts, jury mode, quiet path, parameter admin.

## 6. Decisions on open questions

| Question | Decision |
|---|---|
| (e) vs (j) foster duplication | One adoption/foster mode; professional foster explained as not entitled. |
| Rehabilitation benefit | Information, eligibility and rate; no dedicated calculator. |
| Minimum benefit | 1 000 zł net, confirmed by 11 cases; a parameter. |
| Net vs gross | Gross is the headline; net is an estimate (PIT 12%, advance rounded to full złoty — matches the one printed payment). |
| Sham-contract refusals | The engine never judges genuineness. In case mode the ZUS non-coverage decision is input data; in prospective mode the same situation raises a "ZUS will verify" alert. |
| Right assessed when | On the event date, and again at the start of every separately claimed part. |
| 5-part limit | Counted jointly for both parents. |
| Uncertain rules (9 weeks when the other parent is uninsured, Art. 30 scope, father's rate under 81.5, supplementary leave for non-employees) | Parameter flags; defaults follow the matching cases. |
| Cases that do not reproduce (a Za-życiem week count, a combined-work end date, a father after stillbirth, a supplementary leave regranted) | Marked `knownDivergence` with a written explanation; shown openly on the scoreboard. |
| 81.5% deadline | 21 days **after** birth. |
| Forms | Unified ZAM; old form names only as labels in cases. Print-styled HTML, no PDF library. |
| Upload | Fixture match by browser-side hash; no OCR. |
| Repository | Local work; no history rewrite; PDFs never in the image; no names in fixtures or UI. |

**Out of scope:** real integrations, OCR/LLM at runtime, employer and ZUS-officer portals, childcare-leave and care-allowance calculators (info only), świadczenie rodzicielskie application (link out), dark theme, other languages, drag-and-drop, multi-replica scaling.

## 7. What makes the jury say "wow"

| Criterion | Moment |
|---|---|
| **Związek z wyzwaniem (25%)** | Every lettered requirement and every "simulate" bullet mapped to a screen on `/o-serwisie`. A juror drops their own PDF and sees the outcome match. |
| **Pomysł (20%)** | "Planuję dziecko": the 12 refusals from ZUS's own files replayed as alerts the person would have seen months earlier, each with a fix and a date. |
| **Oryginalność (15%)** | Zero-form onboarding with source badges; two-parent plan with a shared parts counter; a calculator that cites the article; admin runs 86 real cases against a draft law change. |
| **Kompletność i UX (25%)** | Seven journeys end to end on a phone; the quiet path; keyboard and screen-reader complete; nothing asked twice. |
| **Potencjał wdrożeniowy (15%)** | Pure engine with golden tests against real outcomes; effective-dated parameters; adapters ready for real APIs; documented REST; one-command deploy; no AI, so every result is reproducible. |
