import type { AlertCode, Entitlement, Facts, Plan, ReasonCode, Result } from "@/engine/types";
import { sourceById } from "@/integrations/sources";
import type { SystemId } from "@/integrations/types";
import { citationText, leaveExplain, leaveLabel, ratePct, reasonText } from "@/content/pl";
import { formatDateLong, formatDuration, formatMoney } from "@/lib/format";
import type { Provenance } from "@/server/assemble";
import { loadContext } from "@/server/context";
import { evaluateFacts } from "@/server/engine-facade";
import { Button } from "@/ui/components/Button/Button";
import { Card } from "@/ui/components/Card/Card";
import { Notice, type Tone } from "@/ui/components/Notice/Notice";
import { StatusBadge } from "@/ui/components/StatusBadge/StatusBadge";
import { TextLink } from "@/ui/components/TextLink/TextLink";
import { AlertList } from "../../_shell/AlertList";
import { NeedsSession } from "../../_shell/NeedsSession";
import { stepsForBenefit, TraceList } from "../../_shell/Trace";
import { TraceDialog } from "../../_shell/TraceDialog";
import s from "./Entitlements.module.css";

const statusTone: Record<Entitlement["status"], Tone> = { granted: "positive", partial: "caution", withheld: "caution", refused: "negative", notApplicable: "neutral", informational: "info" };
const statusWord: Record<Entitlement["status"], string> = { granted: "Przysługuje", partial: "Przysługuje częściowo", withheld: "Wypłata wstrzymana", refused: "Nie przysługuje", notApplicable: "Nie dotyczy", informational: "Informacja" };

const pregnancy = new Set(["sickPay", "sickness", "rehabilitation", "art30PreBirth"]);

/** Reasons that concern the plan (how many days, in how many parts), not the right itself. */
const PLAN_REASONS = new Set<ReasonCode>(["EXCESS_DAYS", "POOL_EXCEEDED", "PARTS_LIMIT", "NOT_CONTIGUOUS", "WORK_FRACTION_TOO_HIGH"]);

/** After a loss only these alerts matter; the planning ones (rate choice, parental horizon, parts) do not. */
const LOSS_ALERTS = new Set<AlertCode>(["CERTIFICATE_TYPE", "CLAIM_LIMITATION", "EMPLOYER_CERTIFICATE_PENDING", "ARREARS_OWN", "ARREARS_PAYER", "NOT_INSURED_ON_DUE_DATE", "TOP_UP_STATEMENT_NEEDED", "TITLE_LIKELY_VERIFIED"]);

export function isLoss(f: Facts) {
  return f.event.kind === "birth" && f.event.children.length > 0 && f.event.children.every((c) => c.bornAlive === false || Boolean(c.deathDate));
}

function eventDay(f: Facts) {
  return f.event.kind === "birth" ? (f.event.date ?? f.event.expectedDate) : f.event.takenIntoCareOn;
}

const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Genitive for "masz prawo do …": 14 → "2 tygodni", 63 → "9 tygodni", 7 → "1 tygodnia", 10 → "10 dni". */
function durationGen(days: number): string {
  if (days % 7 === 0) return days === 7 ? "1 tygodnia" : `${days / 7} tygodni`;
  return days === 1 ? "1 dnia" : `${days} dni`;
}
const find = (r: Result, ...b: Entitlement["benefit"][]) => r.entitlements.find((e) => b.includes(e.benefit));

/** Unverified registries that could block or cancel the benefit for this person. */
function blockingUnverified(facts: Facts, unverified: SystemId[]): SystemId[] {
  const self = facts.claimant.titles.some((t) => t.kind === "selfEmployed" || t.kind === "collaborator");
  const employee = facts.claimant.titles.some((t) => t.kind === "employment");
  return unverified.filter((id) => id === "zus-postepowania" || (self && (id === "zus-saldo" || id === "ceidg")) || (employee && id === "krs"));
}

