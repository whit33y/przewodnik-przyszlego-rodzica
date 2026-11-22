"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/ui/components/Button/Button";
import { Field, TextInput } from "@/ui/components/Form/Form";
import { Notice } from "@/ui/components/Notice/Notice";
import { adminFetch } from "./client-api";
import s from "../Admin.module.css";

export function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    if (!password) {
      setError("Wpisz hasło.");
      return;
    }
    setBusy(true);
    setError(null);
    setBlocked(null);
    const r = await adminFetch<{ ok: true }>("/api/v1/admin/login", { method: "POST", body: { password } });
    setBusy(false);
    (form.elements.namedItem("password") as HTMLInputElement).value = "";
    if (r.ok) {
      router.replace("/admin");
      router.refresh();
      return;
    }
    if (r.status === 429) setBlocked(r.message);
    else setError(r.fields?.password ?? r.message);
  }

  return (
    <form onSubmit={submit} className={s.stack} noValidate style={{ maxWidth: 420 }}>
      {blocked ? (
        <Notice tone="negative" title="Logowanie zablokowane" role="alert" hideToneWord>
          {blocked}
        </Notice>
      ) : null}
      <Field label="Hasło administratora" error={error}>
        {({ id, describedBy, invalid }) => (
          <TextInput id={id} name="password" type="password" autoComplete="current-password" aria-describedby={describedBy} aria-invalid={invalid || undefined} required />
        )}
      </Field>
      <div>
        <Button type="submit" loading={busy} disabled={busy} icon="lock">
          Zaloguj do panelu
        </Button>
      </div>
    </form>
  );
}
