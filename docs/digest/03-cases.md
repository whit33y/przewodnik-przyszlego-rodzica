# 03 – What the 86 sample ZUS case files tell us

Source: `docs/Sprawy /` – 87 anonymised PDF case files (2 020 scanned pages). One file is a byte-identical duplicate, which leaves **86 unique cases**.
Method: every page was OCR'd (tesseract, Polish, 300 dpi), and rotated pages were re-OCR'd. Every case was read in full and its key pages were checked against the page images. Each case was extracted into a fixed template. Case IDs below (`B1-1` … `B6-15`) are internal working IDs. **No names, PESEL, addresses or employer data are reproduced.**

Caveats that apply to everything below:

- **Most files contain no decision text.** A grant is usually recorded only as an internal note: "Przyznano prawo…", "Sprawa zakończona wypłatą", or a 1240 title ("osoba pobierająca zasiłek macierzyński") on the ZUS account screen. Formal decisions appear for all refusals and for some ZUS-paid grants.
- **The payment rate (100 / 81.5 / 70 %) is printed in only ~8 files.** Elsewhere it is inferred from the application date and the boxes ticked, and is marked *inferred*.
- **Dates are anonymised and partly shifted.** Many fall in 2026–2027, and salary tables are sometimes from other years. Durations and rules are reliable; calendar dates are illustrative.
- **Two pairs look like the same person.** `B1-2`/`B1-4` are one cooperating family member, refused first for sickness benefit and then for maternity benefit. `B2-14`/`B5-6` are one employee returning from childcare leave, filed twice.
- **Handwritten forms OCR badly.** Values marked "(?)" in the source extraction are left out of the numeric fixtures below.

Abbreviations: **UZ** = ustawa zasiłkowa (25.06.1999), **USUS** = ustawa o systemie ubezpieczeń społecznych, **KP** = Kodeks pracy, **KC** = Kodeks cywilny. **ZAM / ZUR / ZAO / ZAS-55 / ZAS-26** = ZUS application forms (maternity / parental / paternity / benefit after liquidation / adoption statement). **Z-3 / Z-3a / Z-3b** = payer certificate for an employee / a non-employee / the self-employed. **POG** = ZUS general-purpose letter form. **PUE / eZUS** = ZUS online portal.

ZUS title codes seen on account screens: `0110` employee · `0411` umowa zlecenie / agency · `0510` self-employed (standard) · `0511` osoba współpracująca · `0540` "ulga na start" (health only) · `0570` preferential ZUS (first 24 months) · `0590` Mały ZUS Plus · `0911` unemployed without benefit · `1240` person receiving maternity benefit.

---

## 0. Headline numbers

| Metric | Count |
|---|---|
| Unique cases | 86 |
| Claimant = mother / adoptive or foster mother | 66 |
| Claimant = father | 20 |
| Insurance title: employee (umowa o pracę, incl. former employees) | ~50 |
| Insurance title: self-employed (JDG) or osoba współpracująca | ~31 |
| Insurance title: umowa zlecenie | 4 |
| Insurance title: none on the key date | 1 |
| **Outcome: granted** in full (incl. 1 where only the maternity part was decided so far) | **72** |
| **Outcome: refused** | **12** |
| Outcome: partial (1 day refused) | 1 |
| Outcome: refused, then reversed by ZUS on appeal (art. 83 ust. 6 USUS) | 1 |
| Cases that include sickness benefit in pregnancy (as part or whole of the file) | ~22 |
| Cases where benefit < 1 000 zł net, topped up to świadczenie rodzicielskie (art. 31 ust. 3a UZ) | 11 (1 inferred) |
| Cases where ZUS had to chase a missing or incorrect document | ~20 |

---

## 1. Taxonomy of scenarios

The counts assign each case to its **primary** scenario, so the counts add up to 86. "Also in" lists cases where the scenario appears as a secondary feature.

| # | Scenario | Count | Outcome |
|---|---|---|---|
| 1.1 | Employee mother – maternity + parental (often after sickness in pregnancy) | 10 | 10 granted |
| 1.2 | Sickness benefit in pregnancy only (zasiłek chorobowy w ciąży) | 3 | 3 granted |
| 1.3 | Self-employed / cooperating mother – maternity (+ parental) | 7 | 7 granted (1 after debt repaid) |
| 1.4 | Umowa zlecenie mother with voluntary sickness insurance | 3 | 3 granted |
| 1.5 | Father – paternity leave (urlop ojcowski) | 8 | 8 granted |
| 1.6 | Father – 9 non-transferable weeks of parental leave | 5 | 5 granted |
| 1.7 | Father – other parental leave (mother uninsured / concurrent / 32 weeks) | 3 | 3 granted |
| 1.8 | Mother ends maternity early (after ≥14 weeks), rest transferred to father or forfeited | 3 | 3 granted |
| 1.9 | Stillbirth (martwe urodzenie) | 9 | 9 granted |
| 1.10 | Preterm / hospitalised newborn – supplementary maternity leave (uzupełniający urlop macierzyński) | 6 | 6 granted |
| 1.11 | Multiples and/or "Za życiem" certificate | 4 | 3 granted, 1 refused→reversed |
| 1.12 | Adoption / foster family (przysposobienie, rodzina zastępcza) | 3 | 3 granted |
| 1.13 | Pregnant employee, employer liquidated – zasiłek w wysokości zasiłku macierzyńskiego (art. 30 UZ) | 4 | 4 granted |
| 1.14 | Fixed-term contract extended to birth, benefit after employment ended | 2 | 2 granted |
| 1.15 | Combining parental leave with part-time work (łączenie z pracą) | 2 | 2 granted (+ top-up) |
| 1.16 | Low income, top-up to 1 000 zł as the primary issue | 1 | granted |
| 1.17 | Refusals (all causes) | 12 | 12 refused |
| 1.18 | Partial – 1 excess day of parental refused | 1 | partial |

### 1.1 Employee mother: maternity + parental (10)
Cases: B2-2, B2-12, B2-13, B2-14, B3-1, B3-13, B3-15, B4-11, B5-6, B6-12.

- **Typical facts:**
  - Umowa o pracę, mostly full-time, insured from 1.5 to more than 10 years. Most employers have ≤20 insured, so ZUS pays.
  - Often pregnancy sick leave (e-ZLA code **B**) for months before the birth. The employer pays the first **33 days** (art. 92 KP), then ZUS takes over at 100%.
  - One application for 20 weeks of maternity + 32 weeks of parental, filed **6–19 days after the birth**. The father's written statement says he won't use parental leave in that period, so his 9 weeks stay reserved.
- **Variants:**
  - Maternity started 2 days *before* the birth (B3-13; allowed up to 6 weeks before).
  - Return from 2-year childcare leave shortly before the pregnancy: the base is the minimum-wage floor (B2-14 = B5-6).
  - Working time raised 3 months before the birth (B3-1), or ½→1 etat (B6-12): only full months after the change count.
  - Second child soon after the first, with months of childcare leave in the 12-month window (B4-11).
- **What ZUS checked:**
  - The title in its register and the e-ZLA list.
  - Sick pay already paid by the employer.
  - The 12-month salary history (with 13.71% deducted), and which bonuses are cut during absence.
  - The leave periods granted by the employer, and the other parent's use of leave.