interface Lead {
  /** "zasiłku macierzyńskiego" / "urlopu ojcowskiego i 9 tygodni urlopu rodzicielskiego" */
  what: string;
  status: Entitlement["status"] | "missing";
  reasonCode?: ReasonCode;
}

/** The claimant's own lead entitlement: a father's are paternity leave and his own 9 weeks of parental leave. */
function leadFor(result: Result, facts: Facts): Lead {
  if (facts.claimant.role === "father") {
    const pat = find(result, "paternity");
    const par = find(result, "parental");
    const nine = durationGen(result.pools.parentalDays.reservedPerParent || 63);
    const parts = [pat ? `${pat.maxDays ? durationGen(pat.maxDays) + " " : ""}urlopu ojcowskiego` : "", par ? `${nine} urlopu rodzicielskiego tylko dla Ciebie` : ""].filter(Boolean);
    const worst = [pat, par].filter((e): e is Entitlement => Boolean(e)).sort((a, b) => rank(a.status) - rank(b.status))[0];
    return { what: parts.join(" i ") || "zasiłku macierzyńskiego", status: worst?.status ?? "missing", reasonCode: worst?.reasonCode };
  }
  const mat = find(result, "maternity", "maternityOnAdoption");
  return { what: mat?.benefit === "maternityOnAdoption" ? "zasiłku macierzyńskiego za urlop na warunkach macierzyńskiego" : "zasiłku macierzyńskiego", status: mat?.status ?? "missing", reasonCode: mat?.reasonCode };
}

function rank(s: Entitlement["status"]) {
  return { refused: 0, withheld: 1, partial: 2, granted: 3, informational: 4, notApplicable: 5 }[s];
}

function Verdict({ result, facts, unverified }: { result: Result; facts: Facts; unverified: SystemId[] }) {
  const lead = leadFor(result, facts);
  const blocking = result.alerts.filter((a) => a.severity === "blocking");
  const day = eventDay(facts);
  const dayText = facts.event.kind === "birth" ? (facts.event.date ? "w dniu porodu" : "na dzień porodu") : "w dniu przyjęcia dziecka";
  const insured = result.insurance.find((i) => i.purpose === "event" || i.purpose === "dueDate")?.insured;
  const notChecked = blockingUnverified(facts, unverified);
  if ((lead.status === "granted" || lead.status === "partial") && blocking.length === 0)
    return (
      <Notice tone="positive" headingLevel={2} hideToneWord title={`${capital(dayText)} masz prawo do ${lead.what}`}>
        <p>
          {day ? `Sprawdziliśmy Twoją sytuację na ${formatDateLong(day)}. ` : ""}
          {insured === false ? "" : "Masz ubezpieczenie chorobowe"}
          {notChecked.length
            ? `${insured === false ? "N" : " — n"}ie sprawdziliśmy jednak wszystkiego, co mogłoby wstrzymać wypłatę (szczegóły poniżej).`
            : `${insured === false ? "N" : " i n"}ic w pobranych danych nie blokuje wypłaty.`}
        </p>
      </Notice>
    );
  if (lead.status === "withheld" || blocking.some((a) => a.code === "ARREARS_OWN" || a.code === "ARREARS_PAYER"))
    return (
      <Notice tone="caution" headingLevel={2} hideToneWord title="Zasiłek zostanie wstrzymany do spłaty zaległości">
        <p>Prawo do zasiłku masz, ale ZUS nie wypłaci go, dopóki zaległość w składkach przekracza próg. Zobacz, co zrobić, poniżej.</p>
      </Notice>
    );
  const fixBy = blocking.map((a) => a.fix?.byDate ?? a.deadline).filter(Boolean).sort()[0];
  return (
    <Notice tone="negative" headingLevel={2} hideToneWord title={fixBy ? `Dziś nie masz prawa do ${lead.what} — możesz to zmienić do ${formatDateLong(fixBy)}` : `${capital(dayText)} nie masz prawa do ${lead.what}`}>
      <p>{lead.reasonCode ? reasonText[lead.reasonCode] : "Sprawdź powody i możliwe rozwiązania poniżej."}</p>
    </Notice>
  );
}

