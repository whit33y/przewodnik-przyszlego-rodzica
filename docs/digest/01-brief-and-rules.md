# 01 — Challenge brief and competition rules (digest)

Sources (both read in full):
- `docs/ZUS - Pełna treść zadania konkursowego.pdf` — full challenge brief, 16 pages (referred to below as **Brief**, with page numbers `p.N`).
- `docs/ZUS - Regulamin zadania konkursowego.pdf` — competition rules, 4 pages (**Rules**, `§N`).

Quotes are verbatim Polish with an English gloss. Where the brief is silent on something a planner might expect (WCAG, RODO, language, deadlines), this is stated explicitly in section 7.

---

## 0. TL;DR for the planner

- **Official challenge name:** "Zasiłkowy Przewodnik Przyszłego Rodzica" (Benefits Guide for the Future Parent). Event: **HackNation 2026**, organised by the Ministry of Digital Affairs (Ministerstwo Cyfryzacji), operated by PROIDEA; prize funded by **ZUS**.
- **What to build:** a responsive (RWD) **web app** that gives future parents / pregnant women / parents of newborns / adoptive and foster parents **personalised** information about ZUS benefits in pregnancy and parenthood, **calculates** maternity benefit (zasiłek macierzyński) duration and amount across many scenarios in **one integrated calculator**, guides users through **documents, deadlines and where to file** (employer vs ZUS), warns about **risks of losing benefits**, lists **charity support organisations**, and **simulates** integrations: mObywatel login, ZUS data download, contribution debt certificate, e-ZLA sick-note preview, PUE/eZUS connection, filling and sending applications, civil-registry birth certificate request. Plus an **admin panel** to change parameters (rates, max durations) when the law changes.
- **Jury will test it with the provided sample cases** (PDF forms in `docs/Sprawy`) and **check calculation correctness**. The site **must allow uploading / selecting sample applications**, verifying whether the person is insured, and running the calculator on them.
- **Scoring:** Relevance to challenge 25% · Idea 20% · Originality 15% · Completeness & UX 25% · Implementation potential 15%.
- **Deliverables:** title + detailed description, ≤10-slide presentation, ≤3-min video (public link), code repo, screenshots, live demo URL, graphics, and an explicit **list of which features use AI**.
- **Preferred stack:** React/Next.js frontend; JS/Python/C#/.NET backend; REST API between them. Must work in test conditions but have production potential.
- **Prize:** single main prize, 30,000 PLN gross; winner must sign a **copyright transfer** to ZUS and hand over source code with description.

---

## 1. Problem statement and users

### 1.1 Organisational context (Brief p.1–2)
- ZUS collects social-insurance contributions from contribution payers (płatnicy składek) and grants/pays benefits. Social insurance = pension (emerytalne), disability (rentowe), sickness (chorobowe), accident (wypadkowe).
- Sickness insurance (ubezpieczenie chorobowe) covers:
  - illness of the insured, **including illness during pregnancy** → sickness benefit (zasiłek chorobowy) and rehabilitation benefit (świadczenie rehabilitacyjne);
  - illness of a family member → care allowance (zasiłek opiekuńczy);
  - **birth of a child or taking a child into care** → maternity benefit (zasiłek macierzyński).
- Brief insists on distinguishing three roles (p.1):
  - **płatnik** — contribution payer, "instytucja zatrudniająca" (the employing institution);
  - **ubezpieczony** — the insured person, "ten za którego składki są płacone";
  - **świadczeniobiorca** — the beneficiary, "ten który pobiera świadczenia z ZUS".
- Benefits are paid **either by the payer (employer) or by ZUS**. Footnote 1 (art. 61 ust. 1 pkt 1 ustawy zasiłkowej): payers who report **more than 20 insured persons** to sickness insurance determine entitlement, calculate and pay the benefits themselves. Headcount is taken as of **30 November of the previous calendar year** (or, for payers who had nobody insured on that date, as of the first month they reported someone). → Smaller payers: ZUS pays.
- ZUS pays maternity benefit to "setek tysięcy osób" (hundreds of thousands of people) a year.

### 1.2 Why ZUS wants this (Brief p.1–2, p.10–11)
- "Chcemy, aby każdy planujący zostać rodzicem mógł łatwo odnaleźć potrzebne informacje i świadomie korzystać z przysługującego mu wsparcia." (Everyone planning to become a parent should easily find information and consciously use available support.)
- Explicitly also for people who **adopt** or become **foster parents** ("Przewodnik adresujemy też do osób, które zdecydują się na adopcje albo zostaną rodzicami zastępczymi.").
- Avoid misunderstandings and disputes that good early information would prevent; support people "również w bardzo trudnych sytuacjach, takich jak urodzenie martwego dziecka" (also in very difficult situations such as stillbirth).
- Benefits for ZUS: fewer missing or wrongly filled documents → shorter case handling, less correspondence; insured are "nie zaskakiwany naszymi decyzjami" (not surprised by decisions); fewer disputes incl. court cases; lower cost; better image of ZUS as open, trustworthy, caring about beneficiaries' rights.
- **Key structural gap:** "w stanie obecnym Zakład jest informowany o narodzinach dziecka i powiązanych z tym świadczeniami dopiero po jego narodzinach. Nie ma więc możliwości wcześniejszej weryfikacji uprawnień do tych świadczeń lub ich wysokości." (ZUS learns of the birth only after it happens; there is no way to verify entitlement or amount earlier.) → A pre-birth planning/verification tool is the opportunity.

### 1.3 Pain points reported by users (Brief p.11, section 2 "Wyzwanie")
Pregnant women and new parents report difficulty getting comprehensive information; they don't know about rights they have, or are surprised by lack of entitlement. Causes listed:
1. lack of knowledge of rights to benefits in pregnancy/after birth **and of the possibility of losing them or having them reduced**;
2. difficulty establishing entitlement in **special situations**, e.g. stillbirth (urodzenie martwego dziecka), premature birth (wcześniak), serious illness of the mother or her death;
3. difficulty establishing **the amount** of the benefit;
4. complicated procedures and documentation;
5. **changes to employment conditions during pregnancy** that affect entitlement and amount.

