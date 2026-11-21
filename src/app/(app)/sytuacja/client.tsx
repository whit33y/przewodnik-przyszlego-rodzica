"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/ui/components/Button/Button";
import { ChoiceGroup, DateInput, Field, Select, TextArea, TextInput } from "@/ui/components/Form/Form";
import { Dialog } from "@/ui/components/Dialog/Dialog";
import { Notice } from "@/ui/components/Notice/Notice";

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(data.error?.message ?? "Nie udało się zapisać.");
  }
  return res.json();
}

function useSave() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const save = (fn: () => Promise<unknown>, after?: () => void) =>
    start(async () => {
      setError(null);
      try {
        await fn();
        after?.();
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  return { pending, error, save };
}

export function QuestionShell({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="question" style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, borderRadius: 4, background: "var(--primary-soft)", borderLeft: "4px solid var(--primary)" }}>
      <p style={{ fontWeight: 700 }}>{title}</p>
      {hint ? <p style={{ color: "var(--ink-muted)", fontSize: 14 }}>{hint}</p> : null}
      {children}
    </div>
  );
}

export function ExpectedDateQuestion({ initial }: { initial?: string }) {
  const [date, setDate] = useState<string | null>(initial ?? null);
  const [touched, setTouched] = useState(false);
  const { pending, error, save } = useSave();
  return (
    <QuestionShell title="Kiedy spodziewasz się porodu?" hint="Termin znajdziesz w karcie ciąży. Możesz go później zmienić.">
      <DateInput legend="Przewidywana data porodu" name="expectedDate" value={initial} onChange={setDate} error={touched && !date ? "Wpisz pełną, poprawną datę, np. 12 3 2027." : error ?? undefined} />
      <div>
        <Button size="sm" loading={pending} onClick={() => (setTouched(true), date ? save(() => send("/api/v1/answers", "PUT", { expectedDate: date })) : undefined)}>
          Zapisz
        </Button>
      </div>
    </QuestionShell>
  );
}

export function ChildrenCountQuestion() {
  const { pending, error, save } = useSave();
  const [v, setV] = useState<"1" | "2" | "3">("1");
  return (
    <QuestionShell title="Ile dzieci się spodziewasz?" hint="Przy ciąży mnogiej urlop macierzyński jest dłuższy (31 tygodni przy bliźniętach).">
      <ChoiceGroup legend="Liczba dzieci" name="childrenCount" row value={v} onChange={(x) => setV(x)} options={[{ value: "1", label: "Jedno" }, { value: "2", label: "Bliźnięta" }, { value: "3", label: "Troje lub więcej" }]} error={error ?? undefined} />
      <div>
        <Button size="sm" loading={pending} onClick={() => save(() => send("/api/v1/answers", "PUT", { childrenCount: Number(v) }))}>
          Zapisz
        </Button>
      </div>
    </QuestionShell>
  );
}

export function ZaZyciemQuestion() {
  const { pending, error, save } = useSave();
  const [v, setV] = useState<"no" | "yes">("no");
  return (
    <QuestionShell title="Czy lekarz wydał zaświadczenie „Za życiem”?" hint="Wydaje je lekarz, gdy u dziecka stwierdzono ciężkie i nieodwracalne upośledzenie albo nieuleczalną chorobę. Urlop rodzicielski wydłuża się wtedy do 65 tygodni.">
      <ChoiceGroup legend="Zaświadczenie „Za życiem”" name="zaZyciem" row value={v} onChange={(x) => setV(x)} options={[{ value: "no", label: "Nie" }, { value: "yes", label: "Tak" }]} error={error ?? undefined} />
      <div>
        <Button size="sm" loading={pending} onClick={() => save(() => send("/api/v1/answers", "PUT", { zaZyciem: v === "yes" }))}>
          Zapisz
        </Button>
      </div>
    </QuestionShell>
  );
}

