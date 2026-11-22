"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Button } from "@/ui/components/Button/Button";
import { ChoiceGroup, DateInput, Field, Select, TextArea, TextInput } from "@/ui/components/Form/Form";
import { Dialog } from "@/ui/components/Dialog/Dialog";
import { Notice } from "@/ui/components/Notice/Notice";
import s from "./Situation.module.css";

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: { message?: string; fields?: Record<string, string> } };
    const field = data.error?.fields ? Object.values(data.error.fields)[0] : undefined;
    throw new Error([data.error?.message ?? "Nie udało się zapisać.", field].filter(Boolean).join(" "));
  }
  return res.json();
}

/** Set by a question save; the progress line takes focus once the refreshed page arrives (the question is gone). */
let focusProgressOnUpdate = false;

function useSave() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const save = (fn: () => Promise<unknown>, opts: { after?: () => void; focusProgress?: boolean } = {}) =>
    start(async () => {
      setError(null);
      try {
        await fn();
        opts.after?.();
        if (opts.focusProgress) focusProgressOnUpdate = true;
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  return { pending, error, save };
}

/** Errors are announced (role="alert") and never carried by colour alone. */
export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className={s.error}>
      Błąd: {children}
    </p>
  );
}

/** "Zostało pytań: N" — focus target after a question is answered, so keyboard and screen-reader users are not dropped on <body>. */
export function ProgressLine({ stamp, children }: { stamp: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!focusProgressOnUpdate) return;
    focusProgressOnUpdate = false;
    ref.current?.focus();
  }, [stamp]);
  return (
    <div ref={ref} id="postep" tabIndex={-1} className={s.progress} role="status">
      {children}
    </div>
  );
}

export function QuestionShell({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className={cx("question", s.question)}>
      <p className={s.questionTitle}>{title}</p>
      {hint ? <p className={s.questionHint}>{hint}</p> : null}
      {children}
    </div>
  );
}

/**
 * Everything about the pregnancy no registry holds (the e-pregnancy card is only announced), asked once and saved with
 * one button: due date, number of babies, "Za życiem". Shows only the parts still missing.
 */