- **Documents:** Z-3 (employer, often several "kontynuacja" versions), ZAM, leave application to employer, father's statement, birth certificate extract, e-ZLA (system).
- **Outcome:** all granted. The rate is printed only in B2-13 and B2-2 (81.5% for the whole period); elsewhere it is inferred as 81.5% from the application date.
- **Legal basis:** mostly none in the file (no decision). Leave applications cite art. 180, 182¹a KP.
- **Amounts shown:**
  - **B2-13:** base **5 608.85 zł** → daily **152.37 zł** (× 81.5% / 30). Monthly 4 723.47 (31 days) / 4 571.10 (30 days). Decision 11 days after the e-filed Z-3.
  - **B2-14/B5-6:** minimum-wage floor 4 242 × 0.8629 = **3 660.42 zł**.
  - **B1-3** (in 1.11): sickness base 3 660.42 → daily 122.01 at 100%.

### 1.2 Sickness benefit in pregnancy only (3)
Cases: B2-4 (¼ etat employee), B2-5 (self-employed switching from Mały ZUS Plus to full ZUS), B4-14 (high-earning employee, filed by employer). Also part of ~19 other files.

- **Facts:**
  - Code B e-ZLA, 100%.
  - Employees: employer pays 33 days, then ZUS (if ≤20 insured) or the employer itself (>20).
  - Self-employed: ZUS from day 1. They file a Z-3b per sick note.
- **What ZUS checked:**
  - The waiting period (okres wyczekiwania): 30 days for compulsory insurance, 90 days for voluntary. In B2-4 it was met after 140 days; in B6-15 (zlecenie, voluntary) on day 103.
  - The e-ZLA.
  - Self-employed only: debt on the day of incapacity, the 12 declared bases, the minimum base, and the "≥60% of forecast average wage" flag.
- **Problems:**
  - B2-4: ZUS could not pay until the employer sent the Z-3, so the claimant got a deadline letter.
  - B2-5: the base averages 7 low months (1 399.80) and 5 high months (5 652). ZUS flags this through the 60% check.
- **Outcome:** all granted at 100%. Amounts not shown.

### 1.3 Self-employed / osoba współpracująca mother: maternity (7)
Cases: B1-1, B1-12, B2-15, B4-1, B4-7, B5-13, B6-6. Also self-employed in B3-9, B3-11, B4-4, B5-5, B6-4, B6-10, B6-11 and refusals B1-2, B1-4, B2-10, B5-8.

- **Facts:** voluntary sickness insurance, often on preferential ZUS (0570) or Mały ZUS Plus (0590). Insured from about 6 weeks to several years before the birth.
- **What ZUS checked:** the same internal check every time, "Wniosek o poświadczenie ubezpieczenia chorobowego", run by the insurance department and answered in 1–6 days. It covers:
  1. the title and the voluntary sickness period; the start = the date the ZUA reached ZUS;
  2. earlier sickness-insurance periods "u dowolnego płatnika";
  3. 12 months of declared bases, including contribution-holiday months ("wakacje składkowe");
  4. the individual minimum base for the year;
  5. **contribution debt on the day the right arises**, and the date it was repaid;
  6. whether the base was ≥60% of the forecast average wage over all 057X/059X months.
- **Documents:** Z-3b (filled by the claimant as her own payer), ZAM, birth certificate extract. Everything else came from ZUS systems.
- **Problems seen:**
  - The claimant thought the Z-3b was the application, so ZUS demanded a ZAM (B3-11).
  - The application was uploaded from the accountant's PUE account, which is not valid without authorisation, and the father's statement lacked his PESEL (B2-15).
  - Debt existed on the first day of sickness and was repaid 3.5 months later, so payment came only after repayment. The ZAM was filed on day 30, so 81.5% was probably lost (B6-6).
  - A "no other title" statement was needed for the 1 000 zł top-up (B1-1, B4-1).
- **Amounts:**
  - **B4-7:** 2026 minimum declared base 5 652 → base **4 877.11** → daily **132.49** at 81.5%. Paid 11 days = 1 457.39 gross, 31 days = 4 107.19 gross.
  - B1-1, B4-1, B6-4: preferential or Mały ZUS bases (1 399.80 / 1 441.80) give a benefit under 1 000 zł net, so it is topped up.
- **Legal basis:** art. 2a UZ (debt rule – cited in B6-13), art. 31 ust. 3a and art. 62 ust. 4, 6 UZ, and § 21 of the 8.12.2015 regulation (top-up).

### 1.4 Umowa zlecenie mother (3 granted + 1 refused)
Cases: B1-11 (base 200 zł/month), B4-3 (940 zł/month), B6-15 (2 425–3 526 zł/month, 81.5% printed). Refusal: B5-12 (in 1.17).

- **Facts:** title 0411 with **voluntary** sickness insurance, joined about 5–8 months before the birth.
- **What ZUS checked:** the voluntary sickness flag and its start date; the 90-day waiting period for sickness benefit; the contribution bases from the Z-3a; the payer's registration documents (B1-11: the payer filed wrong forms, so ZUS wrote to the payer).
- **Outcome:** granted. Bases are averaged over only the months insured.
  - B6-15: 140 days + 224 days, both at **81.5%** (printed).
  - B4-3 and (inferred) B1-11: topped up to 1 000 zł.
- **Key rule:** without voluntary sickness insurance on the zlecenie there is no maternity benefit from that title (B5-12).

### 1.5 Father: paternity leave (8 granted + 1 refused)
Cases: B1-6, B1-7, B2-7, B4-5, B4-9, B5-9, B6-5, B6-9. Refusal: B6-13 (debt).

- **Facts:** 14 days in one block, or 7-day parts (B4-5, B4-9, B5-9, B6-9). Taken 3–12 months after the birth.
  - B4-9: the second part started 6 days before the 12-month deadline. The father had started a new job only about 1 month before the first part, so there was no waiting period problem.
  - B2-7: a self-employed father added a marriage certificate, which wasn't needed.
- **What ZUS checked:** the title, the Z-3 salary, the statement "not drawn from another title", and (B4-9) the first part already recorded in the register.
- **Outcome:** granted at 100% (printed in B1-7).
- **Amounts:**
  - **B1-7:** constant 5 600 zł gross → base 4 832.24 → daily 161.07 (computed here, not printed).
  - **B6-9:** a very high earner (57 300–63 033 zł/month). The deduction is 2.45% instead of 13.71% after the annual pension/disability contribution cap (30× average wage). **The benefit base has no cap.**
- **Legal basis:** art. 182³ KP (in the leave applications).

### 1.6 Father: 9 non-transferable weeks of parental leave (5)
Cases: B1-8, B2-3, B3-6, B5-11, B6-3.

- **Facts:** taken from 8 weeks to about 20 months after the birth, often after the mother's 52 weeks and after the child's 1st birthday (allowed until the end of the calendar year in which the child turns 6). Three of the fathers are self-employed.
- **Edge cases:**
  - **B1-8:** the father applied for 8 weeks + 3 days and corrected it himself to 63 days.
  - **B3-6:** the father switched from employment to self-employment before the birth. His voluntary sickness insurance started **2 days after** the birth and was still accepted, because the right is assessed at the start of the leave and maternity benefit has no waiting period.
  - **B6-3:** the mother was uninsured and received świadczenie rodzicielskie (the municipal flat benefit). ZUS suspended the case under art. 64 § 2 KPA until a **KRUS** document about the mother arrived.
- **What ZUS checked:** the father's sickness insurance on the start date, and what the mother had used. ZUS has this data, but in B2-3 the father still had to bring a ZUS certificate about the mother.
- **Outcome:** all granted, at **70%** (printed in B2-3 and B6-3).
- **Amounts:**
  - **B2-3:** base **4 344.11** → daily **101.36** (70%). October payment 3 142.16 gross / 2 765.16 net.
  - B6-3: base ≈ 4 124.06 → ≈ 2 886.84 per 30 days (some digits uncertain).

