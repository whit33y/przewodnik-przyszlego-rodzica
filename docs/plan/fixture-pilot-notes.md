# Fixture pilot: notes before freezing `schemaVersion: 1`

Pilot of plan 02 §7 step 1: 10 cases extracted by hand into `data/cases/<ID>/{input,expected}.json`. Read this together with plan 02 §2 (types) and §6 (fixture schema). Everything below comes from the real files. Proposed changes are written as diffs against §2/§6.

Status of the pilot fixtures: they follow §2/§6 **except where noted in §1 below**. In those places the field would need a value the files don't contain. Each such deviation is listed under "Workaround in pilot".

## 0. Cases

| ID | Scenario | Outcome | Tier: duration | Tier: amount | Uncertain / omitted |
|---|---|---|---|---|---|
| B2-13 | 1.1 employee, 20 + 32 wk, 81.5% | granted (decision) | true | true | birth date inferred from maternity start; salary table illegible → `statedBenefitBase`; Feb-2027 payment row hidden → omitted; title start only from ZUS screen; payer size = checkbox band |
| B4-07 | 1.3 self-employed, 81.5% | granted (payments) | false | true | birth date conflicts (typed 20.09 vs handwritten 13.09; typed used); monthly declared bases on a missing memo page → 5652.00 inferred; durations are the claim (only 2 payment rows printed); sickness benefit type redacted |
| B2-03 | 1.6 father's 9 weeks, 70% | granted (payments) | false | true | 12 printed declared bases do not reproduce the printed base → months omitted, `statedBenefitBase`; end date = claim; application undated; earlier sickness benefits (types redacted) omitted |
| B4-09 | 1.5 paternity, 2nd part of 2 | granted (internal note) | true | false | first part end truncated → inferred (payroll day count); amounts not printed; Z-3 col. 6 used as contribution base |
| B3-05 | 1.9 stillbirth, no registry act | granted (internal note) | true | true (rate only) | application date unknown; Z-3 month labels shifted +18 months; etat not legible |
| B2-01 | 1.10 extreme preterm, 15 wk | granted (file label only) | false | false | decision not in the scan → all periods are the claim; 81.5% box unticked → rate not asserted; second hospital stay (doubtful start) omitted; salary illegible |
| B5-10 | 1.11 twins + Za życiem | granted, maternity only so far (notice) | true | true (rate only) | supplementary + parental not yet decided; second twin's weight 1280 vs 1290 → omitted; hospital stays collapsed from ~12 certificates; payer size illegible |
| B6-01 | 1.12 adoption | granted (internal note) | true | false | rate not in file; interim court care order date has no field; work-time start partly legible |
| B3-10 | 1.13 Art. 30, liquidation | granted (internal note) | true | false | birth date not in file → inferred = last benefit day + 1; salary window unclear → months omitted; sick periods illegible; title start differs between Z-3 and register |
| B6-13 | 1.17 arrears refusal | refused (decision) | true | false | debt amount never stated → 46.67 recorded as lower bound; child birth date redacted → `event.date` absent |

Result: duration tier **7/10** true, amount tier **6/10** true. 3 of the 6 amount tiers come from a printed rate only.

## 1. What did not fit the §2 types (with proposed diffs)

### 1.1 Required fields the files never contain

**`Person.birthYear`.** PESEL and birth dates are redacted in every pilot file. The field matters only for the 50+ sick-pay rule.
```diff
 export interface Person {
   sex: 'F' | 'M';
-  birthYear: number;
+  birthYear?: number;              // absent → engine assumes < 50 (sickPayDays 33) and adds trace note
```
Workaround in pilot: field omitted in all 10 inputs. This is a type violation today.

