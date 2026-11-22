import type { Metadata } from "next";
import { Suspense } from "react";
import type { ParameterSet } from "@/engine/types";
import { lossPage, lossSections, type LossParams, type LossSection } from "@/content/loss";
import { formatMoney } from "@/lib/format";
import { getCharities, type Charity } from "@/server/content-repo";
import { getPublishedParams } from "@/server/params-repo";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";
import { TextLink } from "@/ui/components/TextLink/TextLink";
import { LossStrip } from "./LossStrip";
import s from "./Loss.module.css";

export const metadata: Metadata = {
  title: "Trudna sytuacja",
  description: "Co przysługuje po urodzeniu martwego dziecka, poronieniu, śmierci dziecka, przy wcześniaku, ciężkiej chorobie dziecka oraz chorobie lub śmierci matki.",
};

/** Values from the newest published parameter set — the copy never hard-codes amounts or lengths. */
async function lossParams(): Promise<LossParams> {
  const { sets } = await getPublishedParams();
  const p = sets[sets.length - 1] as unknown as ParameterSet;
  return {
    lossWeeks: p.loss.weeksAfterStillbirthOrEarlyDeath,
    earlyDeathBeforeWeeks: p.loss.earlyDeathBeforeWeeks,
    minDaysFromDeath: p.loss.minDaysFromDeath,
    funeralGrant: formatMoney(p.loss.funeralGrant, { whole: true }),
    takeoverAfterWeeks: p.maternity.motherMandatoryWeeksSpecial,
    supplementary: {
      capExtreme: p.supplementary.capWeeksExtreme,
      capPreterm: p.supplementary.capWeeksPreterm,
      capTerm: p.supplementary.capWeeksTerm,
      extremeBeforeWeek: p.supplementary.extremePretermBeforeWeek,
      extremeMaxWeightG: p.supplementary.extremeMaxWeightG,
      pretermBeforeWeek: p.supplementary.pretermBeforeWeek,
      termMinConsecutiveDays: p.supplementary.termMinConsecutiveDays,
      termFirstDayFrom: p.supplementary.termFirstDayFrom,
      termFirstDayTo: p.supplementary.termFirstDayTo,
      leadDays: p.supplementary.applicationLeadDays,
    },
    parental: {
      single: p.parental.weeks.single,
      multiple: p.parental.weeks.multiple,
      zaZyciemSingle: p.parental.weeksZaZyciem.single,
      zaZyciemMultiple: p.parental.weeksZaZyciem.multiple,
      reservedPerParent: p.parental.reservedWeeksPerParent,
      leadDays: p.parental.applicationLeadDays,
    },
  };
}

function Organisations({ ids, charities, headingId }: { ids: string[]; charities: Map<string, Charity>; headingId: string }) {
  const list = ids.map((id) => charities.get(id)).filter((c): c is Charity => Boolean(c));
  if (list.length === 0) return null;
  return (
    <div className={s.block}>
      <h3 id={headingId}>{lossPage.talkHeading}</h3>
      <ul className={s.orgs} aria-labelledby={headingId}>
        {list.map((c) => (
          <li key={c.id} className={s.org}>
            <span className={s.orgName}>{c.name}</span>
            <span>{c.description}</span>
            <span className={s.orgMeta}>
              {c.phone ? <span>Telefon: {c.phone}</span> : null}
              <TextLink href={c.url} external>
                Strona organizacji<span className="visually-hidden"> {c.name}</span>
              </TextLink>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Situation({ section, charities }: { section: LossSection; charities: Map<string, Charity> }) {
  const h = `${section.id}-tytul`;
  return (
    <section id={section.id} className={s.section} aria-labelledby={h}>
      <h2 id={h}>{section.title}</h2>
      <p className={s.ack}>{section.acknowledgement}</p>
      <Organisations ids={section.charities} charities={charities} headingId={`${section.id}-rozmowa`} />
      <div className={s.block}>
        <h3>{lossPage.appliesHeading}</h3>
        {section.applies.map((t) => (
          <p key={t}>{t}</p>
        ))}
      </div>
      {section.documents?.length ? (
        <div className={s.block}>
          <h3>{lossPage.documentsHeading}</h3>
          <ul className={s.list}>
            {section.documents.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className={s.block}>
        <h3>{lossPage.stepsHeading}</h3>
        <ol className={s.steps}>
          {section.steps.slice(0, 4).map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
      </div>
      <div className={s.foot}>
        <p className={s.later}>{lossPage.later}</p>
        <p className={s.muted}>Podstawa: {section.basis}</p>
        <p className={s.muted}>
          <TextLink href="#sytuacje">{lossPage.backToList}</TextLink>
        </p>
      </div>
    </section>
  );
}

export default async function Page() {
  const [params, charityList] = await Promise.all([lossParams(), getCharities()]);
  const sections = lossSections(params);
  const charities = new Map(charityList.map((c) => [c.id, c]));
  return (
    <div className={s.page}>
      <PageHeader title={lossPage.title} lead={lossPage.lead} />
      <Suspense fallback={null}>
        <LossStrip />
      </Suspense>
      <nav id="sytuacje" className={s.toc} aria-labelledby="sytuacje-tytul">
        <h2 id="sytuacje-tytul" className={s.tocTitle}>
          {lossPage.tocLabel}
        </h2>
        <ul className={s.tocList}>
          {sections.map((x) => (
            <li key={x.id}>
              <a href={`#${x.id}`}>{x.title}</a>
            </li>
          ))}
        </ul>
        <p className={s.muted}>{lossPage.decides}</p>
      </nav>
      {sections.map((x) => (
        <Situation key={x.id} section={x} charities={charities} />
      ))}
      <section className={s.closing} aria-labelledby="pilne-tytul">
        <h2 id="pilne-tytul">{lossPage.urgentTitle}</h2>
        <p>{lossPage.urgent}</p>
        <p>
          <TextLink href="/wsparcie">{lossPage.moreOrganisations}</TextLink>
        </p>
      </section>
    </div>
  );
}