/** Honest about what we did not read: lists the registries and what they would have told us. */
function UnverifiedNotice({ unverified, manual, unavailable }: { unverified: SystemId[]; manual: boolean; unavailable: boolean }) {
  const shown = unverified.filter((id) => id !== "mobywatel");
  if (!shown.length) return null;
  return (
    <Notice
      tone="caution"
      headingLevel={2}
      title={manual ? "Liczymy na podstawie Twoich odpowiedzi — rejestrów nie sprawdzaliśmy" : "Nie sprawdziliśmy wszystkich rejestrów — wynik może się zmienić"}
      actions={
        manual ? (
          <Button href="/logowanie" size="sm" variant="secondary" icon="lock">
            Zaloguj się (symulacja)
          </Button>
        ) : (
          <>
            {unavailable ? (
              <Button href="/pobieranie" size="sm" variant="secondary" icon="refresh">
                Spróbuj ponownie
              </Button>
            ) : null}
            <Button href="/zgoda" size="sm" variant="secondary">
              Zmień zgody
            </Button>
          </>
        )
      }
    >
      <p>Tych danych nie pobraliśmy, więc nie mogliśmy ich uwzględnić:</p>
      <ul className={s.plainList}>
        {shown.map((id) => (
          <li key={id}>
            <strong>{sourceById[id].label}</strong> — {sourceById[id].reads}
          </li>
        ))}
      </ul>
    </Notice>
  );
}

function monthlyFor(result: Result, benefit: string) {
  const p = result.periods.find((x) => x.type === benefit && x.parent === "claimant" && x.status !== "refused" && x.daily > 0);
  return p ? { daily: p.daily, monthly: p.daily * 30, rate: p.rateBps, paidBy: p.paidBy } : null;
}

function BenefitCard({ e, result, plan, provenance, statusOverride }: { e: Entitlement; result: Result; plan: Plan | null; provenance: Provenance; statusOverride?: Entitlement["status"] }) {
  const status = statusOverride ?? e.status;
  const amt = monthlyFor(result, e.benefit);
  const label = leaveLabel[e.benefit] ?? e.benefit;
  return (
    <Card as="article" compact heading={label} headingLevel={3} aside={<StatusBadge tone={statusTone[status]} label={statusWord[status]} />}>
      {leaveExplain[e.benefit as keyof typeof leaveExplain] ? <p className={s.muted}>{leaveExplain[e.benefit as keyof typeof leaveExplain]}</p> : null}
      <dl className={s.facts}>
        {e.maxDays ? (
          <div>
            <dt>Wymiar</dt>
            <dd>{formatDuration(e.maxDays)}</dd>
          </div>
        ) : null}
        {e.rateBps ? (
          <div>
            <dt>Stawka</dt>
            <dd>{ratePct(e.rateBps)} podstawy</dd>
          </div>
        ) : null}
        {amt ? (
          <div>
            <dt>Szacunkowo</dt>
            <dd>
              {formatMoney(amt.monthly)} / mies. brutto <span className={s.muted}>({formatMoney(amt.daily)} dziennie)</span>
            </dd>
          </div>
        ) : null}
        {amt ? (
          <div>
            <dt>Wypłaci</dt>
            <dd>{amt.paidBy === "payer" ? "pracodawca" : "ZUS"}</dd>
          </div>
        ) : null}
      </dl>
      {e.reasonCode && status !== "granted" ? <p>{reasonText[e.reasonCode]}</p> : null}
      <div className={s.cardFoot}>
        {e.citations.length ? <span className={s.cite}>{e.citations.map(citationText).join("; ")}</span> : <span />}
        <TraceDialog title={label}>
          <TraceList steps={stepsForBenefit(result, e.benefit, plan)} provenance={provenance} />
        </TraceDialog>
      </div>
    </Card>
  );
}

