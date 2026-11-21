import type { Facts, InsuranceTitle } from "@/engine/types";
import { titleKindLabel, roleLabel, leaveShort, ratePct } from "@/content/pl";
import { formatDateShort, formatMoney } from "@/lib/format";
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
import { NeedsSession } from "../../_shell/NeedsSession";
import { ChildrenCountQuestion, CorrectButton, ExpectedDateQuestion, ManualForm, OtherParentQuestion, PlannedEndQuestion, ZaZyciemQuestion, type OverrideSpec } from "./client";
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

export async function SituationContent() {
  const ctx = await loadContext();
  if (!ctx) return <NeedsSession />;
  const { facts, provenance: prov, missing } = ctx.assembled;

  if (ctx.state.mode === "manual" && missing.some((q) => q.id === "manual")) {
    return (
      <Card heading="Powiedz nam o swojej sytuacji" headingLevel={2}>
        <ManualForm />
      </Card>
    );
  }

  const { result } = await evaluateFacts(facts, null);
  const ask = (id: string) => missing.some((q) => q.id === id);
  const c = facts.claimant;
  const ev = facts.event;
  const questionsLeft = missing.length;
  const unavailable = ctx.statuses.filter((x) => x.state === "unavailable");
  const name = ctx.persona?.systems.mobywatel?.displayName;
  const otherRole = c.role === "father" ? "mother" : "father";

  return (
    <div className={s.layout}>
      {ctx.state.mode === "case" ? (
        <Notice tone="info" title="Przeglądasz dane z przykładowej sprawy ZUS" hideToneWord>
          <p>Dane z akt sprawy pokazujemy tak, jak pobrałby je system z rejestrów. Osoba jest zanonimizowana.</p>
        </Notice>
      ) : null}
      <div className={s.progress} role="status">
        {questionsLeft === 0 ? (
          <StatusBadge tone="positive" label="Mamy wszystko, czego potrzebujemy" />
        ) : (
          <span>
            Zapytamy tylko o to, czego nie wie żaden rejestr. <strong>Zostało pytań: {questionsLeft}</strong>
          </span>
        )}
      </div>
      {unavailable.map((u) => (
        <Notice key={u.source} tone="caution" title={`Nie udało się pobrać danych z rejestru „${u.label}”`}>
          <p>Uzupełnij brakujące informacje poniżej. Możesz też wrócić i spróbować ponownie.</p>
        </Notice>
      ))}

      <Card heading="Ty" headingLevel={2}>
        <DataList>
          {name ? <DataRow label="Imię i nazwisko" value={name} source={src(prov, "facts.claimant.sex")} /> : null}
          <DataRow label="Rola" value={roleLabel[c.role]} source={src(prov, "facts.claimant.sex")} />
          {c.birthYear ? <DataRow label="Rok urodzenia" value={String(c.birthYear)} source={src(prov, "facts.claimant.sex")} /> : null}
        </DataList>
      </Card>

      <Card heading="Ubezpieczenie" headingLevel={2}>
        {c.titles.length === 0 ? <p className={s.muted}>Nie znaleźliśmy żadnego tytułu do ubezpieczenia.</p> : null}
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
                  value={t.payer.over20Insured === undefined ? "nie wiemy — zapytaj pracodawcę" : t.payer.over20Insured ? "pracodawca (zgłasza ponad 20 osób)" : "ZUS (pracodawca zgłasza do 20 osób)"}
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
              {t.suspensions?.length ? <DataRow label="Zawieszenie działalności" value={t.suspensions.map((x) => `${formatDateShort(x.from)} – ${x.to ? formatDateShort(x.to) : "…"}`).join(", ")} source={src(prov, `facts.claimant.titles[${i}].suspensions`)} /> : null}
              {t.plannedEnd ? <DataRow label="Planowane zakończenie" value={formatDateShort(t.plannedEnd.date)} source={src(prov, `facts.claimant.titles[${i}].plannedEnd`)} /> : null}
            </DataList>
          </div>
        ))}
        {ask("plannedEnd") && c.titles.find((t) => !t.to) ? <PlannedEndQuestion titleId={c.titles.find((t) => !t.to)!.id} titleLabel={titleKindLabel[c.titles.find((t) => !t.to)!.kind]} /> : null}
      </Card>

      <EarningsCard facts={facts} prov={prov} base={result?.bases?.[0]?.base} />

      <Card heading="Zwolnienia lekarskie (e-ZLA)" headingLevel={2} aside={src(prov, "facts.claimant.sickNotes")}>
        {c.sickNotes.length === 0 ? (
          <p className={s.muted}>Brak zwolnień w ostatnich 12 miesiącach.</p>
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

      <Card heading="Składki" headingLevel={2} aside={src(prov, "facts.claimant.arrears")}>
        <ArrearsBlock facts={facts} />
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
              <DataRow label="Data przyjęcia dziecka" value={<DateText value={ev.takenIntoCareOn} />} source={src(prov, "facts.event")} />
              {ev.children[0]?.birthDate ? <DataRow label="Data urodzenia dziecka" value={<DateText value={ev.children[0].birthDate} />} source={src(prov, "facts.event")} /> : null}
            </>
          ) : null}
        </DataList>
        {ask("expectedDate") ? <ExpectedDateQuestion /> : null}
        {ask("childrenCount") ? <ChildrenCountQuestion /> : null}
        {ask("zaZyciem") ? <ZaZyciemQuestion /> : null}
      </Card>

      <Card heading="Drugi rodzic" headingLevel={2} aside={facts.otherParent ? src(prov, "facts.otherParent") : null}>
        {facts.otherParent ? (
          <DataList>
            <DataRow label="Rola" value={roleLabel[facts.otherParent.role]} />
            <DataRow label="Ubezpieczenie" value={{ yes: "ma ubezpieczenie chorobowe", no: "brak ubezpieczenia", krus: "KRUS", abroad: "za granicą", unknown: "nie wiadomo" }[facts.otherParent.insured]} />
            {facts.otherParent.used.length ? <DataRow label="Wykorzystane urlopy" value={facts.otherParent.used.map((u) => `${leaveShort[u.type]} ${formatDateShort(u.from)}–${formatDateShort(u.to)}${u.rateBps ? ` (${ratePct(u.rateBps)})` : ""}`).join("; ")} /> : null}
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
      ) : null}

      <div className={s.cta}>
        <Button href="/uprawnienia" size="lg" iconAfter="chevron-right" aria-disabled={missing.some((q) => q.required) || undefined}>
          Sprawdź uprawnienia
        </Button>
        {missing.some((q) => q.required) ? <p className={s.muted}>Najpierw odpowiedz na pytania oznaczone powyżej.</p> : null}
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
        {base !== undefined ? <DataRow label="Podstawa wymiaru zasiłku" value={<Money value={base} />} source={<span className={s.muted}>wyliczona z danych ZUS</span>} /> : null}
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

