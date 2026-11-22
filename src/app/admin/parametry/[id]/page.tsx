import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatParam } from "@/lib/param-units";
import { requireAdminPage } from "@/server/admin-auth";
import { diffFor, getSet } from "@/server/admin-repo";
import { fieldSpecs, getPath, GROUPS } from "@/server/params-schema";
import { Card } from "@/ui/components/Card/Card";
import { Notice } from "@/ui/components/Notice/Notice";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";
import { CardSkeleton } from "@/ui/components/Skeleton/Skeleton";
import { StatusBadge } from "@/ui/components/StatusBadge/StatusBadge";
import { AdminNav } from "../../_components/AdminNav";
import { formatIsoDay, formatTimestamp, statusLabel, statusTone } from "../../_components/format";
import { ParamForm } from "../../_components/ParamForm";
import { NewDraftButton } from "../../_components/SetActions";
import s from "../../Admin.module.css";

export const metadata: Metadata = { title: "Zestaw parametrów" };

async function SetContent({ id }: { id: string }) {
  await requireAdminPage();
  const set = getSet(id);
  if (!set) notFound();
  const view = diffFor(id);
  const base = view.base ? getSet(view.base.id) : null;
  const fields = fieldSpecs();

  const head = (
    <PageHeader eyebrow={`Zestaw ${set.id}`} title={set.label}>
      <div className={s.row}>
        <StatusBadge tone={statusTone[set.status]} label={statusLabel[set.status]} />
        <span>
          Obowiązuje od <strong>{formatIsoDay(set.payload.validFrom)}</strong>
          {view.window.to ? ` do ${formatIsoDay(view.window.to)} (wyłącznie)` : " bez daty końcowej"}
        </span>
        <span className={s.muted}>
          autor: {set.author} · utworzono {formatTimestamp(set.createdAt)}
          {set.publishedAt ? ` · opublikowano ${formatTimestamp(set.publishedAt)}` : ""}
        </span>
      </div>
    </PageHeader>
  );

  if (set.status === "draft") {
    return (
      <>
        {head}
        <div className={s.stack}>
          <Notice tone="info" title="Szkic — nie wpływa jeszcze na obliczenia" hideToneWord>
            <p>
              Zmiany zapisujesz w szkicu. Kalkulator zacznie ich używać dopiero po publikacji. Porównujemy go z zestawem <strong>{base?.label ?? "—"}</strong>
              {view.replaces ? " (szkic ma tę samą datę i go zastąpi)" : ""}.
            </p>
          </Notice>
          <ParamForm id={set.id} payload={set.payload as never} base={base ? { label: base.label, payload: base.payload as unknown as Record<string, unknown> } : null} fields={fields} groups={GROUPS} />
        </div>
      </>
    );
  }

  return (
    <>
      {head}
      <div className={s.stack}>
        <Notice tone="neutral" title={set.status === "published" ? "Opublikowany zestaw jest niezmienny" : "Zestaw zarchiwizowany"} hideToneWord>
          <p>Aby coś poprawić, utwórz nowy szkic na jego podstawie, zmień wartości, sprawdź skutki i opublikuj.</p>
        </Notice>
        <div className={s.row}>
          <NewDraftButton fromId={set.id}>Utwórz szkic na podstawie</NewDraftButton>
          <a href={`/api/v1/admin/params/${set.id}/export`} download>
            Pobierz jako JSON
          </a>
        </div>
        <Card heading="Źródła">
          <ul>
            {set.payload.sources.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </Card>
        {GROUPS.map((g) => (
          <Card key={g.id} heading={g.title} headingLevel={2}>
            <div className={s.tableWrap} tabIndex={0} role="region" aria-label="Tabela — można przewijać w poziomie">
              <table className={s.table}>
                <caption className="visually-hidden">{g.title}</caption>
                <thead>
                  <tr>
                    <th scope="col">Parametr</th>
                    <th scope="col" className={s.num}>
                      Wartość
                    </th>
                    <th scope="col">Podstawa</th>
                  </tr>
                </thead>
                <tbody>
                  {fields
                    .filter((f) => f.group === g.id)
                    .map((f) => (
                      <tr key={f.path}>
                        <th scope="row" style={{ fontWeight: 400 }}>
                          {f.label}
                        </th>
                        <td className={s.num}>{formatParam(f.unit, getPath(set.payload, f.path), f.options)}</td>
                        <td>{f.citation ?? "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
        <p>
          <Link href="/admin">← Wszystkie zestawy</Link>
        </p>
      </div>
    </>
  );
}

/** A sample id lets the static shell (global nav reads the pathname) prerender; set data always streams per request. */
export async function generateStaticParams() {
  return [{ id: "2026-01-01" }];
}

export default function Page({ params }: PageProps<"/admin/parametry/[id]">) {
  return (
    <>
      <AdminNav />
      <Suspense fallback={<CardSkeleton count={3} lines={4} />}>
        {params.then(({ id }) => (
          <SetContent id={id} />
        ))}
      </Suspense>
    </>
  );
}
