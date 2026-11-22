"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/ui/components/Button/Button";
import { ChoiceGroup, DateInput } from "@/ui/components/Form/Form";
import { Notice } from "@/ui/components/Notice/Notice";
import s from "./Planning.module.css";

export interface QuestionValues {
  praca?: string;
  chorobowe?: string;
  od?: string;
  zaleglosci?: string;
  termin?: string;
}

const fieldLabel: Record<string, string> = { praca: "Jak pracujesz", chorobowe: "Ubezpieczenie chorobowe", od: "Od kiedy", zaleglosci: "Zaległości w składkach", termin: "Termin porodu" };

/** Four questions, sent as a plain GET form: works without JavaScript and keeps nothing on the server. */
export function QuestionsForm({ values, errors, defaultDue }: { values: QuestionValues; errors: Record<string, string>; defaultDue: string }) {
  const errorKeys = Object.keys(errors);
  return (
    <form method="get" action="/planuje-dziecko" className={s.form} noValidate>
      <input type="hidden" name="sprawdz" value="1" />
      {errorKeys.length ? (
        <Notice tone="negative" title="Popraw zaznaczone odpowiedzi" role="alert" hideToneWord>
          <ul className={s.errorList}>
            {errorKeys.map((k) => (
              <li key={k}>
                {fieldLabel[k] ?? k}: {errors[k]}
              </li>
            ))}
          </ul>
        </Notice>
      ) : null}
      <ChoiceGroup
        legend="1. Jak pracujesz?"
        name="praca"
        defaultValue={values.praca as never}
        error={errors.praca}
        options={[
          { value: "employment", label: "Umowa o pracę" },
          { value: "mandate", label: "Umowa zlecenia" },
          { value: "selfEmployed", label: "Własna działalność gospodarcza" },
          { value: "none", label: "Obecnie nie pracuję" },
        ]}
      />
      <ChoiceGroup
        legend="2. Czy masz ubezpieczenie chorobowe?"
        hint="Na umowie o pracę masz je zawsze. Przy zleceniu i działalności jest dobrowolne — sprawdzisz to w PUE/eZUS albo u zleceniodawcy."
        name="chorobowe"
        row
        defaultValue={values.chorobowe as never}
        error={errors.chorobowe}
        options={[
          { value: "tak", label: "Tak" },
          { value: "nie", label: "Nie" },
          { value: "nie-wiem", label: "Nie wiem" },
        ]}
      />
      <DateInput legend="3. Od kiedy pracujesz w tej formie?" hint="Na przykład 1 3 2025. Pomiń, jeśli nie pracujesz." name="od" value={values.od} error={errors.od} />
      <ChoiceGroup
        legend="4. Czy masz zaległości w składkach ZUS?"
        hint="Ma to znaczenie przy własnej działalności: zaległość w dniu porodu wstrzymuje wypłatę zasiłku."
        name="zaleglosci"
        row
        defaultValue={values.zaleglosci as never}
        error={errors.zaleglosci}
        options={[
          { value: "nie", label: "Nie" },
          { value: "tak", label: "Tak" },
        ]}
      />
      <DateInput legend="Planowany termin porodu (opcjonalnie)" hint={`Jeśli go nie podasz, sprawdzimy sytuację na dzień za 9 miesięcy.`} name="termin" value={values.termin ?? defaultDue} error={errors.termin} />
      <div>
        <Button type="submit" iconAfter="chevron-right">
          Sprawdź
        </Button>
      </div>
    </form>
  );
}

/** Logged in: try another hypothetical due date. GET keeps it out of the saved answers. */
export function DueDateForm({ due, error }: { due: string; error?: string }) {
  return (
    <form method="get" action="/planuje-dziecko" className={s.inlineForm} noValidate>
      <DateInput legend="Hipotetyczny termin porodu" hint="Zmień datę, żeby zobaczyć, co by się działo przy innym terminie." name="termin" value={due} error={error} />
      <Button type="submit" variant="secondary" icon="refresh">
        Przelicz
      </Button>
    </form>
  );
}

/** Saves the hypothetical date as the user's due date — only when they ask for it. */
export function SaveDueDate({ due, label }: { due: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(null);
  return (
    <div className={s.actions}>
      <Button
        variant="text"
        icon="check"
        loading={pending}
        onClick={() =>
          start(async () => {
            const res = await fetch("/api/v1/answers", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedDate: due }) });
            if (res.ok) {
              setState({ ok: true, message: `Zapisaliśmy termin ${label} w Twoich danych.` });
              router.refresh();
            } else {
              const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
              setState({ ok: false, message: data.error?.message ?? "Nie udało się zapisać terminu." });
            }
          })
        }
      >
        Zapisz ten termin w moich danych
      </Button>
      <span role="status" className={s.small}>
        {state ? (state.ok ? state.message : `Błąd: ${state.message}`) : ""}
      </span>
    </div>
  );
}
