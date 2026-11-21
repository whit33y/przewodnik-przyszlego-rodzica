# Review — Phase 3 planner (commit 8275442)

Scope: `src/app/(app)/plan/*`, `src/server/plan-service.ts`, `src/app/api/v1/plan/route.ts`. **Static review only** — nothing was run; items marked *(verify)* depend on engine behaviour or rendering I did not check.

Overall: the planner matches the plan's shape — one `PUT` that saves and evaluates both options, reducer with stale-response guard, engine-driven violations with fixes, read-only timeline with patterns, forced-colors and print rules. The main defects are in how the linked chain interacts with presets and with the second parent, and a few places where statutory numbers are typed into the UI.

## Verdict on the deviations

| Deviation | Verdict |
|---|---|
| What-if bar not built | **Build a reduced version as the first slice of Phase 4** (see `05-phase-4-guidance.md` §1). Brief item (b) asks for a calculator that takes "liczba dzieci, ich wiek, zaświadczenie Za życiem" as options; today a logged-in persona cannot change any of them on `/plan`. Four controls are enough. |
| Linked by default + "Własna data rozpoczęcia" | **Accept.** |
| Pregnancy blocks read-only in "W ciąży", outside chain and presets | **Accept.** Correct: the parent does not plan sick leave. See N3 for the totals label. |
| Part-time preset doubles calendar days | **Accept** given the engine contract. Add a unit test pinning it (S9). |
| Only the totals card is sticky | **Accept.** Better than a sticky column on short screens. |

## Should fix

**S1. Presets and the linked chain disagree, so the plan changes on the first unrelated edit.**
`buildPreset` positions blocks with one global `cursor` across both parents (`plan-utils.ts:76-82`); `replace` stores them as is (`Planner.tsx:59`), but every later `edit` runs `reflow`, which chains per parent only (`plan-utils.ts:34-36`). In "Dzielimy po równo" the mother's supplementary and parental blocks jump back to follow her own maternity block as soon as the user touches anything, and the father's takeover block stops following the mother's.
Fix: define the chain once — a block is linked to its *predecessor in the family sequence* (store `follows: blockId` in the client `linked` map; presets and `defaultPlan` set it) — and run the same `reflow` in `replace`, `reset` and `undo`.

**S2. Takeover and father's blocks are not linked to the mother's.**
Same root: `reflow` never crosses parents, so shortening the mother's maternity leaves a gap or overlap before the father's `takeover` block and the user must use the `NOT_CONTIGUOUS` fix each time. Covered by the `follows` model in S1.

**S3. A saved plan is not rebased when the facts change.**
`initialPlan` returns `state.plan` unconditionally (`plan-service.ts:69`). If the due date, number of children or other-parent answer changes afterwards, the saved blocks keep their old dates and lengths and the planner opens full of violations.
Fix: store `{ plan, anchor, poolsSignature }` with the plan; on load, if the anchor moved, shift all linked blocks by the difference; if pools changed, show "Twoja sytuacja się zmieniła" with "Przelicz plan" (new default) / "Zostaw mój plan".

**S4. Statutory numbers are hard-coded in planner copy.**
`Planner.tsx:466-467` ("Wspólna (32 tygodnie)", "Moje 9 tygodni"), `Summary.tsx:75` ("9 tygodni drugiego rodzica"), `Summary.tsx:123` ("minęło 21 dni"), `plan-utils.ts:86` (`|| 98`), `:102` (`days: 14`), `Planner.tsx:373` ("Ustaw 14 tygodni"). Wrong for twins (34), "Za życiem" (56/58), and after an admin parameter change — the exact scenario the admin panel demonstrates.
Fix: derive every figure from `result.pools` (`reservedPerParent`, `total − reserved`, `motherMandatory`, `paternityDays.total`) and from `result.deadlines`.

**S5. First toggle of "Własna data rozpoczęcia" is not saved.**
The `link` action reflows the plan but does not set `dirty` (`Planner.tsx:60-63`); the save effect returns early (`:120`). Until another edit happens the timeline and totals show the old evaluation.
Fix: set `dirty: true` in `link`.

