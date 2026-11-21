import type { Metadata } from "next";
import { getCharities, getLinks } from "@/server/content-repo";
import { Card } from "@/ui/components/Card/Card";
import { Notice } from "@/ui/components/Notice/Notice";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";
import { TextLink } from "@/ui/components/TextLink/TextLink";
import { formatDateLong } from "@/lib/format";
import { CharityList } from "./CharityList";
import s from "./Wsparcie.module.css";

export const metadata: Metadata = { title: "Wsparcie i organizacje" };

const topicTitle: Record<string, string> = {
  maternity: "Urlop i zasiłek macierzyński",
  parental: "Urlop rodzicielski",
  "leave-rights": "Prawa pracownika-rodzica",
  "birth-certificate": "Akt urodzenia",
  "parental-benefit": "Gdy nie przysługuje zasiłek",
  "za-zyciem": "Program „Za życiem”",
  "funeral-grant": "Zasiłek pogrzebowy",
  other: "Inne",
};

export default async function Page() {
  const [charities, links] = await Promise.all([getCharities(), getLinks()]);
  const verified = charities.map((c) => c.verifiedOn).sort().pop();
  const groups = Object.entries(topicTitle)
    .map(([topic, title]) => ({ topic, title, items: links.filter((l) => l.topic === topic) }))
    .filter((g) => g.items.length);
  const parentalBenefit = links.find((l) => l.topic === "parental-benefit");
  return (
    <>
      <PageHeader title="Wsparcie i organizacje" lead="Gdzie szukać pomocy w trudnych chwilach i gdzie znaleźć oficjalne informacje o uprawnieniach rodziców." />

      <section className={s.section} aria-labelledby="org-title">
        <h2 id="org-title">Organizacje, które pomagają rodzicom</h2>
        <p className={s.muted}>
          Wyłącznie organizacje o charakterze charytatywnym: fundacje i stowarzyszenia, które pomagają bezpłatnie. Nie współpracujemy z nimi i nie przekazujemy im żadnych danych.
          {verified ? ` Dane sprawdziliśmy ${formatDateLong(verified)}.` : ""}
        </p>
        <CharityList charities={charities} />
      </section>

      <section className={s.section} aria-labelledby="crisis-title">
        <Notice tone="info" headingLevel={2} hideToneWord title="Potrzebujesz pilnej rozmowy?">
          <p>
            Całodobowy telefon zaufania dla dorosłych: <strong>116 123</strong>. Centrum wsparcia dla osób w kryzysie psychicznym: <strong>800 70 2222</strong> (całą dobę, bezpłatnie). W sytuacji zagrożenia życia dzwoń pod <strong>112</strong>.
          </p>
        </Notice>
      </section>

      <section className={s.section} aria-labelledby="official-title">
        <h2 id="official-title">Oficjalne informacje</h2>
        <div className={s.grid}>
          {groups.map((g) => (
            <Card key={g.topic} heading={g.title} headingLevel={3} compact>
              <ul className={s.links}>
                {g.items.map((l) => (
                  <li key={l.id}>
                    <TextLink href={l.url} external>
                      {l.title}
                    </TextLink>
                    <span className={s.muted}>
                      {l.publisher} · {l.description}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      <section id="swiadczenie-rodzicielskie" className={s.section} aria-labelledby="sr-title">
        <h2 id="sr-title">Gdy zasiłek macierzyński nie przysługuje</h2>
        <Card tone="alt">
          <p>
            Jeśli w dniu porodu nie masz ubezpieczenia chorobowego (na przykład studiujesz, nie pracujesz, pracujesz na umowie o dzieło albo na zleceniu bez dobrowolnej składki chorobowej), możesz dostać{" "}
            <strong>świadczenie rodzicielskie — 1 000 zł miesięcznie</strong> przez 52 tygodnie (dłużej przy ciąży mnogiej). Wypłaca je ZUS, wniosek składasz przez PUE/eZUS lub w urzędzie gminy.
          </p>
          {parentalBenefit ? (
            <p>
              <TextLink href={parentalBenefit.url} external>
                {parentalBenefit.title}
              </TextLink>
            </p>
          ) : null}
        </Card>
      </section>
    </>
  );
}