function Routing({ result }: { result: Result }) {
  return (
    <Card heading="Kto wypłaci zasiłek i gdzie złożyć wniosek" headingLevel={2} tone="alt">
      <p>
        {result.routing.benefitPayer === "payer" ? (
          <>
            Zasiłek wypłaci <strong>Twój pracodawca</strong> — zgłasza do ubezpieczenia chorobowego ponad 20 osób. Wnioski składasz u pracodawcy.
          </>
        ) : (
          <>
            Zasiłek wypłaci <strong>ZUS</strong>.{" "}
            {result.routing.fileWith === "employer" ? `Wniosek składasz u pracodawcy, a on przekaże go do ZUS w ciągu ${result.routing.payerForwardsWithinDays ?? 7} dni.` : "Wniosek składasz bezpośrednio w ZUS — najwygodniej przez PUE/eZUS."}
          </>
        )}
      </p>
      {result.routing.citations.length ? <p className={s.cite}>{result.routing.citations.map(citationText).join("; ")}</p> : null}
    </Card>
  );
}

/** After a stillbirth or the child's death: maternity from the engine, the funeral grant, only the alerts that matter, and support. */
function LossView({ result, plan, provenance }: { result: Result; plan: Plan | null; provenance: Provenance }) {
  const mat = find(result, "maternity");
  const funeral = find(result, "funeralGrant");
  // A plan-level reason (days planned vs. allowed) is not a refusal of the right after a loss.
  const matStatus = mat && mat.status === "refused" && mat.reasonCode && PLAN_REASONS.has(mat.reasonCode) ? "granted" : mat?.status;
  const entitled = matStatus === "granted" || matStatus === "partial";
  const alerts = result.alerts.filter((a) => LOSS_ALERTS.has(a.code));
  return (
    <>
      <Notice
        tone="neutral"
        headingLevel={2}
        hideToneWord
        title={entitled && mat ? `Przysługuje Ci ${mat.maxDays ? formatDuration(mat.maxDays) + " " : ""}zasiłku macierzyńskiego${mat.rateBps ? ` w wysokości ${ratePct(mat.rateBps)}` : ""}` : "Sprawdziliśmy, co Ci przysługuje"}
      >
        <p>Bardzo nam przykro. Poniżej są tylko najważniejsze informacje. Możesz wrócić do nich w dowolnym momencie.</p>
        {!entitled && mat?.reasonCode ? <p>{reasonText[mat.reasonCode]}</p> : null}
        <p>
          <TextLink href="/trudna-sytuacja">Informacje i wsparcie po stracie dziecka</TextLink>
        </p>
      </Notice>
      {alerts.length ? (
        <section className={s.section} aria-labelledby="todo">
          <h2 id="todo">Co warto załatwić</h2>
          <AlertList alerts={alerts} />
        </section>
      ) : null}
      <section className={s.section} aria-labelledby="after">
        <h2 id="after">Co Ci przysługuje</h2>
        <div className={s.grid}>
          {mat ? <BenefitCard e={mat} result={result} plan={plan} provenance={provenance} statusOverride={matStatus} /> : null}
          {funeral ? <BenefitCard e={funeral} result={result} plan={plan} provenance={provenance} /> : null}
        </div>
      </section>
      <Routing result={result} />
    </>
  );
}

