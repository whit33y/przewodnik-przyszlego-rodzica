import type { Entitlement, Facts, Result } from "@/engine/types";
import { citationText, leaveExplain, leaveLabel, ratePct, reasonText } from "@/content/pl";
import { formatDateLong, formatDuration, formatMoney } from "@/lib/format";
import { loadContext } from "@/server/context";
import { evaluateFacts } from "@/server/engine-facade";
import { Button } from "@/ui/components/Button/Button";
import { Card } from "@/ui/components/Card/Card";
import { Notice, type Tone } from "@/ui/components/Notice/Notice";
import { StatusBadge } from "@/ui/components/StatusBadge/StatusBadge";
import { TextLink } from "@/ui/components/TextLink/TextLink";
import { AlertList } from "../../_shell/AlertList";
import { NeedsSession } from "../../_shell/NeedsSession";
import { TraceList } from "../../_shell/Trace";
import { TraceDialog } from "../../_shell/TraceDialog";
import s from "./Entitlements.module.css";

const statusTone: Record<Entitlement["status"], Tone> = { granted: "positive", partial: "caution", withheld: "caution", refused: "negative", notApplicable: "neutral", informational: "info" };
const statusWord: Record<Entitlement["status"], string> = { granted: "Przysługuje", partial: "Przysługuje częściowo", withheld: "Wypłata wstrzymana", refused: "Nie przysługuje", notApplicable: "Nie dotyczy", informational: "Informacja" };

const pregnancy = new Set(["sickPay", "sickness", "rehabilitation", "art30PreBirth"]);

export function isLoss(f: Facts) {
  return f.event.kind === "birth" && f.event.children.length > 0 && f.event.children.every((c) => c.bornAlive === false || Boolean(c.deathDate));
}

function eventDay(f: Facts) {
  return f.event.kind === "birth" ? (f.event.date ?? f.event.expectedDate) : f.event.takenIntoCareOn;
}

function Verdict({ result, facts }: { result: Result; facts: Facts }) {
  const mat = result.entitlements.find((e) => e.benefit === "maternity" || e.benefit === "maternityOnAdoption");
  const blocking = result.alerts.filter((a) => a.severity === "blocking");
  const day = eventDay(facts);
  const dayText = facts.event.kind === "birth" ? (facts.event.date ? "w dniu porodu" : "na dzień porodu") : "w dniu przyjęcia dziecka";
  if (mat?.status === "granted" && blocking.length === 0)
    return (
      <Notice tone="positive" headingLevel={2} hideToneWord title={`${capital(dayText)} masz prawo do zasiłku macierzyńskiego`}>
        <p>
          {day ? `Sprawdziliśmy Twoją sytuację na ${formatDateLong(day)}. ` : ""}Masz ubezpieczenie chorobowe i nic nie blokuje wypłaty.
        </p>
      </Notice>
    );
  if (mat?.status === "withheld" || blocking.some((a) => a.code === "ARREARS_OWN" || a.code === "ARREARS_PAYER"))
    return (
      <Notice tone="caution" headingLevel={2} hideToneWord title="Zasiłek zostanie wstrzymany do spłaty zaległości">
        <p>Prawo do zasiłku masz, ale ZUS nie wypłaci go, dopóki zaległość w składkach przekracza próg. Zobacz, co zrobić, poniżej.</p>
      </Notice>
    );
  const fixBy = blocking.map((a) => a.fix?.byDate ?? a.deadline).filter(Boolean).sort()[0];
  return (
    <Notice tone="negative" headingLevel={2} hideToneWord title={fixBy ? `Dziś nie masz prawa do zasiłku macierzyńskiego — możesz to zmienić do ${formatDateLong(fixBy)}` : `${capital(dayText)} nie masz prawa do zasiłku macierzyńskiego`}>
      <p>{mat?.reasonCode ? reasonText[mat.reasonCode] : "Sprawdź powody i możliwe rozwiązania poniżej."}</p>
    </Notice>
  );
}

const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function monthlyFor(result: Result, benefit: string) {
  const p = result.periods.find((x) => x.type === benefit && x.status !== "refused");
  return p ? { daily: p.daily, monthly: p.daily * 30, rate: p.rateBps, paidBy: p.paidBy } : null;
}

