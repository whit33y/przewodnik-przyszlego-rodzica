import type { Metadata } from "next";
import { Button } from "@/ui/components/Button/Button";
import { Card } from "@/ui/components/Card/Card";
import { DataList, DataRow } from "@/ui/components/DataRow/DataRow";
import { DateText, Duration, Money } from "@/ui/components/Format/Format";
import { Notice } from "@/ui/components/Notice/Notice";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";
import { SimBadge, SimBanner } from "@/ui/components/Sim/Sim";
import { CardSkeleton, Skeleton } from "@/ui/components/Skeleton/Skeleton";
import { SourceBadge } from "@/ui/components/SourceBadge/SourceBadge";
import { StatusBadge } from "@/ui/components/StatusBadge/StatusBadge";
import { Steps } from "@/ui/components/Steps/Steps";
import { TextLink } from "@/ui/components/TextLink/TextLink";
import { Icon, iconNames } from "@/ui/icons/Icon";
import { InteractiveDemo } from "./Interactive";

export const metadata: Metadata = { title: "Design system", robots: { index: false } };

const swatches = [
  ["--primary", "Zieleń główna"],
  ["--primary-hover", "Hover"],
  ["--primary-strong", "Ciemna płaszczyzna"],
  ["--primary-soft", "Zaznaczenie"],
  ["--accent-red", "Kreska w nagłówku"],
  ["--positive", "Pozytywny"],
  ["--info", "Informacja"],
  ["--caution", "Uwaga"],
  ["--negative", "Negatywny"],
  ["--neutral", "Neutralny"],
  ["--sim-bg", "Symulacja"],
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export default function Styleguide() {
  return (
    <>
      <PageHeader eyebrow="Przewodnik Rodzica" title="Design system" lead="Język wizualny gov.pl w motywie zielonym. Każdy komponent we wszystkich stanach." />
      <Section title="Kolory">
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
          {swatches.map(([v, l]) => (
            <div key={v} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ height: 56, borderRadius: 4, background: `var(${v})`, border: "1px solid var(--line-soft)" }} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>{l}</span>
              <code style={{ fontSize: 13, color: "var(--ink-muted)" }}>{v}</code>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Typografia">
        <p style={{ fontSize: 30, lineHeight: "38px", fontWeight: 700 }}>Display 30/38 — Poznaj swoją decyzję</p>
        <h3 style={{ fontSize: 24, lineHeight: "32px", fontWeight: 700 }}>Tytuł 24/32 — Twoje uprawnienia</h3>
        <p style={{ fontSize: 20, lineHeight: "28px", fontWeight: 600 }}>Sekcja 20/28 — Zasiłek macierzyński</p>
        <p style={{ fontSize: 18, lineHeight: "28px" }}>Tekst wiodący 18/28 — Przysługuje Ci zasiłek przez 52 tygodnie.</p>
        <p>Tekst 16/24 — domyślny tekst interfejsu, nigdy mniejszy dla treści.</p>
        <p style={{ fontSize: 14, color: "var(--ink-muted)" }}>Podpis 14/20 — z ZUS · stan na 12.11.2026</p>
      </Section>
      <Section title="Przyciski">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <Button>Dalej</Button>
          <Button variant="secondary">Popraw dane</Button>
          <Button variant="text">Dlaczego tyle?</Button>
          <Button variant="danger">Wyloguj</Button>
          <Button icon="download">Pobierz</Button>
          <Button loading>Pobieramy</Button>
          <Button disabled>Niedostępne</Button>
          <Button size="lg" iconAfter="chevron-right">
            Zaloguj
          </Button>
          <Button size="sm" variant="secondary">
            Mały
          </Button>
        </div>
        <p>
          Link w tekście: <TextLink href="/plan">plan rodzicielski</TextLink>, link zewnętrzny: <TextLink href="https://www.zus.pl" external>zus.pl</TextLink>
        </p>
      </Section>
      <Section title="Statusy i komunikaty">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <StatusBadge tone="positive" label="Przysługuje" />
          <StatusBadge tone="negative" label="Nie przysługuje" />
          <StatusBadge tone="caution" label="Wymaga uwagi" />
          <StatusBadge tone="info" label="Informacja" />
          <StatusBadge tone="neutral" label="Nie dotyczy" />
          <StatusBadge tone="positive" label="Przysługuje" size="lg" />
        </div>
        <Notice tone="positive" title="Przysługuje Ci zasiłek macierzyński">
          <p>Na dzień porodu masz ubezpieczenie chorobowe z umowy o pracę.</p>
        </Notice>
        <Notice tone="caution" title="Zaległość w składkach: 312,40 zł" actions={<><Button size="sm">Jak spłacić</Button><TextLink href="#">Sprawdź w PUE/eZUS</TextLink></>}>
          <p>Zasiłek nie zostanie wypłacony do czasu spłaty. Jeśli nie spłacisz w ciągu 6 miesięcy, prawo do zasiłku wygaśnie.</p>
        </Notice>
        <Notice tone="negative" title="Nie przysługuje zasiłek macierzyński">
          <p>Na dzień porodu nie masz ubezpieczenia chorobowego.</p>
        </Notice>
        <Notice tone="info" title="To nie jest decyzja ZUS">
          <p>Wyliczenie ma charakter informacyjny.</p>
        </Notice>
        <Notice tone="neutral" title="Nie dotyczy">
          <p>Świadczenie rehabilitacyjne zależy od orzeczenia lekarza orzecznika ZUS.</p>
        </Notice>
      </Section>
      <Section title="Symulacja">
        <SimBanner />
        <div>
          <SimBadge />
        </div>
      </Section>
      <Section title="Dane z rejestrów">
        <Card heading="Ubezpieczenie" headingLevel={3}>
          <DataList>
            <DataRow label="Tytuł ubezpieczenia" value="Umowa o pracę, pełny etat" source={<SourceBadge source="zus-konto" asOf="2026-11-12" />} action={<Button variant="text" size="sm" icon="edit">Popraw</Button>} />
            <DataRow label="Podstawa wymiaru zasiłku" value={<Money value={690320} />} source={<SourceBadge source="zus-konto" />} />
            <DataRow label="Przewidywana data porodu" value={<DateText value="2027-03-12" />} source={<SourceBadge source="user" />} />
            <DataRow label="Pracodawca zgłasza ponad 20 osób" value="Tak — zasiłek wypłaci pracodawca" source={<SourceBadge source="zus-platnik" overridden />} />
          </DataList>
        </Card>
        <p>
          Czas trwania: <Duration days={365} />, <Duration days={140} />, <Duration days={63} />
        </p>
      </Section>
      <Section title="Kroki">
        <Steps
          items={[
            { title: "Zaloguj się", state: "done", meta: "12 listopada 2026" },
            { title: "Uzupełnij plan urlopów", state: "current", body: "Zostały 2 pytania." },
            { title: "Złóż wniosek o urlop rodzicielski", state: "todo", meta: "do 19 lutego 2027" },
          ]}
        />
      </Section>
      <Section title="Formularze i elementy interaktywne">
        <InteractiveDemo />
      </Section>
      <Section title="Wczytywanie">
        <Skeleton lines={3} />
        <CardSkeleton count={1} />
      </Section>
      <Section title="Ikony">
        <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 12, listStyle: "none" }}>
          {iconNames.map((n) => (
            <li key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: 8, border: "1px solid var(--line-soft)", borderRadius: 4 }}>
              <Icon name={n} />
              <code style={{ fontSize: 12 }}>{n}</code>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