function ArrearsBlock({ facts }: { facts: Facts }) {
  const latest = [...facts.claimant.arrears].sort((a, b) => a.onDate.localeCompare(b.onDate)).pop();
  const self = facts.claimant.titles.some((t) => t.kind === "selfEmployed" || t.kind === "collaborator");
  if (!latest || latest.repaidOn || latest.aboveThreshold === false || latest.amount === 0) {
    return (
      <div className={s.inline}>
        <StatusBadge tone="positive" label="Brak zaległości" />
        <span className={s.muted}>{latest ? `stan na ${formatDateShort(latest.onDate)}` : self ? "według rozliczeń ZUS" : "składki odprowadza pracodawca"}</span>
      </div>
    );
  }
  return (
    <Notice tone="caution" title={latest.amount ? `Zaległość: ${formatMoney(latest.amount)} (stan na ${formatDateShort(latest.onDate)})` : `Zaległość powyżej progu (stan na ${formatDateShort(latest.onDate)})`} actions={<Button href="/kroki#skladki" size="sm" variant="secondary">Jak spłacić</Button>}>
      <p>Zaległość ponad 1% minimalnego wynagrodzenia na dzień porodu blokuje wypłatę zasiłku macierzyńskiego. Spłać ją przed porodem.</p>
    </Notice>
  );
}