Additionally: the system is increasingly flexible (combining work and family life), but "rodzice czasami rezygnują z możliwości łączenia ról w obawie przed utratą uprawnień / świadczeń albo z niewiedzy" (parents sometimes give up combining roles from fear of losing benefits or ignorance).

### 1.4 The core ask (Brief p.11) — quote
> "Wyzwanie polega na zaprojektowaniu narzędzia – dedykowanego dla osób planujących rodzicielstwo, dla kobiet w ciąży i dla rodziców, którym urodzi się dziecko – które zapewni kompleksowe informacje o przysługujących uprawnieniach z ubezpieczeń społecznych w okresie ciąży i rodzicielstwa. Przeprowadzi ich przez proces występowania o świadczenia, będzie wsparciem w podejmowaniu świadomych decyzji dotyczących korzystania z urlopów i świadczeń, planowania powrotu do pracy oraz dzieleniem się opieką nad dzieckiem, a także będzie wsparciem w sytuacjach skomplikowanych. Będzie przewodnikiem dla przyszłych rodziców."

English: a tool for (a) people planning parenthood, (b) pregnant women, (c) parents whose child is born, that gives comprehensive info on social-insurance entitlements in pregnancy and parenthood; **guides them through applying**; supports informed decisions on **leave and benefits, planning return to work, sharing childcare between parents**; supports **complicated situations**; acts as a guide.