**`ArrearsSnapshot.amount`.** The refusal decision (B6-13) says only that the debt was above 1% of the minimum wage. The memo says only TAK/NIE. B4-07 has NIE.
```diff
 export interface ArrearsSnapshot {
-  account: 'own' | 'payer'; onDate: ISODate; amount: Grosze;
+  account: 'own' | 'payer'; onDate: ISODate;
+  amount?: Grosze;                       // when printed
+  aboveThreshold?: boolean;              // ZUS memo "zadłużenie: TAK/NIE"; required when amount absent
   repaidOn?: ISODate; instalmentAgreement?: boolean;
 }
```
Workaround in pilot: B6-13 uses `amount: 4667` (threshold + 1 grosz), marked `inferred`. B4-07 uses `amount: 0` for "NIE".

**`Payer.insuredOn30NovPrevYear`.** The Z-3 shows only a checkbox (≤20 / >20).
```diff
-  insuredOn30NovPrevYear?: number;
+  sizeBand?: 'upTo20' | 'over20';                // Z-3 checkbox; drives benefit payer
```
Workaround in pilot: `20` stands for "≤20" and `21` for ">20", marked `inferred`.

### 1.2 `MonthRecord` does not match what a Z-3 reports

The Z-3 salary table (B4-09, B3-05, B5-10, B6-01, and B6-09 in batch 6) has these columns:
- days worked and days due;
- absence reason;
- col. 6, fixed pay at its **full contractual amount**;
- col. 7, variable pay reduced proportionally;
- col. 8, variable pay at its actual amount;
- col. 9, the **deduction %**.

None of these is the "sickness contribution base". For a month with sick days, col. 6 already shows the contractual amount, and the actual base is lower and unknown. Self-employed memos print the declared base per month, which does match `contributionBase`.
```diff
 export interface MonthRecord {
   month: YearMonth;
-  contributionBase: Grosze;                       // sickness-insurance base (gross) or declared base
-  employeeContributions?: Grosze;
+  contributionBase?: Grosze;                      // non-employees: declared base (memo); employees: only if RCA-sourced
+  // employee Z-3 columns (as printed)
+  fixedFull?: Grosze;                             // col. 6 – fixed components at full contractual amount
+  variableProportional?: Grosze;                  // col. 7 – variable, reduced pro rata during absence
+  variableActual?: Grosze;                        // col. 8 – variable, taken at actual amount
+  deductionBps?: Bps;                             // col. 9 – actual employee social deduction (1371, 245, 351…)
+  employeeContributions?: Grosze;
   daysDue?: number;
   daysWorked?: number;
-  fixedPay?: Grosze;
-  variablePay?: Grosze;
+  absence?: 'sickness' | 'unpaidLeave' | 'benefit' | 'other';
   minimumBase?: Grosze;
   contributionHoliday?: boolean;                  // B2-03 memo column "wakacje składkowe"
   fullMonthInsured?: boolean;
 }
```
Base rule for employees: income = `fixedFull` (pro-rated for months with less than half worked, which are then excluded) + `variableProportional` (topped up) + `variableActual`. Deduction = `deductionBps` if present, else the parameter.

Workaround in pilot: `contributionBase` = col. 6 (+ col. 8), marked `inferred`, and `fixedPay` = col. 6, marked `printed`.

### 1.3 Shifted salary tables (B3-05)

The Z-3 table covers 2023-12…2024-11, but the sick pay and the stillbirth are dated 2026. The table is still the 12 months before the first incapacity (sick pay from 2026-06), so it is a consistent shift of +18 months. `parameterDate` alone does not help, because the engine picks months by calendar window.
```diff
 export interface InsuranceTitle {
   …
   months: MonthRecord[];
+  monthLabelOffset?: number;     // months to add to printed MonthRecord.month to align with event dates (anonymisation shift)
```
Workaround in pilot: month labels were rewritten (+18). Provenance marks `months[*].month` as `inferred`. With the proposal, labels stay as printed.

### 1.4 Event happened, date unknown; `asOf` semantics

