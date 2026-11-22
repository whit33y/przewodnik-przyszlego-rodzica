# 04 — Phase 3: "Plan rodzicielski" (`/plan`)

Goal: the one integrated calculator. A parent sees a valid plan immediately, changes it with form controls, and watches weeks, dates and złoty update — for both parents, every scenario in brief items b–f and j.

## 1. State model

```ts
// client, useReducer
interface PlannerState {
  plan: Plan;                       // engine type, source of truth for editing
  origin: 'saved' | 'case' | 'default';
  linked: Record<string, boolean>;  // block id → start follows the previous block of the same parent
  selected: string | null;          // block id
  result: Result;                   // last evaluation of `plan`
  alt: AltSummary | null;           // same plan under the other rate option
  status: 'idle' | 'calculating' | 'error';
  seq: number;                      // drops stale responses
}
interface AltSummary { rateOption: Plan['rateOption']; available: boolean; reason?: ReasonCode;
                       totals: Result['totals']; months: { month: YearMonth; gross: Grosze; net: Grosze }[] }
```

- **Initial plan (server):** `session_state.plan` → else `answers.plan` (case mode: the claim as filed) → else `evaluate(facts, null).defaultPlan`.
- **Persistence:** `PUT /api/v1/plan { plan }` validates (zod: ≤ 24 blocks, `days` 1–1 000, ISO dates), saves to `session_state.plan`, evaluates under both rate options and returns `{ result, alt, savedAt }`. One request per change — no separate save call, no save/evaluate race. `DELETE /api/v1/plan` resets to default (case mode: "Przywróć wniosek z akt"). `POST /evaluate` stays for stateless API use.
- **Manual mode:** identical; facts come from `answers.manual`. **No session:** `NeedsSession`.
- **Linked blocks.** By default each block starts the day after the previous block of the same parent (maternity → supplementary → parental). Changing a length reflows the chain client-side before the request. A block with "Własna data" is unlinked. This removes the most common error class in the case files (date arithmetic).

## 2. What-if bar ("Sytuacja do symulacji")

Brief items b and e need circumstances, not just leave blocks. A compact bar above the editor writes to `PUT /answers` (new field `whatIf`, applied by the assembler only while the registry does not yet know the fact):

| Control | Field |
|---|---|
| Zdarzenie: urodzenie / adopcja / rodzina zastępcza | `eventKind` (+ `care`) |
| Liczba dzieci (1–5) | `childrenCount` |
| Zaświadczenie „Za życiem" | `zaZyciem` |
| Wcześniak lub pobyt w szpitalu → tydzień ciąży, waga, dni w szpitalu | `whatIf.gestationalWeek`, `birthWeightG`, `hospitalDays` |
| Wiek dziecka (adopcja / piecza) | `care.childBirthDate`, `schoolDeferred` |

Registry-known facts render as read-only chips with their source badge. After a what-if change the server returns a fresh `defaultPlan`; the UI asks "Zastąpić plan nowym wymiarem?" only if the user has edited blocks, otherwise replaces silently.

## 3. Editor (form-first)

One card per parent ("Ty — mama", "Drugi rodzic — tata"; labels follow roles). Each block is a row:

| Field | Control | Notes |
|---|---|---|
| Rodzaj | `Select`: macierzyński, uzupełniający, rodzicielski, ojcowski (on adoption: "na warunkach macierzyńskiego") | options limited to what `entitlements` allow for that parent |
| Od | read-only date when linked + "Własna data" toggle → `DateInput` | |
| Długość | `Stepper` in weeks; "dni" field appears for paternity and remainders | min/max from `pools` |
| Do | computed, read-only ("do 1 listopada 2026 · 140 dni") | inclusive |
| Praca w trakcie | `Select`: nie / ¼ / ½ etatu — parental only | shows "wydłuża urlop o N tygodni" |
| Pula | radio: "wspólna" / "moje 9 tygodni" — parental only | default chosen automatically |
| Usuń | text button | mother's mandatory part cannot be removed |

- "Dodaj urlop" per parent opens a small menu of what is still available ("rodzicielski — zostało 12 tygodni", "ojcowski — 14 dni").
- **Rate option** (`ChoiceGroup`): "81,5% przez cały okres" / "100%, potem 70%". Hint with the deadline from `result.deadlines` ("wniosek do 6 lipca 2026 — 21 dni po porodzie"). If the deadline has passed (`alt.available === false`), the option is disabled with the reason.
- "Oświadczenie o jednym tytule" checkbox appears only when a top-up applies.
- Other parent without data: inline prompt "Podaj szacunkowe zarobki drugiego rodzica" (writes `answers.otherParent.estimatedBase`); amounts for that lane show "—" until then.

**Presets** (buttons above the editor; pure functions in `plan/presets.ts` built from `result.pools` and the event date):