export function PregnancyQuestion({ askDate, askCount, askZaZyciem }: { askDate: boolean; askCount: boolean; askZaZyciem: boolean }) {
  const [date, setDate] = useState<string | null>(null);
  const [count, setCount] = useState<"1" | "2" | "3">("1");
  const [zz, setZz] = useState<"no" | "yes">("no");
  const [touched, setTouched] = useState(false);
  const { pending, error, save } = useSave();
  const parts = [askDate, askCount, askZaZyciem].filter(Boolean).length;
  const title = parts > 1 ? "Powiedz nam o ciąży" : askDate ? "Kiedy spodziewasz się porodu?" : askCount ? "Ile dzieci się spodziewasz?" : "Czy lekarz wydał zaświadczenie „Za życiem”?";
  const submit = () => {
    setTouched(true);
    if (askDate && !date) return;
    save(
      () =>
        send("/api/v1/answers", "PUT", {
          ...(askDate ? { expectedDate: date } : {}),
          ...(askCount ? { childrenCount: Number(count) } : {}),
          ...(askZaZyciem ? { zaZyciem: zz === "yes" } : {}),
        }),
      { focusProgress: true },
    );
  };
  return (
    <QuestionShell title={title} hint="Tych informacji nie ma w żadnym rejestrze — są w karcie ciąży i u lekarza. Możesz je później zmienić.">
      {askDate ? (
        <DateInput legend="Przewidywana data porodu" name="expectedDate" onChange={setDate} error={touched && !date ? "Wpisz pełną, poprawną datę, np. 12 3 2027." : undefined} />
      ) : null}
      {askCount ? (
        <ChoiceGroup
          legend="Ile dzieci się spodziewasz?"
          hint="Przy ciąży mnogiej urlop macierzyński jest dłuższy (31 tygodni przy bliźniętach)."
          name="childrenCount"
          row
          value={count}
          onChange={(x) => setCount(x)}
          options={[{ value: "1", label: "Jedno" }, { value: "2", label: "Bliźnięta" }, { value: "3", label: "Troje lub więcej" }]}
        />
      ) : null}
      {askZaZyciem ? (
        <ChoiceGroup
          legend="Czy lekarz wydał zaświadczenie „Za życiem”?"
          hint="Wydaje je lekarz przy ciężkim i nieodwracalnym upośledzeniu albo nieuleczalnej chorobie dziecka. Urlop rodzicielski wydłuża się wtedy do 65 tygodni."
          name="zaZyciem"
          row
          value={zz}
          onChange={(x) => setZz(x)}
          options={[{ value: "no", label: "Nie" }, { value: "yes", label: "Tak" }]}
        />
      ) : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
      <div>
        <Button size="sm" loading={pending} onClick={submit}>
          Zapisz
        </Button>
      </div>
    </QuestionShell>
  );
}

/** Adoption or foster care: the dates come from the court order or the PCPR agreement, not from a registry. */
export function CareQuestion({ kind, existing }: { kind: "adoption" | "foster"; existing?: { petitionFiledOn?: string; fosterType?: "nonProfessional" | "professional" } }) {
  const [taken, setTaken] = useState<string | null>(null);
  const [born, setBorn] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const { pending, error, save } = useSave();
  return (
    <QuestionShell
      title={kind === "adoption" ? "Kiedy przyjęłaś lub przyjąłeś dziecko na wychowanie?" : "Kiedy dziecko trafiło do Twojej rodziny zastępczej?"}
      hint={kind === "adoption" ? "Datę znajdziesz w postanowieniu sądu o powierzeniu opieki. ZUS poprosi o jego kopię." : "Datę znajdziesz w umowie z powiatem (PCPR) albo w postanowieniu sądu. ZUS poprosi o kopię."}
    >
      <DateInput legend="Data przyjęcia dziecka" name="takenIntoCareOn" onChange={setTaken} error={touched && !taken ? "Wpisz pełną, poprawną datę." : undefined} />
      <DateInput legend="Data urodzenia dziecka" name="childBirthDate" onChange={setBorn} error={touched && !born ? "Wpisz pełną, poprawną datę." : undefined} />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <div>
        <Button
          size="sm"
          loading={pending}
          onClick={() => {
            setTouched(true);
            if (!taken || !born) return;
            save(() => send("/api/v1/answers", "PUT", { care: { ...existing, takenIntoCareOn: taken, childBirthDate: born } }), { focusProgress: true });
          }}
        >
          Zapisz
        </Button>
      </div>
    </QuestionShell>
  );
}

/** After a live birth: prematurity or a hospital stay lengthens maternity leave. ZUS asks for the hospital's certificate. */
export function HospitalQuestion() {
  const { pending, error, save } = useSave();
  const [category, setCategory] = useState<"none" | "preterm" | "extreme" | "term">("none");
  const [days, setDays] = useState("");
  const needsDays = category !== "none";
  const n = Number(days);
  const [touched, setTouched] = useState(false);
  const daysError = touched && needsDays && !(Number.isInteger(n) && n > 0 && n <= 400) ? "Wpisz liczbę dni pobytu w szpitalu, np. 25." : undefined;
  return (
    <QuestionShell title="Czy dziecko urodziło się przedwcześnie albo leżało w szpitalu?" hint="Wtedy urlop macierzyński może być dłuższy. ZUS poprosi o zaświadczenie ze szpitala.">
      <ChoiceGroup
        legend="Dziecko po porodzie"
        name="hospital"
        value={category}
        onChange={(x) => setCategory(x)}
        options={[
          { value: "none", label: "Nie, wszystko w normie" },
          { value: "preterm", label: "Urodziło się przed 37. tygodniem i leżało w szpitalu" },
          { value: "extreme", label: "Urodziło się przed 28. tygodniem albo ważyło do 1000 g" },
          { value: "term", label: "Urodziło się w terminie, ale leżało w szpitalu" },
        ]}
      />
      {needsDays ? (
        <Field label="Ile dni dziecko było w szpitalu?" error={daysError}>
          {({ id, describedBy, invalid }) => <TextInput id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} />}
        </Field>
      ) : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
      <div>
        <Button
          size="sm"
          loading={pending}
          onClick={() => {
            setTouched(true);
            if (needsDays && !(Number.isInteger(n) && n > 0 && n <= 400)) return;
            save(() => send("/api/v1/answers", "PUT", { whatIf: { hospital: { category, days: needsDays ? n : 0 } } }), { focusProgress: true });
          }}
        >
          Zapisz
        </Button>
      </div>
    </QuestionShell>
  );
}

export function ArrearsQuestion() {
  const { pending, error, save } = useSave();
  const [v, setV] = useState<"no" | "yes" | "">("");
  const [tried, setTried] = useState(false);
  return (
    <QuestionShell title="Czy masz zaległości w składkach ZUS?" hint="Saldo sprawdzisz w PUE/eZUS w zakładce „Płatnik → Salda”. Przy działalności zaległość ponad 1% minimalnego wynagrodzenia w dniu porodu wstrzymuje wypłatę zasiłku.">
      <ChoiceGroup
        legend="Zaległości w składkach"
        name="arrears"
        value={v || undefined}
        onChange={(x) => setV(x)}
        options={[
          { value: "no", label: "Nie, składki są opłacone" },
          { value: "yes", label: "Tak, mam zaległości" },
        ]}
        error={tried && !v ? "Wybierz odpowiedź." : undefined}
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <div>
        <Button size="sm" loading={pending} onClick={() => (setTried(true), v ? save(() => send("/api/v1/answers", "PUT", { arrears: v === "yes" }), { focusProgress: true }) : undefined)}>
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
      {error ? <ErrorText>{error}</ErrorText> : null}
      <div>
        <Button size="sm" loading={pending} disabled={v === "yes" && !date} onClick={() => save(() => send("/api/v1/answers", "PUT", { plannedEnd: v === "yes" && date ? { titleId, date, reason } : null }), { focusProgress: true })}>
          Zapisz
        </Button>
      </div>
    </QuestionShell>
  );
}

const toGrosze = (text: string) => {
  const n = parseFloat(text.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};

export function OtherParentQuestion({ otherRole }: { otherRole: "mother" | "father" }) {
  const { pending, error, save } = useSave();
  const [mode, setMode] = useState<"invite" | "estimate" | "none">("invite");
  const [insured, setInsured] = useState<"yes" | "no" | "krus" | "abroad" | "unknown">("yes");
  const [gross, setGross] = useState("");
  const grossValue = gross ? toGrosze(gross) : undefined;
  return (
    <QuestionShell title="Czy drugi rodzic też skorzysta z urlopu?" hint="Urlop rodzicielski możecie dzielić. Każde z Was ma 9 tygodni, których nie można przekazać drugiemu.">
      <ChoiceGroup
        legend="Dane drugiego rodzica"
        name="otherParent"
        value={mode}
        onChange={(x) => setMode(x)}
        options={[
          { value: "invite", label: "Zaproszę drugiego rodzica", hint: "Dostaniesz link. Drugi rodzic zaloguje się swoim mObywatelem i razem ułożycie urlopy." },
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
            <Field label="Przeciętne miesięczne wynagrodzenie brutto drugiego rodzica" hint="W złotych, np. 6500" optional error={grossValue === null ? "Wpisz kwotę w złotych, np. 6500." : undefined}>
              {({ id, describedBy, invalid }) => <TextInput id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} inputMode="decimal" value={gross} onChange={(e) => setGross(e.currentTarget.value)} />}
            </Field>
          ) : null}
        </>
      ) : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
      <div>
        <Button
          size="sm"
          loading={pending}
          disabled={grossValue === null}
          onClick={() =>
            save(
              () =>
                mode === "invite"
                  ? send("/api/v1/invites", "POST")
                  : send("/api/v1/answers", "PUT", {
                      // Gross pay is sent as typed; the server applies the parameter set's deduction.
                      otherParent: { mode, role: otherRole, ...(mode === "estimate" ? { insured, ...(grossValue ? { estimatedGross: grossValue } : {}) } : {}) },
                    }),
              { focusProgress: true },
            )
          }
        >
          {mode === "invite" ? "Utwórz link z zaproszeniem" : "Zapisz"}
        </Button>
      </div>
    </QuestionShell>
  );
}

