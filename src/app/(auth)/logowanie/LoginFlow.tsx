"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/ui/components/Button/Button";
import { ChoiceGroup } from "@/ui/components/Form/Form";
import { TextLink } from "@/ui/components/TextLink/TextLink";
import { Icon, type IconName } from "@/ui/icons/Icon";
import type { PersonaListItem } from "@/server/personas-list";
import s from "./Login.module.css";

const otherMethods: { label: string; icon: IconName }[] = [
  { label: "Profil zaufany", icon: "shield" },
  { label: "Bankowość elektroniczna", icon: "building" },
  { label: "e-Dowód", icon: "user" },
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: step === 1 });
  }, [step]);

  useEffect(() => {
    if (step !== 2) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step]);

  async function startChallenge() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/login/start", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { code: string; expiresInSec: number };
      const issuedAt = Date.now();
      setChallenge({ code: data.code, expiresAt: issuedAt + data.expiresInSec * 1000 });
      setNow(issuedAt);
      setStep(2);
    } catch {
      setError("Nie udało się pobrać kodu. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  }

  const left = challenge ? Math.max(0, Math.round((challenge.expiresAt - now) / 1000)) : 0;
  const expired = Boolean(challenge) && left === 0 && now > 0;
  const titles = { 1: "Zaloguj się do Przewodnika Rodzica", 2: "Potwierdź logowanie", 3: "Wybierz profil testowy" } as const;

  return (
    <section data-login-flow="" className={s.layout} aria-labelledby="login-step">
      <div className={s.intro}>
        <div className={s.step}>
          <span className={s.track} aria-hidden="true">
            {[1, 2, 3].map((part) => <i key={part} data-complete={part <= step} />)}
          </span>
          Krok {step} z 3
        </div>
        <h1 id="login-step" ref={headingRef} tabIndex={-1}>{titles[step]}</h1>
        <p className={s.lead}>
          {step === 1 && "Wybierz sposób logowania, aby sprawdzić świadczenia na przykładowym profilu."}
          {step === 2 && challenge && (
            <>Sprawdź, czy na symulowanym telefonie widzisz kod <strong>{challenge.code}</strong>. Jeśli się zgadza, potwierdź logowanie.</>
          )}
          {step === 3 && "Wybierz fikcyjną osobę, której sytuację chcesz sprawdzić."}
        </p>
      </div>

      <div className={s.panel}>
        {step === 1 && (
          <>
            <button className={s.provider} type="button" onClick={startChallenge} disabled={loading}>
              <span className={s.device} aria-hidden="true" />
              <span><strong>Aplikacja mObywatel</strong><small>{loading ? "Przygotowujemy kod…" : "Potwierdź na symulowanym telefonie"}</small></span>
              <Icon name="chevron-right" size={20} />
            </button>
            <TextLink className={s.manual} href="/bez-logowania">Przejdź bez logowania</TextLink>
            <details className={s.other}>
              <summary>Metody niedostępne w symulacji</summary>
              <ul className={s.otherMethods}>
                {otherMethods.map(({ label, icon }) => (
                  <li key={label}><Icon name={icon} size={20} />{label}</li>
                ))}
              </ul>
            </details>
          </>
        )}

        {step === 2 && challenge && (
          <div className={s.phone}>
            <div className={s.phoneHead}><span className={s.device} aria-hidden="true" /><strong>mObywatel</strong><span>Symulacja</span></div>
            <div className={s.request}>
              <h2>Przewodnik Rodzica</h2>
              <div className={s.phoneCode}><small>Kod do porównania</small><strong>{challenge.code}</strong></div>
              <p className={s.timer}><Icon name="clock" size={16} />{expired ? "Kod wygasł." : `Kod ważny jeszcze ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`}</p>
              {expired ? (
                <Button block onClick={startChallenge} disabled={loading} loading={loading} icon="refresh">Wygeneruj nowy kod</Button>
              ) : (
                <Button block onClick={() => setStep(3)} icon="check" uppercase={false}>Potwierdzam (symulacja)</Button>
              )}
            </div>
          </div>
        )}
        {step === 2 && (
          <button className={s.back} type="button" onClick={() => { setError(""); setStep(1); }} disabled={loading}>
            <Icon name="back" size={16} /> Wróć do wyboru metody
          </button>
        )}
        {error && <p role="alert">{error}</p>}

        {step === 3 ? (
          <form action="/api/v1/auth/login/confirm" method="post" className={s.personaGroup}>
            <input type="hidden" name="mode" value="mobywatel" />
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
  );
}
