"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RESET_PHRASE } from "@/lib/admin-constants";
import { Button } from "@/ui/components/Button/Button";
import { Dialog } from "@/ui/components/Dialog/Dialog";
import { Field, TextInput } from "@/ui/components/Form/Form";
import { Notice } from "@/ui/components/Notice/Notice";
import { adminFetch } from "./client-api";
import s from "../Admin.module.css";

/** "Nowy szkic z obowiązującego" / "Utwórz szkic na podstawie" — copies a set and opens the form. */
export function NewDraftButton({ fromId, children, variant = "primary" }: { fromId: string; children: string; variant?: "primary" | "secondary" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function create() {
    setBusy(true);
    setError(null);
    const r = await adminFetch<{ set: { id: string } }>("/api/v1/admin/params", { method: "POST", body: { fromId } });
    if (r.ok) router.push(`/admin/parametry/${r.data.set.id}`);
    else {
      setBusy(false);
      setError(r.message);
    }
  }
  return (
    <div className={s.stack} style={{ gap: 8 }}>
      <div>
        <Button variant={variant} icon="plus" onClick={create} loading={busy} disabled={busy}>
          {children}
        </Button>
      </div>
      {error ? (
        <p role="alert" className={s.small}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Archive with a confirmation dialog. */
export function ArchiveButton({ id, label, status }: { id: string; label: string; status: "draft" | "published" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function archive() {
    setBusy(true);
    setError(null);
    const r = await adminFetch(`/api/v1/admin/params/${id}/archive`, { method: "POST", body: {} });
    setBusy(false);
    if (r.ok) {
      setOpen(false);
      router.refresh();
    } else setError(r.message);
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setError(null);
      }}
      title="Archiwizować zestaw?"
      description={label}
      trigger={
        <button type="button" className={s.linkButton}>
          Archiwizuj<span className="visually-hidden"> zestaw {label}</span>
        </button>
      }
    >
      <div className={s.confirm}>
        <p>
          {status === "published"
            ? "Zestaw przestanie być brany pod uwagę w obliczeniach. Okres, którego dotyczył, przejmie poprzedni opublikowany zestaw."
            : "Szkic zniknie z listy roboczej. Pozostanie w historii jako zarchiwizowany."}
        </p>
        {error ? (
          <Notice tone="negative" title="Nie można zarchiwizować" role="alert" hideToneWord>
            {error}
          </Notice>
        ) : null}
        <div className={s.row}>
          <Button variant="danger" onClick={archive} loading={busy} disabled={busy}>
            Archiwizuj
          </Button>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Anuluj
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

/** Reset to statutory defaults: typed confirmation, audited. */
export function ResetButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function reset() {
    if (phrase.trim() !== RESET_PHRASE) {
      setError(`Wpisz ${RESET_PHRASE}, aby potwierdzić.`);
      return;
    }
    setBusy(true);
    setError(null);
    const r = await adminFetch("/api/v1/admin/params/reset", { method: "POST", body: { confirm: RESET_PHRASE } });
    setBusy(false);
    if (r.ok) {
      setOpen(false);
      setPhrase("");
      router.refresh();
    } else setError(r.fields?.confirm ?? r.message);
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setError(null);
      }}
      title="Przywrócić parametry ustawowe?"
      trigger={
        <Button variant="secondary" icon="refresh">
          Przywróć stan ustawowy
        </Button>
      }
    >
      <div className={s.confirm}>
        <p>Wszystkie zestawy z bazy (opublikowane i szkice) zostaną zarchiwizowane, a obowiązywać zaczną zestawy ustawowe dostarczone z aplikacją. Operacja trafia do dziennika zmian.</p>
        <Field label={`Wpisz ${RESET_PHRASE}, aby potwierdzić`} error={error}>
          {({ id, describedBy, invalid }) => (
            <TextInput id={id} value={phrase} onChange={(e) => setPhrase(e.currentTarget.value)} aria-describedby={describedBy} aria-invalid={invalid || undefined} autoComplete="off" />
          )}
        </Field>
        <div className={s.row}>
          <Button variant="danger" onClick={reset} loading={busy} disabled={busy}>
            Przywróć
          </Button>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Anuluj
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