- B6-13: the child's birth date is redacted everywhere. With `BirthEvent.date` absent, §3 would put the case in prospective mode.
- B3-10: the application (ZAS-55, 13.10) comes before the birth (inferred 22.10). In B6-01 the leave application comes before the care date. The rule "case mode: asOf = application date" therefore produces asOf < event.
```diff
 export interface BirthEvent {
   kind: 'birth';
   expectedDate?: ISODate;
-  date?: ISODate;                                 // absent → prospective
+  date?: ISODate;
+  occurred?: boolean;                             // true with no date: event happened, date unknown (adjudication)
```
```diff
 // CaseInput (§6)
+  mode: 'adjudication';                           // explicit; do not derive from event.date in case mode
```
Also define `asOf` in case mode as the **date of the last dated document ZUS relied on** (decision or note date when present). The filing date stays in `plan.applicationDate`.

Workaround in pilot: B6-13 has no `event.date`. B3-10 has `asOf` 2026-10-13 and `event.date` 2026-10-22.

### 1.5 Proof and certificate types

These drive `CERTIFICATE_TYPE`, the document list and the stillbirth flow. There is no field for them:
- stillbirth with no registry act (B3-05; also B2-11, B5-1, B6-4);
- old vs new hospital-certificate template (B2-01);
- Za życiem certificate vs supplementary-leave hospital certificate (B1-3);
- the pregnancy certificate wording for Art. 30 already has `pregnancyDuringEmploymentCertified`.
```diff
 export interface Child {
   ref: string;
   bornAlive?: boolean;
+  birthProof?: 'birthAct' | 'birthActStillbornNote' | 'stillbirthCertificate' | 'doctorNote';
   …
-  hospitalStays?: { from: ISODate; to: ISODate }[];
+  hospitalStays?: { from: ISODate; to?: ISODate; finished?: boolean; certificate?: 'newTemplate' | 'oldTemplate' }[];
   zaZyciem?: boolean;
+  zaZyciemProof?: 'zaZyciemCertificate' | 'wrongCertificate';   // B1-3
```
B2-01: the first certificate (dated 28.10) says the stay is "not finished" with end 30.09. A required `to` cannot express that.

### 1.6 Adoption

B6-01 has a petition date (16.01), an **interim** court care order (26.01, "for the duration of the proceedings") and the date the child was taken into care (26.01). The benefit was paid from 27.01. `finalOrderOn` is the wrong slot for an interim order.
```diff
 export interface CareEvent {
   takenIntoCareOn: ISODate;
   petitionFiledOn?: ISODate;
+  careOrderOn?: ISODate;                          // interim (zabezpieczenie) order entrusting care
   finalOrderOn?: ISODate;
```
Engine rule to confirm: a block may start after `takenIntoCareOn`. Here it started the next day, and the plan keeps the filed start.

### 1.7 Other parent's declaration

Statements rarely carry dates. B2-13: "32 weeks", dates illegible. B4-07: a "NO" checkbox. B5-10: "not at the same time", from a KRUS-insured father.
```diff
-  declaresNonUse?: { from: ISODate; to: ISODate };
+  declaresNonUse?: { scope: 'claimantParentalPeriod' | 'explicitPeriod'; from?: ISODate; to?: ISODate };
```
Workaround in pilot: dates set to the claimant's parental period, marked `inferred`.

### 1.8 `Plan.rateOption` when there is no choice

For paternity, the father's 9 weeks, stillbirth and Art. 30 there is no rate choice. The pilot writes `split100_70` (B2-03, B4-09, B3-05, B3-10, B6-13).
```diff
-  rateOption: 'split100_70' | 'averaged81_5';
+  rateOption?: 'split100_70' | 'averaged81_5';     // absent = not applicable / not chosen
```

### 1.9 Smaller points

- `InsuranceTitle.from` is required. Every pilot file had it, but B3-10 gives two different start dates (Z-3 vs register). Keep it required and record the conflict in `extractionNotes`. No field is needed.
- `PaidBenefit.type`: the memo redacts the benefit type (B4-07, B2-03). Use `sickness` with `inferred` provenance, or omit the entry.
- Self-employed titles get a separate code while maternity benefit is paid (`0510T`, `1240`). These are not modelled and are not needed.