### 1.5 Personas / situations implied by the brief
(Derived from the brief's content and the sample-case file names; not given as formal personas.)

By employment / insurance title:
- **Employee (pracownica / pracownik, umowa o pracę)** — mandatory sickness insurance; 30-day waiting period; employer pays "wynagrodzenie chorobowe" for first 33 days (14 days if 50+), then zasiłek; gets actual **leave** (urlop) from employer; Labour Code protection applies.
- **Contract-of-mandate worker (umowa zlecenia)** — voluntary sickness insurance; 90-day waiting period; files ZAM; payer issues Z-3a; benefit paid by authorised payer or ZUS. Sample cases include refusal for mandate contract without sickness insurance.
- **Self-employed (pozarolnicza działalność gospodarcza)** — voluntary sickness insurance; 90 days; files directly with ZUS (ZAS-53 for sickness, ZAM for maternity); **contribution debt** on the day the right arises is critical (sample refusals for debt); no Labour Code protection; "zasiłek za okres odpowiadający okresowi urlopu" (no leave as such).
- **Collaborating person (osoba współpracująca)** — sample cases with refusal due to contribution debt.
- **Uninsured person / person whose insurance ended** — refusals; special case "zasiłek w wysokości zasiłku macierzyńskiego" after job loss due to employer bankruptcy/liquidation/death or unlawful termination; maternity benefit after insurance ended (sample: employment until the day of birth).

By parental role / situation:
- Pregnant woman on sick leave (zasiłek chorobowy w ciąży, e-ZLA code "B", 100%).
- Mother after birth (maternity leave 20+ weeks, 14 weeks obligatory personally).
- Father: takes over part of maternity leave; paternity leave (urlop ojcowski, 14 days); his 9 non-transferable weeks of parental leave; father's parental leave when mother uninsured.
- Both parents sharing parental leave simultaneously or alternately.
- Parent combining parental leave with part-time work (≤ half-time).
- Multiple births (twins etc.), premature babies, hospitalised newborns (uzupełniający urlop macierzyński), extremely premature (<1000 g).
- Child with "Za życiem" certificate (severe, irreversible impairment or life-threatening illness) → extended parental leave.
- **Stillbirth or death of child** (before/after 8 weeks of life), miscarriage, mixed outcomes in multiple births.
- Mother's serious illness, hospitalisation, incapacity for independent existence, death, abandonment of child → father takes over early.
- **Adoptive parents** (przysposobienie) and **non-professional foster families** (rodzina zastępcza niezawodowa).
- Person who raised contribution base during pregnancy or concluded a sham contract (risk scenarios).

Other stakeholders: **employer/payer** (receives applications, pays benefits if >20 insured, issues Z-3/Z-3a), **ZUS case officers**, **ZUS admin** (maintains parameters).

---

## 2. Domain rules stated in the brief (business logic to encode)

Legal basis listed in the brief (p.2) — note the fictional/future 2026 dates:
- Ustawa z 25 czerwca 1999 r. o świadczeniach pieniężnych z ubezpieczenia społecznego w razie choroby i macierzyństwa (Dz.U. z 2026 r. poz. 854) — "**ustawa zasiłkowa**".
- Kodeks pracy, ustawa z 26 czerwca 1974 r. (Dz.U. z 2026 r. poz. 1245).
- Rozporządzenie MRPiPS z 27 września 2026 r. on information affecting entitlement and documents needed (Dz.U. z 2026 r. poz. 1316) — "**rozporządzenie**".
- Auxiliary: Rozporządzenie MRPiPS z 11 marca 2025 r. on employee parenthood-related leave applications and attached documents (Dz.U. z 2025 r. poz. 322).

(Details on durations, amounts and the basis of assessment are in the **Załącznik** docx and the ZUS Poradnik — see other digests. Below is everything the brief itself states.)

### 2.1 Sickness benefit in pregnancy — zasiłek chorobowy w ciąży (p.2–4)
- Paid from the Social Insurance Fund (FUS) to people with sickness insurance (in some cases also after insurance ends), by ZUS or an authorised payer, for incapacity to work due to illness.
- **Process:** doctor visit → doctor issues electronic sick note **e-ZLA**; pregnancy is marked with letter code **"B"** → e-ZLA goes electronically **directly to ZUS and to the employer's PUE/eZUS profile**.
- **Employees** inform employer per Labour Code. Authorised payer pays on the basis of e-ZLA; non-authorised payer forwards the claim to ZUS with payer certificate **Z-3** (or **ZAS-12** for a further period).
- **Mandate contract (umowa zlecenia):** refrain from work; submit documents to ZUS or payer; authorised payer pays on the e-ZLA; otherwise payer sends **Z-3a** to ZUS.
- **Non-employees e.g. self-employed:** refrain from work; file **ZAS-53** (sickness benefit application) with ZUS.
- **Entitlement:** must be covered by sickness insurance:
  - mandatory (e.g. employment contract): right generally after **30 days of uninterrupted insurance**;
  - voluntary (e.g. mandate contract, business): generally after **90 days of insurance**.
- Employees: first **33 days** of incapacity in a calendar year (**14 days** for employees aged 50+) paid by employer as "wynagrodzenie chorobowe"; zasiłek chorobowy from the next day.
- Non-employees: zasiłek from **day 1** of incapacity.
- Amount in pregnancy: **100% of the benefit basis** (podstawa wymiaru zasiłku) if e-ZLA has code "B".
- Paid for the period of incapacity in e-ZLA, max **"okres zasiłkowy" = 270 days**.
- **End:** return to work when incapacity ends; if incapacity lasts until birth → maternity leave / maternity benefit starts after birth.

### 2.2 Special: benefit equal to maternity benefit — zasiłek w wysokości zasiłku macierzyńskiego (p.4)
- For a pregnant woman who **lost employment** in circumstances specified by the act; paid **until the day of birth**, after insurance ended. Cases:
  - employment terminated during pregnancy due to employer's **bankruptcy, liquidation or death** and no other employment provided;
  - **unlawful termination** of a pregnant woman's contract, confirmed by a **final court judgement** (prawomocny wyrok).
- Amount: **100%** of the basis (like maternity benefit for maternity leave).

### 2.3 Rehabilitation benefit — świadczenie rehabilitacyjne
- Mentioned in p.1 and required in deliverable (a), but **not described** anywhere in the brief (see open questions).

### 2.4 Maternity benefit — zasiłek macierzyński: general (p.4–5)
- From FUS, to sickness-insured persons (in some cases after insurance ends), by ZUS or authorised payer, for incapacity due to **birth or taking a child into care, and the need to care for the child**.
- **Employees** get it for the period of **leave actually granted**; **non-employees** get it "za okres odpowiadający okresowi urlopu" (for the period corresponding to the leave — no leave is granted).
- Periods covered — on birth: **macierzyński**, **uzupełniający urlop macierzyński**, **rodzicielski**, **ojcowski**; on taking a child into care: **urlop na warunkach urlopu macierzyńskiego**, **rodzicielski**.
- Same rules for employees and non-employees as to duration (wymiar) and amount (wysokość).

### 2.5 A) For the mother (p.5–6)
- Maternity leave may start **max 6 weeks before the expected due date** (needs doctor's certificate of expected due date); or she may work until birth.
- After birth: right to maternity benefit for maternity leave; duration depends on **number of children born in one birth** (1 child → **20 weeks**).
- **First 14 weeks after birth must be used personally by the mother.**
- After maternity leave: supplementary maternity leave (only in strictly defined situations) and parental leave; parental leave length depends on **number of children** and **"Za życiem" certificate**; can be taken **at once or in up to 5 parts**, no later than the **end of the calendar year in which the child turns 6**. With "Za życiem" → extended parental leave.
- "Za życiem" (footnote 2): issued under art. 4 ust. 3 of the 4 Nov 2016 act on support for pregnant women and families "Za życiem", for severe and irreversible impairment or incurable life-threatening illness arising prenatally or during birth; stated by a public-health-insurance doctor with 2nd-degree specialisation or specialist title in obstetrics & gynaecology, perinatology, neonatology, paediatric neurology, paediatric cardiology or paediatric surgery.
- **Stillbirth / child death:**
  - stillbirth or death **before 8 weeks of life** → maternity benefit for **8 weeks after birth**, but not less than **7 days from the child's death**; with multiple births → leave proportional to the number of children who survived;
  - death **after 8 weeks of life** → right retained for **7 days from death**; multiple births → as above.
- **Documents:**
  - Employee applies to employer for maternity leave; if she plans parental leave right after, **one application** suffices. Authorised employer determines and pays, or sends **Z-3** to ZUS.
  - Non-employee files **ZAM** directly with ZUS.
  - Mandate contract: authorised payer or ZUS determines; she files **ZAM**, payer sends **Z-3a** to ZUS.
  - Attach documents needed for entitlement (e.g. **stillbirth certificate** — zaświadczenie o martwym urodzeniu) or affecting duration (e.g. **"Za życiem" certificate**, **hospital certificate** for supplementary maternity leave).

### 2.6 B) For the father (p.7–8)
- Father can get maternity benefit for maternity leave when he **takes over part of it** from the mother, or in special situations when the mother doesn't use it.
- **Takeover rule:** mother must use **min. 14 weeks** after birth; then she may resign from the rest (or apply for only 14 weeks) provided the father takes over the remainder; father's leave starts **immediately after** the mother's.
- **Early takeover (before 14 weeks)** in cases defined by Labour Code and the act, e.g. mother: has a certificate of **incapacity for independent existence** (niezdolność do samodzielnej egzystencji); is in **hospital** preventing care; **died or abandoned** the child. Father takes leave for the hospitalisation period or remaining part.
- **Parental leave for the father:** parents may use it **simultaneously or alternately**, or father after the mother. Father also entitled when **mother was uninsured on the day of birth** and didn't receive maternity benefit for maternity leave.
- **Each parent has an exclusive, non-transferable 9-week part** of the common pool of **41 or 43 weeks** of parental leave. Up to **5 parts**, until end of the calendar year the child turns 6.
- **Paternity leave (urlop ojcowski):** for an **employee** father raising the child (biological or adoptive), exclusive right of the father. Also for a father who started work after the birth if the child is under 12 months, and when the mother isn't sickness-insured.
  - Max **14 calendar days** incl. weekends; at once or in **two parts of min. 7 days**; **multiples don't extend it**.
  - Until the child turns **12 months**; adoption: within **12 months from the adoption ruling becoming final**, but no later than the child's **14th birthday**. Unused → expires.

### 2.7 C) Supplementary maternity leave — uzupełniający urlop macierzyński (p.8)
- For mother or father (only one of them) when the child is **premature** or born on time but **requiring hospitalisation**. Granted **once, not divisible**, **immediately after** maternity leave.

### 2.8 D) Taking a child into care (p.8–9)
- For an insured person who took a child as a **non-professional foster family** (rodzina zastępcza niezawodowa) or took a child and **applied to court for adoption** (przysposobienie).
- **Leave on terms of maternity leave** (urlop na warunkach urlopu macierzyńskiego): child up to **7 years** (up to **10** if school obligation deferred) — foster family; up to **14 years** — adoption application.
- Parental leave as for birth (accounting for the child's age).

### 2.9 E) Combining parental leave with work (p.9)
- Employee may work for the employer granting the leave **up to half of full-time**; leave is granted for the remaining part; **parental leave is extended proportionally** (max limits in Labour Code); maternity benefit is paid for the extended period too.

### 2.10 F) Duration — wymiar (p.9)
- Derives from the leave lengths in the Labour Code; given in the **attached table (Załącznik)**.

### 2.11 G) Amount — wysokość (p.9)
- **100%** of basis: maternity leave, leave on terms of maternity leave, supplementary maternity leave, paternity leave.
- **70%**: parental leave.
- **81.5%** for the whole period (maternity + leave on terms of maternity + parental) if the insured mother files a **written application no later than 21 days after birth** to be paid for the full maternity + parental leave.

### 2.12 H) Risks to entitlement (p.9–10) — must be surfaced (deliverable h)
1. **Sham contract / sham business** (umowa / działalność dla pozoru) concluded only to get sickness insurance → ZUS may issue a decision of **non-coverage** by social insurance → no benefits.
2. **Raising the contribution base during pregnancy** solely to get higher benefits → ZUS may set a **lower basis**.
3. **Not being sickness-insured on the day of birth**, e.g. not registering for voluntary sickness insurance; termination of employment, closing the business, ending the mandate contract before birth (deregistration).

### 2.13 I) Labour Code protection (p.10)
- During pregnancy, maternity leave, and from the day of filing an application for maternity / on-terms-of-maternity / supplementary / paternity / parental leave until its end, the employer **cannot prepare for or give notice / terminate** (unless disciplinary grounds and the union consents).
- Fixed-term or probation contract (>1 month) that would end **after the 3rd month of pregnancy** is **extended until the birth**.
- Protection **does not apply** to non-employees (e.g. self-employed).

---

## 3. Explicit requirements

### 3.1 Expected outcome — general (Brief p.12, section 3 "Oczekiwany rezultat")
> "Narzędzie, które w prosty i przystępny sposób dostarczy rodzicom istotnych informacji o przysługujących im uprawnieniach. Pomoże rodzicom podejmować świadome decyzje dotyczące korzystania z urlopów związanych z rodzicielstwem i prawem do świadczeń, które mogą w związku z tym uzyskać. **Narzędzie powinno ustalać uprawnienia w sposób skonkretyzowany, tj. biorąc pod uwagę indywidualną sytuację danej osoby.**"

> "Informacja o indywidualnej sytuacji może pochodzić z danych zgromadzonych w ZUS, ale również może pochodzić z danych samodzielnie wprowadzanych przez osobę zainteresowaną jak np. planowana data porodu, data ustania stosunku pracy itp."

→ Simple and accessible; **individualised** entitlement determination; inputs from (simulated) ZUS data **and/or** self-entered data (due date, employment end date, etc.).

### 3.2 "Narzędzie powinno zapewnić" — content/calculator features (p.12–13), verbatim list
- **a)** "informacje o przysługujących świadczeniach w czasie ciąży (w tym także brak uprawnień do świadczeń), tj. o zasiłku chorobowym, świadczeniu rehabilitacyjnym oraz zasiłku w wysokości zasiłku macierzyńskiego;" — info on pregnancy benefits **including lack of entitlement**: sickness benefit, rehabilitation benefit, benefit equal to maternity benefit.
- **b)** "kalkulator zasiłku macierzyńskiego dla obojga rodziców (okres trwania i wysokość) przy uwzględnieniu wszystkich okoliczności, które mogą mieć wpływ na jego wymiar (jak np. liczba dzieci, ich wiek, zaświadczenie „Za życiem")" — maternity benefit calculator for **both parents** (duration and amount), considering all circumstances (number of children, age, "Za życiem").
- **c)** "kalkulator zasiłku macierzyńskiego w przypadku łączenia pracy z urlopem rodzicielskim (okres trwania oraz wysokość zasiłku)" — calculator for **combining work with parental leave**.
- **d)** "kalkulator, który umożliwi symulację zasiłku w sytuacji, gdy z uprawnień związanych z opieką na dzieckiem będą chcieli skorzystać oboje rodzice (okres trwania oraz wysokość zasiłku)" — simulation when **both parents share** the entitlements.
- **e)** "kalkulator zasiłku macierzyńskiego dla rodziców adopcyjnych i osób sprawujących funkcję rodziny zastępczej niezawodowej (okres trwania oraz wysokość zasiłku)" — **adoptive parents and non-professional foster families**.
- **f)** "kalkulator wysokości zasiłku przy uwzględnianiu indywidualnej podstawy wymiaru zasiłku – symulacja zasiłku przy uwzględnieniu konkretnej sprawy z podanych w zestawach" — amount calculator using the **individual benefit basis** — simulation **for a specific case from the provided sets** (i.e. driven by `docs/Sprawy`).
- **g)** "informacje o dokumentach, terminach i sposobie złożenia wniosków o świadczenia, przy uwzględnieniu, że zasiłek może wypłacać płatnik składek (pracodawca) albo ZUS (ukierunkowanie ubezpieczonego gdzie powinien złożyć dokumenty)" — documents, **deadlines**, how to file; route the user to **employer vs ZUS**.
- **h)** "informacje o zagrożeniach i ryzykach związanych z możliwością utraty uprawnień do świadczeń albo ze zmianą wymiaru i wysokości świadczeń" — **risks** of losing entitlement or of changed duration/amount.
- **i)** "informacje o podmiotach mających charakter wyłącznie charytatywny, które mogą udzielić wsparcia rodzicom w szczególnych sytuacjach np. śmierci dziecka, przedwczesnego porodu i narodzin wcześniaka, poronienia, urodzenia się dziecka ciężko chorego." — **purely charitable** organisations supporting parents (child death, premature birth, miscarriage, seriously ill child).
- **j)** "kalkulator zasiłku macierzyńskiego dla rodziców adopcyjnych i osób sprawujących funkcję rodziny zastępczej (okres trwania i wysokość)." — near-duplicate of (e) but **without "niezawodowej"** (see open questions).

