"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/ui/components/Button/Button";
import { ChoiceGroup } from "@/ui/components/Form/Form";
import { Notice } from "@/ui/components/Notice/Notice";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";
import { TextLink } from "@/ui/components/TextLink/TextLink";
import { Icon, type IconName } from "@/ui/icons/Icon";
import type { PersonaListItem } from "@/server/personas-list";
import s from "./Login.module.css";

const providers: { id: string; label: string; hint: string; icon: IconName; enabled: boolean }[] = [
  { id: "mobywatel", label: "Aplikacja mObywatel", hint: "Potwierdź logowanie w telefonie", icon: "phone", enabled: true },
  { id: "pz", label: "Profil zaufany", hint: "W symulacji dostępny jest tylko mObywatel", icon: "shield", enabled: false },
  { id: "bank", label: "Bankowość elektroniczna", hint: "W symulacji dostępny jest tylko mObywatel", icon: "building", enabled: false },
  { id: "edowod", label: "e-Dowód", hint: "W symulacji dostępny jest tylko mObywatel", icon: "user", enabled: false },
];

const journeyLabel: Record<string, string> = {
  pregnant: "W ciąży",
  father: "Tata",
  selfEmployed: "Działalność gospodarcza",
  planning: "Planuję dziecko",
  adoption: "Adopcja",
  loss: "Trudna sytuacja",
};

export function LoginFlow({ personas }: { personas: PersonaListItem[] }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [challenge, setChallenge] = useState<{ code: string; expiresAt: number } | null>(null);
  const [now, setNow] = useState(0);
  const [persona, setPersona] = useState(personas[0]?.id ?? "");
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (step !== 2) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step]);

  async function startChallenge() {
    const res = await fetch("/api/v1/auth/login/start", { method: "POST" });
    const data = (await res.json()) as { code: string; expiresInSec: number };
    setChallenge({ code: data.code, expiresAt: Date.now() + data.expiresInSec * 1000 });
    setNow(Date.now());
    setStep(2);
  }

  const left = challenge ? Math.max(0, Math.round((challenge.expiresAt - now) / 1000)) : 0;
  const expired = Boolean(challenge) && left === 0 && now > 0;
  const titles = { 1: "Wybierz sposób logowania", 2: "Potwierdź logowanie w aplikacji mObywatel", 3: "Wybierz profil testowy" } as const;

  return (
    <>
      <PageHeader title="Zaloguj się" lead="Logowanie przez krajowy węzeł identyfikacji — w tej wersji demonstracyjnej jest symulowane." />
      <section className={s.frame} aria-labelledby="login-step">
        <div className={s.frameHead}>
          <span className={s.node}>
            <Icon name="lock" size={20} />
            Węzeł logowania <small>(symulacja)</small>
          </span>
          <span className={s.progress}>Krok {step} z 3</span>
        </div>
        <div className={s.frameBody}>
          <h2 id="login-step" ref={headingRef} tabIndex={-1}>
            {titles[step]}
          </h2>

          {step === 1 ? (
            <ul className={s.providers}>
              {providers.map((p) => (
                <li key={p.id}>
                  <button type="button" className={s.provider} disabled={!p.enabled} onClick={p.enabled ? startChallenge : undefined} aria-describedby={`hint-${p.id}`}>
                    <span className={s.providerIcon}>
                      <Icon name={p.icon} />
                    </span>
                    <span>
                      {p.label}
                      <small id={`hint-${p.id}`}>{p.hint}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {step === 2 && challenge ? (
            <>
              <div className={s.confirm}>
                <div className={s.qr} aria-hidden="true">
                  <span>Kod QR (symulacja)</span>
                </div>
                <div className={s.codeBox}>
                  <p className={s.muted}>Otwórz aplikację mObywatel, wybierz „Zaloguj się kodem” i sprawdź, czy widzisz ten sam kod:</p>
                  <p className={s.code} aria-label={`Kod: ${challenge.code.split("").join(" ")}`}>
                    {challenge.code}
                  </p>
                  <p className={s.muted} aria-live="off">
                    {expired ? "Kod wygasł." : `Kod ważny jeszcze ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`}
                  </p>
                </div>
              </div>
              <div className={s.actions}>
                {expired ? (
                  <Button onClick={startChallenge} icon="refresh">
                    Wygeneruj nowy kod
                  </Button>
                ) : (
                  <Button onClick={() => setStep(3)} icon="check" uppercase={false}>
                    Potwierdzam (symulacja)
                  </Button>
                )}
                <Button variant="text" onClick={() => setStep(1)}>
                  Wróć
                </Button>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <form action="/api/v1/auth/login/confirm" method="post" className={s.personaGroup}>
              <input type="hidden" name="mode" value="mobywatel" />
              <p className={s.muted}>
                W prawdziwej usłudze w tym miejscu ZUS i rejestry rozpoznają Cię po numerze PESEL. W symulacji wybierz, czyje dane mamy „pobrać” — wszystkie osoby są fikcyjne.
              </p>
              <ChoiceGroup
                legend="Profil testowy"
                name="personaId"
                value={persona}
                onChange={(v) => setPersona(v)}
                options={personas.map((p) => ({ value: p.id, label: `${p.label} · ${journeyLabel[p.journey] ?? p.journey}`, hint: p.oneLiner }))}
              />
              <div className={s.actions}>
                <Button type="submit" iconAfter="chevron-right">
                  Zaloguj
                </Button>
                <Button variant="text" type="button" onClick={() => setStep(1)}>
                  Anuluj
                </Button>
              </div>
              <div className={s.cases}>
                <span>Albo zaloguj się jako osoba z jednej z 86 przykładowych spraw ZUS.</span>
                <TextLink href="/sprawy">Przykładowe sprawy</TextLink>
              </div>
            </form>
          ) : null}
        </div>
      </section>
      <Notice tone="info" title="Dlaczego logowanie?">
        <p>Po zalogowaniu pobieramy Twoje dane z ZUS i rejestrów państwowych (za Twoją zgodą), więc nie musisz wpisywać historii zatrudnienia ani zarobków.</p>
        <p>
          Wolisz bez logowania? <TextLink href="/bez-logowania">Policz samodzielnie</TextLink>.
        </p>
      </Notice>
    </>
  );
}