## 2. What did not fit the §6 fixture schema

**`Stated.evidence` is too coarse.** Three of the ten cases have grants evidenced only as a whole (file label, payments for two months, "case closed with payment"). Their periods are the claim as filed. The pilot marks those values `inferred`, so they are never asserted. Proposal:
```diff
-interface Stated<T> { value: T; evidence: 'printed' | 'inferred' }
+interface Stated<T> { value: T; evidence: 'printed' | 'claimed' | 'inferred' }
+// printed  = shown by ZUS (decision, notice, benefit screen, payment row, note) → asserted
+// claimed  = as filed (ZAM/Z-3), grant evidenced only globally → reported, counted separately on the scoreboard
+// inferred = derived by the extractor → reported
```

**Days from printed endpoints.** In B4-09, B6-01, B3-10 and B6-13, ZUS prints `from` and `to` but not the count. The pilot marks `days` as `printed` when both endpoints are printed. Please freeze this convention in §6, or add `'derived'`.

**Benefit not yet decided** (B5-10: supplementary and parental deferred until discharge).
```diff
-    status: 'granted' | 'refused' | 'withheld';
+    status: 'granted' | 'refused' | 'withheld' | 'pending';   // pending: filed, not decided in the file; compared as "not refused"
```
Workaround in pilot: undecided blocks stay in `plan` but are left out of `benefits`. The outcome is `granted`, because the only decision in the file grants maternity.

**`outcome.evidence` values.** Add `'notice'` (zawiadomienie, B5-10) and `'fileLabel'` (B2-01: only the file name says "granting decision").

**Refused vs withheld (B6-13).** ZUS issues a refusal for unpaid arrears. The engine design (§4 gating) marks the periods `withheld` until repayment. Decision for v1: expected keeps ZUS's word (`refused`, `ARREARS_UNPAID`). `compare.ts` treats a `withheld` engine period with `ARREARS_UNPAID` as matching `refused` in adjudication mode. Alternatively the engine emits `refused` in adjudication mode and `withheld` only in prospective mode.

**Post-event alerts.** The §8 alert replay drops the birth, so it cannot test:
- `CERTIFICATE_TYPE` for a stillbirth without a registry act (B3-05);
- `OTHER_PARENT_INFO_MISSING` for a KRUS-insured father (B5-10);
- `TOP_UP_STATEMENT_NEEDED`.

Proposal:
```diff
   expectedAlerts: AlertCode[];
+  expectedAlertsPostEvent?: AlertCode[];   // evaluated on full facts with plan = null
```
In the pilot only B6-13 has `expectedAlerts` (`ARREARS_OWN`).

**Variant patch format.** Not specified. The pilot uses RFC 6902 JSON Patch against `facts` (B6-13: `[{op:'replace', path:'/claimant/arrears/0/amount', value:4666}]` → granted). Freeze RFC 6902 and state that paths are relative to `facts` and `plan` respectively.

**Provenance keys.** The pilot uses `facts.…` and `plan.…` paths with `[i]` and `[*]`, for example `facts.claimant.titles[0].months[*].contributionBase`. Freeze this grammar. `doc` should be a closed vocabulary:

`Z-3`, `Z-3b`, `ZAM`, `ZUR`, `ZAO`, `ZAS-26`, `ZAS-55`, `zus-titles-screen`, `zus-benefit-screen`, `zus-payment-screen`, `zus-insurance-memo`, `zus-note`, `zus-notice`, `decision`, `birth-extract`, `stillbirth-certificate`, `hospital-certificate`, `za-zyciem-certificate`, `doctor-certificate`, `work-certificate`, `leave-application`, `other-parent-statement`, `claimant-statement`, `zus-certificate-other-parent`.

**Payment rows with offsets.** In B4-07 the transfer total is lower than the sum of its rows: 5 sickness-benefit days already paid inside the maternity period were netted off (5 × 162.57). Keep asserting the per-period rows, never the transfer total. Write that down in §6.