| Preset | Result |
|---|---|
| Mama bierze wszystko | maternity + supplementary + parental minus 9 weeks; father: paternity |
| Dzielimy po równo | mother 14 weeks maternity, father the rest; parental pool split evenly, both using their 9 |
| Tata bierze 9 tygodni | as the first, plus father's 9 weeks after the mother's parental |
| Łączę z pracą na pół etatu | first preset with `workFraction ½` on the mother's parental blocks |

A preset replaces the plan after confirmation if blocks were edited; "Cofnij" restores the previous plan (one-level undo in the reducer).

## 4. Live recalculation

- Local reflow is immediate (optimistic); `PUT /plan` is debounced 300 ms with `AbortController` and `seq`.
- While calculating: summary and timeline keep the last values with `aria-busy`, a small "Przeliczamy…" label; no layout shift.
- **Violations** (`result.violations`, keyed by `blockId`) render under the offending row as a negative `Notice` with citation and, where possible, a one-click fix:

| Code | Fix button |
|---|---|
| `EXCESS_DAYS`, `POOL_EXCEEDED` | "Skróć do N dni" |
| `MOTHER_MINIMUM_WEEKS` | "Ustaw 14 tygodni" |
| `PARTS_LIMIT` | "Połącz z poprzednią częścią" |
| `RESERVED_WEEKS` | "Przenieś 9 tygodni do drugiego rodzica" |
| `NOT_CONTIGUOUS` | "Zacznij dzień po poprzednim urlopie" |
| `DEADLINE_PASSED` (paternity) | "Przesuń przed [date]" |
| `WORK_FRACTION_TOO_HIGH` | "Ustaw ½ etatu" |

  Violations without a block go to a summary list at the top; each entry links to its row. Plan-relevant alerts (`RATE_DEADLINE_21_DAYS`, `PARTS_LIMIT_NEAR`, `DAY_COUNT_MISMATCH`, `TOP_UP_STATEMENT_NEEDED`, `REREGISTER_AFTER_MATERNITY`) appear in the summary panel.
- Error from the API: keep the last result, show "Nie udało się przeliczyć — spróbuj ponownie" with a retry button.

## 5. Timeline (read-only)

HTML + CSS, not canvas: two lanes (`<ol>` per parent), blocks are `<button>`s positioned by percentage on a month axis (ticks per month, labels per quarter when narrow). Markers: birth / taking into care, today (simulated), 21-day deadline, child's first birthday (paternity expiry).

- **Colour-independent:** every block has a text label (type + weeks), a border, and a pattern — maternity solid, supplementary dots, parental diagonal lines, paternity vertical lines, reserved-9-weeks outline with cross-hatch for the unused part, part-time lighter fill with "½". Violating blocks: dashed negative outline + icon. Patterns are CSS backgrounds from tokens; under `forced-colors` labels and borders remain.
- Clicking or pressing Enter on a block selects it, scrolls its row into view and moves focus to the row heading. The selected block has `aria-current="true"`.
- The lane container has an accessible summary ("Oś czasu urlopów: mama 52 tygodnie od 15 czerwca 2026…"); the **periods table** (§6) is the full text alternative and is always rendered.
- **Mobile (< 720 px):** no horizontal axis. A vertical list per parent; each item shows label, dates and a mini-bar locating the block within the whole plan span.

## 6. Summary panel

Sticky on desktop (right column), below the editor on mobile.

1. **Totals:** "Razem: N tygodni · X zł brutto" (+ net estimate), per parent.
2. **Pools:** macierzyński used/total with the mandatory 14; uzupełniający; rodzicielski used/total with each parent's reserved 9 shown separately ("9 tygodni taty: wykorzystane 0 z 9 — przepadną, jeśli ich nie weźmie"); ojcowski with expiry date; **"Części urlopu rodzicielskiego: n z 5 (wspólnie)"**.
3. **Comparison card:** two columns — 81,5% vs 100%/70% — total gross, first-month and typical parental-month amounts, difference, one sentence on when each is better (returning to work early vs. steady income). Button "Wybierz" on the other option.
4. **Periods table:** urlop, kto, od, do, dni, stawka, dziennie, brutto, kto wypłaca.
5. **Cash-flow table:** rows = months; columns per parent: brutto, zaliczka PIT, netto, wyrównanie do 1 000 zł; household total. Built client-side from `periods[].months`. A simple bar per row (CSS width) is the only chart. "Dlaczego tyle?" opens the trace for base and rate.

## 7. Variants