### 1.7 Father: other parental leave (3 granted + 1 refused)
Cases: B3-3 (mother uninsured; father takes 32 weeks starting when the child is about 1), B5-2 (self-employed on preferential ZUS; an 8-week part *concurrent* with the mother; topped up to 1 000 zł), B5-14 (self-employed; 32 weeks; top-up requested). Refusal B4-12 (5-part limit, see 1.17).

- **Form errors:** in B3-3 the father ticked the mother's "first year / full-length" declaration, and the employer ticked "urlop macierzyński" instead of "rodzicielski" on the Z-3. ZUS paid anyway.

### 1.8 Mother ends maternity early (3)
Cases: B5-5 (self-employed mother stops after 14 weeks; father takes 6 weeks of maternity + 32 weeks of parental), B1-9 (self-employed mother stops after 19 weeks; employee father, a high earner, takes the rest of maternity, then parental with a paternity break), B3-11 (self-employed mother takes only 14 weeks, no parental, and returns to her business).

- **Requirements:** the mother's written resignation statement; the father's leave starts the next day. Both parents' statements must exclude the father's 9 weeks.
- **Outcome:** granted. B3-11: 98 days. B5-5: decision 10 days after the ZAM.

### 1.9 Stillbirth (9)
Cases: B2-9 (self-employed **father**, 9 weeks), B2-11, B3-5, B3-7, B4-4 (self-employed, formal decision), B5-1, B5-7 (stillborn **twins**), B6-2, B6-4 (self-employed, top-up). Also B2-8 (a triplet stillborn).

- **Facts:** the mother gets **8 weeks = 56 days** from the birth date, maternity part only, no parental leave. Twins don't multiply this (B5-7). No minimum insured period: B2-11 had been employed only 10 weeks.
- **Proof:**
  - A birth certificate extract annotated "dziecko urodziło się martwe".
  - **Or, when the sex could not be determined** (no registry act; seen in **4 cases**: B2-11, B3-5, B5-1, B6-4), the special doctor/midwife certificate "Zaświadczenie o martwym urodzeniu uprawniające do wypłaty zasiłku macierzyńskiego lub pogrzebowego…". It is valid regardless of how long the pregnancy lasted.
  - B3-7: a generic doctor's note ("37 weeks, stillborn") was also accepted.