export function PlannedEndQuestion({ titleId, titleLabel }: { titleId: string; titleLabel: string }) {
  const { pending, error, save } = useSave();
  const [v, setV] = useState<"no" | "yes">("no");
  const [date, setDate] = useState<string | null>(null);
  const [reason, setReason] = useState("fixedTermExpired");
  return (
    <QuestionShell title="Czy przed porodem zmieni się Twoja umowa lub działalność?" hint={`Dotyczy: ${titleLabel}. Koniec umowy lub zamknięcie firmy przed porodem może odebrać prawo do zasiłku — sprawdzimy to.`}>
      <ChoiceGroup legend="Planowana zmiana" name="plannedEnd" value={v} onChange={(x) => setV(x)} options={[{ value: "no", label: "Nie, nic się nie zmieni" }, { value: "yes", label: "Tak, umowa się skończy lub zamknę firmę" }]} />
      {v === "yes" ? (
        <>
          <DateInput legend="Data zakończenia" name="endDate" onChange={setDate} />
          <Field label="Powód">
            {({ id }) => (
              <Select id={id} value={reason} onChange={(e) => setReason(e.currentTarget.value)}>
                <option value="fixedTermExpired">Koniec umowy na czas określony</option>
                <option value="resignation">Rezygnuję z pracy</option>
                <option value="mutualAgreement">Rozwiązanie za porozumieniem stron</option>
                <option value="employerLiquidation">Likwidacja pracodawcy</option>
                <option value="employerBankruptcy">Upadłość pracodawcy</option>
                <option value="businessClosed">Zamykam działalność</option>
                <option value="businessSuspended">Zawieszam działalność</option>
              </Select>
            )}
          </Field>
        </>
      ) : null}
      {error ? <p style={{ color: "var(--negative)" }}>{error}</p> : null}
      <div>
        <Button size="sm" loading={pending} disabled={v === "yes" && !date} onClick={() => save(() => send("/api/v1/answers", "PUT", { plannedEnd: v === "yes" && date ? { titleId, date, reason } : null }))}>
          Zapisz
        </Button>
      </div>
    </QuestionShell>
  );
}

export function OtherParentQuestion({ canConsent, otherRole }: { canConsent: boolean; otherRole: "mother" | "father" }) {
  const { pending, error, save } = useSave();
  const [mode, setMode] = useState<"consent" | "estimate" | "none">(canConsent ? "consent" : "estimate");
  const [insured, setInsured] = useState<"yes" | "no" | "krus" | "abroad" | "unknown">("yes");
  const [gross, setGross] = useState("");
  return (
    <QuestionShell title="Czy drugi rodzic też skorzysta z urlopu?" hint="Urlop rodzicielski możecie dzielić. Każde z Was ma 9 tygodni, których nie można przekazać drugiemu.">
      <ChoiceGroup
        legend="Dane drugiego rodzica"
        name="otherParent"
        value={mode}
        onChange={(x) => setMode(x)}
        options={[
          ...(canConsent ? [{ value: "consent" as const, label: "Poproś o zgodę na pobranie danych (symulacja)", hint: "Drugi rodzic potwierdza w swojej aplikacji mObywatel." }] : []),
          { value: "estimate", label: "Podam szacunkowo" },
          { value: "none", label: "Nie dotyczy / tylko ja" },
        ]}
      />
      {mode === "estimate" ? (
        <>
          <Field label="Czy drugi rodzic ma ubezpieczenie chorobowe?">
            {({ id }) => (
              <Select id={id} value={insured} onChange={(e) => setInsured(e.currentTarget.value as typeof insured)}>
                <option value="yes">Tak (ZUS)</option>
                <option value="no">Nie</option>
                <option value="krus">Ubezpieczenie w KRUS</option>
                <option value="abroad">Pracuje za granicą</option>
                <option value="unknown">Nie wiem</option>
              </Select>
            )}
          </Field>
          {insured === "yes" ? (
            <Field label="Przeciętne miesięczne wynagrodzenie brutto drugiego rodzica" hint="W złotych, np. 6500" optional>
              {({ id, describedBy }) => <TextInput id={id} aria-describedby={describedBy} inputMode="decimal" value={gross} onChange={(e) => setGross(e.currentTarget.value)} />}
            </Field>
          ) : null}
        </>
      ) : null}
      {error ? <p style={{ color: "var(--negative)" }}>{error}</p> : null}
      <div>
        <Button
          size="sm"
          loading={pending}
          onClick={() =>
            save(() =>
              send("/api/v1/answers", "PUT", {
                otherParent: {
                  mode,
                  role: otherRole,
                  ...(mode === "estimate" ? { insured, ...(gross ? { estimatedBase: Math.round(parseFloat(gross.replace(",", ".")) * 100 * 0.8629) } : {}) } : {}),
                },
              }),
            )
          }
        >
          Zapisz
        </Button>
      </div>
    </QuestionShell>
  );
}

export interface OverrideSpec {
  path: string;
  label: string;
  kind: "date" | "money" | "select";
  current: string | number | boolean | undefined;
  display: string;
  options?: { value: string; label: string }[];
  overridden?: boolean;
  sourceLabel: string;
}