- **Adoption / foster:** anchor is the day the child is taken into care; no pre-event part; block type "urlop na warunkach macierzyńskiego"; age-limit end date shown as a marker; professional foster family → planner replaced by the "nie przysługuje" explanation.
- **Father as claimant:** his lane first; mother's blocks editable only as "plan drugiego rodzica".
- **Loss:** no planner. A calm notice with what applies (from `result`), link to `/trudna-sytuacja` and `/kroki`. No presets, no comparison, no counters.
- **Case mode:** opens with the claim as filed; banner "Plan z akt sprawy"; edits are a simulation; reset available.
- **Not entitled:** planner hidden; blocking alerts with fixes shown instead ("Najpierw trzeba to naprawić").

## 8. Brief items in ≤ 3 interactions

| Item | Path |
|---|---|
| b — both parents, children count, "Za życiem" | open `/plan` (default plan shows both lanes) → change "Liczba dzieci" → toggle "Za życiem" |
| c — combining with work | open `/plan` → preset "Łączę z pracą na pół etatu" |
| d — both parents share | open `/plan` → preset "Dzielimy po równo" |
| e / j — adoption, foster | open `/plan` → "Zdarzenie: adopcja" → set child's age (or log in as the adoption persona: 1 step) |
| f — individual base from a sample case | `/sprawy/[id]` → "Otwórz w planerze" → "Dlaczego tyle?" |

## 9. Engine API needs

| Need | Request to the engine |
|---|---|
| Cash-flow per parent per month | **Already there** (`periods[].parent`, `periods[].months`). No change. |
| One-click fixes | Guarantee `Violation.values` per code: `allowedDays`, `requiredFrom`, `latestEnd`, `maxFraction`. |
| Drawing the part-time extension | `Period.extensionDays?: number`. |
| Pool display | `pools.maternityDays.usedByOther`, `pools.supplementaryDays.used`. |
| Other parent without data | Periods for `parent: 'other'` returned with `daily: 0` and `bases[].dataMissing` — never an error. |
| Rate comparison | None: the server evaluates twice. Engine must report an unavailable 81.5 option as a violation/alert, not silently fall back. |
| Stability | `defaultPlan` block ids deterministic (`maternity-claimant-1`…) so selection survives recalculation. |

## 10. A11y and print

- Everything editable by keyboard with native controls; no drag-and-drop anywhere.
- One polite live region, updated after each recalculation (debounced 1 s): "Przeliczono. Razem 52 tygodnie, 55 462,68 zł brutto. Do poprawy: 1."
- Row errors are linked with `aria-describedby`; fix buttons name the block ("Skróć urlop rodzicielski mamy do 224 dni").
- Focus never moves on recalculation; after a fix it stays on the row.
- Tables have captions and scoped headers; they scroll horizontally inside their own container at 320 px.
- **Print (`@media print`):** title, date, facts summary, periods table, pools, cash-flow table, deadlines, disclaimer; timeline printed with `print-color-adjust: exact`; controls, presets and nav hidden. "Drukuj plan" button.

## 11. Cache Components

`page.tsx` is static: header, section headings, skeleton. `<Suspense>` wraps `PlanContent` (server): `loadContext()`, initial double evaluation, renders the client `Planner` with initial state. `searchParams` (`?z=sprawa`) are read inside that boundary. Nothing session-dependent is cached; parameter sets come through the tagged loader.

## 12. Acceptance

- [ ] Fresh login → `/plan` shows a valid default plan with zero violations.
- [ ] Every row field editable by keyboard; totals update within 1 s; no focus loss.
- [ ] Each violation code in §4 is reproducible and its fix button resolves it.
- [ ] Parts counter counts both parents; the sixth part is flagged before saving.
- [ ] Comparison card numbers equal a manual evaluation under the other option.
- [ ] Reload restores the saved plan; reset restores default / claim.
- [ ] Brief paths in §8 work as written.
- [ ] Loss and not-entitled states show no planner.
- [ ] axe clean at 320 / 375 / 1280; timeline usable under forced colours; print preview is two pages or fewer for a standard plan.

**E2E:** default plan for the employee persona (dates and totals match digest persona P1); change length → dates reflow; preset each (4); part-time shows extension and halved benefit; rate toggle + comparison; father's 9 weeks at 70%; twins + "Za życiem" what-if; adoption variant; sixth part violation + fix; 225-day violation + fix; reload persistence; case → planner; loss persona; keyboard-only edit; print snapshot.

## 13. Risks

| Risk | Mitigation |
|---|---|
| Linked-chain reflow disagrees with engine normalisation | Reflow is cosmetic; engine dates in `result.periods` are authoritative and overwrite on response. |
| Two evaluations per keystroke | Debounce + abort; engine is pure and fast; measure, cache `alt` only if needed. |
| What-if bar duplicates `/sytuacja` questions | Same `answers` fields, same components; only `whatIf.*` is new. |
| Timeline polish eats the phase | Ship rows + summary + tables first; timeline is the last slice. |