const noSubscribe = () => () => {};

/** Waiting for the other parent: the link to send, and (demo only) a way to open it as the other parent. */
export function InvitePending({ path }: { path: string }) {
  // Server render has no origin; the browser fills it in after hydration without a mismatch.
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => "");
  const [copied, setCopied] = useState(false);
  const url = `${origin}${path}`;
  return (
    <div className={s.unverified}>
      <p>
        <strong>Zaproszenie czeka na drugiego rodzica.</strong> Wyślij mu ten link — SMS-em, e-mailem albo komunikatorem. Jest ważny 14 dni.
      </p>
      <Field label="Link z zaproszeniem">{({ id }) => <TextInput id={id} readOnly value={url} onFocus={(e) => e.currentTarget.select()} />}</Field>
      <div className={s.actions}>
        <Button
          size="sm"
          variant="secondary"
          icon="document"
          uppercase={false}
          onClick={() => {
            void navigator.clipboard?.writeText(url).then(() => setCopied(true));
          }}
        >
          {copied ? "Skopiowano" : "Kopiuj link"}
        </Button>
        <Button size="sm" variant="text" href={path} uppercase={false}>
          Otwórz jako drugi rodzic (symulacja)
        </Button>
      </div>
      <p aria-live="polite" className={s.muted}>
        {copied ? "Link jest w schowku." : ""}
      </p>
    </div>
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
  const [invalid, setInvalid] = useState(false);
  const { pending, error, save } = useSave();
  if (spec.overridden) {
    return (
      <>
        <Button variant="text" size="sm" icon="refresh" loading={pending} onClick={() => save(() => send(`/api/v1/overrides?path=${encodeURIComponent(spec.path)}`, "DELETE"))}>
          Cofnij poprawkę<span className="visually-hidden"> — {spec.label}</span>
        </Button>
        {error ? <ErrorText>{error}</ErrorText> : null}
      </>
    );
  }
  const parsed = (): string | number | boolean | null => {
    if (value == null || value === "") return null;
    if (spec.kind === "money") return toGrosze(value);
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
        <Notice tone="positive" title="Zapisaliśmy poprawkę" hideToneWord role="status">
          <p>{done}</p>
        </Notice>
      ) : (
        <>
          <p>
            Obecnie: <strong>{spec.display}</strong> ({spec.sourceLabel})
          </p>
          {spec.kind === "date" ? (
            <DateInput legend="Poprawna data" name="override-date" value={typeof spec.current === "string" ? spec.current : undefined} onChange={setValue} error={invalid ? "Wpisz pełną, poprawną datę." : undefined} />
          ) : spec.kind === "money" ? (
            <Field label="Poprawna kwota (zł)" error={invalid ? "Wpisz kwotę w złotych, np. 6500,00." : undefined}>
              {({ id, describedBy, invalid: inv }) => <TextInput id={id} aria-describedby={describedBy} aria-invalid={inv || undefined} inputMode="decimal" value={value ?? ""} onChange={(e) => setValue(e.currentTarget.value)} />}
            </Field>
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
          {error ? <ErrorText>{error}</ErrorText> : null}
          <div className={s.actions}>
            <Button
              loading={pending}
              onClick={() => {
                const v = parsed();
                setInvalid(v === null);
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

/**
 * Manual entry: manual mode, or a session where the ZUS account was not read (declined or unavailable).
 * `defaults` pre-fills what other registries already told us.
 */
export function ManualForm({ defaults = {} }: { defaults?: { sex?: "F" | "M"; expectedDate?: string } }) {
  const { pending, error, save } = useSave();
  const [sex, setSex] = useState<"F" | "M">(defaults.sex ?? "F");
  const [work, setWork] = useState<"employment" | "mandate" | "selfEmployed" | "none">("employment");
  const [since, setSince] = useState<string | null>(null);
  const [fraction, setFraction] = useState("1/1");
  const [gross, setGross] = useState("");
  const [sick, setSick] = useState<"voluntary" | "none">("voluntary");
  const [arrears, setArrears] = useState<"no" | "yes">("no");
  const [over20, setOver20] = useState<"yes" | "no">("yes");
  const [event, setEvent] = useState<"birth" | "adoption" | "foster">("birth");
  const [eventDate, setEventDate] = useState<string | null>(defaults.expectedDate ?? null);
  const [childBirth, setChildBirth] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const grossValue = gross ? toGrosze(gross) : null;
  const missing = (work !== "none" && (!since || grossValue === null)) || !eventDate || (event !== "birth" && !childBirth);
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (missing) return;
        const [num, den] = fraction.split("/").map(Number);
        save(
          () =>
            send("/api/v1/answers", "PUT", {
              eventKind: event,
              ...(event === "birth" ? { expectedDate: eventDate } : { care: { takenIntoCareOn: eventDate, childBirthDate: childBirth, fosterType: "nonProfessional" } }),
              manual: {
                role: event === "birth" ? (sex === "F" ? "mother" : "father") : event === "adoption" ? "adoptive" : "foster",
                sex,
                work,
                since: since ?? eventDate,
                ...(work === "employment" ? { fraction: { num, den }, over20Insured: over20 === "yes" } : {}),
                ...(work !== "none" && grossValue !== null ? { monthlyGross: grossValue } : {}),
                sicknessInsurance: work === "none" ? "none" : work === "employment" ? "mandatory" : sick,
                arrears: work === "selfEmployed" ? arrears === "yes" : undefined,
              },
            }),
          { focusProgress: true },
        );
      }}
      className={s.form}
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
      <DateInput legend={event === "birth" ? "Przewidywana data porodu" : "Data przyjęcia dziecka"} name="eventDate" value={defaults.expectedDate} onChange={setEventDate} error={tried && !eventDate ? "Wpisz datę." : undefined} />
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
            <ChoiceGroup legend="Czy płacisz dobrowolną składkę chorobową?" name="sick" row value={sick} onChange={(v) => setSick(v)} options={[{ value: "voluntary", label: "Tak" }, { value: "none", label: "Nie" }]} />
          )}
          <Field label={work === "selfEmployed" ? "Zadeklarowana miesięczna podstawa składek (zł)" : "Przeciętne miesięczne wynagrodzenie brutto (zł)"} hint="Z ostatnich 12 miesięcy, np. 6500" error={tried && grossValue === null ? "Wpisz kwotę w złotych, np. 6500." : undefined}>
            {({ id, describedBy, invalid }) => <TextInput id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} inputMode="decimal" value={gross} onChange={(e) => setGross(e.currentTarget.value)} />}
          </Field>
          {work === "selfEmployed" ? <ChoiceGroup legend="Czy masz zaległości w składkach?" name="arrears" row value={arrears} onChange={(v) => setArrears(v)} options={[{ value: "no", label: "Nie" }, { value: "yes", label: "Tak" }]} /> : null}
        </>
      ) : null}
      {tried && missing ? <ErrorText>Uzupełnij pola oznaczone powyżej.</ErrorText> : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
      <div>
        <Button type="submit" loading={pending}>
          Zapisz i sprawdź
        </Button>
      </div>
    </form>
  );
}
