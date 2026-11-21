import type { Metadata } from "next";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";

export const metadata: Metadata = { title: "Deklaracja dostępności" };

export default function Page() {
  return (
    <article style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
      <PageHeader title="Deklaracja dostępności" lead="Przewodnik Rodzica projektujemy zgodnie z WCAG 2.1 na poziomie AA." />
      <h2>Co zapewniamy</h2>
      <ul style={{ paddingLeft: 24, display: "flex", flexDirection: "column", gap: 8 }}>
        <li>Pełną obsługę klawiaturą i widoczny fokus na każdym elemencie.</li>
        <li>Kontrast tekstu co najmniej 4,5:1 — sprawdzany automatycznie przy każdej zmianie kolorów.</li>
        <li>Status nigdy nie jest przekazywany wyłącznie kolorem: zawsze ikona i słowo.</li>
        <li>Układ działający przy powiększeniu 200% i szerokości ekranu 320 px.</li>
        <li>Prosty język, krótkie zdania, wyjaśnienia terminów prawnych.</li>
        <li>Ograniczone animacje, wyłączane przy ustawieniu „ogranicz ruch”.</li>
      </ul>
      <h2>Znane ograniczenia</h2>
      <p>Wydruki wniosków są generowane jako strona HTML do wydruku lub zapisu w PDF przez przeglądarkę.</p>
    </article>
  );
}