> "**Rekomendujemy, żeby wszystkie kalkulatory były udostępnione w formie zintegrowanego kalkulatora z możliwością wybrania odpowiednich opcji.**" (bold in original) — all calculators should be **one integrated calculator with selectable options**.

### 3.3 "Narzędzie powinno zapewnić możliwość" — capabilities / simulated integrations (p.13–14), verbatim
- "logowania się przez **mObywatela** (należy wyłącznie zasymulować to logowanie);" — mObywatel login, **simulate only**.
- "pobrania danych z systemów ZUS, tj. danych o ubezpieczeniu albo jego braku, wprowadzenia danych we własnym zakresie w celu ustalenia uprawnień do świadczeń (należy wyłącznie zasymulować pobieranie);" — download from ZUS systems data on **insurance or its absence**, and **manual data entry**; **simulate** the download.
- "uzyskania wyświetlenia danych o stanie **zadłużenia z tytułu składek** na ubezpieczenia społeczne na dzień powstania prawa do świadczenia co jest istotne szczególnie dla osób prowadzących pozarolniczą działalność gospodarczą (należy wyłącznie zasymulować wystawienie zaświadczenia i wysokość zadłużenia);" — show **contribution debt status as of the day the right arises** (esp. for self-employed); **simulate issuing a certificate and the debt amount**.
- "symulacji podglądu danych o zaświadczeniach lekarskich **e-ZLA** wystawionych z powodu niezdolności do pracy ze względu na chorobę;" — simulated preview of e-ZLA sick notes.
- "symulacji połączenia z **PUE/eZUS** (możliwość zapytania w razie wątpliwości, sprawdzenie danych zgromadzonych na koncie ubezpieczonego);" — simulated PUE/eZUS connection: **ask a question when in doubt**, check data on the insured's account.
- "symulacji wypełnienia wniosków o urlopy i świadczenia związane z rodzicielstwem i ewentualnie przesłanie ich do pracodawcy/ZUS (**wnioski o urlopy wymagają zaprojektowania**, wnioski o świadczenia dostępne są na stronie www.zus.pl);" — simulate filling **leave applications** (team must **design** these forms) and **benefit applications** (existing ZUS forms, e.g. ZAM), optionally sending to employer/ZUS.
- "symulacji złożenia wniosku o wydanie odpisu zupełnego lub skróconego **aktu stanu cywilnego** (urodzenia dziecka) https://www.gov.pl/web/cyfryzacja/rejestr-stanu-cywilnego ;" — simulate requesting a full/short **birth certificate copy** from the civil registry (USC / Rejestr Stanu Cywilnego).
- "pozyskania informacji o podmiotach udzielających wsparcia w szczególnych sytuacjach jak np. śmierć dziecka np. fundacje, stowarzyszenia etc;" — info on support organisations (foundations, associations).
- "przekierowania na odpowiednie informacje dotyczące uprawnień związanych z rodzicielstwem zawarte w stronie ZUS www.zus.pl, Ministerstwa Rodziny, Pracy i Polityki Społecznej https://www.gov.pl/web/rodzina/urlop-rodzicielski, Państwowej Inspekcji Pracy https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo." — **deep links** to ZUS, MRPiPS, PIP.