**S6. Row errors are not exposed to assistive technology.**
`aria-describedby` sits on the `<li>` (`Planner.tsx:390`), where it has no effect; the violation notices have no role; the live message only says "Do poprawy: n".
Fix: pass the error id to the row's controls (`Stepper`, `Select`, `DateInput` already accept or can accept `aria-describedby`), include the first violation's text in the announcement, and name the block in each fix button ("Skróć urlop rodzicielski mamy do 224 dni").

**S7. No mobile presentation of the timeline.** *(verify at 375 px)*
`.tlInner { min-width: 640px }` inside a horizontal scroller (`Plan.module.css:52-53`); short blocks (paternity ≈ 2% wide) clip their label and rely on `title`. The plan called for a vertical list with mini-bars below 720 px.
Fix: under 720 px render the same `spans` as a list (label, dates, mini-bar positioned with the existing `pos`/`width`); in the desktop track, move labels of blocks narrower than ~80 px above the block.

**S8. Comparison card and cash-flow table are thinner than specified.**
The card shows total gross only (`Summary.tsx:99-112`); the decision most parents face is monthly income ("how much in month 1, how much during parental leave"). The cash-flow table has one "Na rękę" column (`:181-196`) instead of gross / PIT / net / top-up per parent.
Fix: add two rows to the card (first full month, typical parental month — both already in `alt.months` and `cashFlow`); add per-parent columns when two lanes exist, behind the existing horizontal-scroll region.

**S9. Planner logic has no unit tests.**
`plan-utils.ts` is pure and carries the riskiest client logic. Add tests: `reflow` (linked, unlinked, cross-parent after S1), each preset for single / twins / adoption / no second parent, part-time doubling, `cashFlow` sums equal `result.totals`, `fixFor` per violation code.

**S10. Top-up arithmetic.** *(verify against the engine)*
`plan-service.ts:42-43` adds `topUp` to both gross and net; `Summary.tsx:34,190` adds `topUp` to `net` again. If the engine's `months[].net` already includes the top-up, the cash-flow rows double-count it; if it does not, `totals.netEstimate` in the header may exclude it. Pin the contract in a comment on `Period.months` and add a test with a low-base persona (the row sum must equal `totals`).

**S11. Fixes missing for two violation codes the plan listed.**
`fixFor` (`Planner.tsx:365-383`) has no case for `PARTS_LIMIT` ("Połącz z poprzednią częścią") or `RESERVED_WEEKS` ("Przenieś do drugiego rodzica"); block-less violations (`:261-267`) never get a fix or a link to a row. These are the two rules parents understand least.

**S12. Last edit can be lost on navigation.**
Saving is debounced 300 ms and the timer is cleared on unmount (`Planner.tsx:136`). Clicking a nav link right after a change drops it.
Fix: flush on unmount / `pagehide` with `fetch(..., { keepalive: true })`; show "Zapisano" next to "Przeliczamy…".

## Nits

- **N1.** `Summary.tsx:103` — `.sort((a) => …)` uses a one-argument comparator; order is implementation-defined. Compare both arguments.
- **N2.** `plan-service.ts:58` — any block-less `DEADLINE_PASSED` marks 81.5% unavailable. Match on the rate-option violation specifically (code or `values.kind`).
- **N3.** Header total and "Okresy i kwoty" include pregnancy sickness periods; label it ("razem z zasiłkiem chorobowym w ciąży") or show leave-only and pregnancy subtotals.
- **N4.** `Planner.tsx:415,417` — stepper bounds are constants (`1…14` days, `1…130` weeks). Use pool remainders; paternity parts are 7 or 14 days.
- **N5.** `Planner.tsx:398` — "Usuń" is offered on the mother's mandatory maternity block; hide it there (the engine will refuse anyway).
- **N6.** `Planner.tsx:283` — plain `<a href="/sytuacja">` causes a full reload; the planned inline "podaj szacunkowe zarobki" field would keep the user in the planner.
- **N7.** `Timeline.tsx:36-39` — add markers for the 21-day rate deadline and the paternity expiry date (both in `result`).
- **N8.** `route.ts:22-24` — the plan is saved before evaluation; if the engine fails the stored plan is one the user never saw evaluated. Save after a successful evaluation, or keep the previous plan on failure.