**Printed bases that don't reproduce.** B2-03 prints 12 monthly bases and a final base, and no rule we tried connects them. The §6 rule ("not derivable → `statedBenefitBase`, months empty") drops useful data. Proposal: allow `months` together with `statedBenefitBase`. The stated base wins, and the engine reports its own computation as `reported`.

**Validator PII scan.** Matching the 2-letter surname abbreviations in `names.txt` hits the common words "no", "by" and "po" (16 false positives in the pilot). Match tokens of 3 or more letters, plus the full "First Ab" pairs.

## 3. Modelling decisions taken (please confirm or overrule)

1. **Birth date when the extract is illegible:** first day of the maternity period on the ZUS screen (B2-13, B4-07). When typed and handwritten dates conflict, the typed ZUS date wins (B4-07).
2. **Art. 30 birth date:** last Art. 30 benefit day + 1 (B3-10). The due date goes in `expectedDate`.
3. **First paternity part (B4-09):** the end is inferred from the payroll's days-not-worked count (10 of 20 = 5 days of paternity + 5 days of sick pay). Assumes a 7-day part.
4. **Base not printed but derivable:** months are included as `inferred` so the base engine is exercised. Examples: B4-07 (minimum declared base, carried over from sickness started 2026-07-06), B5-10, B6-01. When the base is printed but not derivable: `statedBenefitBase` (B2-13, B2-03).
5. **Hospital stays from certificate chains:** collapsed to one stay per child and marked inferred (B5-10). Children were assigned by birth weight.
6. **Leave start after taking into care (B6-01):** the filed start (day after) is kept and not normalised.
7. **81.5% box unticked but joint ZAM within 21 days (B2-01):** `averaged81_5` inferred and no rate asserted. Mentors should confirm how ZUS treats the unticked declaration.
8. **`legalBasisCited`:** only articles ZUS itself cites in a decision or notice. Claimants' citations (KP 180¹, 182³ …) are not recorded.
9. **Payer size:** the Z-3 checkbox band is encoded as 20 or 21 (see 1.1).
10. **`asOf`:**
    - application date when legible (B2-13, B4-07, B2-01, B5-10, B6-01, B3-10, B6-13);
    - otherwise the date ZUS examined the right (B2-03);
    - otherwise the date of the leave application to the employer (B4-09);
    - otherwise the event date (B3-05).

## 4. Parameter evidence found during extraction

| Value | Evidence |
|---|---|
| 2025 forecast average wage **8 673,00** (`[verify]` in plan 02 §5 → confirmed) | B2-03 memo: self-employed declared base 5 203,80 = 60% × 8 673,00 for 2025-09…12 |
| 2024-07 minimum wage **4 300,00** (`[verify]` → confirmed) | B6-13 memo: preferential base 1 290,00 in 2024-12 = 30% × 4 300 |
| 2025 minimum wage 4 666,00 | B6-13: preferential base 1 399,80 and the decision's threshold 46,66 |
| 2026 minimum declared base 5 652,00 → 4 877,11 | B4-07 payment screen |
| PIT advance 12%, rounded to full złoty | B2-03: 202,72 → 24; 3 142,16 → 377 |
| `daily = round(base × rate / 30)` | B2-13 (152,37), B4-07 (132,49), B2-03 (101,36): all consistent |
| No recalculation of the base when maternity follows sickness | B4-07: base window Apr–Jun 2026 = 12 months before sickness from 2026-07-06 |

## 5. Before the fan-out

- Apply 1.1–1.8 and §2. Then re-emit the pilot fixtures: drop the workarounds, restore B3-05 month labels plus `monthLabelOffset`, and use `aboveThreshold` in B6-13.
- Give fan-out agents the `doc` vocabulary, the evidence ladder (`printed` > `claimed` > `inferred`) and the `asOf` rule from §3.10.
- Extraction tip: pages that OCR badly (rotated ZUS screenshots, handwritten Z-3 margins) render cleanly at 200–300 dpi with ghostscript. Expect to view 2–6 page images per case.
