"use client";

import { useState } from "react";
import { Accordion } from "@/ui/components/Accordion/Accordion";
import { Button } from "@/ui/components/Button/Button";
import { Dialog } from "@/ui/components/Dialog/Dialog";
import { ChoiceGroup, DateInput, Field, Select, TextInput } from "@/ui/components/Form/Form";
import { Stepper } from "@/ui/components/Stepper/Stepper";
import { Tabs } from "@/ui/components/Tabs/Tabs";

export function InteractiveDemo() {
  const [weeks, setWeeks] = useState(20);
  const [rate, setRate] = useState<"815" | "100-70">("815");
  const [date, setDate] = useState<string | null>("2027-03-12");
  return (
    <div style={{ display: "grid", gap: 32 }}>
      <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <Field label="Imię dziecka" hint="Możesz wpisać później." optional>
          {({ id, describedBy }) => <TextInput id={id} aria-describedby={describedBy} placeholder="np. Zosia" />}
        </Field>
        <Field label="Wymiar etatu" error="Wybierz wymiar etatu">
          {({ id, describedBy, invalid }) => (
            <Select id={id} aria-describedby={describedBy} aria-invalid={invalid} defaultValue="">
              <option value="" disabled>
                Wybierz…
              </option>
              <option>Pełny etat</option>
              <option>1/2 etatu</option>
            </Select>
          )}
        </Field>
        <DateInput legend="Przewidywana data porodu" hint="Na przykład 12 3 2027" name="due" value={date ?? undefined} onChange={setDate} />
        <Stepper label="Urlop macierzyński" unit="tyg." value={weeks} min={14} max={20} onChange={setWeeks} hint="Matka musi wykorzystać co najmniej 14 tygodni." />
      </div>
      <p>Wybrana data: {date ?? "niepoprawna lub niepełna"}</p>
      <ChoiceGroup
        legend="Jak chcesz otrzymywać zasiłek?"
        name="rate"
        value={rate}
        onChange={(v) => setRate(v)}
        options={[
          { value: "815", label: "81,5% przez cały okres", hint: "Wniosek najpóźniej 21 dni po porodzie." },
          { value: "100-70", label: "100%, potem 70%", hint: "100% za urlop macierzyński, 70% za rodzicielski." },
        ]}
      />
      <ChoiceGroup legend="Kto będzie korzystał z urlopu?" name="who" type="checkbox" row defaultValue={["mama"]} options={[{ value: "mama", label: "Mama" }, { value: "tata", label: "Tata" }]} />
      <Tabs
        label="Przykładowe zakładki"
        items={[
          { id: "a", label: "Mama", content: <p>Treść zakładki mamy.</p> },
          { id: "b", label: "Tata", content: <p>Treść zakładki taty.</p> },
          { id: "c", label: "Razem", content: <p>Podsumowanie rodziny.</p> },
        ]}
      />
      <Accordion
        items={[
          { id: "1", title: "Kto wypłaci mi zasiłek?", content: <p>Jeśli Twój pracodawca zgłasza do ubezpieczenia chorobowego więcej niż 20 osób — pracodawca. W innym przypadku ZUS.</p> },
          { id: "2", title: "Do kiedy muszę złożyć wniosek?", content: <p>Wniosek o zasiłek w wysokości 81,5% złóż najpóźniej 21 dni po porodzie.</p> },
        ]}
      />
      <div>
        <Dialog title="Popraw dane" description="Twoja poprawka zostanie oznaczona, a ZUS ją zweryfikuje." trigger={<Button variant="secondary" icon="edit">Otwórz okno</Button>}>
          <p>Zawartość okna dialogowego.</p>
        </Dialog>
      </div>
    </div>
  );
}