### 3.4 Admin panel / configurability (p.14) — quote
> "Dodatkowo narzędzie powinno być tak zaprojektowane, aby była możliwość wprowadzania zmian w jego parametrach np. stopy procentowej zasiłku macierzyńskiego, maksymalnego wymiaru, w razie zmian legislacyjnych albo w celu dodania nowych funkcjonalności bądź ich usprawnienia **w panelu administracyjnym**."

→ Admin panel to change parameters (benefit percentage rates, maximum durations, etc.) on legislative change, and to add/improve functionality. Rules engine must be **parameter-driven**, not hard-coded.

### 3.5 Formal requirements — submission contents (p.14, section 4 "Wymagania formalne")
Must contain:
- "szczegółowy opis i tytuł projektu" — detailed description and title;
- "prezentację (maksymalnie **10 slajdów**)";
- "filmik umieszczony w dostępnym, otwartym repozytorium (link), trwający maksymalnie **3 minuty** i prezentujący projekt i jego użycie; filmik może być częścią aplikacji." — video ≤3 min in a publicly accessible location (link); may be embedded in the app.

Additionally should contain:
- "repozytorium kodu";
- "zrzuty ekranu" — screenshots;
- "linki do demonstracji będącej stroną internetową; na stronie powinna być możliwość przetestowania wybranych załączonych przykładów (formularze w pdf) tak, aby zweryfikować czy osoba posiada ubezpieczenie oraz umożliwić sprawdzenie kalkulatora;" — **live website demo**; it must let you **test selected attached examples (PDF forms)** to **verify whether the person is insured** and **check the calculator**;
- "interfejs aplikacji powinien być w pełni responsywny … zarówno na komputerach, jak i na urządzeniach mobilnych;" — **fully responsive**, desktop and mobile;
- "materiały graficzne lub inne elementy związane z projektem";
- "**wskazanie, które z funkcjonalności działają ze wsparciem mechanizmów opartych na sztucznej inteligencji**." — explicitly declare which features use AI.

