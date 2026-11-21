# 02 – Domain rules for the rules engine and calculators

Scope: social-insurance entitlements (ZUS, sickness insurance fund FUS) of future and new parents, plus the
adjacent Labour Code (Kodeks pracy) leave rights that drive the benefit periods. Written to be turned into
code: every rule has an ID, inputs, output and a legal citation.

## 0. Sources, abbreviations, conventions

| Code | Source (all in `docs/Materiały dla uczestników/` unless noted) |
|---|---|
| **UZ** | *Ustawa z 25.06.1999 o świadczeniach pieniężnych z ubezpieczenia społecznego w razie choroby i macierzyństwa* ("ustawa zasiłkowa"), Dz.U. 2026 poz. 854 – extract. Art. 32–35 (zasiłek opiekuńczy) and Art. 23–28 are **not** in the extract. |
| **KP** | *Kodeks pracy* – extract, Dz.U. 2026 poz. 1245 (Art. 92, 175¹–189¹). Art. 186–186⁸ (urlop wychowawczy) are **not** in the extract. |
| **RW** | *Rozporządzenie MRPiPS z 11.03.2025 w sprawie wniosków dotyczących uprawnień pracowników związanych z rodzicielstwem* (Dz.U. 2025 poz. 322) – content of leave applications and attachments. |
| **RD** | *Rozporządzenie MRPiPS z 27.09.2026 w sprawie zakresu informacji ... oraz dokumentów niezbędnych do przyznania i wypłaty zasiłków* (Dz.U. 2026 poz. 1316) – documents required by ZUS. Replaces the 2015 regulation that the Poradnik still cites. |
| **P** | *Poradnik dla rodziców i opiekunów dzieci*, ZUS, legal status 1 April 2026 (page numbers = printed page numbers). |
| **ZAL** | *Załącznik – maksymalny czas trwania zasiłków, wysokość, podstawa wymiaru* (.docx). |
| **TASK** | `docs/ZUS - Pełna treść zadania konkursowego.pdf` (process descriptions, form names, form changes from 24.10.2026). |
| **GK** | General knowledge of Polish law not contained in the provided materials. **Always flagged; verify before relying on it.** |

Conventions used below:

- `[UNCERTAIN]` = the materials are silent/ambiguous or the value comes from GK. Treat as a configurable assumption.
- "week" of leave = 7 calendar days (KP Art. 183¹ §1). Benefits are paid for every calendar day, including days off
  (UZ Art. 11 ust. 4 applied to maternity by Art. 31 ust. 5).
- Month = 30 days for benefit purposes (UZ Art. 11 ust. 5); daily benefit = 1/30 of the monthly benefit (UZ Art. 36 ust. 3).
- Money rounding: to the grosz, half-up (P p. 22 for contributions; ZUS uses the same for benefits).
- "Insured" (*ubezpieczony/a*) means covered by sickness insurance (*ubezpieczenie chorobowe*) – this is the gate for
  every ZUS benefit in this document. Being covered by pension/disability insurance or health insurance (NFZ) is
  **not** enough.
- Key actor terms: *płatnik składek* (contribution payer – employer, client under a mandate contract, or the
  self-employed person themself), *płatnik zasiłku* (benefit payer – either the contribution payer or ZUS, see R-PAY-1).

---

## 1. Catalogue of benefits and leaves

### 1.1 Overview table

| ID | Benefit / leave (PL) | What it pays for | Who pays | Rate | Max duration | Main legal basis |
|---|---|---|---|---|---|---|
| B1 | **Wynagrodzenie chorobowe** (employer sick pay) during pregnancy | Employee's incapacity (e-ZLA with code B) – first days in a calendar year | Employer (own funds) | **100%** in pregnancy (80% otherwise) | 33 days/calendar year (14 days if employee turned 50 in a previous year) | KP Art. 92 §1 pkt 2, §4, §5 |
| B2 | **Zasiłek chorobowy w ciąży** (sickness benefit in pregnancy) | Incapacity during pregnancy (code B) after B1 is exhausted, or from day 1 for non-employees | Contribution payer with >20 insured, otherwise ZUS (FUS money) | **100%** | Benefit period (*okres zasiłkowy*) **270 days** | UZ Art. 4, 6, 8, 9, 11 ust. 2 pkt 1 |
| B2a | Zasiłek chorobowy **po ustaniu tytułu ubezpieczenia** in pregnancy | Incapacity that started ≤14 days after insurance ended and lasts ≥30 days | ZUS | 100% (pregnancy) | 270 days (the 91-day cap does not apply in pregnancy) | UZ Art. 7, 8 ust. 2, 13, 61 ust. 1 pkt 2 lit. d |
| B3 | **Świadczenie rehabilitacyjne** | Continued incapacity after the 270-day period is exhausted, if recovery is expected | ZUS (decision of ZUS certifying doctor) | **100%** if incapacity is in pregnancy (otherwise 90% for 3 months, then 75%) | up to 12 months | UZ Art. 18, 19 |
| B4 | **Zasiłek w wysokości zasiłku macierzyńskiego** | Pregnant employee whose contract ended due to employer's bankruptcy/liquidation/death and no other job was provided – paid **until the birth** | ZUS | 100% | until the day of birth | UZ Art. 30 ust. 3; RD §17 |
| B5 | **Zasiłek macierzyński za okres urlopu macierzyńskiego** (maternity leave period) | Birth of a child (incl. up to 6 weeks before due date) | Contribution payer >20 insured / ZUS | 100% or 81.5% (option) | 20/31/33/35/37 weeks by number of children born at one birth | UZ Art. 29, 29a, 31; KP Art. 180 |
| B6 | Zasiłek macierzyński **za okres urlopu na warunkach urlopu macierzyńskiego** (adoption / foster family) | Taking a child into care + adoption petition, or non-professional foster family | as B5 | 100% or 81.5% | 20–37 weeks by number of children taken at once; min. 9 weeks | UZ Art. 29 ust. 1 pkt 2–3, ust. 2; KP Art. 183 |
| B7 | Zasiłek macierzyński **za okres uzupełniającego urlopu macierzyńskiego** (supplementary maternity leave – premature / hospitalised newborn) | 1 week per week of the newborn's hospital stay | as B5 | 100% | up to 8 or 15 weeks | KP Art. 180² ; UZ Art. 31 ust. 1 |
| B8 | Zasiłek macierzyński **za okres urlopu rodzicielskiego** (parental leave) | Care for the child, either/both parents | as B5 | 70% (or 81.5% under the option; 9 "other-parent" weeks always 70%) | 41 weeks (1 child) / 43 weeks (≥2 at one birth); "Za życiem": 65/67; extended up to 82/86 (130/134) when combined with part-time work | KP Art. 182¹a–182¹g; UZ Art. 29a ust. 3, 30a, 31 ust. 2–4a |
| B9 | Zasiłek macierzyński **za okres urlopu ojcowskiego** (paternity leave) | Father's own right | as B5 | 100% | 2 weeks (14 days), not extended for multiples | KP Art. 182³; UZ Art. 31 ust. 1 |
| B10 | Zasiłek macierzyński after **stillbirth** (*martwe urodzenie*) or **child death** | Recovery after loss | as B5 | 100% | 8 weeks after birth (min. 7 days from death); 7 days if the child died after 8 weeks of life | KP Art. 180¹; P p. 33–34 |
| B11 | **Zasiłek pogrzebowy** for a stillborn child | Funeral costs | ZUS | flat **7 000 zł** (full amount even if costs were lower) | one-off; apply within 12 months of burial | P p. 35–36 (from *ustawa emerytalna* – not in extract) |
| B12 | **Zasiłek opiekuńczy** (care allowance) | Care of a healthy child <8 in listed situations (incl. **childbirth or illness of the other parent who normally cares for the child**), sick child <14, etc. | Contribution payer >20 / ZUS | 80% | 60 days/calendar year (shared limit) | P p. 36–38; UZ Art. 32 (not in extract) |
| B13 | **Świadczenie rodzicielskie** (parental benefit – *not* ZUS insurance) | Parents with **no** right to zasiłek macierzyński (unemployed, students, *umowa o dzieło*, uninsured mandate workers …) | Municipality (gmina) under *ustawa o świadczeniach rodzinnych* | flat `[UNCERTAIN, GK]` 1 000 zł/month | `[UNCERTAIN, GK]` 52 weeks (1 child), 65/67/69/71 weeks for 2/3/4/≥5 | P p. 35 (mention only); UZ Art. 31 ust. 3a uses its amount as the minimum maternity benefit |
| L1 | **Urlop wychowawczy** (childcare leave – unpaid) | Personal care of child | No ZUS benefit; state budget pays pension/disability + health contributions | 0% (no benefit) | `[GK]` up to 36 months, until end of the calendar year in which the child turns 6 | KP Art. 186 (not in extract; referenced by RW §19); P p. 20, 35 |

> Note on the user brief: "zasiłek w wysokości zasiłku macierzyńskiego" (B4) is a *pre-birth* benefit for women
> who lost their job in pregnancy for the listed reasons. "Świadczenie rodzicielskie" (B13) is a municipal family
> benefit, out of ZUS scope, but the system must route uninsured parents to it.

### 1.2 Lengths as data (for the parameter table / admin panel)

