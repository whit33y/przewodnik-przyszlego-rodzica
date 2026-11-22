# 03 — Phase 2: data layer, simulated login, situation, entitlements, jury mode

Goal: one pipeline — **persona → mock systems → facts assembler → engine → screens** — used identically by demo personas, sample cases and manual entry. Built in parallel with the engine against `src/engine/types.ts`; until `evaluate` lands, `src/server/engine-facade.ts` returns canned `Result` JSON from `tests/fixtures/results/`.

## 1. Personas and mock systems

**Decision: system payloads are typed slices of engine `Facts`, not bespoke registry formats.** Realistic ZUS wire formats add work and no jury value; slices make the assembler a merge and let a case fixture be split back into systems mechanically.

```ts
// src/integrations/types.ts
export type SourceId = 'mobywatel'|'zus-konto'|'zus-platnik'|'zus-saldo'|'zus-ezla'|'zus-swiadczenia'
  |'zus-postepowania'|'ceidg'|'krs'|'rsc'|'ezdrowie'|'user'|'sprawa';   // single source of truth; UI imports it
export interface Sourced<T> { value: T; source: SourceId; asOf: ISODate; fetchedAt: string }

export interface SystemPayloads {
  mobywatel: { displayName: string; sex: 'F'|'M'; birthYear: number };          // displayName is fictional
  'zus-konto': { role?: Role; titles: Omit<InsuranceTitle,'suspensions'>[]; flags?: Person['flags'] };
  'zus-platnik': { payers: Pick<Payer,'ref'|'insuredOn30NovPrevYear'|'relatedToClaimant'>[] };
  'zus-saldo': { arrears: ArrearsSnapshot[] };
  'zus-ezla': { sickNotes: SickNote[] };
  'zus-swiadczenia': { paidBenefits: PaidBenefit[]; otherParentUsed?: PaidBenefit[] };
  'zus-postepowania': { insuranceDecisions: InsuranceDecision[] };
  ceidg: { suspensions: { titleId: string; from: ISODate; to?: ISODate }[] };
  krs: { payerStatus: { ref: string; status: Payer['status'] }[] };
  rsc: { event?: Pick<BirthEvent,'kind'|'date'> & { children: Pick<Child,'ref'|'bornAlive'|'deathDate'|'birthDate'>[] };
         otherParentKnown: boolean };
  ezdrowie: { expectedDate?: ISODate; children?: Pick<Child,'ref'|'gestationalWeek'|'birthWeightG'|'hospitalStays'|'zaZyciem'>[] };
}

// data/personas/<id>.json
interface PersonaFile {
  id: string; label: string; oneLiner: string; journey: 'pregnant'|'planning'|'father'|'selfEmployed'|'adoption'|'loss';
  asOf: ISODate;                                   // the persona's "today"
  systems: Partial<SystemPayloads>;
  unavailable?: SourceId[];                        // scripted outage
  presetAnswers?: Partial<Answers>;                // lets the demo skip typing
  otherParent?: { consented: boolean; systems: Partial<SystemPayloads> };
}
```

**Adapters** (`src/integrations/<source>.ts`), all the same shape:

```ts
interface Adapter<K extends keyof SystemPayloads> {
  source: K; label: string; purpose: string; latencyMs: number; required: boolean;
  fetch(ctx: { personaId: string; asOf: ISODate }): Promise<Sourced<SystemPayloads[K]>>;   // throws SourceUnavailable
}
```

`PersonaStore` resolves a persona ID to payloads from `data/personas/*.json` **or** `data/cases/<id>/input.json`.

**Case → persona.** `splitFacts(input.facts): Partial<SystemPayloads>` uses a static ownership table (fact path → source, same table the assembler uses). Case ID is the persona ID with prefix `case:`; `plan` and anything owned by `user` become `presetAnswers`; display name is "Sprawa B4-07". Round-trip test over every fixture: `assemble(splitFacts(f)).facts` deep-equals `f`.

**Latency and outage.** No background jobs: `POST /integrations/fetch` stores `startedAt`; status is derived — a source is `ok` once `now − startedAt ≥ latencyMs` (300–1 800 ms, staggered). Sources in `unavailable` end as `unavailable`; `retry` succeeds on the second attempt. `SIM_LATENCY=0` in tests.

## 2. Facts assembler

