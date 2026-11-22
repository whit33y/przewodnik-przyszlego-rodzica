import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { aboutIntro, aboutText, requirements } from "@/content/about";
import { SOURCES } from "@/integrations/sources";
import { formatDateLong, formatNumber } from "@/lib/format";
import { readReport } from "@/server/cases-repo";
import { getPublishedParams } from "@/server/params-repo";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";
import { TextLink } from "@/ui/components/TextLink/TextLink";
import s from "./About.module.css";

export const metadata: Metadata = { title: "O serwisie", description: aboutText.lead };

interface ReportTotals {
  cases: number;
  matching: number;
  outcomeTier: { asserted: number; match: number };
  durationFields: { match: number; mismatch: number };
  amountFields: { match: number; mismatch: number };
  knownDivergences?: number;
}

async function caseTotals(): Promise<ReportTotals | null> {
  "use cache";
  cacheTag("cases");
  cacheLife("max");
  const r = readReport() as { totals?: ReportTotals } | null;
  return r?.totals ?? null;
}

export default async function Page() {
  const [totals, { sets }] = await Promise.all([caseTotals(), getPublishedParams()]);
  const registries = SOURCES.filter((x) => x.id !== "mobywatel");
  const login = SOURCES.find((x) => x.id === "mobywatel");
  return (
    <div className={s.page}>
      <PageHeader title={aboutText.title} lead={aboutText.lead} />

      <section className={s.section} aria-labelledby="co-robi">
        <h2 id="co-robi">Co robi Przewodnik Rodzica</h2>
        <ul className={s.list}>
          {aboutIntro.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <section className={`${s.section} ${s.wide}`} aria-labelledby="wymagania">
        <h2 id="wymagania">Mapa wymagań konkursu</h2>
        <p className={s.muted}>Każdy punkt zadania konkursowego i każda wymagana symulacja — z ekranem, który go realizuje.</p>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <caption>Wymagania z treści zadania (punkty a–j i symulacje) i ekrany serwisu</caption>
            <thead>
              <tr>
                <th scope="col">Wymaganie</th>
                <th scope="col">Gdzie w serwisie</th>
              </tr>
            </thead>
            <tbody>
              {requirements.map((r) => (
                <tr key={r.id} data-req={r.id}>
                  <th scope="row">
                    <span className={s.tag}>{r.tag.length === 1 ? `${r.tag})` : `${r.tag}:`}</span> <span className={s.reqText}>{r.text}</span>
                  </th>
                  <td>
                    <ul className={s.screens}>
                      {r.screens.map((x) => (
                        <li key={x.href}>
                          <TextLink href={x.href}>{x.label}</TextLink>
                          {x.coming ? <span className={s.muted}> (w przygotowaniu)</span> : null}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={s.section} aria-labelledby="zrodla">
        <h2 id="zrodla">Skąd bierzemy dane — {registries.length} symulowanych rejestrów</h2>
        <p>
          Po zalogowaniu{login ? ` przez ${login.label}` : ""} i Twojej zgodzie pobieramy dane z rejestrów. Każda wartość na ekranie ma oznaczenie źródła, a Twoja poprawka nigdy nie usuwa danej z rejestru.
        </p>
        <ul className={s.list}>
          {registries.map((x) => (
            <li key={x.id}>
              <strong>{x.label}</strong> — {x.reads}. {x.purpose}
            </li>
          ))}
        </ul>
      </section>

      <section className={s.section} aria-labelledby="symulacja">
        <h2 id="symulacja">To jest symulacja</h2>
        <p>{aboutText.simulation}</p>
        <h3>Sztuczna inteligencja</h3>
        <ul className={s.list}>
          <li>{aboutText.aiRuntime}</li>
          <li>{aboutText.aiDev}</li>
        </ul>
      </section>

      <section className={s.section} aria-labelledby="liczby">
        <h2 id="liczby">Jak liczymy</h2>
        <p>{aboutText.engine}</p>
        <p>{aboutText.params}</p>
        {sets.length ? (
          <ul className={s.list} aria-label="Opublikowane zestawy parametrów">
            {sets.map((p) => (
              <li key={p.id}>
                od {formatDateLong(p.validFrom)} — {p.label}
              </li>
            ))}
          </ul>
        ) : null}
        {totals ? (
          <>
            <p>
              Silnik sprawdzamy testami na {formatNumber(totals.cases)} prawdziwych, zanonimizowanych sprawach ZUS. Wyniki porównujemy z decyzjami w tych sprawach:
            </p>
            <ul className={s.stats} data-testid="case-totals">
              <li className={s.stat}>
                <span className={s.statValue}>
                  {formatNumber(totals.outcomeTier.match)} z {formatNumber(totals.outcomeTier.asserted)}
                </span>
                <span className={s.muted}>spraw z tym samym rozstrzygnięciem (przyznanie lub odmowa)</span>
              </li>
              <li className={s.stat}>
                <span className={s.statValue}>{formatNumber(totals.durationFields.match)}</span>
                <span className={s.muted}>
                  zgodnych okresów i liczby dni{totals.durationFields.mismatch ? `, niezgodnych: ${formatNumber(totals.durationFields.mismatch)}` : ", bez niezgodności"}
                </span>
              </li>
              <li className={s.stat}>
                <span className={s.statValue}>{formatNumber(totals.amountFields.match)}</span>
                <span className={s.muted}>
                  zgodnych kwot (podstawa, stawka dzienna, suma){totals.amountFields.mismatch ? `, niezgodnych: ${formatNumber(totals.amountFields.mismatch)}` : ", bez niezgodności"}
                </span>
              </li>
            </ul>
            {totals.knownDivergences ? (
              <p className={s.muted}>W {formatNumber(totals.knownDivergences)} sprawach opisujemy znane różnice i ich przyczynę.</p>
            ) : null}
          </>
        ) : null}
        <p>
          <TextLink href="/sprawy">Zobacz wszystkie sprawy i porównanie z decyzjami ZUS</TextLink>
        </p>
      </section>

      <section className={s.section} aria-labelledby="prywatnosc">
        <h2 id="prywatnosc">Prywatność</h2>
        <ul className={s.list}>
          {aboutText.privacy.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <section className={s.section} aria-labelledby="dostepnosc">
        <h2 id="dostepnosc">Dostępność</h2>
        <p>
          Serwis projektujemy zgodnie z WCAG 2.1 na poziomie AA. Szczegóły i znane ograniczenia opisujemy w <TextLink href="/dostepnosc">deklaracji dostępności</TextLink>.
        </p>
      </section>

      <section className={s.section} aria-labelledby="licencje">
        <h2 id="licencje">Licencje komponentów</h2>
        <ul className={s.list}>
          {aboutText.licences.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
