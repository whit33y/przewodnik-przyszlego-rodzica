"use client";

import { useState } from "react";
import type { Charity } from "@/server/content-repo";
import { TextLink } from "@/ui/components/TextLink/TextLink";
import { Icon } from "@/ui/icons/Icon";
import s from "./Wsparcie.module.css";

const situations: { id: string; label: string }[] = [
  { id: "", label: "Wszystkie" },
  { id: "loss", label: "Śmierć dziecka" },
  { id: "miscarriage", label: "Poronienie" },
  { id: "preterm", label: "Wcześniak" },
  { id: "illness", label: "Ciężko chore dziecko" },
  { id: "mental-health", label: "Zdrowie psychiczne" },
  { id: "crisis", label: "Kryzys" },
];

export function CharityList({ charities }: { charities: Charity[] }) {
  const [filter, setFilter] = useState("");
  const shown = charities.filter((c) => !filter || c.situations.includes(filter));
  return (
    <>
      <div className={s.chips} role="group" aria-label="Pokaż organizacje dla sytuacji">
        {situations.map((x) => (
          <button key={x.id} type="button" className={s.chip} aria-pressed={filter === x.id} onClick={() => setFilter(x.id)}>
            {x.label}
          </button>
        ))}
      </div>
      <p className={s.muted} role="status">
        Organizacji: {shown.length}
      </p>
      <ul className={s.orgs}>
        {shown.map((c) => (
          <li key={c.id} className={s.org}>
            <h3 className={s.orgName}>{c.name}</h3>
            <p>{c.description}</p>
            <p className={s.orgMeta}>
              <TextLink href={c.url} external>
                {c.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </TextLink>
              {c.phone ? (
                <span>
                  <Icon name="phone" size={16} style={{ display: "inline", verticalAlign: "-3px" }} /> {c.phone}
                </span>
              ) : null}
              {c.krs ? <span className={s.muted}>KRS {c.krs}</span> : null}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