```ts
// src/server/assemble.ts (pure, no I/O)
assemble(input: { payloads: Partial<SystemPayloads>; meta: Record<SourceId, {asOf; fetchedAt}>;
                  answers: Answers; overrides: Override[]; asOf: ISODate })
  : { facts: Facts; provenance: Provenance; missing: Question[] }

type FactPath = string;                              // 'facts.claimant.titles[0].from' (fixture convention)
type Provenance = Record<FactPath, { source: SourceId; asOf: ISODate; overridden?: { original: unknown; at: string } }>;
interface Override { path: FactPath; value: unknown; at: string; note?: string }
interface Answers {
  expectedDate?: ISODate; childrenCount?: number; zaZyciem?: boolean;
  eventKind?: 'birth'|'adoption'|'foster'; care?: Partial<CareEvent>;
  plannedEnd?: { titleId: string; date: ISODate; reason: TitleEndReason };
  otherParent?: { mode: 'consent'|'estimate'|'none'; insured?: OtherParent['insured']; estimatedBase?: Grosze };
  manual?: ManualFacts;                              // manual mode only
}
```

Order: payload slices → answers → overrides. Provenance is recorded at the coarsest path that shares a source; lookup is longest-prefix. Overridable paths are a whitelist with a zod schema each (dates, bases, work fraction, sickness-insurance period, due date). `missing` drives the questions on `/sytuacja`.

**Storage.** The cookie stays tiny: `{ sid, personaId, mode, since }`. Everything else goes to a new table `session_state(sid PK, consents, fetch_started_at, retries, answers, overrides, plan, updated_at)` (JSON as text). Rows older than 24 h are deleted on boot. `submissions` remains for sent forms. Add `sid` to `SessionData`.

## 3. REST API (`/api/v1`)

All bodies zod-validated; errors `{ error: { code, message, fields? } }`. Session endpoints read cookies (dynamic). Form-posting endpoints answer `303` with a relative `Location`.

| Method and path | Request | Response |
|---|---|---|
| `POST /auth/login/start` | `{ provider: 'mobywatel' }` | `{ challengeId, code: '482 913', expiresInSec: 120 }` (stateless, sealed) |
| `POST /auth/login/confirm` (form) | `challengeId`, `personaId` \| `caseId`, `mode` | sets cookie, creates `session_state`; `303 /zgoda` (persona), `303 /sprawy/<id>` (case), `303 /sytuacja` (manual) |
| `POST /auth/logout` (form) | — | `303 /` |
| `GET /personas` | — | `{ items: { id, label, oneLiner, journey }[] }` (cached, tag `personas`) |
| `GET /consent` · `PUT /consent` | `{ sources: SourceId[] }` | `{ sources: { source, label, purpose, required, granted }[] }` |
| `POST /integrations/fetch` | — | `202 { startedAt }` |
| `GET /integrations/status` | — | `{ done, sources: { source, label, state: 'pending'|'ok'|'unavailable'|'skipped', asOf? }[] }` |
| `POST /integrations/retry` | `{ source }` | same as status |
| `GET /integrations/{source}` | — | `Sourced<SystemPayloads[source]>` (the "pobranie danych z ZUS" requirement, visible in API docs) |
| `GET /situation` | — | `{ groups: Group[]; questions: Question[]; provenance; alertsPreview: Alert[] }` |
| `PUT /answers` | `Partial<Answers>` | `{ questions, changed: FactPath[] }` |
| `POST /overrides` · `DELETE /overrides?path=` | `{ path, value, note? }` | `{ provenance entry }` |
| `POST /pue/queries` | `{ path?, message }` | `201 { id, status: 'przyjęto' }` (stored in `submissions`) |
| `GET /debt-certificate?onDate=` | — | `{ onDate, account, amount, threshold, blocksPayment, expiresOn? }` |
| `POST /evaluate` | `{ plan?: Plan }` (session facts) **or** `{ facts, plan? }` (stateless) | `Result` |
| `GET /cases` | `?scenario=&outcome=&q=` | `{ total, items: { id, title, scenario, tags, outcome, tiers }[] }` (cached, tag `cases`) |
| `GET /cases/{id}` | — | `{ …item, documentsInFile, extractionNotes }` |
| `POST /cases/match` | `{ pdfSha256?, fileNameSha256? }` | `{ id }` or `404` |
| `GET /cases/{id}/compare` | — | `{ result: Result; fields: FieldResult[]; summary: { match, mismatch, reported, knownDivergence } }` |
| `GET /cases/report` | — | scoreboard from `data/cases/_report.json` |