export function CorrectButton({ spec }: { spec: OverrideSpec }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string | null>(spec.kind === "money" && typeof spec.current === "number" ? (spec.current / 100).toFixed(2).replace(".", ",") : spec.current != null ? String(spec.current) : null);
  const [note, setNote] = useState("");
  const [report, setReport] = useState(true);
  const [done, setDone] = useState<string | null>(null);
  const { pending, error, save } = useSave();
  if (spec.overridden) {
    return (
      <Button variant="text" size="sm" icon="refresh" loading={pending} onClick={() => save(() => send(`/api/v1/overrides?path=${encodeURIComponent(spec.path)}`, "DELETE"))}>
        Cofnij poprawkę
      </Button>
    );
  }
  const parsed = (): string | number | boolean | null => {
    if (value == null || value === "") return null;
    if (spec.kind === "money") {
      const n = parseFloat(value.replace(/\s/g, "").replace(",", "."));
      return Number.isFinite(n) ? Math.round(n * 100) : null;
    }
    if (value === "true" || value === "false") return value === "true";
    return value;
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => (setOpen(o), o ? setDone(null) : null)}
      title={`Popraw: ${spec.label}`}
      description="Wartość z rejestru zostanie zachowana. Twoja poprawka będzie oznaczona, a ZUS ją zweryfikuje przy rozpatrywaniu wniosku."
      trigger={
        <Button variant="text" size="sm" icon="edit">
          Popraw<span className="visually-hidden"> — {spec.label}</span>
        </Button>
      }
    >
      {done ? (
        <Notice tone="positive" title="Zapisaliśmy poprawkę" hideToneWord>
          <p>{done}</p>
        </Notice>
      ) : (
        <>
          <p>
            Obecnie: <strong>{spec.display}</strong> ({spec.sourceLabel})
          </p>
          {spec.kind === "date" ? (
            <DateInput legend="Poprawna data" name="override-date" value={typeof spec.current === "string" ? spec.current : undefined} onChange={setValue} />
          ) : spec.kind === "money" ? (
            <Field label="Poprawna kwota (zł)">{({ id }) => <TextInput id={id} inputMode="decimal" value={value ?? ""} onChange={(e) => setValue(e.currentTarget.value)} />}</Field>
          ) : (
            <Field label="Poprawna wartość">
              {({ id }) => (
                <Select id={id} value={value ?? ""} onChange={(e) => setValue(e.currentTarget.value)}>
                  {spec.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
          <Field label="Uzasadnienie" hint="Na przykład: „pracodawca wypłacił premię, której brakuje”." optional>
            {({ id, describedBy }) => <TextArea id={id} aria-describedby={describedBy} value={note} onChange={(e) => setNote(e.currentTarget.value)} />}
          </Field>
          <ChoiceGroup legend="Zgłoszenie do ZUS" name="report" type="checkbox" plain value={report ? ["yes"] : []} onChange={(_, c) => setReport(c)} options={[{ value: "yes", label: "Zgłoś niezgodność do ZUS przez PUE/eZUS (symulacja)" }]} />
          {error ? <p style={{ color: "var(--negative)", fontWeight: 600 }}>{error}</p> : null}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Button
              loading={pending}
              onClick={() => {
                const v = parsed();
                if (v === null) return;
                save(async () => {
                  await send("/api/v1/overrides", "POST", { path: spec.path, value: v, note: note || undefined });
                  let msg = "Wyliczenia uwzględniają już nową wartość.";
                  if (report) {
                    const r = (await send("/api/v1/pue/queries", "POST", { path: spec.path, topic: "Niezgodność danych", message: `Proszę o weryfikację: ${spec.label}. ${note}`.trim() })) as { id: string };
                    msg += ` Zgłoszenie do ZUS ma numer ${r.id} — odpowiedź w ciągu 7 dni w PUE/eZUS.`;
                  }
                  setDone(msg);
                });
              }}
            >
              Zapisz poprawkę
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
          </div>
        </>
      )}
    </Dialog>
  );
}

export function ManualForm() {
  const { pending, error, save } = useSave();
  const [sex, setSex] = useState<"F" | "M">("F");
  const [work, setWork] = useState<"employment" | "mandate" | "selfEmployed" | "none">("employment");
  const [since, setSince] = useState<string | null>(null);
  const [fraction, setFraction] = useState("1/1");
  const [gross, setGross] = useState("");
  const [sick, setSick] = useState<"mandatory" | "voluntary" | "none">("mandatory");
  const [arrears, setArrears] = useState<"no" | "yes">("no");
  const [over20, setOver20] = useState<"yes" | "no">("yes");
  const [event, setEvent] = useState<"birth" | "adoption" | "foster">("birth");
  const [eventDate, setEventDate] = useState<string | null>(null);
  const [childBirth, setChildBirth] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const missing = !since || !eventDate || (work !== "none" && !gross) || (event !== "birth" && !childBirth);
  const effectiveSick = work === "employment" ? "mandatory" : sick === "mandatory" ? "voluntary" : sick;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (missing) return;
        const [num, den] = fraction.split("/").map(Number);
        save(() =>
          send("/api/v1/answers", "PUT", {
            eventKind: event,
            ...(event === "birth" ? { expectedDate: eventDate } : { care: { takenIntoCareOn: eventDate, childBirthDate: childBirth, fosterType: "nonProfessional" } }),
            manual: {
              role: event === "birth" ? (sex === "F" ? "mother" : "father") : event === "adoption" ? "adoptive" : "foster",
              sex,
              work,
              since,
              ...(work === "employment" ? { fraction: { num, den }, over20Insured: over20 === "yes" } : {}),
              ...(gross ? { monthlyGross: Math.round(parseFloat(gross.replace(/\s/g, "").replace(",", ".")) * 100) } : {}),
              sicknessInsurance: work === "none" ? "none" : effectiveSick,
              arrears: work === "selfEmployed" ? arrears === "yes" : undefined,
            },
          }),
        );
      }}
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      <ChoiceGroup legend="Kim jesteś?" name="sex" row value={sex} onChange={(v) => setSex(v)} options={[{ value: "F", label: "Mamą" }, { value: "M", label: "Tatą" }]} />
      <ChoiceGroup
        legend="Co się wydarzy?"
        name="event"
        value={event}
        onChange={(v) => setEvent(v)}
        options={[
          { value: "birth", label: "Urodzenie dziecka" },
          { value: "adoption", label: "Przysposobienie (adopcja)" },
          { value: "foster", label: "Rodzina zastępcza (niezawodowa)" },
        ]}
      />
      <DateInput legend={event === "birth" ? "Przewidywana data porodu" : "Data przyjęcia dziecka"} name="eventDate" onChange={setEventDate} error={tried && !eventDate ? "Wpisz datę." : undefined} />
      {event !== "birth" ? <DateInput legend="Data urodzenia dziecka" name="childBirth" onChange={setChildBirth} error={tried && !childBirth ? "Wpisz datę urodzenia dziecka." : undefined} /> : null}
      <ChoiceGroup
        legend="Jak pracujesz?"
        name="work"
        value={work}
        onChange={(v) => setWork(v)}
        options={[
          { value: "employment", label: "Umowa o pracę" },
          { value: "mandate", label: "Umowa zlecenia" },
          { value: "selfEmployed", label: "Własna działalność gospodarcza" },
          { value: "none", label: "Nie pracuję" },
        ]}
      />
      {work !== "none" ? (
        <>
          <DateInput legend={work === "selfEmployed" ? "Od kiedy prowadzisz działalność?" : "Od kiedy trwa umowa?"} name="since" onChange={setSince} error={tried && !since ? "Wpisz datę." : undefined} />
          {work === "employment" ? (
            <>
              <Field label="Wymiar etatu">
                {({ id }) => (
                  <Select id={id} value={fraction} onChange={(e) => setFraction(e.currentTarget.value)}>
                    <option value="1/1">Pełny etat</option>
                    <option value="3/4">3/4 etatu</option>
                    <option value="1/2">1/2 etatu</option>
                    <option value="1/4">1/4 etatu</option>
                  </Select>
                )}
              </Field>
              <ChoiceGroup legend="Czy Twój pracodawca zatrudnia ponad 20 osób?" hint="Od tego zależy, kto wypłaci zasiłek: pracodawca czy ZUS." name="over20" row value={over20} onChange={(v) => setOver20(v)} options={[{ value: "yes", label: "Tak" }, { value: "no", label: "Nie / nie wiem" }]} />
            </>
          ) : (
            <ChoiceGroup legend="Czy płacisz dobrowolną składkę chorobową?" name="sick" row value={sick === "mandatory" ? "voluntary" : sick} onChange={(v) => setSick(v)} options={[{ value: "voluntary", label: "Tak" }, { value: "none", label: "Nie" }]} />
          )}
          <Field label={work === "selfEmployed" ? "Zadeklarowana miesięczna podstawa składek (zł)" : "Przeciętne miesięczne wynagrodzenie brutto (zł)"} hint="Z ostatnich 12 miesięcy, np. 6500" error={tried && !gross ? "Wpisz kwotę." : undefined}>
            {({ id, describedBy, invalid }) => <TextInput id={id} aria-describedby={describedBy} aria-invalid={invalid} inputMode="decimal" value={gross} onChange={(e) => setGross(e.currentTarget.value)} />}
          </Field>
          {work === "selfEmployed" ? <ChoiceGroup legend="Czy masz zaległości w składkach?" name="arrears" row value={arrears} onChange={(v) => setArrears(v)} options={[{ value: "no", label: "Nie" }, { value: "yes", label: "Tak" }]} /> : null}
        </>
      ) : null}
      {error ? <p style={{ color: "var(--negative)", fontWeight: 600 }}>{error}</p> : null}
      <div>
        <Button type="submit" loading={pending}>
          Zapisz i sprawdź
        </Button>
      </div>
    </form>
  );
}