### 3.6 Technical requirements (p.15, section 5)
- "nowoczesnej, funkcjonalnej i możliwej do realnego zastosowania aplikacji webowej, stworzonej w architekturze **Responsive Web Design (RWD)**."
- "Projekt powinien działać w warunkach testowych, ale powinien posiadać również **potencjał do wdrożenia w środowisku produkcyjnym**."
- "**Wybór technologii jest dowolny**" (free choice), but preferred: frontend **React/Next.js**; backend **JavaScript, Python, C#/.NET**; recommended integration: **REST API**.

### 3.7 Testing / validation by the jury (p.15, section 6) — critical
- Evaluated on compliance with **business and technical requirements**.
- Technical evaluation: **hands-on testing of the demo**, compliance with technical requirements, **review of code structure in the repo**.
- Each juror decides scope/methodology individually.
- > "Jednocześnie podczas testów zostaną użyte niektóre z zamieszczonych przykładowych wniosków oraz **sprawdzona zostanie poprawność wyliczeń** powstałych na ich podstawie. **Strona powinna mieć możliwość uploadu/wyboru wybranych wniosków.**"
- → Jurors will feed sample cases and **verify calculations**. Must support **upload and/or selection** of sample applications. Calculation accuracy against ZUS decisions in the case files is a hard test.

### 3.8 AI usage (p.16, section 9)
- AI is allowed both in the creative process and inside the app, "z zastrzeżeniem wskazania w opisie zakresu jego użycia" (provided the scope of use is described). Also see 3.5 last bullet.

---

## 4. Evaluation criteria (Brief p.16, section 8; Rules §2)

| Criterion (PL) | English | Weight |
|---|---|---|
| Związek z wyzwaniem | Relevance / fit to the challenge | **25%** |
| Pomysł | Idea | **20%** |
| Oryginalność | Originality | **15%** |
| Kompletność projektu i user experience | Project completeness and UX | **25%** |
| Potencjał wdrożeniowy | Implementation (deployment) potential | **15%** |

Jury & process (Rules §2):
- Jury appointed by ZUS (Przyrzekający), **at least 3 members** with domain expertise; composition published no later than the event start day.
- Criteria are published with the full brief on the event start day at **11:00**.
- **Jury may select up to three teams to present** their solution (finals); the winner is chosen among them.
- Jury decisions are final, no appeal.
- "Zwycięski projekt będzie inspiracją do finalnego wdrożenia." (Brief p.16) — the winning project will inspire the final production implementation.

---

## 5. Deliverables, deadlines, prize, IP

### 5.1 Deliverables checklist
1. Project title + detailed description (incl. **scope of AI use** and which features use AI).
2. Presentation, **≤10 slides** (must clearly indicate any **external solutions** used — Rules §4.1).
3. Video, **≤3 min**, publicly accessible link (may be part of the app).
4. Code repository (jury reviews code structure).
5. Screenshots.
6. Live demo website link — with ability to upload/select sample PDF cases, verify insurance, check calculator.
7. Graphic materials / other elements.
8. Fully responsive UI.
9. Possibly a live pitch if selected among top 3.

### 5.2 Deadlines
- **Neither document states a submission deadline or event dates.** Only: criteria and full brief published on event start day at 11:00 (Rules §2.4); rules published on www.hacknation.pl no later than start day (Rules §5.4). Event-level rules (Regulamin Wydarzenia, www.hacknation.pl) govern anything not covered — check there for submission time. Today is 2026-11-21.
- Prize paid within **7 days** of signing the copyright transfer and handing over source code with description (Rules §3.5). Winner loses the prize if they don't sign within **7 days** of receiving the agreement (§3.9).

### 5.3 Prize (Rules §3)
- One main prize: **30,000 PLN**, reduced by tax (ZUS withholds as payer). Split equally among team members. Not exchangeable / transferable.

### 5.4 Copyright / IP (Rules §4)
- Each participant declares authorship and full economic rights to their contribution; **use of external solutions must be explicitly indicated in the presentation**.
- Solution must be free of legal defects and not infringe third-party rights → be careful with licences of libraries, fonts, images, datasets, and AI-generated content.
- Winners must sign a written transfer of economic copyrights to ZUS (template = Załącznik nr 1 to the Rules, not in repo), covering software fields (art. 74 ust. 4) and non-software works (art. 50), incl. source code, modifications, compiling, testing, deploying, foreign-language versions and accessible versions for people with disabilities. All co-authors must sign. Winners also submit a payment-data statement (Załącznik nr 2).

### 5.5 Contact
- ZUS mentors at the ZUS booth; Discord channel. Emergency contact: dr Wojciech Janek (email in the brief).

---

## 6. Data sources, systems, and integrations mentioned

All integrations are to be **simulated** (the brief repeatedly says "należy wyłącznie zasymulować").