`compare` calls the engine's pure `compare(result, expected)`; `expected.json` is read only here.

## 4. Screens (mobile-first)

Shared: anonymous users get a public nav (Start · Planuję dziecko · Trudna sytuacja · Wsparcie · Przykładowe sprawy); the app nav appears after login or manual start.

**`/logowanie`** — three steps in one route (`?krok=1|2|3`), SimBanner from the `(auth)` layout, neutral wordmarks.
1. "Wybierz sposób logowania": tiles **mObywatel** (active), "Profil zaufany", "Bankowość elektroniczna", "e-Dowód" — disabled, hint "w symulacji dostępny jest tylko mObywatel".
2. "Potwierdź logowanie w aplikacji mObywatel": 6-digit code, placeholder square labelled "Kod QR (symulacja)", countdown 2:00 (`aria-live="off"`, text updates every 10 s for screen readers), button **"Potwierdzam (symulacja)"**, link "Wróć". Expiry → "Kod wygasł" + "Wygeneruj nowy".
3. "Wybierz profil testowy": 8 radio tiles (label + one-liner), then "albo sprawa z zestawu ZUS →" linking to `/sprawy`. Submit = form POST to `confirm`.

**`/zgoda`** — "Skąd pobierzemy Twoje dane". One row per source: name, what we read, why. **Checkboxes start unchecked** (consent must be an affirmative act); "Zaznacz wszystkie" button; required sources (ZUS – konto) are labelled "potrzebne do wyliczeń"; without one we ask manually instead. Primary: **"POBIERZ DANE"**. Secondary: "Wpiszę dane samodzielnie". Skipped in case mode.

**`/pobieranie`** — "Pobieramy Twoje dane". List with state per source (text + icon: "pobieramy…", "pobrano", "niedostępne", "pominięto"); one `role="status"` summary ("Pobrano 6 z 9"). Unavailable source → caution notice "Rejestr … nie odpowiada. Możesz spróbować ponownie albo uzupełnić te dane ręcznie." with both actions. Auto-continue is **not** automatic: button "DALEJ" enables when done. Polling 500 ms, stops on unmount.

**`/sytuacja`** — "Twoja sytuacja". Top: "Zapytamy tylko o to, czego nie wie żaden rejestr" with a counter ("Zostały 2 pytania"). Cards of `DataRow`s with `SourceBadge` and "Popraw": **Ty · Ubezpieczenie · Zarobki i podstawa · Zwolnienia lekarskie (e-ZLA) · Składki · Ciąża i dziecko · Drugi rodzic**. Questions appear inline in the card they belong to, one at a time: due date; number of children; "Za życiem"; expected changes ("Czy przed porodem zmieni się Twoja umowa lub działalność?"); other parent ("Poproś o zgodę (symulacja)" / "Podam szacunkowo" / "Nie dotyczy"). Składki card shows the simulated debt certificate ("Stan na dzień porodu"). Correction dialog: current value + source, new value, optional note → badge "poprawione przez Ciebie — ZUS zweryfikuje", "Cofnij poprawkę", and "Zgłoś niezgodność do ZUS" (PUE/eZUS, simulated) with confirmation number. States: skeleton, source unavailable (manual fields), empty e-ZLA ("Brak zwolnień"). CTA "SPRAWDŹ UPRAWNIENIA".

**`/uprawnienia`** — verdict hero (a `Notice`, `h1` above): "Na dzień porodu masz prawo do zasiłku macierzyńskiego" / "Dziś nie masz prawa do zasiłku macierzyńskiego — możesz to zmienić do 12 marca" / "Zasiłek zostanie wstrzymany do spłaty zaległości". Then **"Co wymaga działania"**: alerts sorted by severity then deadline, each with date, one-sentence cause, fix button. Then benefit cards with `StatusBadge`, rate, max duration, "Kto wypłaci: pracodawca / ZUS", "Dlaczego?" (trace dialog: rule, values with source badges, citation): *W ciąży* — zasiłek chorobowy, świadczenie rehabilitacyjne, zasiłek w wysokości zasiłku macierzyńskiego. *Po porodzie* — macierzyński, uzupełniający, rodzicielski, ojcowski; conditional: zasiłek pogrzebowy; "Świadczenie rodzicielskie z gminy" link-out when uninsured. CTA "UŁÓŻ PLAN". Loss cases redirect to the quiet page instead of this layout.

