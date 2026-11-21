import type { Facts, InsuranceTitle, Result } from "@/engine/types";
import type { SystemId } from "@/integrations/types";
import { titleKindLabel, roleLabel, leaveShort, ratePct } from "@/content/pl";
import { formatDateLong, formatDateShort, formatMoney } from "@/lib/format";
import { lookupProvenance, type Provenance } from "@/server/assemble";
import { loadContext } from "@/server/context";
import { evaluateFacts } from "@/server/engine-facade";
import { Button } from "@/ui/components/Button/Button";
import { Card } from "@/ui/components/Card/Card";
import { DataList, DataRow } from "@/ui/components/DataRow/DataRow";
import { DateText, Money } from "@/ui/components/Format/Format";
import { Notice } from "@/ui/components/Notice/Notice";
import { SourceBadge, sourceLabel, type SourceId } from "@/ui/components/SourceBadge/SourceBadge";
import { StatusBadge } from "@/ui/components/StatusBadge/StatusBadge";
import { TextLink } from "@/ui/components/TextLink/TextLink";
import { NeedsSession } from "../../_shell/NeedsSession";
import { NotFetched } from "../../_shell/Unverified";
import { ArrearsQuestion, ChildrenCountQuestion, CorrectButton, ExpectedDateQuestion, ManualForm, OtherParentQuestion, PlannedEndQuestion, ProgressLine, ZaZyciemQuestion, type OverrideSpec } from "./client";
import s from "./Situation.module.css";

function src(prov: Provenance, path: string) {
  const p = lookupProvenance(prov, path);
  if (!p) return null;
  return <SourceBadge source={p.source as SourceId} asOf={p.asOf} overridden={Boolean(p.overridden)} wrap />;
}

function spec(prov: Provenance, path: string, label: string, kind: OverrideSpec["kind"], current: OverrideSpec["current"], display: string, options?: OverrideSpec["options"]): OverrideSpec {
  const p = lookupProvenance(prov, path);
  return { path, label, kind, current, display, options, overridden: Boolean(p?.overridden), sourceLabel: p ? sourceLabel[p.source as SourceId] : "" };
}

const sicknessText = (t: InsuranceTitle) =>
  t.sickness.mode === "mandatory" ? "obowiązkowe" : t.sickness.mode === "voluntary" ? `dobrowolne${t.sickness.periods[0] ? ` od ${formatDateShort(t.sickness.periods[0].from)}` : ""}` : "brak";

/** Short hash so the progress line can tell that the page was refreshed after a save. */
function stampOf(v: unknown): string {
  const t = JSON.stringify(v);
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
  return String(h);
}