| System / source | What the brief says | Use in tool |
|---|---|---|
| **mObywatel** | Login via mObywatel — simulate only | Mock auth / identity (e.g. pick a persona from sample cases) |
| **ZUS internal systems** (KSI etc., not named) | Data on insurance or its absence; "Zrzuty z systemu wewnętrznego ZUS" in cases show granted benefits and insurance periods; "Poświadczenie ubezpieczenia chorobowego" internal doc confirms title, periods and contribution basis | Mock "pobierz dane z ZUS" returning insurance titles, periods, contribution base |
| **Contribution debt / certificate** (zaświadczenie o niezaleganiu / stan zadłużenia) | Show debt as of the day the right arises; simulate certificate issue and debt amount; key for self-employed | Mock debt check → affects entitlement (sample refusals) |
| **e-ZLA** | Electronic sick notes go to ZUS and to employer PUE/eZUS profile; code "B" = pregnancy | Mock preview of sick notes, 100% rate if "B" |
| **PUE/eZUS** (Platforma Usług Elektronicznych) | Simulate connection: ask a question if in doubt, check data on account; employer profile receives e-ZLA | Mock account view + "zadaj pytanie" |
| **Payer / employer** | Pays if >20 insured (as of 30 Nov previous year); otherwise forwards Z-3/Z-3a/ZAS-12 to ZUS | Routing logic "where to file"; send leave application to employer (simulated) |
| **ZUS forms** (www.zus.pl → Wzory formularzy → Zasiłki) | ZAM, ZAS-53, Z-3, Z-3a, ZAS-12; ZUR and ZAO **merged into ZAM from 24 Oct 2026**; Z-3b **abolished from 24 Oct 2026** | Simulated form filling (benefit forms exist; **leave applications must be designed**) |
| **Rejestr Stanu Cywilnego / USC** | Simulate request for full/short birth certificate copy (gov.pl link) | Mock request flow |
| **Info sites** | zus.pl; gov.pl/web/rodzina/urlop-rodzicielski (MRPiPS); pip.gov.pl/…/rodzicielstwo (PIP) | Deep links |
| **Charities** | Foundations/associations for child death, premature birth, miscarriage, seriously ill child; "wyłącznie charytatywny" | Curated directory (team must research) |

Not mentioned at all in the brief: **ePUAP**, **Profil Zaufany**, **CEPiK**, **PESEL registry** (beyond civil registry link), **NFZ / P1 / e-recepta**, **Krajowy System e-Faktur**, **KSeF**, banks. Don't assume they're required.

Key data fields implied (for the data model): insurance title(s) and type (mandatory/voluntary), insurance periods/continuity (30/90-day waiting periods), sickness insurance status on the day of birth, contribution base (podstawa wymiaru składek) history and changes during pregnancy, benefit basis (podstawa wymiaru zasiłku), payer size (>20 insured), e-ZLA periods and codes, expected due date, actual birth date, number of children per birth, child survival / death date, "Za życiem", prematurity/hospitalisation, adoption/foster status and child age, employment end date and reason, contribution debt, work time during parental leave, leave parts already used by each parent, 81.5% election within 21 days.

---

## 7. Provided materials and how they are meant to be used

### 7.1 What ZUS provides (Brief p.11, p.15)
1. "załącznik, w którym zaprezentowano maksymalny czas trwania zasiłków związanych z rodzicielstwem, ich wysokość, podstawę wymiaru zasiłków" → `docs/Materiały dla uczestników/Załącznik_ maksymalny czas trwania zasiłków, wysokość, podstawa wymiaru.docx` (source of truth for durations table, rates and benefit-basis rules).
2. "wyciąg przepisów stanowiący podstawę do ustalania uprawnień" → in `docs/Materiały dla uczestników/`: Kodeks pracy extract; ustawa zasiłkowa extract; rozporządzenie on information/documents for benefits; rozporządzenie on employee parenthood leave applications (the latter is key for **designing leave application forms**).
3. "poradnik dla rodziców i opiekunów dzieci wydany przez ZUS w 2026 r." → `Poradnik dla rodziców, ZUS 2026.pdf` (the brief says it contains the "szczegółowy opis zasiłku macierzyńskiego").
4. "przykładowe sprawy, na podstawie których możliwe będzie testowanie konkretnych przypadków" → `docs/Sprawy /` (note trailing space in folder name).

### 7.2 Sample cases (docs/Sprawy) — purpose (p.11–12, p.15)
- "kilkadziesiąt przykładowych spraw obejmujących różne stany faktyczne" (several dozen sample cases with varied facts). Repo has **87 PDF files** (one is a duplicate: `Dariusz Go_3_… (1).pdf`), so ~86 unique cases; ~11 have "odmowa"/refusal in the file name, the rest are grants.
- Sets contain documents on which ZUS bases entitlement; they show how insured people apply for sickness and maternity benefits, what extra documents they submit, and what documents ZUS requests.
- **"Każdy zestaw zawiera informację czy w danej sytuacji świadczenie przyznano, czy nie."** — each set contains the outcome (granted or not) → usable as **test oracle / ground truth**.
- "Zestawy mają charakter poglądowy i mogą być wsparciem w projektowaniu i testowaniu narzędzia." — illustrative; support design and testing.
- Brief p.15: "przykładowe (zanonimizowane) wnioski oraz inna dokumentacja wskazujące na obecność lub brak ubezpieczenia oraz na wysokość zasiłku" — anonymised, indicate presence/absence of insurance and benefit amount.
- Document types in sets (p.12):
  - **ZAM** — maternity benefit application (maternity / parental leave);
  - **ZUR** — parental leave benefit application (merged into ZAM from 24.10.2026);
  - **ZAO** — paternity leave benefit application (merged into ZAM from 24.10.2026);
  - **Z-3, Z-3a, Z-3b** — payer certificates with data needed to determine benefits (leave periods, pay components affecting entitlement and amount); Z-3b abolished 24.10.2026;
  - **Poświadczenie ubezpieczenia chorobowego** — internal ZUS doc confirming insurance title, coverage periods and contribution base;
  - **Zrzuty z systemu wewnętrznego ZUS** — screenshots from internal system: granted benefits and insurance periods;
  - **Other** — e.g. ZAS-12, certificates (stillbirth, "Za życiem", hospital, etc.).
- Required uses: deliverable (f) "symulacja zasiłku przy uwzględnieniu konkretnej sprawy z podanych w zestawach"; demo must allow testing selected sample PDFs to verify insurance and check the calculator; jury will **upload/select** them and **check calculation correctness**.

### 7.3 Usage restriction — important
> "Przeznaczone są **wyłącznie na użytek HackNation. Udostępnionych przez ZUS dokumentów nie wolno kopiować ani rozpowszechniać.**" (p.11–12)

