"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/ui/components/Button/Button";
import { Dialog } from "@/ui/components/Dialog/Dialog";
import { Field, Select } from "@/ui/components/Form/Form";
import { Stepper } from "@/ui/components/Stepper/Stepper";
import s from "./Plan.module.css";

export interface WhatIfState {
  eventKind: "birth" | "adoption" | "foster";
  childrenCount: number;
  zaZyciem: boolean;
  hospital: { category: "none" | "preterm" | "extreme" | "term"; days: number };
  /** Facts a registry already holds are shown read-only. */
  known: { eventKind: boolean; children: boolean; zaZyciem: boolean; hospital: boolean };
}

const hospitalLabel = { none: "Nie", preterm: "Wcześniak (28–36 tydzień)", extreme: "Skrajny wcześniak (do 27 tygodnia lub do 1000 g)", term: "Urodzone o czasie, długi pobyt w szpitalu" } as const;

/**
 * "Sytuacja do symulacji": brief item (b) asks for a calculator with the number of children,
 * "Za życiem" and the child's circumstances as options. Changes write to the user's answers and
 * re-derive the statutory pools; an edited plan is only replaced after confirmation.
 */
export function WhatIfBar({ state, dirty, onApplied }: { state: WhatIfState; dirty: boolean; onApplied: () => Promise<void> }) {
  const router = useRouter();
  const [draft, setDraft] = useState(state);
  const [ask, setAsk] = useState(false);
  const [pending, start] = useTransition();
  const changed = JSON.stringify(draft) !== JSON.stringify(state);

  async function save(replace: boolean) {
    start(async () => {
      await fetch("/api/v1/answers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(!state.known.eventKind ? { eventKind: draft.eventKind } : {}),
          ...(!state.known.children ? { childrenCount: draft.childrenCount } : {}),
          ...(!state.known.zaZyciem ? { zaZyciem: draft.zaZyciem } : {}),
          ...(!state.known.hospital ? { whatIf: { hospital: draft.hospital } } : {}),
        }),
      });
      if (replace) await onApplied();
      setAsk(false);
      router.refresh();
    });
  }

  return (
    <section className={s.whatIf} aria-labelledby="whatif-title">
      <div className={s.laneHead}>
        <h2 id="whatif-title" className={s.h3}>
          Sytuacja do symulacji
        </h2>
        <span className={s.muted}>Zmień, żeby zobaczyć, jak wpływa na urlop i zasiłek.</span>
      </div>
      <div className={s.whatIfGrid}>
        <Field label="Zdarzenie">
          {({ id }) => (
            <Select id={id} value={draft.eventKind} disabled={state.known.eventKind} onChange={(e) => setDraft({ ...draft, eventKind: e.currentTarget.value as WhatIfState["eventKind"] })}>
              <option value="birth">Urodzenie dziecka</option>
              <option value="adoption">Przysposobienie</option>
              <option value="foster">Rodzina zastępcza</option>
            </Select>
          )}
        </Field>
        {draft.eventKind === "birth" ? (
          <>
            {state.known.children ? (
              <p>
                <span className={s.label}>Liczba dzieci</span>
                <span className={s.value}>{state.childrenCount}</span> <span className={s.muted}>z rejestru</span>
              </p>
            ) : (
              <Stepper label="Liczba dzieci" unit={draft.childrenCount === 1 ? "dziecko" : "dzieci"} value={draft.childrenCount} min={1} max={5} onChange={(n) => setDraft({ ...draft, childrenCount: n })} />
            )}
            <Field label="Zaświadczenie „Za życiem”">
              {({ id }) => (
                <Select id={id} value={draft.zaZyciem ? "yes" : "no"} disabled={state.known.zaZyciem} onChange={(e) => setDraft({ ...draft, zaZyciem: e.currentTarget.value === "yes" })}>
                  <option value="no">Nie</option>
                  <option value="yes">Tak</option>
                </Select>
              )}
            </Field>
            <Field label="Dziecko w szpitalu po porodzie">
              {({ id }) => (
                <Select id={id} value={draft.hospital.category} disabled={state.known.hospital} onChange={(e) => setDraft({ ...draft, hospital: { category: e.currentTarget.value as WhatIfState["hospital"]["category"], days: draft.hospital.days || 21 } })}>
                  {Object.entries(hospitalLabel).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            {draft.hospital.category !== "none" && !state.known.hospital ? (
              <Stepper label="Dni w szpitalu" unit="dni" value={draft.hospital.days} min={1} max={200} onChange={(d) => setDraft({ ...draft, hospital: { ...draft.hospital, days: d } })} />
            ) : null}
          </>
        ) : null}
      </div>
      {changed ? (
        <div className={s.toolbarActions}>
          <Button size="sm" loading={pending} onClick={() => (dirty ? setAsk(true) : save(true))}>
            Przelicz
          </Button>
          <Button size="sm" variant="text" onClick={() => setDraft(state)}>
            Anuluj
          </Button>
        </div>
      ) : null}
      <Dialog open={ask} onOpenChange={setAsk} title="Zastąpić plan nowym wymiarem urlopu?" description="Zmieniona sytuacja zmienia, ile urlopu przysługuje. Twój plan ma własne zmiany.">
        <div className={s.toolbarActions}>
          <Button loading={pending} onClick={() => save(true)}>
            Tak, ułóż plan od nowa
          </Button>
          <Button variant="secondary" disabled={pending} onClick={() => save(false)}>
            Zostaw mój plan
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
