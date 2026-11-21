# 05 — Phase 4: guidance, forms, quiet path, support

Goal: turn the engine's `documents`, `deadlines`, `routing` and `alerts` into things a parent can act on — a dated checklist, pre-filled applications, and calm information for difficult situations. Brief items a, g, h, i and every "simulate" bullet that is still open.

## 1. Slice 0 — reduced what-if bar on `/plan`

Four controls above the editor, shown only while the registry does not yet hold the fact (otherwise read-only chips with a source badge):

| Control | Writes |
|---|---|
| Zdarzenie: urodzenie · adopcja · rodzina zastępcza | `answers.eventKind` (+ child's birth date for care events) |
| Liczba dzieci 1–5 | `answers.childrenCount` |
| Zaświadczenie „Za życiem" | `answers.zaZyciem` |
| Dziecko w szpitalu po porodzie: nie · wcześniak 28–36 tyg. · skrajny wcześniak · urodzone o czasie + dni w szpitalu | `answers.whatIf.hospital = { category, days }` → assembler fills `gestationalWeek`, `birthWeightG`, one `hospitalStays` entry |

After a change the server returns a new default plan; if the user edited blocks, ask before replacing. No weight/week inputs — the three categories map to the three statutory cases.

## 2. `/kroki` — "Co i kiedy"

**Builder:** `src/server/steps.ts`, pure: `buildSteps(result, facts, plan, submissions) → Step[]`.

```ts
interface Step {
  id: string; group: 'now' | 'beforeBirth' | 'atBirth' | 'first21Days' | 'duringLeave' | 'afterLeave';
  date?: ISODate; hard: boolean;                    // from result.deadlines
  title: string; body?: string;
  who: 'you' | 'employer' | 'otherParent' | 'doctor' | 'court' | 'system';
  to?: 'employer' | 'zus' | 'usc'; channel?: ('paper' | 'pue' | 'employerAny')[];
  state: 'todo' | 'notNeeded' | 'done';             // notNeeded = obtainableFromRegistry; done = a submission exists
  formHref?: string; anchor?: string; citations: Citation[];
}
```

Sources: `alerts[].fix` → group `now`; `documents[]` joined to `deadlines[]` by code; `routing` supplies recipient and channel for every "you → employer/ZUS" item; saved plan blocks supply dates ("21 dni przed 2 listopada").

**Layout.** Header strip: "Wnioski składasz **u pracodawcy** / **w ZUS**" with the reason. Then `Steps` per group, headed:

1. **Do zrobienia teraz** — fixes from alerts, most urgent first.
2. **Przed porodem** (or "Przed przyjęciem dziecka").
3. **Po urodzeniu dziecka** — registration at USC, child's PESEL.
4. **Pierwsze 21 dni** — the rate decision and the joint application, with a day counter.
5. **W trakcie urlopu** — parental application 21 days before each part, supplementary leave certificate, paternity before the child is 12 months old.
6. **Po urlopie** — return to work, re-registration for voluntary insurance (self-employed).

Each item: date ("do 6 lipca 2026"), title, "Kto: Ty → pracodawca", channel, button "Wypełnij wniosek" when a form exists. Registry items render as done-looking rows with the text **"Nie musisz — mamy to z rejestru stanu cywilnego"** and a source badge. Other-party items ("Pracodawca przekazuje zaświadczenie Z-3 do ZUS w ciągu 7 dni") are visibly not the user's task.

**Guide sections** below the list — static content, the targets of fix links: `#ubezpieczenie` (ZUA, voluntary sickness insurance, starts on receipt), `#skladki` (check balance, pay in full, 6-month limit, instalments do not count), `#dzialalnosc` (do not suspend around the due date; re-register after maternity benefit), `#dowody` (proof of real work: contract, attendance, medical exam, transfers), `#zaswiadczenia` (which certificate to ask for: "Za życiem", hospital stay, stillbirth), `#pracodawca` (Z-3, what to check on it).

**Calendar:** `GET /api/v1/steps.ics` — `text/calendar`, all-day `VEVENT` per dated step, `VALARM` 3 days before hard deadlines, stable `UID`s, titles only (no personal data). Button "Dodaj terminy do kalendarza".

## 3. `/wnioski`

**Catalogue** (`src/server/forms.ts`): `requiredForms(result, plan, facts) → FormSpec[]`, each with recipient from `routing`, status (do wysłania / wysłano), and the step it fulfils. Non-employees get no leave applications — only benefit applications to ZUS, with one sentence explaining why.

**Leave applications (our design, content per RW).** One renderer, six variants:

| Form | When offered | Content beyond header |
|---|---|---|
| Urlop macierzyński | employee mother | period; part before due date; request for parental leave directly after (joint application); 81.5% request |
| Urlop rodzicielski | any parental block | period(s), part number n of 5, statement on the other parent's use in that period, pool (own 9 weeks) |
| — łączenie z pracą | block with `workFraction` | working time, period, how the extension will be used |
| Urlop ojcowski | paternity block | period, part 1/2, statement on earlier use |
| Uzupełniający urlop macierzyński | supplementary block | period, other parent's non-use statement, hospital certificate attached |
| Rezygnacja z części urlopu / przejęcie przez ojca | takeover blocks | mother's date of return; father's start date |
| Urlop na warunkach macierzyńskiego | adoption / foster | date child taken into care, court document attached |

Structure of every form: place and date · applicant (from mObywatel) · addressee ("Pracodawca" — name left as a fillable line; we do not hold it) · title · legal basis (from citations) · body generated from plan blocks · statements as checkboxes · list of attachments (registry-obtainable ones marked "nie dołączasz") · signature line. Fields we cannot know are empty inputs, never guesses. Pre-filled values carry a source badge on screen, not in print.

**Page flow:** `/wnioski` (list + "Wysłane") → `/wnioski/[kind]` (preview with a few editable fields) → "Drukuj / zapisz PDF" (print stylesheet, A4, no chrome) or **"Wyślij do pracodawcy (symulacja)"** / **"Wyślij do ZUS przez PUE/eZUS (symulacja)"** → `POST /api/v1/submissions` → confirmation with number, timestamp, recipient and "to jest symulacja — nic nie zostało wysłane". The step on `/kroki` turns "done".

**ZAM / ZAS-53.** Not replicas. A "dane do wniosku" sheet: the values the unified ZAM (from 24.10.2026) asks for — benefit type, periods, rate option, child data, other-parent statement, bank-account line (empty), single-title statement when a top-up applies — with a copy button per value and a link to the form on zus.pl. ZAS-53 the same for non-employee sickness benefit; a line for the Art. 30 benefit application where it applies.

**Odpis aktu urodzenia (USC).** Enabled once the birth is registered. Choice: skrócony / zupełny / wielojęzyczny; purpose; delivery (skrzynka e-Doręczeń / odbiór w urzędzie); fee shown from content data. Prominent note: "ZUS nie wymaga odpisu — pobiera dane z rejestru. Odpis może być potrzebny pracodawcy." Submission stored like the others.

**PUE/eZUS — "Zadaj pytanie".** Topic select, message, optional reference to a step or a data row; stored; confirmation number; canned "odpowiedź w ciągu 7 dni".

**API:** `GET /steps`, `GET /steps.ics`, `GET /forms`, `GET /forms/{kind}` (pre-fill JSON), `POST /submissions { kind, payload }`, `GET /submissions`. Table `submissions` already exists.

## 4. `/trudna-sytuacja` — the quiet path

Static, prerendered; a short personalised strip on top only when the session shows a loss ("Na podstawie Twoich danych: 8 tygodni zasiłku, do 2 czerwca 2026"). No planner links, no primary buttons, no counters, no status colours other than neutral.

Order on the page: one sentence of acknowledgement → **"Z kim możesz porozmawiać"** (two or three organisations for the situation, from `charities.json`) → what applies → what to do, in at most four steps → "Możesz wrócić do tego później."

In-page list of situations (anchors, plain headings):

| Section | Content |
|---|---|
| **Urodzenie martwego dziecka** | 8 weeks of maternity benefit at 100%, from the day of birth; no minimum insurance period; twins do not change it. Document: birth certificate with annotation, **or** — when no certificate is drawn up — "zaświadczenie o martwym urodzeniu" from the doctor or midwife; say the exact name to ask for. Funeral grant 7 000 zł, form Z-12, within 12 months. |
| **Poronienie** | See the note below. |
| **Śmierć dziecka po urodzeniu** | Before 8 weeks of life: 8 weeks from birth, at least 7 days from the death. Later: 7 days from the death. Multiples: leave follows the surviving children. |
| **Wcześniak lub dziecko w szpitalu** | Supplementary maternity leave: a week for each started week in hospital, up to 8 or 15; application 21 days before maternity leave ends; ask the hospital for the certificate on the current template; ZUS decides after discharge. |
| **Ciężka choroba dziecka — „Za życiem"** | Longer parental leave (65/67 weeks); which specialist issues the certificate; it is a different document from the hospital-stay certificate. |
| **Choroba lub śmierć matki** | Father or another close family member takes over: after 8 weeks when the mother is in hospital or cannot live independently; from the next day after her death. Documents in one line each. |

**Miscarriage — wording and a disagreement.** The provided regulation (RD §13) and four case files grant the 8-week benefit on the stillbirth certificate *regardless of how long the pregnancy lasted*; the materials contain no 22-week threshold. I would not publish "before 22 weeks it is not a birth". Proposed copy: "Jeśli lekarz lub położna wystawi zaświadczenie o martwym urodzeniu albo urząd sporządzi akt urodzenia z adnotacją, przysługuje Ci 8 tygodni zasiłku macierzyńskiego — bez względu na to, w którym tygodniu ciąży to się stało. Jeśli takiego dokumentu nie ma, możesz skorzystać ze zwolnienia lekarskiego; zasiłek chorobowy w ciąży wynosi 100%." Confirm with ZUS mentors before the demo.

## 5. `/wsparcie`

- Filter chips by situation (strata dziecka · poronienie · wcześniak · ciężka choroba dziecka · inne), client-side over the prerendered list. Card: name, what they do, phone, link (external, marked), "organizacja pożytku publicznego" tag, "sprawdzono: data".
- Inclusion rule stated on the page: non-commercial, free help, verified registry entry.
- `#swiadczenie-rodzicielskie`: who gets it (no right to maternity benefit), amount, where to apply (gmina / Emp@tia) — the target of `APPLY_MUNICIPAL_BENEFIT`.
- "Oficjalne źródła" from `links.json`, grouped by publisher (ZUS, MRPiPS, PIP, gov.pl).

## 6. `/o-serwisie`

1. What the service does, in five lines.
2. **Requirement map:** table of brief items a–j and each "simulate" bullet → screen link.
3. Data sources: the ten simulated registries, what each provides.
4. Simulation statement; "no AI at runtime", AI use during development.
5. How numbers are computed: engine, parameter sets with dates, link to `/sprawy` scoreboard.
6. Privacy (session-only data, deletion), accessibility statement link, third-party licences.

## 7. Content tone guide

1. **Say what applies first, then why.** "Przysługuje Ci 8 tygodni" before any article number.
2. **One instruction per sentence, with a date and a recipient.** "Do 6 lipca złóż wniosek u pracodawcy."
3. **Name documents exactly as the office does**, then explain in plain words once.
4. **Never blame, never hurry.** No "musisz natychmiast", no exclamation marks, no "niestety"; in loss content no "gratulacje", "maluszek", calculators or progress.
5. **Do not promise what only ZUS decides.** "Według naszych wyliczeń", "ZUS może sprawdzić", never "dostaniesz na pewno".

## 8. Cache Components

`/trudna-sytuacja`, `/wsparcie`, `/o-serwisie` fully prerendered; content loaders `'use cache'` + tag `content`. `/kroki`, `/wnioski`, `/wnioski/[kind]`: static header, streamed body. `steps.ics` and `/submissions` are dynamic.

## 9. Acceptance and e2e

- [ ] Every `documents[]` and `deadlines[]` entry of the nine personas appears exactly once on `/kroki`; every `fixHref` anchor exists.
- [ ] Employee with payer ≤20, payer >20 and self-employed each see the correct recipient and channel.
- [ ] Registry-obtainable documents are never requested.
- [ ] `.ics` imports with correct dates; contains no personal data.
- [ ] Each form variant pre-fills from the saved plan; print output is one A4 page without navigation.
- [ ] Sending stores a submission, shows the number, marks the step done, survives reload.
- [ ] `/trudna-sytuacja` has no link to `/plan` and passes a tone read-through.
- [ ] axe clean at 320 / 375 / 1280, including print-preview markup.

**E2E:** checklist for employee, self-employed with arrears (fix link lands on `#skladki`), father; `.ics` download parses; maternity + parental application pre-filled and "sent"; part-time application shows working time; ZAM sheet values match the plan; USC request disabled before birth and enabled after; PUE question confirmation; submissions list; loss persona sees the strip and no planner link; charity filter; requirement-map links resolve; what-if: twins, "Za życiem", preterm category change the default plan.
