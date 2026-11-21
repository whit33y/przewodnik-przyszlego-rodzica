# Review — Phase 2 (commit 5a2d053 + working tree)

Scope: code read against `03-phase-2-data-layer.md` and general UX/a11y/security practice. **Static review only** — nothing was run. I did not read `src/content/pl.ts` or `tests/e2e/entitlements.spec.ts` in full.

Overall: the pipeline is in place and clean — slices, `splitFacts`, the pure assembler, derived fetch status, form-POST login, the `session_state` table and the compare screen all follow the plan. Two things break promises the product makes to the user and the jury; the rest is validation, honesty of a few screens, and tests.

## Verdict on the deviations

| Deviation | Verdict |
|---|---|
| Real registry badges in case mode + notice | **Accept.** It shows the pipeline; the notice makes the origin clear. |
| `CaseExtras` in `Answers` | **Accept.** Note it carries the whole `event` and `otherParent`, so the round-trip is trivially exact for cases and the `rsc` / `ezdrowie` slices are decorative there. Personas are the real test of the assembler (S10). |
| No OpenAPI until Phase 6 | **Accept**, but keep it above the cut line — "REST API" is a stated jury preference. |
| Client-side filters on `/sprawy` | **Accept.** Better than `searchParams` here. |

## Blockers

**B1. Missing registry data is treated as "nothing there".**
When a source is declined, skipped or unavailable, its slice is simply absent and the assembler fills in empty arrays (`assemble.ts:76,120-123`). The UI then states the absence as fact:
- `SituationContent.tsx:85` — "Nie znaleźliśmy żadnego tytułu do ubezpieczenia" when *ZUS – konto* was not consented;
- `SituationContent.tsx:277-283` — green "Brak zaległości" when *ZUS – saldo* was never read;
- `SituationContent.tsx:144` — "Brak zwolnień w ostatnich 12 miesiącach" without e-ZLA;
- `EntitlementsContent.tsx:39` — "nic nie blokuje wypłaty", or a "not insured" verdict, computed from the gaps.

"Wpiszę dane samodzielnie" (`consent/route.ts:22-25`) makes it worse: mode stays `mobywatel`, so `questions()` (`assemble.ts:210`) never asks for manual facts and the user lands on an empty situation. `required` in `sources.ts` is display-only.
Fix: (1) the manual button and "required source missing" switch `state.mode` to `manual` (or add a `manual` question whenever `zus-konto` is not `ok`); (2) `assemble` returns `unverified: SystemId[]`; (3) each card renders "Nie pobraliśmy tych danych" + a question or "nie sprawdzono" instead of a negative/positive statement; (4) `/uprawnienia` shows a caution notice listing unverified sources and never says "nic nie blokuje" while `zus-saldo` is unverified for a self-employed title.

**B2. PDF upload can never match.**
All 47 fixtures have empty `source.pdfSha256` and `source.fileNameSha256`, and `scripts/hash-cases.mjs` does not exist (`CaseBrowser.tsx:42` refers to it). `matchCase` (`cases-repo.ts:63`) therefore always returns null — the jury's "upload" path ends in "Nie rozpoznaliśmy pliku" for every file.
Fix: write the local-only script (reads `docs/Sprawy `, private ID↔file map from `.work/`, writes both hash arrays, same normalisation as `normaliseName`), run it, and add a guard test that fails when a fixture has no hash. Add an e2e test that injects a known hash.

## Should fix

**S1. Overrides are not validated per path.** `overrides/route.ts:6,16` only compares `typeof` with the current value; a date path accepts `"banana"`, `sickness.mode` accepts any string, and an unset path (`to`, `repaidOn`) accepts any type. The value goes straight into engine `Facts`. Fix: a `path-regex → zod schema` table next to `OVERRIDABLE` (ISO date with range, enum, non-negative integer grosze, boolean); reject otherwise. Validate `path` on `DELETE` too.