```yaml
maternity_leave_weeks_by_children:        # KP 180 §1; also urlop na warunkach (KP 183 §1, §1¹) by children taken at once
  1: 20
  2: 31
  3: 33
  4: 35
  5_plus: 37
maternity_before_due_date_max_weeks: 6    # KP 180 §2
maternity_mother_mandatory_weeks: 14      # KP 180 §4, UZ 29 ust. 3 (8 in special cases)
maternity_mother_mandatory_weeks_special: 8
parental_leave_weeks: { single: 41, multiple: 43 }                  # KP 182¹a §1
parental_leave_weeks_za_zyciem: { single: 65, multiple: 67 }        # KP 182¹a §2
parental_leave_non_transferable_weeks_per_parent: 9                 # KP 182¹a §4
parental_leave_max_parts: 5                                         # KP 182¹c
parental_leave_deadline: end of calendar year in which child turns 6 # KP 182¹c
parental_leave_combined_with_work_cap_weeks: { single: 82, multiple: 86 }            # KP 182¹f §1
parental_leave_combined_with_work_cap_weeks_za_zyciem: { single: 130, multiple: 134 } # KP 182¹f §1¹
parental_leave_work_max_fraction: 0.5                               # KP 182¹e §1
paternity_leave_weeks: 2            # 14 calendar days, KP 182³ §1
paternity_leave_max_parts: 2        # min. 1 week each, KP 182³ §1¹
paternity_leave_deadline_months: 12 # from birth; adoption: 12 months from final adoption order, max child age 14
supplementary_maternity:            # KP 180²
  before_28w_or_le_1000g: { cap_week_after_birth: 15 }
  28_to_37w_and_gt_1000g: { cap_week_after_birth: 8 }
  after_37w_hosp_ge_2_consecutive_days_first_in_day_5_to_28: { window: "day 5 .. end of week 8", cap_week_after_birth: 8 }
stillbirth_or_death_lt_8w: { weeks: 8, min_days_from_death: 7 }     # KP 180¹ §1
death_after_8w: { days_from_death: 7 }                              # KP 180¹ §2
adoption:
  foster_family_child_max_age: 7          # 10 if school obligation postponed; professional foster family excluded
  adoption_child_max_age: 14
  min_leave_weeks: 9                      # KP 183 §3; ZAL
  parental_weeks_reduced_case: 38         # KP 183 §4 pkt 3, §4² ("§3 case")
  parental_weeks_reduced_case_za_zyciem: 62
sickness_benefit_period_days: { standard: 182, pregnancy: 270, after_title_end_non_pregnancy: 91 }
waiting_period_days: { mandatory: 30, voluntary: 90 }   # UZ Art. 4 – sickness benefit only
care_allowance_days_per_year: 60
```

---

## 2. Eligibility, conditions, exclusions – per benefit

### 2.1 Who is covered by sickness insurance (the master gate)