function BenefitCard({ e, result }: { e: Entitlement; result: Result }) {
  const amt = monthlyFor(result, e.benefit);
  const label = leaveLabel[e.benefit] ?? e.benefit;
  return (
    <Card as="article" compact heading={label} headingLevel={3} aside={<StatusBadge tone={statusTone[e.status]} label={statusWord[e.status]} />}>
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
      {e.reasonCode && e.status !== "granted" ? <p>{reasonText[e.reasonCode]}</p> : null}
      <div className={s.cardFoot}>
        {e.citations.length ? <span className={s.cite}>{e.citations.map(citationText).join("; ")}</span> : <span />}
        <TraceDialog title={label}>
          <TraceList steps={result.trace} stages={pregnancy.has(e.benefit) ? ["insurance", "gating", "rate", "base", "amount"] : ["insurance", "event", "lengths", "rate", "base", "amount", "gating"]} />
        </TraceDialog>
      </div>
    </Card>
  );
}

export async function EntitlementsContent() {
  const ctx = await loadContext();
  if (!ctx) return <NeedsSession />;
  const { facts, missing } = ctx.assembled;
  if (missing.some((q) => q.required)) {
    return (
      <Notice tone="info" title="Brakuje kilku informacji" actions={<Button href="/sytuacja">Uzupełnij</Button>}>
        <p>Odpowiedz na pytania na stronie „Twoja sytuacja”, a pokażemy Twoje uprawnienia.</p>
      </Notice>
    );
  }
  const { result, error } = await evaluateFacts(facts, ctx.answers.plan ?? null);
  if (!result) {
    return (
      <Notice tone="caution" title="Nie możemy teraz policzyć uprawnień" role="alert">
        <p>To nie jest informacja o Twoich uprawnieniach — wystąpił problem techniczny ({error}). Spróbuj ponownie za chwilę.</p>
      </Notice>
    );
  }
  const loss = isLoss(facts);
  const preg = result.entitlements.filter((e) => pregnancy.has(e.benefit));
  const after = result.entitlements.filter((e) => !pregnancy.has(e.benefit) && e.benefit !== "funeralGrant" && e.benefit !== "parentalBenefitMunicipal");
  const extra = result.entitlements.filter((e) => e.benefit === "funeralGrant" || e.benefit === "parentalBenefitMunicipal");
  const actionable = result.alerts.filter((a) => a.severity !== "info");
  const info = result.alerts.filter((a) => a.severity === "info");

  return (
    <div className={s.layout}>
      {loss ? (
        <Notice tone="neutral" headingLevel={2} hideToneWord title="Przysługuje Ci 8 tygodni zasiłku macierzyńskiego w wysokości 100%">
          <p>Bardzo nam przykro. Poniżej znajdziesz informacje o tym, co Ci przysługuje. Możesz wrócić do nich w dowolnym momencie.</p>
          <p>
            <TextLink href="/trudna-sytuacja">Informacje i wsparcie po stracie dziecka</TextLink>
          </p>
        </Notice>
      ) : (
        <Verdict result={result} facts={facts} />
      )}

      {actionable.length ? (
        <section className={s.section} aria-labelledby="todo">
          <h2 id="todo">Co wymaga działania</h2>
          <AlertList alerts={actionable} />
        </section>
      ) : null}

      {preg.length && !loss ? (
        <section className={s.section} aria-labelledby="preg">
          <h2 id="preg">W ciąży</h2>
          <div className={s.grid}>
            {preg.map((e) => (
              <BenefitCard key={e.benefit} e={e} result={result} />
            ))}
          </div>
        </section>
      ) : null}

      <section className={s.section} aria-labelledby="after">
        <h2 id="after">{facts.event.kind === "birth" ? "Po urodzeniu dziecka" : "Po przyjęciu dziecka"}</h2>
        <div className={s.grid}>
          {after.map((e) => (
            <BenefitCard key={e.benefit} e={e} result={result} />
          ))}
          {extra.map((e) => (
            <BenefitCard key={e.benefit} e={e} result={result} />
          ))}
        </div>
      </section>

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

      {info.length ? (
        <section className={s.section} aria-labelledby="info">
          <h2 id="info">Warto wiedzieć</h2>
          <AlertList alerts={info} />
        </section>
      ) : null}

      <div className={s.cta}>
        {loss ? (
          <Button href="/kroki" iconAfter="chevron-right">
            Co i kiedy trzeba załatwić
          </Button>
        ) : (
          <>
            <Button href="/plan" size="lg" iconAfter="chevron-right">
              Ułóż plan urlopów
            </Button>
            <Button href="/kroki" variant="secondary">
              Dokumenty i terminy
            </Button>
          </>
        )}
      </div>
      <p className={s.muted}>Wyliczenie ma charakter informacyjny i nie jest decyzją ZUS. Parametry prawne: {result.parameterSetId}.</p>
    </div>
  );
}