export async function EntitlementsContent() {
  const ctx = await loadContext();
  if (!ctx) return <NeedsSession />;
  const { facts, missing, unverified, provenance } = ctx.assembled;
  if (missing.some((q) => q.required)) {
    return (
      <Notice tone="info" title="Brakuje kilku informacji" actions={<Button href="/sytuacja">Uzupełnij</Button>}>
        <p>Odpowiedz na pytania na stronie „Twoja sytuacja”, a pokażemy Twoje uprawnienia.</p>
      </Notice>
    );
  }
  const plan = ctx.answers.plan ?? null;
  const { result } = await evaluateFacts(facts, plan);
  if (!result) {
    return (
      <Notice tone="caution" title="Nie możemy teraz policzyć uprawnień" role="alert">
        <p>To nie jest informacja o Twoich uprawnieniach — wystąpił problem techniczny po naszej stronie. Spróbuj ponownie za chwilę.</p>
      </Notice>
    );
  }
  const loss = isLoss(facts);
  const today = ctx.persona ? (
    <p className={s.muted}>
      Dziś w symulacji: <strong>{formatDateLong(ctx.persona.asOf)}</strong> — terminy liczymy od tej daty.
    </p>
  ) : null;
  const unverifiedNotice = <UnverifiedNotice unverified={unverified} manual={ctx.state.mode === "manual"} unavailable={ctx.statuses.some((x) => x.state === "unavailable")} />;

  if (loss) {
    return (
      <div className={s.layout}>
        {today}
        <LossView result={result} plan={plan} provenance={provenance} />
        {unverifiedNotice}
        <div className={s.cta}>
          <Button href="/kroki" iconAfter="chevron-right">
            Co i kiedy trzeba załatwić
          </Button>
        </div>
        <p className={s.muted}>Wyliczenie ma charakter informacyjny i nie jest decyzją ZUS. Parametry prawne: {result.parameterSetId}.</p>
      </div>
    );
  }

  const preg = result.entitlements.filter((e) => pregnancy.has(e.benefit));
  const after = result.entitlements.filter((e) => !pregnancy.has(e.benefit) && e.benefit !== "funeralGrant" && e.benefit !== "parentalBenefitMunicipal");
  // A father's own rights come first.
  if (facts.claimant.role === "father") after.sort((a, b) => Number(b.benefit === "paternity") - Number(a.benefit === "paternity"));
  const extra = result.entitlements.filter((e) => e.benefit === "funeralGrant" || e.benefit === "parentalBenefitMunicipal");
  const actionable = result.alerts.filter((a) => a.severity !== "info");
  const info = result.alerts.filter((a) => a.severity === "info");

  return (
    <div className={s.layout}>
      {today}
      <Verdict result={result} facts={facts} unverified={unverified} />
      {unverifiedNotice}

      {actionable.length ? (
        <section className={s.section} aria-labelledby="todo">
          <h2 id="todo">Co wymaga działania</h2>
          <AlertList alerts={actionable} />
        </section>
      ) : null}

      {preg.length ? (
        <section className={s.section} aria-labelledby="preg">
          <h2 id="preg">W ciąży</h2>
          <div className={s.grid}>
            {preg.map((e) => (
              <BenefitCard key={e.benefit} e={e} result={result} plan={plan} provenance={provenance} />
            ))}
          </div>
        </section>
      ) : null}

      <section className={s.section} aria-labelledby="after">
        <h2 id="after">{facts.event.kind === "birth" ? "Po urodzeniu dziecka" : "Po przyjęciu dziecka"}</h2>
        <div className={s.grid}>
          {[...after, ...extra].map((e) => (
            <BenefitCard key={e.benefit} e={e} result={result} plan={plan} provenance={provenance} />
          ))}
        </div>
      </section>

      <Routing result={result} />

      {info.length ? (
        <section className={s.section} aria-labelledby="info">
          <h2 id="info">Warto wiedzieć</h2>
          <AlertList alerts={info} />
        </section>
      ) : null}

      <div className={s.cta}>
        <Button href="/plan" size="lg" iconAfter="chevron-right">
          Ułóż plan urlopów
        </Button>
        <Button href="/kroki" variant="secondary">
          Dokumenty i terminy
        </Button>
      </div>
      <p className={s.muted}>Wyliczenie ma charakter informacyjny i nie jest decyzją ZUS. Parametry prawne: {result.parameterSetId}.</p>
    </div>
  );
}