| Insurance title (*tytuł ubezpieczenia*) | Sickness insurance | Notes / pitfalls | Source |
|---|---|---|---|
| Employee (*umowa o pracę*, any working time) | **Mandatory** | Includes students. Insurance runs from start to end of employment. A *zlecenie*/*dzieło* signed with **one's own employer** (or performed for them) is treated as employment → mandatory. | P p. 6–7 |
| Mandate contract (*umowa zlecenia*, agency, similar services) | **Voluntary**, on request (form **ZUS ZUA**) – only if the person is mandatorily in pension+disability insurance from that contract | Cannot be backdated: starts on the date in ZUA but not earlier than the filing date (exception: if registration happens within 7 days of the obligation arising, the date in ZUA counts). | P p. 9 |
| Mandate contract + employment paying ≥ minimum wage elsewhere | **Not possible** from the mandate (pension/disability only voluntary there) | Only the employment title gives benefits. | P p. 9–10 |
| Mandate contract + employment paying < minimum wage | Mandatory pension/disability from both → voluntary sickness from mandate possible | | P p. 10 |
| Mandate worker who is a **student/pupil under 26** | **No** social insurance at all | → no zasiłek macierzyński; route to świadczenie rodzicielskie (B13). | P p. 10 |
| Mandate + receiving zasiłek macierzyński | Pension/disability from the benefit; mandate may be voluntary for pension/disability but **not** sickness | | P p. 10 |
| Self-employed (*JDG / pozarolnicza działalność*: CEIDG sole trader, creative artist, free profession, single-member sp. z o.o. shareholder, partners of sp. j./k./p., PSA work-shareholders, SKA general partner, school operator) | **Voluntary** (ZUS ZUA) | Same no-backdating rule; exception extended to end of January for a January start under *mały ZUS+*. Voluntary sickness insurance **ends automatically** when the person starts receiving zasiłek macierzyński (and in other title-concurrence cases) – must re-register with ZUA afterwards. Contributions must be paid for every month of coverage. | P p. 12–13, 35 |
| Self-employed under **ulga na start** (first 6 months) | **None** (no social insurance, only health) | No benefits at all; can opt out of the relief by registering. | P p. 14–15 |
| Self-employed + employment ≥ minimum wage | Pension/disability from employment only → **no** voluntary sickness from business | | P p. 13 |
| *Osoba współpracująca* (family member cooperating with a self-employed person / ulga-na-start person / mandate worker) | Voluntary (as self-employed) | Arrears rule (R-ELIG-ARREARS) applies. | P p. 7, 24 |
| Unregistered activity (*działalność nierejestrowa*) | None | No social or health insurance. | P p. 14 |
| *Umowa o dzieło* with a third party | None | → B13. | P p. 7, 35 |
| Unemployed (registered or not) | None (unemployment benefit is not a sickness title) | → B13. | P p. 35; UZ Art. 13 ust. 1 pkt 4 |
| Person on **urlop wychowawczy** | Pension/disability (budget-funded) but **not** sickness – yet UZ Art. 29 ust. 1 explicitly grants zasiłek macierzyński for a birth/adoption **during urlop wychowawczy** | Sickness benefit is not paid for incapacity during urlop wychowawczy (UZ Art. 12 ust. 2 pkt 2). | UZ Art. 29 ust. 1; P p. 20 |
| Person receiving zasiłek macierzyński | Pension/disability funded by the budget; **no** health insurance from this title (NFZ covers treatment) | | P p. 19–20 |

Sham contracts: an employment/mandate contract concluded *dla pozoru* (to obtain benefits) or a business that is not
really run has no legal effect – ZUS issues a decision that the person is **not insured** (*decyzja o niepodleganiu*).
ZUS may also challenge an inflated salary/contribution base and issue a decision lowering the base (P p. 8, 11, 15;
TASK p. 9–10 "zagrożenia"). → Risk flags R-RISK-1/2 below.

### 2.2 Cross-cutting rules

| Rule ID | Rule | Source |
|---|---|---|
| **R-ELIG-INSURED-AT-EVENT** | Zasiłek macierzyński requires that on the **day the right arises** (day of birth / day the child is taken into care; for the pre-birth part, the first day of leave) the person is covered by sickness insurance **or** is on urlop wychowawczy. | UZ Art. 29 ust. 1; P p. 29 |
| **R-ELIG-NO-WAITING-MAT** | There is **no waiting period** (*okres wyczekiwania*) for zasiłek macierzyński – it is available from the first day of insurance. (UZ Art. 4 waiting periods apply only to zasiłek chorobowy.) Zasiłek opiekuńczy also has no waiting period (P p. 38). | UZ Art. 4 (scope), 29 |
| **R-ELIG-WAIT-SICK** | Zasiłek chorobowy: after **30 days** of uninterrupted mandatory insurance, or **90 days** of voluntary insurance. Previous insurance periods count if the gap was ≤30 days or was caused by urlop wychowawczy, unpaid leave or military service. **No waiting** for: graduates insured within 90 days of finishing school/university/doctoral school; incapacity caused by a commuting accident; mandatorily insured with ≥10 years of prior mandatory sickness insurance; MPs/senators within 90 days of term end; certain customs officers. Incapacity during the waiting period is not paid and does not count towards the benefit period. | UZ Art. 4, 9 ust. 3 |
| **R-ELIG-ARREARS** | Self-employed, *osoby współpracujące*, clergy paying own contributions, seafarers (Art. 6 ust. 1 pkt 24 usus): if on the day the right arises they have social-insurance contribution **arrears > 1% of the minimum wage** (2026: 4 806 × 1% = **48.06 zł**), sickness benefit, rehabilitation benefit, maternity benefit and care allowance are **not paid until the entire debt is repaid**. If the debt is not repaid within **6 months** of the day the right arose, the right **expires** (*przedawnia się*). After repayment ZUS pays within 30 days, max **60 days** from repayment. | UZ Art. 2a, 64 ust. 3; P p. 24, 36 |
| **R-ELIG-SHAM** | Insurance title concluded for appearances → ZUS decision of non-insurance → no benefits. Raising the declared contribution base in pregnancy solely to inflate benefits → ZUS may reduce the base. | P p. 8, 11, 15; TASK p. 9–10 |
| **R-ELIG-AFTER-TITLE-MAT** | Zasiłek macierzyński **after insurance ended** only if insurance ended **during pregnancy** because of (1) death, bankruptcy or liquidation of the employer, or (2) termination in breach of law confirmed by a **final court judgment**. Also: a fixed-term or >1-month probation contract that would end after the **3rd month of pregnancy** is **extended to the day of birth** (KP 177 §3; not for replacement contracts, §3¹) and the woman keeps the right to zasiłek macierzyński after the insurance ends (UZ 30 ust. 4). In **all other cases** (e.g. contract simply expired, resignation, closed business, mandate ended, deregistered from voluntary sickness insurance) there is **no** zasiłek macierzyński – even if she received zasiłek chorobowy after title end (B2a). `[UNCERTAIN]` whether Art. 30 cases cover the parental-leave part too – the extract does not say; treat as maternity-leave part only unless confirmed. | UZ Art. 30; KP Art. 177 §3, §3¹ |
| **R-ELIG-SALARY-OVERLAP** | Zasiłek macierzyński is not paid for days for which the person keeps a right to salary, nor during unpaid leave or detention (UZ Art. 12 ust. 1, ust. 2 pkt 1 and 3 via Art. 31 ust. 5). Zasiłek macierzyński is **not** paid for urlop wychowawczy (P p. 35). | UZ Art. 31 ust. 5; P p. 35 |
| **R-ELIG-MULTI-TITLE** | A person insured from several titles may receive zasiłek macierzyński from each title; they must inform every benefit payer about the others and the amounts (UZ Art. 62 ust. 4). The minimum top-up (R-AMT-MIN) is computed on the sum and paid by the payer the person designates (ZUS if ZUS is one of them). From 1.01.2027 one benefit period is set regardless of the number of sickness titles (UZ Art. 9 ust. 4 – sickness benefit). | UZ Art. 62 ust. 4–6, 9 ust. 4 |
| **R-ELIG-ADOPTION-MALE** | The adoption/foster provisions (UZ 29 ust. 1 pkt 2–3) apply equally to a male insured person (UZ 29 ust. 2) – either adoptive parent can take B6. | UZ Art. 29 ust. 2 |

### 2.3 B1/B2 – sickness in pregnancy

- **Trigger:** doctor issues **e-ZLA** with letter code **B** (incapacity in pregnancy). Pregnancy itself is not a ground
  – there must be an illness during pregnancy (P p. 23). The insured may ask in writing that code B is **not** put on
  the e-ZLA (UZ Art. 57 ust. 2) – then the 80% rate and 182-day period apply. `[engine: ask user / read e-ZLA code]`
- **Employee (mandatory insurance):** days 1–33 of incapacity in the calendar year (1–14 if aged 50+, counted from
  the year after turning 50) → B1 **wynagrodzenie chorobowe 100%** paid by employer, computed like the benefit base
  (KP Art. 92). From day 34 (15) → B2 **zasiłek chorobowy 100%** (UZ Art. 11 ust. 2 pkt 1).
- **Voluntarily insured (mandate, self-employed):** no employer sick pay; zasiłek chorobowy from day 1 of incapacity
  (after the 90-day waiting period) (P p. 23; TASK p. 4).
- **Benefit period:** 270 days in pregnancy (UZ Art. 8 ust. 1). All uninterrupted incapacity periods are added, plus
  earlier ones if the gap was ≤60 days; **exception:** periods before a gap of ≤60 days are **not** counted if the
  new incapacity (after the gap) falls in pregnancy – i.e. the 270-day period restarts with the first code-B e-ZLA
  (UZ Art. 9 ust. 2; P p. 24). Employer sick-pay days (B1) count towards the period (UZ Art. 12 ust. 1).
- **After 270 days:** świadczenie rehabilitacyjne (B3) at 100% if still in pregnancy and recovery expected; certified
  by ZUS doctor (UZ Art. 18–19).
- **Exclusions:** incapacity during unpaid leave, urlop wychowawczy, detention, urlop opiekuńczy (KP 173¹) → not
  paid and not counted (UZ Art. 12 ust. 2–3); first 5 days if caused by alcohol abuse (code C) (Art. 16); whole
  period if caused by own intentional crime (Art. 15); **loss of the whole e-ZLA period** if the person works for
  gain or acts contrary to the purpose of the leave (incidental tasks like answering an e-mail are allowed, an
  employer's instruction is never an "important circumstance") (Art. 17; P p. 26–27); forged certificate (Art. 17
  ust. 2).
- **After title ends (B2a):** incapacity starting ≤14 days after insurance ended (≤3 months for listed infectious
  diseases), lasting ≥30 days uninterrupted (UZ Art. 7). Not paid if the person: has a pension; continues/starts gainful
  activity giving sickness insurance; had not completed the waiting period while insured; is entitled to
  unemployment/pre-retirement benefits etc.; is in farmers' insurance (KRUS); or insurance ended after exhausting
  sickness benefit (UZ Art. 13). Base is capped at 100% of average wage for after-title benefits (UZ Art. 46).
  Always paid by ZUS (UZ Art. 61 ust. 1 pkt 2 lit. d).
- **From 1.01.2027:** with ≥2 titles, the insured may ask the doctor not to issue the e-ZLA for a title where the
  work can still be done (UZ Art. 17 ust. 1d–1e).

### 2.4 B4 – zasiłek w wysokości zasiłku macierzyńskiego

- Employee, pregnant, whose employment **expired due to employer's death**, or was **terminated in pregnancy due to
  bankruptcy or liquidation**, and who was **not provided with other employment** → benefit equal to zasiłek
  macierzyński (100% of base) **until the day of birth**; after birth → zasiłek macierzyński under UZ Art. 30 ust. 1
  (UZ Art. 30 ust. 3; KP Art. 177 §4; RD §17).
- TASK p. 4 also lists "termination in breach of law confirmed by final judgment" as a ground for B4 – UZ Art. 30
  ust. 3 does **not** list it (that case gives zasiłek macierzyński *after birth* under Art. 30 ust. 1 pkt 2).
  `[UNCERTAIN – follow UZ text; flag to ZUS mentors]`.

### 2.5 B5 – zasiłek macierzyński for maternity leave

- **Eligible:** insured mother (any sickness-insurance title; non-employees get the benefit for the period
  "corresponding to" the leave – TASK p. 4–5) on the day of birth (R-ELIG-INSURED-AT-EVENT), or a woman covered by
  R-ELIG-AFTER-TITLE-MAT.
- **Length:** 20/31/33/35/37 weeks by number of children **born at one birth** (KP 180 §1). Up to **6 weeks before the
  due date** may be used (KP 180 §2); unused pre-birth weeks are available after birth (§3). If no leave is taken
  before birth, day 1 = day of birth (KP 183¹ §2).
- **Splitting with father:**
  - The mother must use **at least 14 weeks after birth** personally (KP 180 §4; UZ 29 ust. 3).
  - After 14 weeks she may resign from the remainder and return to work if the **father** (employee) takes it, or an
    insured father interrupts gainful activity to care for the child (KP 180 §4–5; UZ 29 ust. 3). Request ≥7 days
    before returning to work (KP 180 §8); father's request ≥14 days before he starts (KP 180 §9). ZUS checks the
    father's sickness insurance when he applies (P p. 30).
  - **8-week exceptions** – father or **another closest family member** (*inny członek najbliższej rodziny*) can take over
    after the mother used ≥8 weeks after birth if: (a) mother holds a decision of **inability to live independently**
    (*orzeczenie o niezdolności do samodzielnej egzystencji*) – remainder (KP 180 §6–7; UZ 29 ust. 5); (b) mother is
    **hospitalised** and cannot care – for the period of hospitalisation, her benefit is interrupted (KP 180 §10–11;
    UZ 29 ust. 6); (c) mother **abandons** the child – from the day after abandonment, not earlier than after her
    8 weeks (KP 180 §13; UZ 29 ust. 7).
  - **Mother's death** during maternity leave/benefit → father/closest family member gets the remainder from the day
    after death (KP 180 §12; UZ 29 ust. 7) – no 8-week minimum.
  - **Uninsured mother** (no sickness-insurance title): father/closest family member gets the maternity-period
    benefit only if the mother **dies**, **abandons** the child, or holds an **inability-to-live-independently**
    decision and cannot care – for the period after the event (KP 180 §15; UZ 29 ust. 9); or if the uninsured mother
    takes up **employment ≥ half-time** (sic – UZ 29 ust. 10, KP 180 §17) – father gets the remainder for the duration
    of her employment.
  - Combined total of mother's + father's maternity leave/benefit cannot exceed the KP 180 §1 length (KP 180 §14; UZ
    29a ust. 2).
- **Hospitalised newborn:** after 8 weeks of maternity leave the mother may defer the rest until the child leaves
  hospital (KP 181).
- **Child placed in foster care / care institution, or abandoned by mother:** mother loses the remainder after that
  day, but maternity leave after birth is never shorter than 8 weeks (KP 182).
- **Termination of 81.5% option, father's later share, ZUS documents:** see §3 and §4.

### 2.6 B6 – adoption and non-professional foster families (*urlop na warunkach urlopu macierzyńskiego*)

- **Eligible:** insured person (woman or man) who (a) took a child **aged ≤14** into care and filed an **adoption
  petition** with the guardianship court, or (b) took a child **aged ≤7** (≤10 if compulsory schooling was postponed)
  into care as a **foster family other than a professional one** (*rodzina zastępcza niezawodowa*) (UZ 29 ust. 1 pkt
  2–3, ust. 2; KP 183 §1, §1¹).
- **Length:** 20/31/33/35/37 weeks by number of children taken **at once**, but not beyond the child's 7th (10th) or
  14th birthday; **minimum 9 weeks** (KP 183 §1, §1¹, §3; ZAL). No pre-arrival part.
- **Parental leave after it:** 41/43 weeks (foster: KP 183 §4; adoption: §4¹, until child turns 14); **38 weeks** in
  the "§3 case" (KP 183 §4 pkt 3, §4²); with "Za życiem": 65/67, or **62** in the §3 case (KP 183 §4³–§4⁵; P p. 32).
  `[UNCERTAIN – interpretation]` The "§3 case" (9 weeks leave / 38 weeks parental) most plausibly applies when the
  age cap would cut the 20-week leave short; confirm with ZUS mentors. Parental leave max 5 parts (KP 183 §4⁶).
- **Foster → adoption:** leave/parental already used as a foster family is deducted from the adoption entitlement
  (KP 183 §7–8).
- **Uzupełniający** also available if the child's hospital stay occurred **after** being taken into care (KP 183 §3¹).
- **Deadlines (employees):** application within **7 days** of taking the child; leave starts on the date requested,
  **no later than 21 days** after taking the child (KP 183 §6). 81.5% option: written request within 21 days of taking
  the child and filing the court petition / taking as foster family (UZ 30a ust. 2).
- **Paternity leave for adoptive father:** within 12 months from the adoption order becoming final, until the child
  turns 14 (KP 182³ §1 pkt 2).

### 2.7 B7 – supplementary maternity leave (*uzupełniający urlop macierzyński*)

- **Eligible:** **one** parent – the mother or the father raising the child (employees under KP 180²; the benefit also
  exists for other insured persons, see RD §26–27 which covers non-employees). Taken **immediately after** maternity
  leave, **in one block** (no splitting). The other parent must declare they will not use it (RW §14; RD §26).
  Poradnik (p. 30) says it is for employees; RD §26 pkt 3 provides a path for non-employees – `[UNCERTAIN – confirm,
  engine should allow non-employees per RD]`.
- **Length (algorithm, KP 180² §1–3):**

```text
input: gestational_week_at_birth (completed weeks), birth_weight_g, hospital_stays[] (per child), births>1?
if multiple births: weight = min(weights); stays = stays of the longest-hospitalised child   # §2
if week < 28 or weight <= 1000:            window = [day 0 .. end of week 15]; cap = 15
elif 28 <= week < 37 and weight > 1000:    window = [day 0 .. end of week 8];  cap = 8
elif week >= 37:
    require a stay of >= 2 consecutive days whose first day is between day 5 and day 28 after birth
    window = [day 5 .. end of week 8]; cap = 8   # hospital days only counted from day 5
days = sum of hospital days falling inside window   # stays are summed (§3)
weeks = ceil(days / 7)                              # incomplete week rounds UP (§3)
weeks = min(weeks, cap)
```
  Note: Poradnik (p. 31) phrases case 1 as "masa poniżej 1000 g"; KP says "niewiększą niż 1000 g" (≤1000 g). Use KP.
  Poradnik/ZAL: requires ≥5 days of hospital stay after birth in general (P p. 30) – implied by the rules above for the
  ≥37-week case; for preterm cases the KP has no 5-day minimum. `[UNCERTAIN – P p. 30 vs KP]`
- **Deadline:** application **≥21 days before the end of maternity leave**, with the hospital certificate (stay period
  + gestational week or birth weight) (KP 180² §4–5; RW §14).
- **Rate:** 100% (UZ 31 ust. 1); not covered by the 81.5% averaging (the 81.5% option covers maternity + parental
  only).

### 2.8 B8 – parental leave (*urlop rodzicielski*)

- **Eligible:** each insured parent (employees: KP 182¹a; non-employees: benefit for the corresponding period).
- **Pool:** 41 weeks (1 child) / 43 weeks (≥2 at one birth); with a **"Za życiem" certificate** (severe irreversible
  impairment or incurable life-threatening illness arising prenatally or during birth, issued under Art. 4 ust. 3 of
  the *ustawa "Za życiem"* by a specialist doctor) 65/67 weeks (KP 182¹a §1–2; P p. 32; TASK p. 5 fn. 2).
- **Non-transferable 9 weeks:** each employee-parent has an exclusive right to 9 weeks out of the pool; it cannot be
  transferred; using ≥9 weeks satisfies it (KP 182¹a §4–5). Consequence: one parent alone can use at most
  41−9 = **32** (43−9 = **34**; Za życiem 56/58) weeks; the other 9 weeks are lost if the other parent doesn't use
  them. The 9-week portion "belonging to the other parent" is always paid at **70%** (UZ 31 ust. 3f).
  `[UNCERTAIN]` How the 9-week reservation applies when the other parent is **not insured/not an employee** – KP §4
  speaks of "employees – parents"; UZ 31 ust. 3h (budget-financed parental benefit for the father when the mother is
  uninsured) and TASK p. 7 ("przysługuje również ojcu, gdy matka na dzień porodu nie była ubezpieczona") suggest the
  insured parent can still use parental benefit; whether the full 41 weeks or only 32 is a known interpretation
  question → make it a configurable flag `nine_weeks_lost_if_other_parent_uninsured` (default **true**, conservative).
- **Simultaneous / alternating:** both parents may be on parental leave at the same time or alternately; combined
  total ≤ pool (KP 182¹a §6–7; UZ 29a ust. 3–4).
- **Parts:** at once or in **≤5 parts**, used **no later than the end of the calendar year in which the child turns 6**
  (KP 182¹c). Number of parts = number of applications, including benefit applications by non-employee parents
  (KP 182¹d §2).
- **Deadline:** application ≥**21 days** before start (KP 182¹d §1). Employee may cancel at any time **with employer's
  consent** (KP 182¹d §3).
- **Combining with work (*łączenie z pracą*)** – only for employees, at the employer granting the leave (KP 182¹e,
  182¹f; UZ 31 ust. 4a):
  - Work ≤ **½ of full time**; leave is granted for the remaining part of working time.
  - Request ≥21 days before starting work; employer must accept unless impossible due to work organisation/type;
    refusal in writing/electronically within 7 days.
  - **Benefit reduced proportionally** to working time: `benefit × (1 − work_fraction)`.
  - **Leave extended proportionally:** `extension_weeks = weeks_combined × work_fraction` (KP 182¹f §2), only for the
    combined part (§3); cap 82/86 weeks (Za życiem 130/134) (§1, §1¹). Fractional weeks are granted in days, partial
    days dropped (§4). The extension is attached to the combined part (§5). If the extension itself is combined with
    work at fraction `f2`, its length becomes `extension_weeks / (1 − f2)` (§7). The employee states how the extension
    will be used in the request (§6; RW §16).
  - Contribution side: employee is in pension/disability insurance from both employment and the benefit (P p. 19).
- **Rate:** 70% (UZ 31 ust. 2), or 81.5% under the option (R-AMT-815); 9 "other-parent" weeks 70% (31 ust. 3f). If
  **not a single day** of parental benefit is used in the **child's first year**, parental benefit is 70% (31 ust.
  3g) and the parent may request a **one-off top-up of the maternity-leave benefit from 81.5% to 100%** (31 ust. 4).

### 2.9 B9 – paternity leave (*urlop ojcowski*)

- Father's **own, independent** right – also when the mother is uninsured (P p. 32; TASK p. 8). Employees under KP 182³;
  insured non-employee fathers get the benefit for the corresponding period (RD §33).
- **2 weeks = 14 calendar days**, at once or in **2 parts of ≥7 days**; multiples do not extend it (TASK p. 8).
- Must be used **before the child turns 12 months** (adoption: within 12 months of the final adoption order, child ≤14);
  otherwise the right **expires** (KP 182³ §1; P p. 33).
- Applies also to a father who started work after the birth, while the child is <12 months (TASK p. 8).
- Request ≥**7 days** before (KP 182³ §2). Non-employee: benefit request filed before the start date (RD §33 pkt 3).
- Rate **100%** (UZ 31 ust. 1).

### 2.10 B10 – stillbirth / death of the child

- Stillbirth (**regardless of pregnancy duration** – RD §13 ust. 1 pkt 2) or child death before **8 weeks (56 days)** of
  life → maternity leave/benefit of **8 weeks after birth**, but **not shorter than 7 days from the death** (KP 180¹
  §1). Child dies after 8 weeks → benefit continues **7 days from the death** (KP 180¹ §2).
- **Multiples:** leave length follows the **number of children who survive**, never shorter than 7 days from a death
  (KP 180¹ §1–2).
- Same rules for employees and non-employees (P p. 33). Rate **100%** (P p. 34).
- Documents: abbreviated birth certificate with "stillborn" annotation, or if no birth certificate was drawn up –
  certificate of stillbirth from an OB-GYN specialist / OB-GYN resident / midwife, based on medical records (RD §13;
  P p. 33).
- **Zasiłek pogrzebowy 7 000 zł** for the person who organised and paid for the funeral, application (form **Z-12**) +
  bills within **12 months of the burial**; if no birth certificate with stillbirth annotation – death card or
  stillbirth certificate (P p. 35–36).
- `[UNCERTAIN, GK]` After stillbirth the parent is not entitled to parental leave; the 9-week/paternity rights depend
  on there being a child to care for – engine should present only B10 + B11 + B12 (care allowance not applicable) +
  charity support info (TASK §3 i).
- Product note: TASK requires listing **charity-only organisations** supporting parents after child loss, premature
  birth, miscarriage, severe illness – not covered by these materials.

### 2.11 B12 – zasiłek opiekuńczy (relevant around birth)

- 80% of the sickness-benefit base; no waiting period; either parent, but only one per period (the one who applies);
  only if no other household member can care, unless the child is sick and under 2 (P p. 36–38).
- Birth-relevant trigger: **childbirth or illness of the spouse/other parent who permanently cares for a child under
  8** (P p. 37) – e.g. father caring for an older sibling while the mother gives birth.
- Limits: 60 days/year for children <14 (shared total cap 60 days/year per insured regardless of number of children);
  30 days for a sick disabled child 14–18; 14 days for older children/adult family (P p. 38).
- Forms: **Z-15A** (child), **Z-15B** (other family member) to employer / ZUS (P p. 38). Not paid automatically.
- Also (RD §40, UZ Art. 32a – not in extract) a care allowance for the father/other insured when the insured mother is
  hospitalised/abandons the child/has an inability decision after using 8 weeks of maternity benefit
  `[UNCERTAIN – Art. 32a text not provided]`.

### 2.12 L1 – urlop wychowawczy (childcare leave) `[GK – KP Art. 186 not in extract]`

- Employee with ≥6 months of total employment; up to **36 months**, until the end of the calendar year in which the
  child turns 6; each parent has **1 non-transferable month**; up to 5 parts; application ≥21 days before.
  Additional up to 36 months (until the child turns 18) for a child with a disability certificate. Single parent /
  other parent deceased, deprived of parental authority etc. → may use all 36 months (RW §19 ust. 2 pkt 4 confirms
  these documents). Alternative: reduced working time ≥½ during the period the leave could be taken (KP 186⁷; RW §20).
- **No ZUS cash benefit** (P p. 35). State budget pays pension/disability contributions (base: average salary from the
  12 months before the leave, capped at 60% of forecast average wage, floor 75% of minimum wage) and health
  contributions (P p. 20).
- Interplay: a new birth during urlop wychowawczy gives zasiłek macierzyński (UZ 29 ust. 1); incapacity during it gives
  no sickness benefit (UZ 12 ust. 2 pkt 2); voluntary sickness waiting periods bridge over it (UZ 4 ust. 2).

### 2.13 B13 – świadczenie rodzicielskie `[GK – amounts and lengths not in materials]`

- For a parent of a newborn/adopted child **not entitled** to zasiłek macierzyński or *uposażenie macierzyńskie*:
  unemployed, students, *umowa o dzieło*, uninsured mandate workers, farmers (KRUS) etc. (P p. 35).
- Amount used by ZUS as the **floor** for zasiłek macierzyński (UZ 31 ust. 3a) – configure as `parental_benefit_amount`
  (believed 1 000 zł/month since 2016 – verify for 2026). Applications to the municipality / gov.pl – out of ZUS
  scope; the guide must route there.

---

## 3. Amount formulas

### 3.1 Benefit base (*podstawa wymiaru zasiłku*) – employees (UZ Art. 36–45, applied to maternity by Art. 47)

```text
R-BASE-EMP-1  base = average monthly "wynagrodzenie" over the 12 full calendar months preceding the month in which the
              right arose (incapacity / birth / start of pre-birth maternity leave / taking the child)          # Art. 36 ust. 1
              where wynagrodzenie = gross contribution base for sickness insurance − employee-financed social
              contributions (9.76% pension + 1.5% disability + 2.45% sickness = 13.71%)                         # Art. 3 pkt 3
R-BASE-EMP-2  insured < 12 months → average over the FULL calendar months of insurance                           # Art. 36 ust. 2
R-BASE-EMP-3  right arises in the 1st (incomplete) month → salary the person would earn for a full month:
              fixed monthly pay from the contract; or pay for worked days ÷ days worked × days due; or, if nothing
              earned, average variable pay of employees in similar positions                                    # Art. 37
R-BASE-EMP-4  only earnings from the payer during the CURRENT uninterrupted sickness insurance count             # Art. 36 ust. 4
R-BASE-EMP-5  months with < ½ of the working time worked (justified absence) are EXCLUDED; months with ≥ ½ are
              TOPPED UP to a full month (fixed components: full contractual amount; variable components:
              actual ÷ days worked × working days). If every month is < ½ → all months, topped up               # Art. 38 ust. 2–3
R-BASE-EMP-6  quarterly bonuses: 1/12 of amounts paid for the 4 quarters before the month of the event;
              annual bonuses (13th salary): 1/12 of the amount paid for the previous year;
              components not paid during benefit periods (e.g. some allowances) are excluded                    # Art. 41–42
R-BASE-EMP-7  change of working time in the reference months or in the month of the event → base = pay for the NEW
              working time                                                                                      # Art. 40
R-BASE-EMP-8  NO recalculation if the gap between benefits (of any type) is < 1 calendar month                   # Art. 43
              (e.g. zasiłek chorobowy in pregnancy → zasiłek macierzyński: same base; P p. 28). Exception per
              Poradnik p. 25: working time changed between the benefits.
R-BASE-EMP-9  FLOOR for FULL-TIME employees: base ≥ minimum wage − 13.71%  (2026: 4 806,00 − 658,90 = 4 147,10 zł)
              not for part-time; not for employees outside the minimum-wage act                                 # Art. 45
R-BASE-EMP-10 no upper cap for employees (the 30× annual cap applies to pension/disability contributions only; the
              sickness contribution base is not capped – P p. 7). Cap of 100% average wage only for benefits after
              the title ended (Art. 46).
R-BASE-DAY    daily base = base / 30                                                                            # Art. 36 ust. 3
```

### 3.2 Benefit base – non-employees (mandate, self-employed, collaborators) (UZ Art. 48–50, 52)

```text
R-BASE-NE-1   base = average monthly "przychód" for the 12 calendar months before the month the right arose,
              przychód = sickness-insurance contribution base − 13.71% of it                                    # Art. 48 ust. 1, Art. 3 pkt 4
              (for self-employed: the DECLARED contribution base, P p. 25)
R-BASE-NE-2   uninterrupted insurance from the same title only; consecutive mandates with the same client or
              consecutive periods of business count as uninterrupted                                            # Art. 48 ust. 2 → 36 ust. 4; P p. 25
R-BASE-NE-3   declared-base insureds (self-employed) insured < 12 months:                                       # Art. 48a ust. 1
              base = avg(minimum contribution base − 13.71%) over full months
                   + (1/12) × avg(declared base − minimum base, after 13.71% deduction) over full months × n_months
              (this dampens last-minute base increases). If the business always declared ≥ 60% of forecast average
              wage (art. 18 ust. 8 usus), the "minimum base" is that 60% amount                                  # Art. 48a ust. 5
              Gap ≤ 30 days from another title → those months count (max 12 total)                              # Art. 48a ust. 2–3
              Gap caused only by non-payment/late payment of the sickness contribution → months before it count  # Art. 48a ust. 4
R-BASE-NE-4   right arises before the first full calendar month of insurance:
              self-employed → minimum contribution base for that month − 13.71%;
              mandate → contract income for that month − 13.71% (or average of similar contracts)                # Art. 49 ust. 1
R-BASE-NE-5   months with activity < ½ month due to benefit periods are excluded; ≥ ½ included as is             # Art. 50
R-BASE-NE-6   no statutory floor (Art. 45 is for employees only); ceiling follows from the contribution cap:
              voluntary sickness contribution base ≤ 250% of forecast average wage = 23 550 zł (2026)
              → max benefit base 23 550 × 0.8629 ≈ 20 321,29–20 321,30 zł (ZAL states 20 321,30; rounding depends on
              whether 13.71% is rounded first)                                                                   # P p. 11, 18; ZAL
```

2026 parameter values (from materials unless flagged):

| Parameter | Value | Source |
|---|---|---|
| Minimum wage (*minimalne wynagrodzenie*) | **4 806,00 zł** | ZAL |
| Employee contribution deduction | **13.71%** | UZ Art. 3 pkt 4; P p. 24 |
| Minimum benefit base, full-time employee | **4 147,10 zł** (4 806 × 0.8629) | computed from ZAL/Art. 45 |
| Forecast average monthly wage 2026 (*prognozowane przeciętne wynagrodzenie*) | **9 420,00 zł** (derived: 23 550 / 2.5) | derived from ZAL |
| Self-employed standard minimum declared base (60%) | **5 652,00 zł** → benefit base **4 877,11 zł** | derived; P p. 15 |
| Self-employed preferential base (30% of min wage, first 24 months) | **1 441,80 zł** → benefit base **1 244,13 zł** | derived; P p. 15 |
| Max voluntary sickness contribution base (250%) | **23 550,00 zł** → benefit base cap **20 321,30 zł** (ZAL) | ZAL; P p. 11 |
| Arrears threshold (1% min wage) | **48,06 zł** | UZ Art. 2a |
| Minimum maternity benefit (= świadczenie rodzicielskie) | `[UNCERTAIN, GK]` **1 000 zł/month**, compared net of PIT advance | UZ 31 ust. 3a; P p. 19 |
| Funeral grant (stillbirth) | **7 000 zł** | P p. 35 |
| PIT advance on benefits | `[GK]` 12% (first bracket), no tax-deductible costs (P p. 24 confirms no costs); health contribution **not** deducted from benefits | P p. 24 (no costs); GK for 12% |

### 3.3 Rates

| Rule ID | Situation | Rate of base | Source |
|---|---|---|---|
| R-AMT-SICK | Sickness benefit, rehabilitation benefit and employer sick pay **in pregnancy** (code B) | **100%** (80% otherwise) | UZ 11 ust. 2 pkt 1, 19 ust. 1; KP 92 §1 pkt 2 |
| R-AMT-MAT100 | Maternity leave (incl. pre-birth), leave on maternity terms, supplementary leave, paternity leave, stillbirth, B4 | **100%** | UZ 31 ust. 1, 30 ust. 3; P p. 33–34 |
| R-AMT-PAR70 | Parental leave (default "variable" option) | **70%** | UZ 31 ust. 2 |
| R-AMT-815 | **Averaged option**: mother files, **no later than 21 days after birth**, a written request for benefit for maternity + parental leave in full (or declares she will use it in full) → **81.5% for the whole maternity + parental period** (20–37 + 32/34 weeks), except the 9 weeks of the other parent (70%) | **81.5%** | UZ 30a ust. 1, 31 ust. 3, 3f; P p. 34 |
| R-AMT-815-ADOPT | Same for adoption/foster: request ≤21 days after taking the child (and filing the court petition) | 81.5% | UZ 30a ust. 2 |
| R-AMT-815-SHARE | Under the option the mother may share the parental part (except the 9 reserved weeks) with the father | `[UNCERTAIN]` father's shared part paid at 81.5% of **his own** base (ZUS practice; UZ 31 ust. 3 "za cały okres") | UZ 30a ust. 3 |
| R-AMT-815-1Y | If **no day** of parental benefit is used in the child's first year → parental at 70%, and one-off top-up (*jednorazowe wyrównanie*) of the maternity part to 100% **on request** | 70% / top-up | UZ 31 ust. 3g, 4 |
| R-AMT-9W | 9 weeks of parental leave of the other parent | always **70%** | UZ 31 ust. 3f; P p. 34 |
| R-AMT-WORK | Parental leave combined with part-time work at fraction f | rate × (1 − f) | UZ 31 ust. 4a |
| R-AMT-CARE | Care allowance | **80%** | P p. 38 |
| R-AMT-MIN | If monthly maternity benefit (net of PIT advance) < świadczenie rodzicielskie → raised to it; prorated for partial months; budget-funded; with several titles, the sum is compared and one payer pays the difference | floor | UZ 31 ust. 3a–3c, 62 ust. 5–6; P p. 19 |

Note: the user brief says "21 days **before** birth for 81.5%" – that is wrong. The deadline is **21 days after
birth** (UZ 30a ust. 1). The 21-day **before** deadlines apply to applications for parental leave, supplementary
leave and combining with work (KP).

### 3.4 Formulas

```text
monthly_benefit = round(base × rate, 2)
daily_benefit   = round(monthly_benefit / 30, 2)          # practice: ZUS rounds daily amount
benefit_for_period = daily_benefit × calendar_days         # every calendar day, incl. weekends
net ≈ benefit − PIT advance (12% × benefit, rounded to full zł)   [GK; PIT-2 reduction may apply]
if monthly net < parental_benefit_amount → top-up (prorated by days / days_in_month?) [UNCERTAIN prorating basis]
```

### 3.5 Worked examples (2026 parameters)

**E1 – Employee, stable salary 8 000 zł gross, 1 child, no pregnancy sick leave.**
- Base = 8 000 − 13.71% (1 096,80) = **6 903,20 zł**.
- Option A (100% / 70%): maternity 20 wks = 140 days × 230,11 = 32 215,40; parental 32 wks (her share, the father's 9
  weeks excluded) = 224 days × 161,07 = 36 079,68 → **68 295,08 zł** gross (monthly: 6 903,20 then 4 832,24).
- Option B (81.5%, request ≤21 days after birth): 52 wks = 364 days × 187,54 (5 626,11/30) = **68 264,56 zł** gross
  (monthly 5 626,11). Same total within rounding (100×20 + 70×32 = 42.4 week-equivalents; 81.5×52 = 42.38).
- Choice driver: A pays more up front; B is safer if the mother may return to work early (B overpays the maternity
  part vs. parental later – if she stops after 20 weeks she received 81.5% instead of 100% and only gets the top-up
  if no parental day was used in year 1, R-AMT-815-1Y).
- Father's 9 weeks: 70% of **his** base (e.g. his base 5 000 → 3 500/month).

**E2 – Full-time employee on minimum wage.** Base floor 4 147,10. 100% = 4 147,10; 81.5% = 3 379,89; 70% = 2 902,97.
Net > 1 000 → no top-up.

**E3 – Pregnant employee on sick leave from month 4 (code B), birth in month 9.**
- Days 1–33 of the year: employer sick pay 100%; days 34+: zasiłek chorobowy 100%; benefit period 270 days.
- Maternity starts at birth with **no gap** → base not recalculated (R-BASE-EMP-8): same base as the sickness benefit.
- If the e-ZLA had been issued **without code B** (at her request): 80% and the 182-day period.

**E4 – Mandate worker (voluntary sickness insurance since 10 months), monthly contract income 1 500 zł.**
- Base = 10-month average (full months) 1 500 − 13.71% = 1 294,35. 70% = 906,05 gross; net (−12% ≈ 109) ≈ 797 < 1 000 →
  topped up to the świadczenie rodzicielskie amount (R-AMT-MIN). 81.5% = 1 054,90 gross ≈ 928 net → also topped up.
- If she were a student <26 → not insured at all → świadczenie rodzicielskie only.
- Sickness benefit in pregnancy requires 90 days of voluntary insurance (met here).

**E5 – Self-employed, voluntary sickness insurance for 6 full months, declared 15 000 zł/month, standard minimum 5 652.**
- Art. 48a: min part 5 652 × 0.8629 = 4 877,11; excess (15 000 − 5 652 = 9 348) × 0.8629 = 8 066,39 × 6/12 = 4 033,20;
  base = **8 910,31** (not 12 943,50 as a naive 12-month average would give). 81.5% → 7 261,90/month.
- With 12+ months at 15 000: base 12 943,50 (cap 20 321,30). ZUS may additionally challenge a base raised in pregnancy
  (R-ELIG-SHAM).
- Arrears of 60 zł on the birth date (> 48,06) → benefit withheld until fully paid; not paid within 6 months → right
  expires (R-ELIG-ARREARS).
- On starting maternity benefit her voluntary sickness insurance ends; must re-file ZUA afterwards.

**E6 – Twins.** Maternity 31 weeks; parental pool 43 weeks (mother max 34). Option B: (31 + 34) = 65 weeks at 81.5%.
Supplementary leave uses the lightest twin's weight and the longest hospital stay.

**E7 – Parental leave combined with ½-time work (employee, base 6 903,20, option A 70%).**
- Combines all 32 of her weeks at f = 0.5 → benefit 4 832,24 × 0.5 = **2 416,12/month** (+ half salary from work).
- Extension = 32 × 0.5 = 16 weeks (→ 48 weeks of leave, capped at 82 for the whole pool).
- If she also works ½ during the 16-week extension: its length = 16 / (1 − 0.5) = 32 weeks → total 64 weeks.
- Under option B: 5 626,11 × 0.5 = 2 813,05/month.

**E8 – Preterm birth.** Born in week 30, 1 400 g → cap 8 weeks after birth. Hospital: day 0–24 (25 days) → ceil(25/7) =
**4 weeks** of supplementary leave at 100%, starting the day after maternity leave ends. Born in week 26 (or ≤1000 g)
and hospitalised 12 weeks → 12 weeks (cap 15). Born week 39, hospitalised days 10–13 (4 days, first day in 5–28) → 1 week.

**E9 – Stillbirth.** 8 weeks of maternity benefit at 100% from the birth date + 7 000 zł funeral grant to the person
who paid for the funeral (Z-12 within 12 months of burial).

**E10 – Adoption of a 6.5-year-old by a foster family (non-professional).** The foster-family age limit is 7 →
leave ends at the 7th birthday but cannot be shorter than 9 weeks (KP 183 §3); parental leave 38 weeks in that case
`[interpretation flagged in §2.6]`.

---

## 4. Documents, forms, who files, channels

### 4.1 Who decides and pays (R-PAY-1)

| Insured person | Benefit payer (*płatnik zasiłku*) | Source |
|---|---|---|
| Employee / mandate worker of a contribution payer reporting **>20** sickness-insured persons (as of **30 November of the previous year**; new payers: first month of reporting) | **The contribution payer** (employer/client) – decides and pays on payroll dates | UZ 61 ust. 1 pkt 1, ust. 2; P p. 23 |
| Same, payer with **≤20** insured | **ZUS** – payer forwards the application + certificate **within 7 days**; ZUS pays within 30 days of the last relevant fact | UZ 61 ust. 1 pkt 2 lit. a, 61b ust. 5, 64 |
| Self-employed, *osoba współpracująca*, clergy | **Always ZUS** | UZ 61 ust. 1 pkt 2 lit. b–c |
| Benefits after insurance ended (B2a, Art. 30 maternity, B4) | **ZUS** | UZ 61 ust. 1 pkt 2 lit. d |
| Employee of a foreign employer insured in PL | ZUS | UZ 61 ust. 1 pkt 2 lit. e |
| ZUS started paying before 31 Dec → continues in the next year even if payer becomes >20 | ZUS | UZ 61 ust. 4 |

### 4.2 Forms (names as used by ZUS)

| Form | Purpose | Filed by → to | Notes |
|---|---|---|---|
| **e-ZLA** | Electronic sick-leave certificate (letter codes A/B/C/D/E) | Doctor → ZUS → payer's PUE/eZUS profile (next day) | Printout only if payer has no PUE profile or on request (UZ 55–58) |
| **ZAS-53** | Application for sickness benefit (to ZUS) | Insured (e.g. self-employed) → ZUS | TASK p. 3; RD Annex 1 |
| **Z-3** | Contribution payer's certificate (employee) – salary components, leave periods | Employer → ZUS (when ZUS pays) | RD §3, Annex 2 |
| **Z-3a** | Payer's certificate – non-employee (mandate etc.) | Client → ZUS | RD Annex 3 |
| **Z-3b** | Certificate for self-employed | Self-employed → ZUS | **Abolished from 24.10.2026** (TASK fn. 5); Poradnik (p. 25, 28, 34) still cites it |
| **ZAS-12** | Payer's certificate for a further period (*na dalszy okres*) | Payer → ZUS | TASK p. 3 `[exact content UNCERTAIN]` |
| **ZAM** | Application for zasiłek macierzyński (maternity, parental, paternity – all) | Insured → payer or ZUS | Since **24.10.2026** absorbs **ZUR** (parental) and **ZAO** (paternity) (TASK fn. 3–4) |
| **ZUS ZUA** | Registration for (voluntary) insurance | Insured/payer → ZUS | No backdating |
| **Z-15A / Z-15B** | Care allowance (child / other family member) | Insured → employer / ZUS | P p. 38 |
| **Z-12** | Funeral grant | Payer of funeral → ZUS | P p. 36 |
| Leave applications (no official ZUS form; content set by **RW**) | Maternity part pre-birth, resignation, father's part, supplementary, parental, combining, paternity, adoption, urlop wychowawczy, reduced hours | Employee → employer | Employer **must** accept (except combining with work; reduced hours) |

### 4.3 Document matrix per case (RD + RW)

| Case | Documents | Source |
|---|---|---|
| Maternity – pre-birth part | Medical certificate (*zaświadczenie lekarskie na zwykłym druku*) with **expected date of birth** (electronic version possible 12 months after RD comes in force); employee leave request with the date | RD §13 ust. 1 pkt 1, §39; RW §2 |
| Maternity – from birth | **Odpis skrócony aktu urodzenia** (or foreign birth document; translation unless EU/EFTA/agreement state) – **not needed when ZUS pays**: ZUS fetches it from the civil-status registry using child's name, PESEL, date/place of birth + parent's PESEL; if ZUS can't, it asks (≥14 days) | RD §13 ust. 2–4; P p. 34; RW §21 |
| Stillbirth | Birth certificate with stillbirth annotation, or stillbirth certificate from OB-GYN/resident/midwife | RD §13 ust. 1 pkt 2; P p. 33 |
| Born abroad | Foreign hospital/doctor certificate of due date; foreign birth document | RD §14 |
| After insurance ended in pregnancy (Art. 30) | Medical certificate of pregnancy during employment; świadectwo pracy / document on employer death, bankruptcy, liquidation; or final court judgment on unlawful termination | RD §15 |
| B4 | As above + statement that no other job was provided | RD §17 |
| Adoption | Statement on date of taking the child; court certificate on petition date (with child's birth date) or copy of petition stamped by the court | RD §16 ust. 1; RW §18 |
| Foster family | Court order (final or interim) placing the child, or contract with the *starosta*; proof of child's age; school-postponement decision if relevant | RD §16 ust. 2; RW §18 |
| Mother resigns after 14 weeks | Mother's statement with the date from which the father takes over; employer's certificate of the end date (if ZUS pays) or non-employee's request; father's application + birth certificate + certificate of mother's paid period and rate | RD §18, §20; RW §3, §5 |
| Mother with inability-to-live-independently decision | + copy of the final decision | RD §21–22; RW §4, §12 |
| Mother hospitalised | Hospital certificates of admission (and discharge); mother's statement; father's undertaking to report discharge | RD §23–24; RW §6–7 |
| Mother's death / abandonment | Father's statement of the date; birth certificate | RD §20 ust. 3–4; RW §8–11 |
| Uninsured mother takes ≥½-time job | Mother's statement (with employer name/NIP); father's statement and undertaking | RD §25; RW §13 |
| Supplementary maternity | **Hospital certificate** (stay period + gestational week or weight band); other parent's statement of non-use; employer certificate (if ZUS pays) or non-employee request **before end of maternity benefit** | KP 180² §5; RD §26–27; RW §14 |
| Parental leave | Birth certificate; statement on the other parent's (non-)use in the period; copy of "Za życiem" certificate (employer) / **statement** that the child has it (ZUS application suffices – UZ 61b ust. 4a); employer certificate of leave period and working time if combining (if ZUS pays); list of payers, parts used and rates | RD §29–30, §32; RW §15–16 |
| Parental – mother uninsured | Father's statement that the mother has no sickness-insurance title (with her PESEL) | RD §32 |
| Paternity | Birth certificate or final adoption order; statement whether already used (also from another title); non-employee: request before start | RD §33; RW §17 |
| Minimum top-up | Statement on other titles and designated payer; other payers' certificates | RD §28 |
| Sickness benefit (ZUS pays) | e-ZLA (ZUS has it) + payer certificate Z-3/Z-3a, or application with Annex 1 data incl. bank account; after title end: statement per Annex 4 (pension? unemployment benefit? new work? KRUS?) | RD §2–4 |
| Care allowance (child <8, other parent giving birth) | Medical certificate on ordinary form about the other parent's childbirth/illness/hospitalisation (with name of the child – even if not yet named) | RD §36 |
| General | Documents already in the employee's personnel file need not be attached (RW §22); copies allowed, originals on request (RW §23; UZ 61b ust. 4, 5b) | |

### 4.4 Channels

- Employee whose employer pays (>20): everything to the **employer** (paper or electronic) – no separate ZUS application
  (P p. 34). Employer's own forms usually include the choice of the 81.5%/100-70% option.
- Employer ≤20: to the **employer**, who forwards to ZUS within 7 days (UZ 61b ust. 5).
- Self-employed / collaborator: directly to **ZUS** – recommended via **PUE/eZUS** (P p. 25, 28, 35); mZUS app; e-mail
  mama@zus.pl / cot@zus.pl for questions; helpline 22 560 16 00 (P p. 39).
- From **1.07.2026**: applications to ZUS – paper, or electronic document signed with a qualified signature, **profil
  zaufany**, personal ID signature, or the ZUS system's own authentication, sent to ZUS's **electronic inbox
  (ePUAP ESP)** or **e-Doręczenia** address; such electronic attachments are legally equivalent to signed originals
  (UZ 61b ust. 1, 5a). To a payer-as-benefit-payer: paper or electronic (any form).
- Application must contain: insured's name, PESEL (or passport + DOB), address; payer's NIP/PESEL; circumstances
  affecting the right/amount (UZ 61b ust. 3).
- Appeals: if the insured thinks their rights were violated by the payer, they (or the payer) can ask ZUS to determine
  the entitlement (UZ 63); ZUS decisions → court appeal.

---

## 5. Canonical timeline with decision points

```text
T0  Planning / before pregnancy
    D0.1  Is there a sickness-insurance title? (employee: auto; mandate/JDG: ZUS ZUA voluntary sickness – no backdating)
    D0.2  Waiting period for sickness benefit (30 / 90 days) – maternity benefit has NO waiting period
    D0.3  JDG: ulga na start = NO insurance → opt out if a pregnancy is planned; preferential base → low benefits
    D0.4  JDG: Art. 48a – base raised < 12 months before birth is diluted; contribution arrears must be 0 (≤48,06 zł)
    D0.5  Risks: sham contract / inflated base / ending a contract before birth

T1  Pregnancy confirmed (doctor's *świadectwo lekarskie*, KP 185 §1)
    - Employee protection starts: no termination (except disciplinary with union consent / bankruptcy, liquidation),
      paid time off for prenatal exams (KP 177 §1, 185 §2)
    - Fixed-term contract ending after month 3 of pregnancy → extended to birth (KP 177 §3)
    D1.1  Illness? → e-ZLA code B → B1 (33/14 days, employer, 100%) → B2 (100%, up to 270 days) → B3 (100%)
    D1.2  Contract ends during pregnancy? → classify: employer death/bankruptcy/liquidation → B4 until birth + maternity;
          unlawful (court) → maternity after birth; other → only B2a (if ill ≤14 days after) and NO maternity benefit
    D1.3  Changing job / working time during pregnancy affects the base (Art. 40, 36 ust. 4)

T2  Due date − 6 weeks … due date
    D2.1  Start maternity leave early (max 6 weeks before due date)? Needs due-date certificate; request ~14 days before
          (P p. 27). Otherwise maternity starts on the birth date (KP 183¹ §2)
    D2.2  Father: plan paternity leave (request ≥7 days before) and parental leave

T3  Birth (day 0) – right to zasiłek macierzyński arises; must be insured on this day
    - Register the birth at USC (akt urodzenia, child's PESEL) – ZUS can fetch the abbreviated certificate
    D3.1  Number of children → maternity 20/31/33/35/37 weeks; parental 41/43
    D3.2  Stillbirth / death < 8 weeks → B10 (8 weeks, min 7 days from death) + B11 funeral grant
    D3.3  Premature / hospitalised newborn → B7 eligibility check (week, weight, hospital days)
    D3.4  "Za życiem" certificate → parental 65/67 weeks
    D3.5  Other parent caring for an older child while mother gives birth → care allowance (B12)

T3+21d  DEADLINE: 81.5% averaged option request (UZ 30a) – after this only 100%/70%

T3+8w   Earliest takeover by father/other family member in special cases (mother hospitalised / inability decision /
        abandonment); earliest end of mother's leave if she gives up after a hospitalised child (KP 181, 182)

T3+14w  Earliest the mother can hand the rest of maternity leave to the father (her request ≥7 days before return;
        father's request ≥14 days before start)

Maternity end − 21d  DEADLINE: supplementary maternity leave request (with hospital certificate)
Maternity end        → supplementary leave (if any) → parental leave
Parental start − 21d DEADLINE: parental leave request; combining-with-work request (employer replies within 7 days)

T3+12 months  DEADLINES: paternity leave expires; if no parental day used in year 1 → parental at 70% and the 81.5%
              → 100% one-off top-up can be requested
Each benefit  Claim limitation: 6 months from the last day of the period the benefit is for (3 years if payer/ZUS
              error; from the end of an obstacle beyond the person's control) (UZ 67)
JDG with arrears: repay within 6 months of the right arising, or the right expires (UZ 2a ust. 2)

After parental leave
    - Return to the same or equivalent position (KP 186⁴); protection from termination ends with the leave
    - Optional urlop wychowawczy (unpaid, up to 36 months until end of year child turns 6) or reduced hours
    - JDG: re-register for voluntary sickness insurance (ZUA)
End of calendar year in which child turns 6: last day for parental leave parts (and childcare leave [GK])
```

---

## 6. Data points – sources

Legend for "Plausible source": **CSZ/KSI** = ZUS central systems (insurance accounts, contribution reports
ZUS RCA/DRA/ZUA/ZWUA, Centralny Rejestr Ubezpieczonych, Centralny Rejestr Płatników Składek); **e-ZLA** = ZUS
sick-leave register (UZ 55b); **PUE/eZUS** = ZUS portal; **CEIDG** = business register; **KRS**; **PESEL/RSC** =
population and civil-status registry (birth/death certificates); **P1/SIM** = e-health system (CSIOZ/CeZ) incl.
e-prescriptions, hospital stays, Rejestr Asystentów Medycznych; **NFZ** = ZIP/eWUŚ; **Employer** = payroll/HR;
**User** = only the person can tell (self-declaration).

| # | Data point | Used by rules | Plausible state source | Only user? / notes |
|---|---|---|---|---|
| 1 | Identity, PESEL, address, DOB (age ≥50 for 14-day rule) | all | PESEL; ZUS CRU | mObywatel login (simulated) |
| 2 | Sex / role (mother, father, adoptive parent, other family member) | B5–B9 | PESEL (sex); RSC (parentage on birth certificate) | Role for adoption/foster: user + court docs |
| 3 | Current and past insurance titles with dates (employment, mandate, JDG, collaborator, maternity benefit, urlop wychowawczy) | gate, waiting periods, Art. 48a, Art. 36 ust. 4 | **ZUS CSZ/KSI** (ZUA/ZZA/ZWUA registrations) | Future plans (contract end, new job) – user |
| 4 | Sickness insurance flag (mandatory/voluntary), start/end dates, gaps | R-ELIG-*, R-ELIG-WAIT-SICK | **ZUS CSZ/KSI** (insurance code in ZUA; "poświadczenie ubezpieczenia chorobowego" – internal ZUS doc, TASK p. 12) | |
| 5 | Monthly sickness-contribution base per title, last 12+ months | R-BASE-* | **ZUS KSI** (RCA reports from payers / DRA of self-employed) | Salary components detail (quarterly/annual bonuses, top-ups for <½ months) – **Employer** (Z-3 data); user may estimate |
| 6 | Working time (etat fraction) and changes | R-BASE-EMP-7/9, combining | ZUS (ZUA includes working time) / Employer | Planned changes – user |
| 7 | Days worked vs. due per month, absences | R-BASE-EMP-5 | Employer only (Z-3) | User can declare approx. |
| 8 | Contribution arrears on a given date (> 48,06 zł) | R-ELIG-ARREARS | **ZUS KSI** (account balance; "zaświadczenie o niezaleganiu") | Simulated per TASK p. 13 |
| 9 | Payer's number of sickness-insured persons as of 30 Nov previous year (>20?) | R-PAY-1 | **ZUS** (payer reports) | User may know "small/large company" |
| 10 | Payer identity (NIP, REGON, name), payer's PUE profile | forms, routing | ZUS CRPS; KRS/CEIDG/REGON (GUS) | |
| 11 | Business status: active/suspended, start date, ulga na start, preferential base, mały ZUS+ | gate, Art. 48a/49 | **CEIDG** (start/suspension); ZUS (insurance code shows relief/preferential) | |
| 12 | Company role (sp. z o.o. sole shareholder, partner) | gate | **KRS** | |
| 13 | Student status and age <26 (mandate) | gate | POL-on (universities) / SIO (schools) `[plausible]`; ZUS (code) | User |
| 14 | e-ZLA history: periods, letter codes (B, A, C…), hospital stays, payer | B1–B3, benefit period | **ZUS e-ZLA register** | |
| 15 | Days of employer sick pay already used this year | B1 | Employer; ZUS (from Z-3/e-ZLA) partially | User |
| 16 | Pregnancy confirmed, expected due date | timeline, pre-birth leave | **P1** (e-health records, *karta ciąży* – partially electronic) `[plausible]`; certificate is a doctor's document | **User** (primary) |
| 17 | Date of birth, number of children born at one birth, child PESEL, place | B5–B10 | **PESEL / RSC** (akt urodzenia) | Before registration – user |
| 18 | Stillbirth / child death date | B10, B11 | **RSC** (akt urodzenia z adnotacją / akt zgonu); P1 (karta zgonu) | User (sensitive) |
| 19 | Gestational week at birth, birth weight, newborn hospital stays | B7 | **P1/SIM** (hospital discharge, *karta noworodka*) `[plausible]`; hospital certificate | User |
| 20 | "Za życiem" certificate | B8 length | Issued by NFZ-contracted specialist – possibly P1 `[plausible]` | **User statement suffices** (UZ 61b ust. 4a) |
| 21 | Mother's hospitalisation after birth | UZ 29 ust. 6 | P1/NFZ | User |
| 22 | Inability-to-live-independently decision (mother) | 8-week exceptions | ZUS (orzecznictwo) if ZUS decision; disability boards (EKSMOON) `[plausible]` | User |
| 23 | Other parent's identity and insurance status, benefits used (parental weeks, parts, rates) | 9-week rule, pool, parts | **ZUS** (if both in ZUS; benefits paid by large payers are reported to ZUS only partially `[UNCERTAIN]`) | User statements required by RD/RW |
| 24 | Marital status / parentage, abandonment, death of mother | special cases | RSC (marriage, death) | Abandonment – user |
| 25 | Adoption: date of taking child, court petition date, final adoption order; foster placement order / contract with starosta; school postponement | B6 | Courts (no central API) `[plausible: court portal]`; PCPR | **User** + documents |
| 26 | Contract end date (fixed-term), reason for termination (bankruptcy, liquidation, employer death, unlawful) | Art. 30, B4, KP 177 §3 | ZUS (ZWUA deregistration code); KRS (bankruptcy/liquidation); RSC (employer death); courts | User |
| 27 | Planned leave choices: 81.5% vs 100/70; split with partner; start dates; combining with work (fraction) | calculators | — | **User only** |
| 28 | Other closest family member taking over | special cases | — | User |
| 29 | Bank account | payment | ZUS (if on file); — | User |
| 30 | PIT-2 / tax settings | net amount | — | User / payer |
| 31 | Unemployment benefit / pension status (exclusions after title end) | B2a | Praca.gov / PUP (unemployment); ZUS (pension) | User |
| 32 | KRUS farmer insurance | B2a exclusion, B13 | KRUS | User |
| 33 | Concurrent titles and payers for minimum top-up | R-AMT-MIN | ZUS KSI | User designates the payer |
| 34 | Health insurance status (NFZ) | info only | NFZ eWUŚ | |

---

## 7. Rule list for implementation (summary)

1. **Gate**: `insured_sickness(person, date)` from titles (§2.1), arrears (R-ELIG-ARREARS) and sham-contract flags.
2. **Sickness in pregnancy**: waiting period → B1/B2 split by employee status and age → 270-day benefit-period tracker
   with the code-B restart rule → B3 → after-title rules (Art. 7, 13).
3. **Maternity entitlement**: event type (birth / adoption / foster / stillbirth) × insured-at-event × Art. 30 exceptions.
4. **Lengths**: tables in §1.2 keyed by children, Za życiem, adoption age caps, stillbirth/death dates, hospital stays.
5. **Allocation** between parents: mother's mandatory 14 (8) weeks; takeover scenarios; parental pool with 9-week
   reservation per parent; ≤5 parts; deadline end of year child turns 6; simultaneous use allowed.
6. **Rate selection**: 100/70 vs 81.5 (deadline 21 days after birth/adoption), 9-week 70% override, first-year rule,
   combining reduction.
7. **Base**: employee (12-month average, exclusions/top-ups, floor, Art. 43 continuity, Art. 40 working-time change)
   vs non-employee (declared base, Art. 48a dilution, Art. 49 first month, cap).
8. **Amount**: base × rate, daily = /30, per calendar day; minimum top-up to świadczenie rodzicielskie; PIT estimate.
9. **Routing**: payer >20 vs ZUS; forms (ZAM, Z-3/Z-3a, ZAS-53, e-ZLA, Z-15A, Z-12); attachments per RD/RW; deadlines
   (§5).
10. **Risk messages**: no insurance on birth day; contract ending before birth; JDG arrears; ulga na start; voluntary
    insurance lapse after maternity; sham contract / base increase scrutiny; parental leave not used in year 1;
    paternity expiry at 12 months; claim limitation 6 months.

## 8. Open questions / uncertainties to confirm with ZUS mentors

1. Świadczenie rodzicielskie amount for 2026 and whether the floor comparison is on the net amount (Poradnik p. 19 says
   net of PIT advance) – value not in materials.
2. Whether Art. 30 (birth after insurance ended) maternity benefit covers parental leave as well.
3. B4 grounds: UZ 30 ust. 3 (death/bankruptcy/liquidation) vs TASK p. 4 (adds unlawful termination).
4. 9-week reservation when the other parent is uninsured/not an employee (can the insured parent take 41 or only 32
   weeks?).
5. Father's rate when sharing parental leave under the mother's 81.5% application.
6. Supplementary maternity leave for non-employees (RD §26 implies yes; Poradnik p. 30 says employees).
7. Meaning of the KP 183 §3 "9 weeks" / §4 pkt 3 "38 weeks" adoption case.
8. ZAS-12 exact purpose; replacement for Z-3b after 24.10.2026 (presumably ZAM/ZAS-53 only).
9. Minimum-benefit top-up proration basis for partial months (calendar days of month vs. 30).
10. Urlop wychowawczy and świadczenie rodzicielskie details are from general knowledge (KP Art. 186 and the family
    benefits act are not in the materials).
11. Combining work with maternity benefit for non-employees (e.g. continuing a business) – not addressed in the extract;
    UZ 31 ust. 5 does not apply Art. 17 (loss of benefit for working) to maternity benefit – confirm practice.
