# 06 — Phase 5: admin panel

Goal: a ZUS administrator changes a legal parameter, sees what it would do to 86 real cases, and publishes it with an effective date — without a deploy.

## 1. Access

- `/admin/logowanie`: one password field. `POST /api/v1/admin/login` compares with `ADMIN_PASSWORD` (constant-time), sets a **separate** iron-session cookie `pr_admin` (`path=/`, `httpOnly`, `sameSite=strict`, 2 h). No password set → admin disabled with an explanatory page.
- `requireAdmin()` guards every `/api/v1/admin/*` handler and the streamed content of every `/admin/*` page. Five failed attempts per 10 minutes per IP → 429.
- All admin pages `noindex`, never prerender data.

## 2. Screens

| Route | Content |
|---|---|
| `/admin` | Versions table: obowiązuje od, nazwa, status (opublikowany / szkic / zarchiwizowany), autor, data. Marker on the set in force today. Actions: "Nowy szkic z obowiązującego", open, archive. Below: last 20 audit entries. |
| `/admin/parametry/[id]` | The form (§3). Published sets are read-only with "Utwórz szkic na podstawie". |
| `/admin/parametry/[id]/porownanie` | Diff against the published set the draft would replace or follow (§4) and the regression run (§5). |
| `/admin/tresci` | Charities and links (§7). |
| `/admin/dziennik` | Full audit log with filters. |

## 3. Parameter form

- Single source: `src/server/params-schema.ts` — a zod schema of `ParameterSet` with bounds (rates 0–10000 bps, weeks 0–200, money ≥ 0, dates ISO) and `.meta({ label, unit, group, help, citation })` per field. The form is generated from it; the same schema validates the API and the seed files in `verify`.
- Units are edited as people think of them: złote (stored as grosze), percent (stored as bps), weeks, days, fractions as "1/2".
- Groups (accordion, all keyboard-operable):

| Group | Fields |
|---|---|
| Wynagrodzenia i podstawa | minimalne wynagrodzenie, prognozowane przeciętne, potrącenie składek, minimalna podstawa, podstawa preferencyjna, limit 250% |
| Stawki zasiłków | macierzyński, rodzicielski, wariant uśredniony, 9 tygodni drugiego rodzica, ojcowski, uzupełniający, chorobowy w ciąży, opiekuńczy |
| Wymiar urlopów | macierzyński wg liczby dzieci, przed porodem, część obowiązkowa matki, rodzicielski (zwykły / „Za życiem"), część nieprzenoszalna, liczba części, łączenie z pracą |
| Urlop ojcowski | dni, części, termin |
| Urlop uzupełniający | data wejścia w życie, progi tygodni i masy, limity |
| Strata dziecka | 8 tygodni, 7 dni, zasiłek pogrzebowy |
| Przysposobienie i piecza | granice wieku, minimum 9 tygodni, wymiary obniżone |
| Chorobowe | okresy wyczekiwania, 33/14 dni, 270 dni |
| Zaległości i płatnik | próg 1%, 6 miesięcy, próg 20 ubezpieczonych |
| Podatek i minimum | zaliczka PIT, 1 000 zł |
| Ryzyko weryfikacji | progi sygnałów |
| Interpretacje | each flag as a radio pair with a two-sentence explanation of both readings and the case that supports the default |

- Each field shows the published value beside the input when different, and its legal citation. Header fields: nazwa, **obowiązuje od**, źródło (Dz.U.).
- "Zapisz szkic" (`PUT /api/v1/admin/params/{id}`) validates server-side; errors map to fields.

## 4. Diff

Flat list of changed paths: label, published → draft, unit. Empty diff disables publishing. Also shown: the date window the draft will govern (from its `validFrom` to the next set).

## 5. Regression — "Sprawdź na 86 sprawach"

`POST /api/v1/admin/params/{id}/regression`:

1. Build the candidate list = published sets with the draft inserted (replacing a published set that has the same `validFrom`).
2. For every fixture run `evaluate` twice — current list and candidate list — and `compare` against `expected.json`.
3. Return per case: outcome change, total-gross delta, days delta, golden status before → after.

Screen: headline "Zmiana wpływa na N z 86 spraw" · "zgodność z rozstrzygnięciami ZUS: 86 → M"; table of affected cases (ID, scenario, what changed), each linking to `/sprawy/[id]`. Cases whose `parameterDate` falls outside the draft's window are listed as unaffected by design. The run is synchronous (pure engine, well under a second) and its summary is stored with the draft.

A second, forward-looking block: the nine demo personas evaluated under the draft, showing monthly benefit before → after — the answer to "what happens to a parent applying next year".

## 6. Publish, archive, reset

- **Publish** (`POST …/publish`): confirmation dialog repeating `validFrom`, the diff count and the regression headline; requires typing the effective date. Sets status, `publishedAt`, writes the audit entry with the full diff, calls `revalidateTag('params')`. A published set is immutable; corrections are a new draft.
- **Archive:** removes a set from selection (not allowed for the only set covering today).
- **Reset to statutory defaults:** archives all DB sets and re-seeds from `data/params/*.json`; typed confirmation; audited.
- **Export:** download a set as JSON (the same shape as the seed files) — makes a change reviewable in a pull request.

**How the engine sees it.** `getPublishedParams()` already reads published DB rows (falling back to the JSON files) under tag `params`; publishing invalidates the tag, the next request loads the new list, and `selectParameterSet` picks by date. Nothing parameter-dependent is prerendered. `version` must include a content hash so `/api/health` and the result footer show the change.

## 7. Content editing — below the cut line

Charities and links stay in `data/content/*.json` as the source of truth. If time allows: `/admin/tresci` lists `content_items` (seeded from the files) with add / edit / hide and `revalidateTag('content')`. Reason for the low priority: the brief's admin requirement is about legal parameters; content changes are rare and safer through review. Parameter admin with regression is the differentiator.

## 8. API

`POST /admin/login` · `POST /admin/logout` · `GET /admin/params` · `POST /admin/params` (draft from id) · `GET|PUT /admin/params/{id}` · `GET /admin/params/{id}/diff` · `POST /admin/params/{id}/regression` · `POST /admin/params/{id}/publish` · `POST /admin/params/{id}/archive` · `POST /admin/params/reset` · `GET /admin/audit`.

## 9. Security notes

- Mutations are JSON `fetch` from the admin pages; `sameSite=strict` plus an `Origin` check on every admin handler.
- Parameter payloads are data only — never evaluated; schema bounds stop nonsensical values (negative weeks, 0% deduction).
- Audit log is append-only: actor ("admin"), action, entity, diff, timestamp.
- Regression and publish are the only CPU-heavy calls; rate-limit them per session.
- The admin cookie never unlocks citizen data; admin pages read no `session_state`.
- Jury credentials go in the submission, not in the repo or the UI.

## 10. Acceptance and e2e

- [ ] Wrong password rejected; five failures throttle; pages unreachable without the cookie.
- [ ] Draft from published → change parental rate 70% → 75% → diff shows one line → regression lists affected cases → publish with a future `validFrom` → a persona with a later due date shows the new amount, an earlier one does not.
- [ ] Minimum wage change moves the base floor and the arrears threshold together.
- [ ] Invalid values are rejected with field errors; published sets cannot be edited.
- [ ] Reset restores golden 299/299.
- [ ] Every action appears in the audit log.
- [ ] Forms fully keyboard-operable; axe clean.

**E2E:** login / logout / throttle; create draft; edit + validation errors; diff; regression table; publish and observe `/plan` change; archive; reset; export JSON equals the stored payload; audit entries.
