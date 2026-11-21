"use client";

import { useState } from "react";
import { Button } from "@/ui/components/Button/Button";
import s from "./Consent.module.css";

interface Src {
  id: string;
  label: string;
  reads: string;
  purpose: string;
  required: boolean;
}

/** Consent is an affirmative act: boxes start unchecked; "Zaznacz wszystkie" is one click. */
export function ConsentForm({ sources, granted }: { sources: Src[]; granted: string[] }) {
  const [checked, setChecked] = useState<string[]>(granted);
  const all = checked.length === sources.length;
  return (
    <form action="/api/v1/consent" method="post" className={s.form}>
      <div className={s.toolbar}>
        <span aria-live="polite">
          Zaznaczono {checked.length} z {sources.length}
        </span>
        <Button variant="text" type="button" onClick={() => setChecked(all ? [] : sources.map((x) => x.id))}>
          {all ? "Odznacz wszystkie" : "Zaznacz wszystkie"}
        </Button>
      </div>
      <ul className={s.list}>
        {sources.map((src) => {
          const on = checked.includes(src.id);
          return (
            <li key={src.id}>
              <label className={s.row} data-on={on || undefined}>
                <input
                  type="checkbox"
                  name="sources"
                  value={src.id}
                  checked={on}
                  onChange={(e) => setChecked((c) => (e.currentTarget.checked ? [...c, src.id] : c.filter((x) => x !== src.id)))}
                />
                <span className={s.text}>
                  <span className={s.name}>
                    {src.label}
                    {src.required ? <span className={s.req}>potrzebne do wyliczeń</span> : null}
                  </span>
                  <span className={s.reads}>Pobierzemy: {src.reads}</span>
                  <span className={s.purpose}>{src.purpose}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className={s.note}>
        Dane pobieramy jednorazowo, tylko do wyliczeń w tej sesji. Po wylogowaniu usuwamy je od razu, a jeśli się nie wylogujesz — po 24 godzinach bez aktywności. W symulacji nie łączymy się z prawdziwymi rejestrami.
      </p>
      <div className={s.actions}>
        <Button type="submit" icon="download" disabled={checked.length === 0}>
          Pobierz dane
        </Button>
        <Button type="submit" name="manual" value="1" variant="secondary">
          Wpiszę dane samodzielnie
        </Button>
      </div>
    </form>
  );
}