export async function SituationContent() {
  const ctx = await loadContext();
  if (!ctx) return <NeedsSession />;
  const { facts, provenance: prov, missing, unverified } = ctx.assembled;
  const manualMode = ctx.state.mode === "manual";

  if (manualMode && missing.some((q) => q.id === "manual")) {
    return (
      <Card heading="Powiedz nam o swojej sytuacji" headingLevel={2}>
        <p className={s.muted}>Nie pobieramy danych z rejestrów, więc zapytamy o kilka podstawowych informacji. Wynik będzie orientacyjny.</p>
        <ManualForm />
      </Card>
    );
  }

  const { result } = await evaluateFacts(facts, ctx.answers.plan ?? null);
  const ask = (id: string) => missing.some((q) => q.id === id);
  const unv = (id: SystemId) => unverified.includes(id);
  const c = facts.claimant;
  const ev = facts.event;
  const questionsLeft = missing.length;
  const unavailable = ctx.statuses.filter((x) => x.state === "unavailable");
  const name = ctx.persona?.systems.mobywatel?.displayName;
  const otherRole = c.role === "father" ? "mother" : "father";
  const selfEmployed = c.titles.some((t) => t.kind === "selfEmployed" || t.kind === "collaborator");
  const employed = c.titles.some((t) => t.kind === "employment" || t.kind === "mandate");
  const changeConsent = manualMode ? null : (
    <Button href="/zgoda" size="sm" variant="secondary">
      Zmień zgody
    </Button>
  );
  const kontoMissing = ask("manual");

  return (
    <div className={s.layout}>
      {ctx.state.mode === "case" ? (
        <Notice tone="info" title="Przeglądasz dane z przykładowej sprawy ZUS" hideToneWord>
          <p>Dane z akt sprawy pokazujemy tak, jak pobrałby je system z rejestrów. Osoba jest zanonimizowana.</p>
        </Notice>
      ) : null}
      <ProgressLine stamp={stampOf([missing.map((q) => q.id), ctx.state.answers, ctx.state.overrides])}>
        {questionsLeft === 0 ? (
          <StatusBadge tone="positive" label="Mamy wszystko, czego potrzebujemy" />
        ) : (
          <span>
            Zapytamy tylko o to, czego nie wie żaden rejestr. <strong>Zostało pytań: {questionsLeft}</strong>
          </span>
        )}
      </ProgressLine>
      {ctx.persona ? (
        <p className={s.today}>
          Dziś w symulacji: <strong>{formatDateLong(ctx.persona.asOf)}</strong> — terminy liczymy od tej daty.
        </p>
      ) : null}
      {unavailable.map((u) => (
        <Notice
          key={u.source}
          tone="caution"
          title={`Nie udało się pobrać danych z rejestru „${u.label}”`}
          actions={
            <Button href="/pobieranie" size="sm" variant="secondary" icon="refresh">
              Spróbuj ponownie
            </Button>
          }
        >
          <p>Możesz spróbować ponownie albo uzupełnić brakujące informacje poniżej.</p>
        </Notice>
      ))}

      <Card heading="Ty" headingLevel={2}>
        <DataList>
          {name ? <DataRow label="Imię i nazwisko" value={name} source={<SourceBadge source="mobywatel" asOf={lookupProvenance(prov, "facts.claimant.sex")?.asOf} wrap />} /> : null}
          <DataRow label="Rola" value={roleLabel[c.role]} source={src(prov, "facts.claimant.role")} />
          {c.birthYear ? <DataRow label="Rok urodzenia" value={String(c.birthYear)} source={src(prov, "facts.claimant.birthYear")} /> : null}
        </DataList>
        {unv("mobywatel") && !manualMode ? <p className={s.muted}>Nie pobraliśmy danych z mObywatela — rolę ustalamy na podstawie Twoich odpowiedzi.</p> : null}
      </Card>

      <Card heading="Ubezpieczenie" headingLevel={2}>
        {kontoMissing ? (
          <div className={s.unverified}>
            <NotFetched sources={["zus-konto"]} action={changeConsent}>
              <p>Bez konta ubezpieczonego nie wiemy, jak pracujesz i czy masz ubezpieczenie chorobowe. Opowiedz nam o tym poniżej albo wróć i zaznacz zgodę na pobranie danych z ZUS.</p>
            </NotFetched>
            <ManualForm defaults={{ sex: ctx.persona?.systems.mobywatel && !unv("mobywatel") ? c.sex : undefined, expectedDate: ev.kind === "birth" ? ev.expectedDate : undefined }} />
          </div>
        ) : c.titles.length === 0 ? (
          <p className={s.muted}>{lookupProvenance(prov, "facts.claimant.titles")?.source === "user" ? "Z Twoich odpowiedzi: obecnie nie pracujesz." : "Konto ubezpieczonego w ZUS nie zawiera żadnego tytułu do ubezpieczenia."}</p>
        ) : null}
        {c.titles.map((t, i) => (
          <div key={t.id} className={s.title}>
            <h3 className={s.subhead}>
              {titleKindLabel[t.kind]}
              {t.zusCode ? <span className={s.code}> · kod {t.zusCode}</span> : null}
            </h3>
            <DataList>
              <DataRow
                label="Okres"
                value={`od ${formatDateShort(t.from)}${t.to ? ` do ${formatDateShort(t.to)}` : " — trwa"}`}
                source={src(prov, `facts.claimant.titles[${i}].from`)}
                action={<CorrectButton spec={spec(prov, `facts.claimant.titles[${i}].from`, "Początek ubezpieczenia", "date", t.from, formatDateShort(t.from))} />}
              />
              <DataRow
                label="Ubezpieczenie chorobowe"
                value={sicknessText(t)}
                source={src(prov, `facts.claimant.titles[${i}].sickness.mode`)}
                action={
                  <CorrectButton
                    spec={spec(prov, `facts.claimant.titles[${i}].sickness.mode`, "Ubezpieczenie chorobowe", "select", t.sickness.mode, sicknessText(t), [
                      { value: "mandatory", label: "obowiązkowe" },
                      { value: "voluntary", label: "dobrowolne" },
                      { value: "none", label: "brak" },
                    ])}
                  />
                }
              />
              {t.workTime?.length ? <DataRow label="Wymiar czasu pracy" value={t.workTime.map((w) => `${w.fraction.num}/${w.fraction.den} etatu od ${formatDateShort(w.from)}`).join(", ")} source={src(prov, `facts.claimant.titles[${i}]`)} /> : null}
              {t.kind === "employment" || t.kind === "mandate" ? (
                <DataRow
                  label="Kto wypłaci zasiłek"
                  value={t.payer.over20Insured === undefined ? (unv("zus-platnik") ? "nie sprawdziliśmy — zapytaj pracodawcę" : "nie wiemy — zapytaj pracodawcę") : t.payer.over20Insured ? "pracodawca (zgłasza ponad 20 osób)" : "ZUS (pracodawca zgłasza do 20 osób)"}
                  source={src(prov, `facts.claimant.titles[${i}].payer.over20Insured`)}
                  action={
                    <CorrectButton
                      spec={spec(prov, `facts.claimant.titles[${i}].payer.over20Insured`, "Liczba ubezpieczonych u pracodawcy", "select", String(t.payer.over20Insured ?? false), t.payer.over20Insured ? "ponad 20" : "do 20", [
                        { value: "true", label: "ponad 20 osób" },
                        { value: "false", label: "do 20 osób" },
                      ])}
                    />
                  }
                />
              ) : (
                <DataRow label="Kto wypłaci zasiłek" value="ZUS" source={src(prov, `facts.claimant.titles[${i}]`)} />
              )}
              {t.payer.status && t.payer.status !== "active" ? <DataRow label="Status pracodawcy" value={t.payer.status === "liquidation" ? "w likwidacji" : t.payer.status === "bankruptcy" ? "w upadłości" : t.payer.status} source={src(prov, `facts.claimant.titles[${i}].payer.status`)} /> : null}
              {t.kind === "employment" && unv("krs") && !t.payer.status ? <DataRow label="Status pracodawcy" value="nie sprawdziliśmy w KRS" /> : null}
              {t.suspensions?.length ? <DataRow label="Zawieszenie działalności" value={t.suspensions.map((x) => `${formatDateShort(x.from)} – ${x.to ? formatDateShort(x.to) : "…"}`).join(", ")} source={src(prov, `facts.claimant.titles[${i}].suspensions`)} /> : null}
              {t.kind === "selfEmployed" && unv("ceidg") && !t.suspensions?.length ? <DataRow label="Zawieszenie działalności" value="nie sprawdziliśmy w CEIDG" /> : null}
              {t.plannedEnd ? <DataRow label="Planowane zakończenie" value={formatDateShort(t.plannedEnd.date)} source={src(prov, `facts.claimant.titles[${i}].plannedEnd`)} /> : null}
            </DataList>
          </div>
        ))}
        {c.titles.length && unv("zus-postepowania") && !manualMode ? <p className={s.muted}>Nie sprawdziliśmy decyzji ZUS w sprawie podlegania ubezpieczeniom (rejestr „ZUS — postępowania”).</p> : null}
        {ask("plannedEnd") && c.titles.find((t) => !t.to) ? <PlannedEndQuestion titleId={c.titles.find((t) => !t.to)!.id} titleLabel={titleKindLabel[c.titles.find((t) => !t.to)!.kind]} /> : null}
      </Card>

      <EarningsCard facts={facts} prov={prov} base={result?.bases?.find((b) => !b.dataMissing && b.titleId !== "other")?.base} />

      <Card heading="Zwolnienia lekarskie (e-ZLA)" headingLevel={2} aside={unv("zus-ezla") ? null : src(prov, "facts.claimant.sickNotes")}>
        {unv("zus-ezla") ? (
          <NotFetched sources={["zus-ezla"]} action={changeConsent}>
            <p>{manualMode ? "W trybie bez logowania nie znamy Twoich zwolnień lekarskich, więc nie liczymy zasiłku chorobowego w ciąży." : "Jeśli w ciąży jesteś na zwolnieniu lekarskim, zaznacz zgodę na e-ZLA — policzymy zasiłek chorobowy."}</p>
          </NotFetched>
        ) : c.sickNotes.length === 0 ? (
          <p className={s.muted}>W e-ZLA nie ma zwolnień z ostatnich 12 miesięcy.</p>
        ) : (
          <ul className={s.list}>
            {c.sickNotes.map((n, i) => (
              <li key={i}>
                {formatDateShort(n.from)} – {formatDateShort(n.to)}
                {n.code === "B" ? <span className={s.tag}>kod B — ciąża, 100%</span> : n.code ? <span className={s.tag}>kod {n.code}</span> : null}
                {n.hospital ? <span className={s.tag}>szpital</span> : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card heading="Składki" headingLevel={2} aside={selfEmployed && unv("zus-saldo") ? null : src(prov, "facts.claimant.arrears")}>
        {selfEmployed && unv("zus-saldo") ? (
          <div className={s.unverified}>
            <NotFetched sources={["zus-saldo"]} action={changeConsent}>
              <p>Przy działalności zaległość w składkach może wstrzymać wypłatę zasiłku. Odpowiedz na pytanie poniżej albo zaznacz zgodę na pobranie rozliczeń z ZUS.</p>
            </NotFetched>
            {ask("arrears") ? <ArrearsQuestion /> : null}
          </div>
        ) : (
          <ArrearsBlock facts={facts} result={result} selfEmployed={selfEmployed} employed={employed} declared={lookupProvenance(prov, "facts.claimant.arrears")?.source === "user"} />
        )}
      </Card>

      <Card heading={ev.kind === "birth" ? "Ciąża i dziecko" : "Przyjęcie dziecka"} headingLevel={2}>
        <DataList>
          {ev.kind === "birth" && ev.date ? <DataRow label="Data urodzenia" value={<DateText value={ev.date} />} source={src(prov, "facts.event.date")} /> : null}
          {ev.kind === "birth" && ev.expectedDate ? (
            <DataRow
              label="Przewidywana data porodu"
              value={<DateText value={ev.expectedDate} />}
              source={src(prov, "facts.event.expectedDate")}
              action={ev.date ? undefined : <CorrectButton spec={spec(prov, "facts.event.expectedDate", "Przewidywana data porodu", "date", ev.expectedDate, formatDateShort(ev.expectedDate))} />}
            />
          ) : null}
          {ev.kind === "birth" && (ev.date || ev.occurred || ev.children.length > 1) ? (
            <DataRow label="Dzieci" value={ev.children.map((ch, i) => childText(ch, i)).join("; ")} source={src(prov, "facts.event.children")} />
          ) : null}
          {ev.kind !== "birth" ? (
            <>
              <DataRow label="Data przyjęcia dziecka" value={<DateText value={ev.takenIntoCareOn} />} source={src(prov, "facts.event.takenIntoCareOn")} />
              {ev.children[0]?.birthDate ? <DataRow label="Data urodzenia dziecka" value={<DateText value={ev.children[0].birthDate} />} source={src(prov, "facts.event.children[0].birthDate")} /> : null}
            </>
          ) : null}
        </DataList>
        {ev.kind === "birth" && !ev.date && !manualMode && (unv("ezdrowie") || unv("rsc")) ? (
          <p className={s.muted}>
            Nie pobraliśmy danych z {[unv("ezdrowie") ? "e-zdrowia (termin porodu, pobyt dziecka w szpitalu)" : "", unv("rsc") ? "rejestru stanu cywilnego (akt urodzenia)" : ""].filter(Boolean).join(" ani z ")}. O to, czego potrzebujemy, zapytamy wprost.
          </p>
        ) : null}
        {ask("expectedDate") ? <ExpectedDateQuestion /> : null}
        {ask("childrenCount") ? <ChildrenCountQuestion /> : null}
        {ask("zaZyciem") ? <ZaZyciemQuestion /> : null}
      </Card>

      <Card heading="Drugi rodzic" headingLevel={2} aside={facts.otherParent ? src(prov, "facts.otherParent") : null}>
        {facts.otherParent ? (
          <DataList>
            <DataRow label="Rola" value={roleLabel[facts.otherParent.role]} />
            <DataRow label="Ubezpieczenie" value={{ yes: "ma ubezpieczenie chorobowe", no: "brak ubezpieczenia", krus: "KRUS", abroad: "za granicą", unknown: "nie wiadomo" }[facts.otherParent.insured]} />
            {facts.otherParent.used.length ? (
              <DataRow label="Wykorzystane urlopy" value={facts.otherParent.used.map((u) => `${leaveShort[u.type]} ${formatDateShort(u.from)}–${formatDateShort(u.to)}${u.rateBps ? ` (${ratePct(u.rateBps)})` : ""}`).join("; ")} source={src(prov, "facts.otherParent.used")} />
            ) : unv("zus-swiadczenia") ? (
              <DataRow label="Wykorzystane urlopy" value="nie sprawdziliśmy w ZUS" />
            ) : null}
          </DataList>
        ) : ask("otherParent") ? (
          <OtherParentQuestion canConsent={Boolean(ctx.persona?.otherParent?.consented)} otherRole={otherRole} />
        ) : (
          <p className={s.muted}>Planujesz urlop samodzielnie.</p>
        )}
      </Card>

      {c.paidBenefits.length ? (
        <Card heading="Wypłacone już świadczenia" headingLevel={2} aside={src(prov, "facts.claimant.paidBenefits")}>
          <ul className={s.list}>
            {c.paidBenefits.map((b, i) => (
              <li key={i}>
                {leaveShort[b.type]}: {formatDateShort(b.from)} – {formatDateShort(b.to)}
                {b.rateBps ? ` · ${ratePct(b.rateBps)}` : ""}
              </li>
            ))}
          </ul>
        </Card>
      ) : unv("zus-swiadczenia") && !manualMode ? (
        <Card heading="Wypłacone już świadczenia" headingLevel={2}>
          <NotFetched sources={["zus-swiadczenia"]} action={changeConsent}>
            <p>Nie wiemy, czy ZUS wypłacił Ci już zasiłek (np. część urlopu). Przy liczeniu urlopu przyjmujemy, że nie.</p>
          </NotFetched>
        </Card>
      ) : null}

      <div className={s.cta}>
        <Button href="/uprawnienia" size="lg" iconAfter="chevron-right">
          Sprawdź uprawnienia
        </Button>
        {missing.some((q) => q.required) ? <p className={s.muted}>Najpierw odpowiedz na pytania oznaczone powyżej — bez nich nie policzymy uprawnień.</p> : null}
        {manualMode ? (
          <p className={s.muted}>
            Chcesz dokładniejszy wynik? <TextLink href="/logowanie">Zaloguj się (symulacja)</TextLink> — pobierzemy dane z ZUS.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function childText(ch: Facts["event"]["children"][number], i: number) {
  const parts = [`dziecko ${i + 1}`];
  if (ch.bornAlive === false) parts.push("urodzone martwe");
  if (ch.gestationalWeek) parts.push(`${ch.gestationalWeek}. tydzień`);
  if (ch.birthWeightG) parts.push(`${ch.birthWeightG} g`);
  if (ch.hospitalStays?.length) parts.push(`w szpitalu ${ch.hospitalStays.map((h) => `${formatDateShort(h.from)}–${formatDateShort(h.to)}`).join(", ")}`);
  if (ch.zaZyciem) parts.push("„Za życiem”");
  return parts.join(", ");
}

function EarningsCard({ facts, prov, base }: { facts: Facts; prov: Provenance; base?: number }) {
  const t = facts.claimant.titles.find((x) => x.months.length > 0 || x.statedBenefitBase !== undefined);
  if (!t) return null;
  const i = facts.claimant.titles.indexOf(t);
  const months = [...t.months].sort((a, b) => b.month.localeCompare(a.month)).slice(0, 12);
  const avg = months.length ? Math.round(months.reduce((a, m) => a + m.contributionBase, 0) / months.length) : null;
  return (
    <Card heading="Zarobki i podstawa zasiłku" headingLevel={2} aside={src(prov, `facts.claimant.titles[${i}]`)}>
      <DataList>
        {base !== undefined ? <DataRow label="Podstawa wymiaru zasiłku" value={<Money value={base} />} source={<span className={s.muted}>wyliczona przez silnik</span>} /> : null}
        {t.statedBenefitBase !== undefined ? <DataRow label="Podstawa (podana)" value={<Money value={t.statedBenefitBase} />} source={src(prov, `facts.claimant.titles[${i}].statedBenefitBase`)} /> : null}
        {avg !== null ? <DataRow label={`Średnia podstawa składek (${months.length} mies.)`} value={<Money value={avg} />} /> : null}
      </DataList>
      {months.length ? (
        <details className={s.details}>
          <summary>Pokaż podstawy z {months.length} miesięcy</summary>
          <table className={s.table}>
            <caption className="visually-hidden">Podstawa wymiaru składki na ubezpieczenie chorobowe w kolejnych miesiącach</caption>
            <thead>
              <tr>
                <th scope="col">Miesiąc</th>
                <th scope="col">Podstawa składek</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.month}>
                  <td>{m.month.split("-").reverse().join(".")}</td>
                  <td className="tabular">{formatMoney(m.contributionBase)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ) : null}
    </Card>
  );
}

/** Arrears status as the engine sees it (alerts and gating), never a local threshold rule. */
function ArrearsBlock({ facts, result, selfEmployed, employed, declared }: { facts: Facts; result: Result | null; selfEmployed: boolean; employed: boolean; declared: boolean }) {
  const alert = result?.alerts.find((a) => a.code === "ARREARS_OWN" || a.code === "ARREARS_PAYER");
  const latest = [...facts.claimant.arrears].sort((a, b) => a.onDate.localeCompare(b.onDate)).pop();
  if (alert) {
    const amount = typeof alert.values.amount === "number" ? alert.values.amount : undefined;
    const threshold = typeof alert.values.threshold === "number" ? alert.values.threshold : undefined;
    return (
      <Notice
        tone="caution"
        title={amount !== undefined ? `Zaległość: ${formatMoney(amount)}${latest ? ` (stan na ${formatDateShort(latest.onDate)})` : ""}` : "Zaległość powyżej progu"}
        actions={
          <Button href="/kroki#skladki" size="sm" variant="secondary">
            Jak spłacić
          </Button>
        }
      >
        <p>
          Zaległość ponad {threshold !== undefined ? formatMoney(threshold) : "1% minimalnego wynagrodzenia"} w dniu porodu wstrzymuje wypłatę zasiłku macierzyńskiego
          {alert.deadline ? `; jeśli nie spłacisz jej do ${formatDateLong(alert.deadline)}, prawo do zasiłku wygaśnie` : ""}. {declared ? "To Twoja odpowiedź — kwotę sprawdzisz w PUE/eZUS." : ""}
        </p>
      </Notice>
    );
  }
  if (!selfEmployed) {
    return (
      <div className={s.inline}>
        <StatusBadge tone="neutral" label="Nie dotyczy" />
        <span className={s.muted}>{employed ? "Składki za Ciebie odprowadza pracodawca lub zleceniodawca — ewentualne zaległości nie wstrzymują Twojego zasiłku." : "Zaległości w składkach mają znaczenie tylko przy własnej działalności."}</span>
      </div>
    );
  }
  if (latest?.amount && !latest.repaidOn) {
    return (
      <Notice tone="info" title={`Niedopłata ${formatMoney(latest.amount)} (stan na ${formatDateShort(latest.onDate)})`}>
        <p>Silnik nie uznał jej za przeszkodę w wypłacie zasiłku — jest poniżej progu. Warto ją jednak spłacić przed porodem.</p>
      </Notice>
    );
  }
  return (
    <div className={s.inline}>
      <StatusBadge tone="positive" label="Brak zaległości" />
      <span className={s.muted}>{declared ? "według Twojej odpowiedzi" : latest ? `stan na ${formatDateShort(latest.onDate)}` : "według rozliczeń ZUS"}</span>
    </div>
  );
}