**`/planuje-dziecko`** — same engine in prospective mode with a hypothetical due date (today + 9 months, adjustable); shows alerts only. Logged-out: four questions (form of work, sickness insurance, since when, arrears) → manual facts.

**`/sprawy`** — "Przykładowe sprawy ZUS". Scoreboard ("Zgodność wyniku z rozstrzygnięciem ZUS: N/86"), drop zone "Wgraj plik sprawy (PDF) — plik nie opuszcza Twojego komputera" (WebCrypto SHA-256 of bytes and of the normalised name → `match`; also a normal file input), filters (scenario, outcome, tier), search by ID, list of scenario titles + IDs. Unknown file → "Nie rozpoznaliśmy pliku. Wybierz sprawę z listy."

**`/sprawy/[id]`** — title, tags, "Zaloguj jako ta osoba" (form POST, mode `case`), insurance verdict on the decisive day, table **"Nasz wynik / Rozstrzygnięcie ZUS"** per field with labels "zgodne", "różnica", "nie podano w aktach", "wartość wywnioskowana", known-divergence explanation, alerts that would have fired beforehand ("Co aplikacja pokazałaby wcześniej"), trace, "Otwórz w planerze".

**Manual mode** — "Policz bez logowania" posts `mode=manual`; `/sytuacja` shows the same cards as an editable form (`Answers.manual`): role, form of work, start date, working time, average gross pay or declared base, sickness insurance, arrears yes/no, event. Every provenance entry is `user`; no consent or fetch screens.

## 5. Cache Components per route

| Route | Prerendered shell | Streams (Suspense + skeleton) | Cached |
|---|---|---|---|
| `/logowanie` | steps 1–2 chrome | step from `searchParams`; persona list | `personas` |
| `/zgoda`, `/pobieranie` | header, copy | consent state, status (client polling) | adapter metadata |
| `/sytuacja`, `/uprawnienia` | header, section headings | everything from session | — |
| `/planuje-dziecko` | copy, logged-out form | alerts when session exists | — |
| `/sprawy` | header, drop zone | filters from `searchParams` | `cases` (list, report) |
| `/sprawy/[id]` | `generateStaticParams`; case header | — | `cases`; compare result per id + tag `params` |

Session reads only through `getSession()`; login and logout are form POSTs with a full navigation so the private session cache cannot go stale.

## 6. Acceptance

- [ ] 8 personas and every committed case load through `PersonaStore` → adapters → `assemble`; round-trip test green for all fixtures.
- [ ] No screen asks for a fact a consented, available source provides.
- [ ] Declining or losing a source turns exactly its facts into questions.
- [ ] Override: value, badge and engine result change; undo restores; original kept in provenance.
- [ ] Cookie < 1 KB with 20 overrides.
- [ ] Every auth screen shows SYMULACJA; no official logos; site `noindex`.
- [ ] Dropping a known PDF opens its case in < 2 s; network log shows only the hash request.
- [ ] `/sprawy` lists no names; compare table shows tier labels.
- [ ] All endpoints in `/api/docs` (OpenAPI from zod).
- [ ] axe clean at 320, 375, 1280 on every new screen, including open dialogs.

**E2E:** login happy path (provider → confirm → persona → consent → fetch → situation), header shows the persona after login and "Zaloguj się" after logout; expired code; consent subset → manual questions; scripted outage + retry + manual fallback; answer due date → question counter drops; override + undo; PUE query confirmation; entitlements for employee (granted), self-employed with arrears (withheld + deadline), no insurance (alert + municipal link); planning check-up logged out; manual mode end to end; case by list, case by hash (injected), unknown hash; compare table; keyboard-only run of the login flow.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Engine not ready | Facade with canned results; switch is one import. |
| Ownership table drifts from engine types | Round-trip test; `satisfies` checks on slice types. |
| Session-state table grows | 24 h cleanup; one row per session. |
| Persona authoring time | Derive 8 personas from digest 03 P1–P12 and reuse fixtures where a case fits. |