**S2. Stateless `/evaluate` runs the engine on unvalidated JSON.** `evaluate/route.ts:6,16,23` accepts any record as `Facts`, returns the raw exception message, and answers 503 for bad input. It is unauthenticated. Fix: parse with the facts/plan schemas from `integrations/case-schema.ts`, cap sizes (titles, months, blocks), return 422 on invalid input, a generic message on engine errors (log the detail).

**S3. Open redirect in `next`.** `auth/login/confirm/route.ts:28` allows `/\evil.example` (browsers treat `\` as `/`). Fix: allow only `^/[A-Za-z0-9\-_/\[\]]*$` or an explicit route list.

**S4. Loss handling on `/uprawnienia`.** `EntitlementsContent.tsx:138` hard-codes "Przysługuje Ci 8 tygodni… 100%" regardless of the engine result (an uninsured mother would be told she is entitled). The page then still renders "Co wymaga działania" with "Pilne" alerts and cards such as parental leave with a red "Nie przysługuje". Fix: derive the sentence from the maternity entitlement; in loss mode show only maternity (8 weeks), funeral grant and loss-relevant alerts; no red "refused" cards for leaves that do not apply; or redirect to the quiet page as planned.

**S5. Verdict ignores the claimant's role.** `EntitlementsContent.tsx:31-37` always headlines "masz prawo do zasiłku macierzyńskiego" — wrong framing for a father persona, whose own rights are paternity leave and his 9 weeks. Fix: role-specific headline and lead entitlement.

**S6. "Dlaczego?" is not readable by a parent.** `Trace.tsx:36-51` prints rule IDs, camelCase input keys, raw grosze and truncated JSON. Each card passes the *whole* `result.trace` filtered only by stage (`EntitlementsContent.tsx:102`), so every dialog shows steps for all benefits, and the full trace is serialised once per card. The provenance join — the reason trace steps carry `factPaths` — is not used. Fix: render a Polish sentence per step (message key + formatted values), show a `SourceBadge` per fact path, filter by benefit, keep rule ID / parameter keys under a "Szczegóły techniczne" `<details>`; load the trace once.

**S7. Provenance marks that never match.** `assemble.ts:158` writes `facts.event.children.zaZyciem`, which no lookup reaches (`children[0].zaZyciem` falls back to `children` → "rejestr stanu cywilnego" for a user statement). Fields merged from e-zdrowie (`:145`) are badged as RSC when both exist and unbadged when only e-zdrowie exists. `SituationContent.tsx:79` badges the role with the mObywatel source. Fix: mark per child field; add a unit test that every displayed path resolves to the expected source.

**S8. "Co aplikacja pokazałaby wcześniej" can show alerts the engine did not raise.** `CompareContent.tsx:69,132` filters the adjudication result and, when nothing fired, prints the *expected* alert titles anyway. Fix: run the pre-event replay (as in the planned alert-recall test) and show only what fires; otherwise say "Silnik nie wygenerował ostrzeżenia" — on a jury screen this must be true.

**S9. Tier flags are wrong.** `cases-repo.ts:47` — `printed("days")` is true if a `days` field exists and *any* field anywhere is printed. Cases get "okresy w aktach" / "kwoty w aktach" chips they do not deserve. Fix: walk `benefits[]` and check each field's own `evidence`, or have `fixtures:validate` write `tiers`.

**S10. The tests the plan relies on are missing.** `split.ts:4` cites `tests/unit/split-assemble.test.ts`; `tests/unit` holds two files. Add: round-trip over every fixture; assembler tests on personas *without* extras (consent subsets, outage, overrides, question list); provenance lookup. E2E gaps: manual mode, partial consent, retry of the unavailable source, case login, `/sprawy` list + match + compare, keyboard-only login.

**S11. Domain rules duplicated outside the engine.** `debt-certificate/route.ts:11-17` re-implements the arrears threshold with casts and ignores `onDate` (always the latest snapshot); `SituationContent.tsx:274-289` has a third variant that warns on any unpaid amount; `0.8629` is hard-coded in `assemble.ts:237` and `client.tsx:178`. Fix: read arrears status from `Result` (alert / gating), take the deduction from the parameter set, or pass gross and let the engine deduct.

**S12. Retention claim is not implemented.** `ConsentForm.tsx:56` promises deletion within 24 hours after logout. Logout (`auth/logout/route.ts`) leaves the row; cleanup runs once per process (`session-state.ts:21-28`). Fix: delete the `session_state` row on logout; run the cleanup at most hourly instead of once.

**S13. `/planuje-dziecko` is still a stub.** It was in Phase 2 scope and is the centrepiece of the "Pomysł" criterion. Schedule it explicitly (it needs only prospective `evaluate` + `AlertList`).

**S14. Focus and announcements after saving.** After a question is answered, `router.refresh()` removes the question and focus falls to `<body>`; errors are plain red paragraphs (`client.tsx:119,167,267,391`). Fix: move focus to the progress line (`tabIndex={-1}`) or the next question; render errors with `role="alert"` and the "Błąd:" prefix.

**S15. Login step 2.** The expiry message sits in `aria-live="off"` (`LoginFlow.tsx:103`) so a screen-reader user never learns the code expired; the heading is focused on first mount (`:36`), stealing initial focus; disabled providers are unfocusable, so their hint is unreachable by keyboard. Fix: announce expiry once via `role="status"`; skip the focus effect on mount; use `aria-disabled` + hint.

**S16. `GET /api/v1/cases/{id}` returns full `facts` and `plan`.** That publishes the complete structured content of every case to anonymous clients. The UI does not need it (pages are server-rendered). Given the "do not distribute" restriction, return the summary only and keep facts behind the compare view.

**S17. Answers schema is loose.** `answers/route.ts:17` accepts any `reason` string and any `titleId`. Fix: `z.enum` of `TitleEndReason`, check the title exists, bound `expectedDate` to a sane window around `asOf`.

## Nits

- **N1.** `engine-facade.ts:11,14` and `case-compare.ts:16,24` still use `as unknown as` and optional-function checks; the engine now exports `evaluate`, `compare`, `FieldResult` — import them directly.
- **N2.** `EntitlementsContent.tsx:124` shows the technical `error` string to the user.
- **N3.** `personas/route.ts` re-reads files instead of using cached `getPersonaList()`; `matchCase` parses every `input.json` per request — build a hash→id map under the `cases` tag.
- **N4.** `LoginFlow` ignores `?krok` / `?blad=profil` set by `confirm/route.ts:16`; `challengeId` is returned and never checked (fine for a simulation — say so in a comment or drop it).
- **N5.** `debt-certificate/route.ts:18` exposes the first 8 characters of the session id; use a random number.
- **N6.** `SituationContent.tsx:216` — `aria-disabled` on a link that still navigates; either block it (as in `FetchStatus.tsx:67`) or let the target page explain.
- **N7.** `CompareContent.tsx:24` prints "nie podano w aktach" in *our* column when the engine has no value; use "—" there.
- **N8.** Inline styles in `UserSlot.tsx`, `AlertList.tsx:30`, `bez-logowania/page.tsx`.
- **N9.** Persona "today" is `persona.asOf`. Show it once on `/sytuacja` and `/uprawnienia` ("Dziś w symulacji: …") so deadlines relative to a fixed date do not look wrong next to the real calendar.
- **N10.** `FetchStatus.tsx:21` — polling without an in-flight guard; skip a tick while a request is pending.
- **N11.** `alertValues` (`AlertList.tsx:16`) and `show` (`CompareContent.tsx:26`) infer formatting from key names; have the engine tag value types or keep a per-code formatter map in `content/pl.ts`.