- **What ZUS checked:** the title, the proof, and (B5-1) unpaid leave right before the birth, which did not block anything.
- **Outcome:** all granted at 100% (printed for B3-5).
- **Legal basis:** art. 180¹ § 1 KP (cited by claimants), art. 29 UZ.
- **Open question:** B2-9 (the father's 9 weeks after a stillbirth): the legal path isn't stated in the file. Verify with mentors.

### 1.10 Preterm / hospitalised newborn: supplementary maternity leave (6)
Cases: B2-1, B4-15, B5-3, B5-4, B6-10, B6-11. Also B3-14, B5-10, and B1-3 (transitional refusal). The leave was introduced by the act of 6.12.2024 (Dz.U. 2024 poz. 1871) and has been in force since 19.03.2025.

| Case | Gestation | Weight | Hospital stay | Supplementary leave granted |
|---|---|---|---|---|
| B2-1 | 29th week (25? on one form) | **650 g** | ~4 months, 2 certificates | **15 weeks** (max) |
| B5-10 | 28+5 weeks, twins | ~1 150 / 1 280 g | months, ~12 certificates | **8 weeks** requested (max for the category); decided only after discharge |
| B5-4 | 36 weeks | 2 640 g | 10 days (re-admission) | **2 weeks** |
| B6-11 | 36 weeks | 3 100 g | 8 days | **2 weeks** |
| B6-10 | unknown | ~2 350 g | 8 days in neonatal ICU | 2 weeks, then **8 weeks** on a second ZAM/decision (reason not in file) |
| B5-3 | 38 weeks (term) | ~3 600 g (?) | 5 days, from day 7 | **1 week** |
| B4-15 | 41 weeks (term) | 3 625 g | ~5 days | **1 week**, at 100% between 81.5% maternity and parental |
| B3-14 | term | – | 29 days (counted from day 5) | ~**4 weeks** |

- **Rule confirmed by the cases:** 1 week for each started week in hospital, capped at 15 weeks (<28 weeks or ≤1 000 g), 8 weeks (28–37 weeks and >1 000 g), or 8 weeks (term baby with ≥2 consecutive days in hospital between day 5 and day 28 after birth). For multiples, use the lowest weight and the longest stay.
- **Order of leaves:** maternity → supplementary → parental. The supplementary leave shifts every later date.
- **Documents:** a hospital certificate on the **new template**. Old-template certificates still circulate (B2-1). A certificate issued before discharge needs a second one after discharge. ZUS decides the supplementary and parental parts only after discharge (B5-10).
- **Problems:** in all 6 cases at least one form was corrected or re-filed.
  - B6-11: the first ZAM listed all 52 weeks as "maternity".
  - B5-3: hand-corrected dates.
  - B6-10 and B3-14: second ZAMs.

### 1.11 Multiples and/or "Za życiem" (4)
Cases:

- **B3-9:** self-employed mother of twins. 3.5 months of sickness in pregnancy, then **31 weeks maternity + 34 weeks parental** (43 − 9) = 455 days.
- **B2-8:** triplets, one stillborn, one with a "Za życiem" certificate. **31 weeks maternity** (the stillborn child counts). Parental applied for separately at 70%. 56 weeks of parental doubled to 112 weeks by working ½ etat. *Possible discrepancy: 2 live-born children with Za życiem should give 67 − 9 = 58 weeks, not 56.*
- **B5-10:** twins born at 28 weeks, both with "Za życiem". Requested 31 + 8 + **58** weeks at 81.5%.
- **B1-3:** single child; "Za życiem" extension refused, then **reversed**.
  - The doctor had issued supplementary-leave hospital certificates instead of a Za życiem certificate.
  - The supplementary-leave transitional rule also failed: on 19.03.2025 the mother was already on *parental*, not maternity, leave.
  - The appeal brought the correct certificate. ZUS revoked its own decision under **art. 83 ust. 6 USUS** without going to court.
  - Legal basis cited: art. 29a ust. 1 UZ, art. 182¹a and 184 KP, art. 4 ust. 3 of ustawa "Za życiem".

### 1.12 Adoption / foster family (3)
Cases:

- **B6-1:** employee adopting.
  - Timeline: court petition 16.01, court care order 26.01, benefit from **27.01**.
  - Granted 20 + 32 weeks.
  - Documents: ZAS-26 statement, court order, birth certificate extract, Z-3.
- **B3-8:** self-employed (preferential base 1 080 zł) adopting a **5-year-old with a "Za życiem" certificate**.
  - Voluntary sickness insurance for only **45 days** before taking the child into care; the business closed 18 days later.
  - Paid **76 weeks** = 20 + (65 − 9), continuing after the insurance ended.
- **B4-8:** self-employed **non-professional foster family**.
  - Court order placing the child for the duration of proceedings, plus the foster-care organiser's certificate.
  - 52 weeks; she first requested 20 weeks and then corrected it.
- **What ZUS checked:** that the child was taken into care and an adoption petition filed (not the final adoption order); the child's age (under 7, or under 10 with deferred schooling); the type of foster family (professional ones are excluded).

### 1.13 Pregnant employee, employer liquidated: art. 30 benefit (4)
Cases: B3-2, B3-4 (the sole-proprietor employer closed the business), B3-10 (high earner, dismissed under the collective-redundancy act 3 weeks before the due date), B6-7.

- **Benefit:** zasiłek w wysokości zasiłku macierzyńskiego (ZAS-55) from the **day after the employment ends until the birth**, then a separate ZAM for maternity (and parental).
  - Lengths seen: 21 days (B3-10), about 2.5 months (B3-2), about 6 months (B3-4).
- **Evidence ZUS required:**
  1. ZAS-55 with the statement "nie zapewniono mi innego zatrudnienia";
  2. a work certificate (świadectwo pracy) giving liquidation or bankruptcy as the reason. Termination by agreement, by notice under art. 30 § 1 pkt 2 KP, or under the 2003 act all qualify;
  3. a doctor's certificate that the **pregnancy existed during the employment**. B3-10's states this explicitly;
  4. a Z-3 for the base.
- **Friction (B3-2):** ZUS itself asked for Z-10 (the form for sickness benefit after insurance ended), although the claimant had correctly applied on ZAS-55. The infoline had told her Z-10 was not needed. She had to write two explanations citing art. 30 herself.
- **Outcome:** all granted (100% where shown).

### 1.14 Fixed-term contract extended to the birth (2)
Cases: B1-10, B4-13. Also B3-14.

- **Facts:** the contract was extended to the day of birth (art. 177 § 3 KP). The employment ends on the birth date, and ZUS pays from the next day.
  - B1-10: the employer (>20 insured) paid day 1 at 100% = **150.11 zł**, which implies a base of ≈4 503.30.
- **Problems:**
  - B4-13: the employer had to correct the Z-3 twice (missing leave period; 128 zł of overtime omitted). ZUS **cross-checked the Z-3 against the payer's monthly RCA reports**.
  - B3-14: the mother had to register the child for health insurance herself, because there was no longer an employer to do it.

### 1.15 Combining parental leave with part-time work (2)
Cases: B1-5, B4-2. Also B2-8.

- **Facts:** the parental leave is extended in proportion to the working time, and the benefit is reduced in proportion.
  - B4-2: ½ etat. When the reduced benefit fell under 1 000 zł it was topped up. She later stopped the benefit early by her own notice to ZUS on returning at ¾ etat.
  - B1-5: the mother asked her employer to calculate the new end date. ZUS stated it as 17.04.2027, which doesn't reproduce with a simple formula (3/8 etat?). **Verify.**
- **Legal basis:** art. 182¹e/182¹f KP.

### 1.16 Low income, top-up as the primary issue (1)
Case: B6-14 (¼ etat at ¼ of the minimum wage; long sickness in pregnancy; the father's concurrent 9 weeks).

The top-up rule (art. 31 ust. 3a UZ) appears in 11 cases overall: B1-1, B1-5, B1-11*, B4-1, B4-2, B4-3, B5-2, B5-7, B5-14, B6-4, B6-14.

- **Rule:** if the monthly benefit **net of the PIT advance** is below the świadczenie rodzicielskie (1 000 zł), it is raised to 1 000 zł.
- **Statement required every time:** "maternity benefit from only one title". ZUS usually asks for it in a follow-up letter, and the claimant must report any new title within 7 days (§ 21 of the 8.12.2015 regulation, art. 62 ust. 4, 6 UZ).

### 1.17 Refusals (12)

| Case | Who / title | Benefit refused | Reason | Legal basis cited |
|---|---|---|---|---|
| B2-6 | Employee, full-time at minimum wage, hired 4 months before sick leave | Sickness in pregnancy | Employment found not genuine; title removed from day 1 by a separate ZUS decision | USUS insurance decision; UZ art. 1/4 (implied) |
| B3-12 | Employee at ~1/8 etat (?) and 1 273 zł, hired ~10 weeks before birth | Maternity 52 weeks | **Sham contract** (umowa dla pozoru) | art. 83 ust. 1 pkt 1, 68, 6, 11, 12, 13 USUS + **art. 83 § 1 KC** + art. 300 KP |
| B4-6 | Employee at 1/10 etat with disproportionate pay; sick 24 days after hiring | Maternity 52 weeks | Not subject to insurance; base "incorrect" | art. 29 ust. 1 pkt 1 UZ |
| B4-10 | Employee with a second full-time job elsewhere; registered late; sick ~1 month after hiring | Sickness + maternity | Sham employment: cash wages, safety training dated before hiring, no medical certificate, no attendance lists, 40 km commute | art. 83, 68, 6, 8, 11–13, 36 ust. 4 USUS + art. 83 KC + 300 KP; art. 1, 6, 29 UZ; Supreme Court case law |
| B1-4 | Osoba współpracująca | Sickness in pregnancy (continuation) | **Contribution debt** on the business owner's (payer's) account on the date checked | not printed (art. 2a UZ) |
| B1-2 | Same person as B1-4 | Maternity + parental | Debt on the payer's account on the birth date; a later instalment agreement did not cure it | not printed (art. 2a UZ) |
| B6-13 | Self-employed father | Paternity 2 weeks | Debt > 1% of minimum wage (46.66 zł in 2025), not repaid | **art. 2a UZ** |
| B2-10 | Self-employed mother | Maternity | Business suspended 30.06; birth 09.07; voluntary sickness re-registered only from 28.07. **Not insured on the birth date** | art. 29 ust. 1 UZ (implied) |
| B5-8 | Self-employed mother | Parental (separate later claim) | Deregistered during maternity benefit ("zbieg"), didn't re-register; a 2-week gap before the parental claim | art. 1 ust. 1, **art. 29 ust. 1 UZ** |
| B5-12 | Umowa zlecenie (plus other jobs) | Maternity from the zlecenie | No voluntary sickness insurance on the zlecenie | (art. 29 UZ) |
| B6-8 | No sickness-insured title | Maternity + parental | Not insured on the birth date. Applied **deliberately to get a refusal for a foreign institution** (EU coordination) | art. 1 ust. 1, 29 ust. 1 UZ |
| B4-12 | Self-employed father | 6th part of parental (1 week) | **5-part limit is shared by both parents**: his 4 parts of 2 weeks + the mother's 1 long part = 5 | **art. 29a ust. 1, 3 UZ**; art. 182¹a/b KP |

Plus:

- **B3-14 (partial):** 225 days of parental requested, 224 allowed, so **1 day refused** by a formal decision (art. 29a ust. 1 UZ).
- **B1-3:** refused, then reversed (see 1.11).

Sham-contract proceedings (B2-6, B3-12, B4-6, B4-10) took **2–4 months**, overlapping the birth, with **no income** in that time. The claimant faces **two** decisions to appeal: insurance status (to the regional court) and the benefit (to the district court), each within 1 month.

---

## 2. Most common refusal / problem causes and what the citizen could have done earlier

Ordered by frequency × impact. The proactive alerts in the right-hand column are what the app should show and when.

| # | Cause (cases) | What the citizen could have done earlier | Proactive alert in the app |
|---|---|---|---|
| 1 | **Insurance title not recognised: new job just before or early in pregnancy** (4 refusals: B2-6, B3-12, B4-6, B4-10) | Only genuinely performed work protects. Keep proof of real work: contract, attendance lists, pre-employment medical certificate, safety training, bank transfers instead of cash, emails, work products. Register in ZUS within 7 days. Expect a ZUS check if hired at small etat or high pay within months of the birth. | Risk flag (not an eligibility "no"): job start < ~3–6 months before the due date, sick leave < 1–4 months after hiring, tiny etat, pay out of line with etat, family firm, zlecenie→employment switch at the same firm → "ZUS will probably verify the employment – prepare these documents; a decision can take 2–4 months." |
| 2 | **No sickness insurance on the decisive day** (4 refusals: B2-10, B5-8, B5-12, B6-8) | Self-employed: don't suspend the business near the due date; file ZUA with voluntary sickness **before** the birth; it starts no earlier than the day ZUS receives it. After maternity benefit ends, **re-register** before any separately claimed parental part. Zlecenie: opt into voluntary sickness at the start of the contract. | Check the title + sickness flag on: the due date, every planned leave start, and the end of maternity benefit. "Your sickness insurance ends on X – your parental leave starts on Y – re-register by X." Explain the świadczenie rodzicielskie (municipality) and EU-coordination routes when there is no title. |
| 3 | **Contribution debt, self-employed or cooperating** (3 refusals: B1-2, B1-4, B6-13; 1 delayed: B6-6) | Check the balance on PUE/eZUS before the due date, before each sick-note continuation and before paternity leave. Pay any debt above 1% of the minimum wage (48.06 zł in 2026). For osoba współpracująca the debt is on the **business owner's** account. An instalment agreement ≠ paid. If a refusal comes, repay within **6 months** to restore the right. | Debt banner pulled from the ZUS account: "Debt of X zł on the [payer] account. Benefits are blocked until it is repaid in full; the right expires on [date + 6 months]." Re-check on each continuation (B1-4 was cut mid-spell). |
| 4 | **Missing or incorrect documents from the employer** (Z-3 missing, incomplete, wrong boxes, salary vs RCA mismatch: B2-4, B2-12, B4-13, B5-3, B1-11, B3-5, B3-3) | Ask HR to file the Z-3 electronically via PUE right after the leave application (B2-13: decision 11 days after the e-filed Z-3 and 20 days after the birth). Check that the Z-3 lists every leave type, the date of the leave application, and all pay components. | Employer task tracker: "Z-3 not yet received by ZUS." Pre-fill the Z-3 from RCA data so HR only confirms. Show typical delays (deadline letters of 7–14 days; ~3 months in B5-3). |
| 5 | **Leave-date arithmetic errors** (1 day refused in B3-14; 8 weeks + 3 days in B1-8; whole 52 weeks under "maternity" in B6-11; re-planning after supplementary leave in B5-3, B6-10, B3-14; unclear end date when combining with work in B1-5) | Use exact day counts: maternity 140 days for 1 child (217 for twins); parental 224 days for the mother of 1 child when the father keeps 9 weeks; father's quota 63 days; paternity 14 days or 2 × 7. Inclusive counting: end = start + n − 1. | Built-in leave calculator that outputs the exact date ranges per leave type in the order maternity → supplementary → parental, and validates the 5-part limit and the 6-year horizon. |
| 6 | **Rate lost / 21-day rule misunderstood** (B6-6 filed on day 30; B2-8 asked for maternity only, then parental at 70%; B1-2 mixed "100% then 70%" with the 81.5% box; several ZAMs with the 81.5% box unticked or inconsistent: B4-1, B4-3, B4-7) | Decide on the maternity + parental package before the birth and file within **21 days of the birth** to get 81.5% for the whole period. The father's 9 weeks are always 70%. | Countdown from the birth date: "Day 14 of 21 – choose 81.5% for everything, or 100% now and 70% later." A side-by-side money comparison. |
| 7 | **Wrong form / leave application ≠ benefit application** (B2-12: a letter to the employer instead of a ZAM; B3-11: Z-3b only; B3-2: ZUS asked for Z-10 instead of ZAS-55; B2-15: accountant's PUE upload; B4-1: self-employed filed an "employer leave application") | Leave is requested from the employer (KP); the benefit is requested from ZUS (ZAM/ZUR/ZAO/ZAS-55/ZAS-26). Self-employed: Z-3b + ZAM. The application must come from the insured person's own PUE/eZUS, trusted profile or paper signature. | Scenario-driven checklist that names the exact form per step and who files it. |
| 8 | **Wrong certificate type** (B1-3: hospital-stay certificate instead of "Za życiem"; old vs new hospital template in B2-1; stillbirth without a registry act) | Ask the doctor for the right certificate: "Za życiem" (art. 4 ust. 3, from an eligible specialist) vs the supplementary-leave hospital certificate on the 2024-act template. When the stillborn child's sex is undetermined, ask for the special stillbirth certificate. | Document picker with sample images and the exact name to ask the doctor for. |
| 9 | **Other-parent information missing** (B5-13, B5-4: ZUS asked by letter or phone, 7-day deadline, "32 or 9 weeks?"; B2-15: father's PESEL missing; B6-3: mother's KRUS status; B5-12: e-form field greyed out) | Attach the other parent's statement with name, PESEL, whether and when they use leave, and which pool (32 weeks vs 9 weeks). | Capture both parents in one plan; check the other parent's ZUS benefits by PESEL; flag KRUS / uninsured / abroad early. |
| 10 | **Low benefit, top-up not automatic** (11 cases) | Submit the "only one title" statement with the application. | Estimate the net benefit; if < 1 000 zł, include the statement automatically and explain why. |
| 11 | **5-part limit for parental leave** (B4-12) | Plan fewer, longer parts. The other parent's parts count too. | Parts counter across both parents. |
| 12 | **Low base by design or by timing** (preferential ZUS 1 399.80/1 441.80; ¼ etat; switching etat or ZUS scheme months before the birth – B2-5, B3-1, B3-4, B6-12) | Understand that the base = average of the 12 months before the first incapacity (only full months after an etat change; declared bases for the self-employed). Raising the base shortly before pregnancy is flagged by ZUS. | "Your benefit will be ~X zł/month because…" with the base breakdown. |

---

## 3. Data ZUS pulled from its own systems vs. what claimants and employers supplied

This drives the "data from state systems, not from the user" design.

### 3.1 Pulled by ZUS from its own systems (seen in the files as screenshots or internal memos)

| Data | Where it shows up | Cases |
|---|---|---|
| Insurance titles and periods (code, payer, from/to, reason for ending: "zbieg – zasiłek mac.", "wyrejestrowanie") | KSI/EPWD screen "Tytuły ubezpieczenia – Konto" | almost all |
| Voluntary sickness insurance flag and **start date (= ZUA receipt date)** | Same; the insurance department's "poświadczenie" memo | all self-employed and zlecenie cases; B5-2 (ZUS corrected the start itself) |
| Declared contribution bases per month (12 months), minimum individual base, contribution holidays | "Wniosek / Odpowiedź o poświadczenie ubezpieczenia chorobowego" | B1-2, B2-3, B2-5, B2-7, B3-6, B3-8, B3-9, B3-11, B4-3, B4-7, B5-2, B5-13, B6-4, B6-6, B6-13 |
| **Contribution debt on the day the right arises**, and the repayment date | Same memo ("zadłużenie… na datę badania: TAK/NIE", "uregulowana w dniu…") | B1-2, B1-4, B1-12, B6-6, B6-13 and every self-employed check |
| "Base ≥60% of forecast average wage" flag for 057X/059X | Same memo | B2-5, B2-7, B3-6, B3-8, B3-11, B5-2, B6-4, B6-6, B6-13 |
| Prior benefits in the benefit period (sickness, care, maternity, earlier children) | Benefits tab; memo | most |
| **The other parent's** maternity/parental periods and rates | Second parent's account | B1-9, B2-3 (ZUS had it, but the father still supplied a certificate), B5-11 |
| e-ZLA sick notes (codes, periods, retroactive flags) | e-ZLA list | all sickness-in-pregnancy cases |
| Employer-reported sick pay / benefits (RSA) and monthly contribution reports (RCA) | Payer data; RCA used to **cross-check the Z-3** | B1-10, B4-13 |
| Registration date and timeliness of the employer's ZUA | Account | B4-10 (late registration was evidence of a sham) |
| CEIDG business data | Insurance proceedings | B4-10 |
| Insurance-validity proceedings and decisions ("Wniosek o zbadanie okoliczności…") | Internal memo + decision | B2-6, B3-12, B4-6, B4-10 |
| Payments made (amounts, tax, dates) | "Przyznane prawo do zasiłku" screen | B2-3, B2-13, B4-7, B6-3, B6-15 |

### 3.2 Supplied on paper or upload by the claimant or employer, although a state register already holds it

These are the biggest opportunities to pre-fill or fetch instead of asking the user:

| Data | Supplied as | Could come from |
|---|---|---|
| Child's birth, parents, PESEL | Birth certificate extract (odpis skrócony aktu urodzenia) **in nearly every file**, plus PESEL assignment notices | Civil registry (USC/BUSC) and PESEL register |
| Stillbirth | Annotated extract or doctor's certificate | USC (when an act exists); e-certificate from the hospital |
| Marriage / paternity link | Marriage certificate extract (B2-7, B4-4; unnecessary) | USC/PESEL |
| Salary history for 12 months | Z-3 tables (often corrected; B4-13 checked against RCA) | ZUS's own RCA/contribution data (pre-fill; the employer only confirms non-contribution components) |
| Self-employed bases, title, debt | Z-3b (duplicates what ZUS already has) | ZUS account (Z-3b could be eliminated or auto-generated) |
| Pregnancy / due date, hospital stays, gestational week, birth weight | Doctor/hospital certificates (2–12 per preterm case) | Medical systems (P1 / e-certificates); a structured hospital certificate |
| "Za życiem" status | Doctor's certificate | Medical systems |
| Adoption / foster placement | Court orders, organiser certificates, ZAS-26 | Courts (e-court records), PCPR |
| Liquidation as the termination reason | Work certificate (świadectwo pracy) | ZUS deregistration code + CEIDG/KRS liquidation status |
| Other parent's insurance (KRUS) | KRUS document requested by ZUS (B6-3) | KRUS data exchange |
| Other parent's benefit use | Statements on commercial templates | ZUS account of the other parent (by PESEL) |

### 3.3 Data only the citizen can give: intentions and choices

- Which leave(s), dates and order, and whether to file the maternity + parental package (81.5%) or maternity only (100%, then 70%).
- Which parental pool (32 weeks vs the 9-week quota) and how many parts.
- The other parent's intended leave periods, and consent/waiver statements (resignation after 14 weeks, non-use of parental).
- Combining with work: the etat and the period.
- Statement of "no other title" for the top-up; it could be partly derived from ZUS data.
- Bank account and contact address.

---

## 4. Test personas (demo data and eligibility-engine fixtures)

All names are fictional. Parameters for 2026: minimum wage **4 806 zł**; social-contribution deduction **13.71%** (factor 0.8629); minimum declared base for the self-employed **5 652 zł**; preferential base (30% of minimum wage) **1 441.80 zł**; debt threshold **48.06 zł**; świadczenie rodzicielskie floor **1 000 zł net**.

- Daily rate = base × rate / 30, paid per calendar day.
- **[C] = confident:** follows directly from a rule plus a value printed in a case, or from simple arithmetic on an unambiguous rule.
- **[E] = estimated:** depends on tax, rounding, or a rule not shown in the case files.

### P1 – Magdalena: employee, sick in pregnancy, 52 weeks at 81.5% (the happy path)
- **Basis:** B2-13, B2-2.
- **Title:** umowa o pracę full-time since 2021-04-01; constant pay 6 500 zł gross. Employer has 15 insured, so ZUS pays.
- **Dates:** pregnancy sick leave (code B) from 2026-03-02. Birth 2026-06-15. Joint ZAM + Z-3 on 2026-06-24 (day 9). Father signs non-use of parental leave.
- **Children:** 1, term, healthy.
- **Expected:**
  - Sick pay from the employer 2026-03-02 → 2026-04-03 (33 days), then ZUS sickness benefit 2026-04-04 → 2026-06-14 at 100%, daily **186.96 zł** [C].
  - Base **5 608.85 zł** [C] (6 500 × 0.8629; the same base B2-13 printed).
  - Maternity 2026-06-15 → 2026-11-01 (140 days) + parental 2026-11-02 → 2027-06-13 (224 days), all at **81.5%, daily 152.37 zł** [C]. Monthly 4 723.47 (31 days) / 4 571.10 (30 days) [C]. Total ≈ **55 462.68 zł gross** [C].
  - The father keeps 9 weeks until the end of 2032 [C].

### P2 – Bartosz: employee father, paternity leave + his 9 weeks
- **Basis:** B1-7, B4-9, B5-11.
- **Title:** umowa o pracę full-time since 2022-02-01; constant 5 600 zł gross.
- **Dates:** child born 2026-05-30. Paternity 2026-09-21 → 2026-10-04 (14 days). His 9 weeks 2027-06-07 → 2027-08-08 (63 days), after the mother's 52 weeks.
- **Expected:**
  - Base **4 832.24 zł** [C].
  - Paternity at 100%: daily 161.07, 14 days ≈ **2 254.98 zł** [C].
  - 9 weeks at **70%**: daily 112.75, 63 days ≈ **7 103.25 zł** [C for rate and base; E for total rounding].
- **Validation fixtures:**
  - Paternity after 2027-05-30 → reject (12-month limit) [C].
  - A 3rd paternity part → reject [C].
  - The father's 9 weeks requested as 8 weeks + 3 days → warn (B1-8).

### P3 – Weronika: self-employed, standard ZUS, 81.5%, plus a debt variant
- **Basis:** B4-7, B6-13, B6-6.
- **Title:** JDG since 2026-01-01, standard contributions on the minimum base 5 652 zł, voluntary sickness from 2026-01-01.
- **Dates:** birth 2026-09-20. ZAM + Z-3b on 2026-10-09 (day 19), 81.5% box ticked.
- **Expected (no debt):**
  - Base **4 877.11 zł** [C]; daily **132.49 zł** [C]; 11 days in Sept = 1 457.39 gross; 31 days = 4 107.19 gross [C, printed in B4-7].
  - Maternity 2026-09-20 → 2027-02-06, parental 2027-02-07 → 2027-09-18 [C]. Total ≈ 48 226.36 zł gross [C].
- **Variant P3-debt:** 120 zł of arrears on 2026-09-20 → **not paid until repaid in full**. The right expires if not repaid by 2027-03-20 [C, art. 2a UZ]. If repaid on 2026-11-15 → paid in arrears (B6-6).
- **Variant P3-late:** ZAM filed 2026-10-20 (day 30) → 100% for 20 weeks (daily 162.57) and 70% for parental (daily 113.80) [C for the rates; E for the 81.5→100% top-up mechanics].

### P4 – Kamil: self-employed father on preferential ZUS, 9 weeks, 1 000 zł top-up
- **Basis:** B5-2, B5-14.
- **Title:** JDG on preferential ZUS (0570) since 2025-11-01, voluntary sickness from the ZUA receipt date 2025-11-05. Declared base 1 441.80 zł every month.
- **Dates:** child born 2026-03-12. Mother on 52 weeks at 81.5%. Kamil's 9 weeks 2026-10-05 → 2026-12-06 (63 days), concurrent with the mother's parental leave (allowed).
- **Expected:**
  - Base **1 244.13 zł** [C]; 70% → daily 29.03, ≈ **870.89 zł/month gross** [C].
  - Below 1 000 zł, so **topped up to 1 000 zł net** after the "only one title" statement [C for the trigger; E for the exact prorating of partial months].
  - ZUS's internal check: debt = NO, ≥60% flag = NO [C as a process fixture].

### P5 – Oliwia: umowa zlecenie with voluntary sickness insurance (plus a negative twin)
- **Basis:** B6-15, B4-3, B5-12.
- **Title:** zlecenie since 2025-09-01; joined voluntary sickness insurance on 2026-02-01. Income 3 000 zł/month.
- **Dates:** sick (code B) from 2026-05-15, which is day 104 of voluntary insurance (> 90-day waiting period). Birth 2026-07-20. ZAM on 2026-08-01 (day 12).
- **Expected:**
  - Base **2 588.70 zł** [C, assuming a constant 3 000 zł]. Sickness at 100%: daily 86.29 [C].
  - Maternity 2026-07-20 → 2026-12-06, parental 2026-12-07 → 2027-07-18, at 81.5%, daily **70.33 zł** [C].
- **Variants:**
  - **P5-early:** sick from day 60 of voluntary insurance → **no sickness benefit until day 91** (waiting period), but maternity is unaffected [C].
  - **P5-none:** never joined voluntary sickness → **maternity refused** from the zlecenie title (B5-12); route to świadczenie rodzicielskie [C].

### P6 – Patrycja: stillbirth, sex undetermined
- **Basis:** B2-11, B3-5, B5-1, B6-4.
- **Title:** umowa o pracę full-time since 2026-01-12 (3 months before the event); 5 000 zł gross.
- **Dates:** stillbirth on 2026-04-08 at week 24. No registry act (sex undetermined); the doctor issues the special stillbirth certificate.
- **Expected:**
  - Maternity benefit **2026-04-08 → 2026-06-02 (56 days) at 100%** [C].
  - No parental leave [C].
  - Base 4 314.50 (from available full months), daily 143.82, ≈ **8 053.92 zł** [E: the base for under 12 months depends on the full months worked].
- **Engine rules:** no insured period required; twins don't double the 8 weeks (B5-7) [C].
- **UX:** an empathetic flow; don't ask for a birth certificate.

### P7 – Monika: twins born at 30 weeks, hospitalised, supplementary leave
- **Basis:** B5-10, B3-9, B2-1.
- **Title:** umowa o pracę full-time since 2023-09-01; 7 400 zł gross.
- **Dates:** twins born 2026-02-04 at 30+2 weeks, 1 420 g and 1 610 g. Both in the neonatal ICU; total hospital stay 33 days (longest child). Joint application on day 12; father uses his 9 weeks later.
- **Expected:**
  - Maternity **31 weeks**: 2026-02-04 → 2026-09-08 (217 days), 81.5% [C].
  - Supplementary: 33 days → **5 weeks** (cap 8 for 28–37 weeks & >1 000 g): 2026-09-09 → 2026-10-13, at **100%** [C for the cap and rounding up; E for the rate, which is printed only in B4-15].
  - Parental for the mother: 43 − 9 = **34 weeks**, 2026-10-14 → 2027-06-08, 81.5% [C].
  - Base 6 385.46; daily 173.47 (81.5%) / 212.85 (100%) [C].
  - ZUS decides the supplementary and parental parts **only after the discharge certificate** [C, process].
- **Variant P7-Za-życiem:** both children get "Za życiem" certificates → parental 67 − 9 = **58 weeks** [C per rule; cf. the B2-8 discrepancy].

### P8 – Hanna: pregnant, employer liquidated (art. 30 benefit), then maternity
- **Basis:** B3-2, B3-4, B3-10, B6-7.
- **Title:** umowa o pracę full-time 2019-03-01 → 2026-08-31, ended by notice under art. 30 § 1 pkt 2 KP because the employer was liquidated; 7 200 zł gross. No other job offered.
- **Dates:** due date 2026-11-10. ZAS-55 filed 2026-08-28 (before the employment ends – allowed). Birth 2026-11-08.
- **Expected:**
  - **Zasiłek w wysokości zasiłku macierzyńskiego** 2026-09-01 → 2026-11-07 at 100%, daily **207.10 zł** (base 6 212.88) [C for the eligibility and period; E for the base if variable pay existed].
  - From 2026-11-08: zasiłek macierzyński paid by ZUS (new ZAM).
- **Required documents:** ZAS-55, work certificate with the liquidation reason, doctor's certificate "pregnancy existed during employment", Z-3 [C].
- **Negative twin P8-resign:** she resigned instead → **no** art. 30 benefit and no maternity benefit (only sickness benefit after title end, if eligible) [C per 02-domain-rules R-ELIG-AFTER-TITLE-MAT].

### P9 – Iwona: high-risk "new job" (sham-contract verification)
- **Basis:** B3-12, B4-6, B4-10, B2-6.
- **Title:** umowa o pracę at 1/8 etat with a small family company from 2026-03-01, pay 2 900 zł/month. Before that, a zlecenie with the same firm without contributions. ZUA filed 2026-03-15 (late).
- **Dates:** pregnancy sick leave from 2026-03-25 (24 days after hiring). Birth 2026-08-10.
- **Expected engine output:** not "ineligible". Instead: **"Eligible on paper; very high probability of a ZUS insurance-validity check (art. 83 USUS / art. 83 KC); benefit withheld for ~2–4 months; refused if real work can't be shown"** [C as process; outcome E].
- **Checklist:** contract, attendance lists, pre-employment medical certificate, safety training dated after hiring, bank transfers, evidence of tasks.
- **Appeal path:** two decisions, each appealable within 1 month.

### P10 – Łucja: self-employed, business suspended around the birth
- **Basis:** B2-10, B5-8.
- **Title:** JDG on preferential ZUS since 2025-12-01 with voluntary sickness. Suspends the business 2026-06-30.
- **Dates:** birth 2026-07-09. Resumes in CEIDG on 2026-07-01, but the ZUA with sickness reaches ZUS only on 2026-07-28.
- **Expected:** **maternity refused** (not insured on the birth date; art. 29 ust. 1 UZ) [C].
- **Variant P10-ok:** ZUA received 2026-07-05 → granted (no waiting period for maternity) [C].
- **Variant P10-gap (B5-8):** maternity paid → 2026-11-25; she claims parental separately from 2026-12-10 without re-registering → **parental refused** [C].
- **Alerts:** "insured on the birth date?" and "re-register before the parental start".

### P11 – Aleksandra: adoption of a 3-year-old
- **Basis:** B6-1, B3-8, B4-8.
- **Title:** umowa o pracę full-time since 2020-05-01; 8 000 zł gross. Spouse employed.
- **Dates:** adoption petition filed 2026-02-20; court care order 2026-03-09; child taken into care 2026-03-10. ZAM + ZAS-26 on 2026-03-20.
- **Children:** 1, aged 3 (under the age-7 limit).
- **Expected:**
  - Leave on maternity terms **20 weeks**, 2026-03-10 → 2026-07-27 (in B6-1 the benefit started the day *after* the court order) [C for 20 + 32 weeks; E for the start-day convention].
  - Parental 32 weeks → 2027-03-08 [C]; spouse keeps 9 weeks [C].
  - Base 6 903.20, daily 187.54 at 81.5% [E: the 21-day window counted from taking into care isn't visible in the files].
- **Variants:**
  - Child aged 8 without deferred schooling → **no** adoption leave [C].
  - Professional foster family → excluded [C].
  - Child with "Za życiem" → parental 65 − 9 = 56 weeks (B3-8) [C].

### P12 – Maja: ¼-etat employee, top-up, father's concurrent 9 weeks, plus a parts-limit fixture
- **Basis:** B6-14, B5-4, B4-12.
- **Title:** umowa o pracę at 0.25 etat since 2023-09-01; pay = ¼ of the minimum wage, 1 201.50 zł.
- **Dates:** birth 2026-05-04. Joint 81.5% application on day 15. The father takes his 9 weeks 2026-06-01 → 2026-08-02, concurrent with her leave.
- **Expected:**
  - Base 1 036.77; 81.5% ≈ **844.97 zł/month gross** < 1 000, so **topped up to 1 000 zł net** after the "only one title" statement [C].
  - Her leave: 140 + 224 days → 2027-05-02 [C].
- **Parts-limit fixture:** the father later takes 4 more 1-week parts while the mother's parental is 1 part → his request for one more part is **refused** (shared limit of 5) [C, B4-12].
- **Date-validation fixture:** a parental request of 225 days for one child (father keeping 9 weeks) → the 225th day is refused (B3-14) [C].

---

## 5. Pain points and confusing moments implied by the cases

1. **"I asked my employer for leave, so I've applied" – but I haven't.** The leave request (KP, to the employer) and the benefit application (ZAM/ZUR/ZAO, to ZUS) are separate. B2-12 got a refusal-threat letter; B3-11 and B4-1 got the self-employed variant of the same problem.
2. **The 21-day decision comes during the newborn weeks.** 81.5% for everything vs 100% then 70% has to be chosen within 21 days. Forms show the choice as a small checkbox that is often left unticked or contradicted (B1-2, B4-1, B4-3, B4-7). B6-6 missed it by 9 days.
3. **Date arithmetic.** Weeks vs days, inclusive end dates, the order maternity → supplementary → parental, twins (31/43), Za życiem (65/67), the father's 9 weeks, combining with work. Errors cost money or caused formal refusals (B3-14 – 1 day). Several parents asked their employer to calculate dates (B1-5).
4. **New 2025 supplementary leave.** Nobody knows the week count in advance. Two hospital-certificate templates exist, a certificate issued before discharge needs replacing, and ZUS defers the decision until discharge. In all 6 cases forms were re-filed. The transitional rule (status on 19.03.2025) caused a refusal (B1-3).
5. **Similar-looking medical certificates.** "Za życiem" vs the supplementary-leave hospital certificate (B1-3); generic doctor's note vs the stillbirth certificate; a pregnancy certificate that must state "pregnancy existed during employment" (B3-10).
6. **Grief plus paperwork (stillbirth).** Parents must obtain a special certificate when no registry act exists, write a formal 8-week leave request, and the employer still fills a full Z-3 (B2-11, B3-5, B6-2). The forms have no clear option for a father after a stillbirth (B2-9).
7. **Employer as the bottleneck.** Z-3 late, incomplete or wrong (wrong benefit box, missing leave type or application date, omitted overtime). ZUS cross-checks against RCA and sends 7–14-day deadline letters. B5-3 took about 3 months; B2-13 (e-filed Z-3) shows it can take 11 days.
8. **Self-employed traps.**
   - Sickness insurance starts only on the day ZUS receives the ZUA (B5-2, B3-6).
   - They are deregistered during maternity benefit and must re-register (B5-8).
   - Suspending the business near the due date (B2-10).
   - A tiny debt blocks everything, and the refusal wording hides the 6-month cure (B6-13).
   - For osoba współpracująca the debt sits on someone else's account (B1-2, B1-4).
   - An accountant's upload isn't the insured's signature (B2-15).
   - The Z-3b isn't the application (B3-11).
9. **Low benefits and the hidden top-up.** Preferential ZUS, Mały ZUS Plus, ¼ etat and combining with work all lead to benefits under 1 000 zł. The top-up needs an extra statement that people only learn about from a follow-up letter (11 cases).
10. **The other parent.** Statements on commercial templates, the PESEL missing, "32 or 9 weeks?" letters with a 7-day deadline, an e-form field greyed out (B5-12), KRUS status questions (B6-3), and the shared 5-part limit nobody tracks (B4-12). ZUS has most of this data by PESEL yet still asks.
11. **Losing the job while pregnant.** Which benefit applies – sickness after title end (Z-10) or the art. 30 benefit (ZAS-55)? Even ZUS asked for the wrong form (B3-2). It is a two-stage chain (until birth, then maternity) with a gap risk.
12. **Long silent waits in verification.** Sham-contract checks take 2–4 months around the birth with no income (B2-6, B4-6, B4-10, B3-12). The claimant learns about the check only after applying, and faces two decisions to appeal.
13. **Contracts that end at the birth.** The payer switches from the employer to ZUS overnight (B1-10, B4-13), and the mother must register the child for health insurance herself (B3-14).
14. **Cross-border families.** Some file only to obtain a Polish refusal for a foreign institution (B6-8). This is not explained anywhere.
15. **Duplicated civil-status paperwork.** Birth certificate extracts in almost every file, marriage certificates, PESEL notices – all data the state already holds.

---

## 6. Rules confirmed by the cases (quick reference for the engine)

| Rule | Evidence |
|---|---|
| Maternity benefit has **no waiting period**: 45 days of voluntary insurance (B3-8), 6.5 weeks (B5-5), 10 weeks of employment (B2-11), insurance starting 2 days after the birth for a father's later parental leave (B3-6) | many |
| Sickness benefit waiting period: 30 days (compulsory) / 90 days (voluntary) | B2-4, B4-3, B6-15 |
| Insured on the birth date (maternity) and on the start of each **separately claimed** part (parental) | B2-10, B5-8, B6-8 |
| Self-employed / cooperating: debt > 1% of minimum wage on the day the right arises → no payment until repaid; expires after 6 months; for współpracujący the payer's account counts | B1-2, B1-4, B6-6, B6-13 |
| Pregnancy sick leave: employer pays the first 33 days (art. 92 KP), then ZUS (≤20 insured) or the employer (>20), 100% | B1-10, B2-2, B2-4, B6-14 |
| An e-ZLA overlapping the birth → sickness stops, maternity starts on the birth date; the base isn't recalculated when maternity directly follows sickness | B1-3, B1-12, B2-12, B6-12 |
| Joint application within 21 days → 81.5% for maternity + parental; maternity only → 100%; separate parental → 70%; father's 9 weeks → 70%; paternity and supplementary → 100% | B2-13, B6-15, B2-3, B6-3, B4-15 |
| Durations: maternity 20/31 weeks (1/2–3 children); stillbirth 8 weeks; parental 41/43 weeks (65/67 with Za życiem) minus 9 for the other parent; paternity 2 × 1 week within 12 months; mother may stop after 14 weeks | throughout |
| Max **5 parts** of parental leave, counted jointly for both parents | B4-12 |
| Parents may take parental leave simultaneously | B3-6, B5-2, B6-14 |
| Benefit < 1 000 zł net → top-up to świadczenie rodzicielskie, after a single-title statement | 11 cases |
| Base: 12-month average gross × 0.8629; only full months after an etat change; minimum-wage floor for full-time employees (art. 45 UZ); **no upper cap** for employees; for the self-employed, declared bases averaged over the insured months | B2-14, B6-12, B6-9, B4-7 |
| Art. 30: liquidation/bankruptcy + pregnancy during employment → benefit from the day after termination to birth | B3-2, B3-4, B3-10, B6-7 |
| Contract extended to the birth → maternity (and parental) after employment ends, paid by ZUS from the next day | B1-10, B4-13, B3-14 |
| ZUS self-corrects on appeal within 30 days (art. 83 ust. 6 USUS) | B1-3 |
| Grants usually have no formal decision (an internal note only); refusals always do | throughout |