The provided documents are for HackNation use only and **must not be copied or distributed**. Implications: do **not** commit the raw PDFs to a **public** repo, and avoid exposing them for public download on the demo site; prefer extracted structured fixtures (or confirm with ZUS mentors what is acceptable — see open questions). The deliverables require a "repozytorium kodu" and a "dostępne, otwarte repozytorium" for the video, which creates tension.

---

## 8. Ambiguities and open questions worth deciding

**Scope / requirements**
1. **(e) vs (j) duplication:** (e) says "rodziny zastępczej niezawodowej" (non-professional foster), (j) says "rodziny zastępczej" (any foster family). Likely a copy-paste duplicate; decide whether to also cover **professional** foster families (the domain rules on p.8 only grant the right to *non-professional* foster families). Recommendation: one adoption/foster mode; explain that professional foster families aren't entitled.
2. **Rehabilitation benefit (świadczenie rehabilitacyjne)** is required in (a) but not explained in the brief — need rules from ustawa zasiłkowa extract / Poradnik (typically after the 270-day sickness period ends, if further treatment promises recovery). Decide depth (info only vs calculator).
3. **"Kalkulator … przy uwzględnieniu indywidualnej podstawy wymiaru"** — how precisely must we compute the benefit basis (podstawa wymiaru: average of 12 months' pay minus 13.71% social contributions, minimum basis rules, voluntary insured using declared base, recalculation rules)? Jury will verify numbers against cases → aim for exact replication of ZUS decisions, including rounding and daily rate (1/30) rules. Need the Załącznik.
4. **Input mode for sample cases:** "upload/wybór" — select from a preloaded list (easy, robust) and/or upload PDF with extraction (AI/OCR — impressive but risky; scanned PDFs?). Recommendation: both; select list as fallback; upload parsed via AI with a human-review step. Must declare AI use.
5. **What "verify whether the person is insured" means** in the demo: derive from Poświadczenie ubezpieczenia / system screenshots in the case → show insured/uninsured on key dates (due date, birth date) + waiting-period check + debt check.
6. **Leave application forms "wymagają zaprojektowania"** — design forms for urlop macierzyński, rodzicielski, ojcowski, uzupełniający, na warunkach macierzyńskiego, rezygnacja, łączenie z pracą — based on the 2025 rozporządzenie. Decide which ones and output (PDF generation? simulated send to employer).
7. **Benefit application forms** — which to simulate: ZAM (now combined incl. former ZUR/ZAO), ZAS-53, Z-3/Z-3a (employer-side). Should we reproduce the post-24.10.2026 ZAM layout?
8. **Charity directory** — must be "wyłącznie charytatywny" (purely charitable, no commercial). Team must research and curate real organisations; consider disclaimers and keeping it in the admin panel as editable data.
9. **Admin panel depth:** parameters (rates 100/70/81.5%, durations per number of children, 9-week quota, 41/43 weeks, 6-week pre-birth, 14-week obligatory, 21-day deadline, 270 days, 30/90 waiting periods, 33/14 days, >20 insured threshold, age limits 7/10/14, 12-month paternity window, "Za życiem" extensions). Also "dodawanie nowych funkcjonalności" — content management (texts, links, charities)? Authentication for admin?
10. **"Planning return to work" and "sharing childcare"** — not separate lettered items but in the core ask; implies a **timeline/planner** view for both parents (leave sequence calendar).
11. **Who is the primary user in the demo** — the insured parent (citizen-facing). Is an **employer view** (payer receiving applications) or **ZUS officer view** expected? Not required; could be a differentiator (Implementation potential).

**Non-functional (absent from the brief — decide ourselves)**
12. **Accessibility / WCAG:** not mentioned in the brief. However, as a public-sector app, Polish law (ustawa o dostępności cyfrowej, WCAG 2.1 AA) applies in production, and the Rules' copyright clause mentions accessible versions. Recommend targeting WCAG 2.1 AA — helps "UX" and "Implementation potential" scores.
13. **Language:** not specified. Materials are Polish; target users Polish → **Polish UI** as default; English/Ukrainian optional bonus.
14. **RODO / GDPR, security:** not mentioned. Sample data is anonymised, but production potential implies privacy by design (minimal data, consent, no PII in logs, data stays in-session; sensitive data like pregnancy/health is special-category data under art. 9 RODO). Also matters if AI APIs process case documents — mention data handling in description.
15. **Disclaimers:** tool provides information/simulation, not a binding ZUS decision — wording matters given ZUS's goal of not surprising users.
16. **Sensitive-content UX** (stillbirth, miscarriage, child death): tone, gentle navigation, not burying users in calculators — implicit in the brief's emphasis on "bardzo trudnych sytuacjach".

**Legal / timeline quirks**
17. Legal acts carry fictional 2026 dates (Dz.U. 2026, rozporządzenie of 27 Sept 2026; ZUR/ZAO merged into ZAM and Z-3b abolished from **24 Oct 2026**). Some sample cases likely predate the change and use ZUR/ZAO/Z-3b — parser must handle both old and new forms.
18. Parental leave pool "41 lub 43 tygodni" (single vs multiple birth) and "Za życiem" extension values must come from the Załącznik / Kodeks pracy extract — verify, don't assume.
19. **Distribution restriction vs public repo/demo** — confirm with ZUS mentors (booth/Discord) whether sample PDFs can be bundled in the demo (likely: keep repo private or exclude PDFs; ship extracted fixtures). Check the Regulamin Wydarzenia for whether repos must be public.
20. **Submission deadline and format** (platform, time) — not in these documents; check www.hacknation.pl / event Discord.
21. **AI disclosure** — must list which features use AI (e.g. PDF extraction, chat assistant, "zapytaj w razie wątpliwości"); AI must not be the source of truth for calculations (deterministic engine checked against cases is safer for the "correctness of calculations" test).
