"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/ui/components/Button/Button";
import { Field, Select, TextInput } from "@/ui/components/Form/Form";
import { Notice } from "@/ui/components/Notice/Notice";
import { StatusBadge } from "@/ui/components/StatusBadge/StatusBadge";
import { Icon } from "@/ui/icons/Icon";
import type { CaseListItem } from "@/server/cases-repo";
import s from "./Sprawy.module.css";

const scenarios: Record<string, string> = {
  "1.1": "Pracownica — macierzyński i rodzicielski",
  "1.2": "Zasiłek chorobowy w ciąży",
  "1.3": "Działalność / osoba współpracująca",
  "1.4": "Umowa zlecenia",
  "1.5": "Ojciec — urlop ojcowski",
  "1.6": "Ojciec — 9 tygodni rodzicielskiego",
  "1.7": "Ojciec — inny urlop rodzicielski",
  "1.8": "Matka kończy macierzyński wcześniej",
  "1.9": "Urodzenie martwego dziecka",
  "1.10": "Wcześniak — urlop uzupełniający",
  "1.11": "Ciąża mnoga / „Za życiem”",
  "1.12": "Adopcja / rodzina zastępcza",
  "1.13": "Likwidacja pracodawcy (art. 30)",
  "1.14": "Umowa przedłużona do porodu",
  "1.15": "Łączenie urlopu z pracą",
  "1.16": "Niski zasiłek — wyrównanie do 1000 zł",
  "1.17": "Odmowy",
  "1.18": "Częściowa odmowa",
};

const outcomeBadge = { granted: { tone: "positive", label: "ZUS: przyznano" }, refused: { tone: "negative", label: "ZUS: odmowa" }, partial: { tone: "caution", label: "ZUS: częściowo" } } as const;

async function sha256(buf: ArrayBuffer) {
  const h = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Same normalisation as scripts/hash-cases: NFC, lower case, collapsed whitespace, no extension. */
function normaliseName(name: string) {
  return name.normalize("NFC").toLowerCase().replace(/\.pdf$/, "").replace(/\s+/g, " ").trim();
}

export function CaseBrowser({ cases }: { cases: CaseListItem[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [scenario, setScenario] = useState("");
  const [outcome, setOutcome] = useState("");
  const [drop, setDrop] = useState<{ state: "idle" | "hashing" | "nomatch" | "error"; name?: string }>({ state: "idle" });
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const shown = useMemo(
    () => cases.filter((c) => (!scenario || c.scenario === scenario) && (!outcome || c.outcome === outcome) && (!q || c.id.toLowerCase().includes(q.toLowerCase()) || c.title.toLowerCase().includes(q.toLowerCase()))),
    [cases, q, scenario, outcome],
  );

  async function handle(file: File) {
    setDrop({ state: "hashing", name: file.name });
    try {
      const [pdfSha256, fileNameSha256] = await Promise.all([file.arrayBuffer().then(sha256), sha256(new TextEncoder().encode(normaliseName(file.name)).buffer as ArrayBuffer)]);
      const res = await fetch("/api/v1/cases/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pdfSha256, fileNameSha256 }) });
      if (res.ok) {
        const { id } = (await res.json()) as { id: string };
        router.push(`/sprawy/${id}`);
      } else setDrop({ state: "nomatch", name: file.name });
    } catch {
      setDrop({ state: "error", name: file.name });
    }
  }

  return (
    <div className={s.browser}>
      <section aria-labelledby="drop-title" className={s.dropWrap}>
        <h2 id="drop-title">Wgraj plik sprawy</h2>
        <div
          className={s.drop}
          data-over={over || undefined}
          onDragOver={(e) => (e.preventDefault(), setOver(true))}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const f = e.dataTransfer.files[0];
            if (f) void handle(f);
          }}
        >
          <Icon name="upload" size={32} />
          <p>
            <strong>Przeciągnij tu plik PDF</strong> z zestawu przykładowych spraw albo
          </p>
          <Button variant="secondary" icon="document" onClick={() => input.current?.click()} loading={drop.state === "hashing"}>
            Wybierz plik
          </Button>
          <input
            ref={input}
            type="file"
            accept="application/pdf,.pdf"
            className="visually-hidden"
            tabIndex={-1}
            aria-label="Plik sprawy (PDF)"
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              if (f) void handle(f);
            }}
          />
          <p className={s.dropNote}>
            <Icon name="lock" size={16} /> Plik nie opuszcza Twojego komputera — przeglądarka liczy jego skrót SHA-256 i tylko ten skrót wysyłamy, żeby rozpoznać sprawę.
          </p>
        </div>
        <div aria-live="polite">
          {drop.state === "nomatch" ? (
            <Notice tone="caution" title="Nie rozpoznaliśmy pliku">
              <p>
                „{drop.name}” nie pasuje do żadnej sprawy z zestawu. Wybierz sprawę z listy poniżej albo <Link href="/bez-logowania">wpisz dane samodzielnie</Link>.
              </p>
            </Notice>
          ) : drop.state === "error" ? (
            <Notice tone="caution" title="Nie udało się odczytać pliku">
              <p>Spróbuj ponownie albo wybierz sprawę z listy.</p>
            </Notice>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="list-title" className={s.listWrap}>
        <h2 id="list-title">Lista spraw</h2>
        <div className={s.filters}>
          <Field label="Szukaj (numer lub opis)">{({ id }) => <TextInput id={id} type="search" value={q} onChange={(e) => setQ(e.currentTarget.value)} placeholder="np. B4-07 albo „wcześniak”" />}</Field>
          <Field label="Sytuacja">
            {({ id }) => (
              <Select id={id} value={scenario} onChange={(e) => setScenario(e.currentTarget.value)}>
                <option value="">Wszystkie</option>
                {Object.entries(scenarios).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Rozstrzygnięcie ZUS">
            {({ id }) => (
              <Select id={id} value={outcome} onChange={(e) => setOutcome(e.currentTarget.value)}>
                <option value="">Wszystkie</option>
                <option value="granted">Przyznano</option>
                <option value="refused">Odmowa</option>
                <option value="partial">Częściowo</option>
              </Select>
            )}
          </Field>
        </div>
        <p role="status" className={s.count}>
          Spraw: {shown.length} z {cases.length}
        </p>
        <ul className={s.list}>
          {shown.map((c) => (
            <li key={c.id} className={s.item}>
              <Link href={`/sprawy/${c.id}`} className={s.itemLink}>
                <span className={s.id}>{c.id}</span>
                <span className={s.itemTitle}>{c.title}</span>
              </Link>
              <span className={s.itemMeta}>
                <StatusBadge tone={outcomeBadge[c.outcome].tone} label={outcomeBadge[c.outcome].label} />
                <span className={s.muted}>{scenarios[c.scenario] ?? c.scenario}</span>
                {c.tiers.amount ? <span className={s.tier}>kwoty w aktach</span> : null}
                {c.tiers.duration ? <span className={s.tier}>okresy w aktach</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
