import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAdminPage } from "@/server/admin-auth";
import { diffFor, getSet, latestRegression, payloadHash, today } from "@/server/admin-repo";
import { GROUPS } from "@/server/params-schema";
import { Card } from "@/ui/components/Card/Card";
import { Notice } from "@/ui/components/Notice/Notice";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";
import { CardSkeleton } from "@/ui/components/Skeleton/Skeleton";
import { AdminNav } from "../../../_components/AdminNav";
import { formatIsoDay } from "../../../_components/format";
import { RegressionPanel } from "../../../_components/RegressionPanel";
import s from "../../../Admin.module.css";

export const metadata: Metadata = { title: "Porównanie i sprawdzenie" };

async function CompareContent({ id }: { id: string }) {
  await requireAdminPage();
  const set = getSet(id);
  if (!set) notFound();
  const view = diffFor(id);
  const last = latestRegression(id);
  const fresh = last && last.payloadHash === payloadHash(set.payload) ? last : null;
  const groupTitle = Object.fromEntries(GROUPS.map((g) => [g.id, g.title]));

  return (
    <>
      <PageHeader eyebrow={`Zestaw ${set.id}`} title={`Porównanie: ${set.label}`} lead={`Zmiany względem zestawu „${view.base?.label ?? "—"}”${view.replaces ? ", który ten szkic zastąpi" : ""}, i ich skutki dla przykładowych spraw.`} />
      <div className={s.stack}>
        <Card heading="Co się zmienia" aside={set.status === "draft" ? <Link href={`/admin/parametry/${id}`}>Wróć do edycji</Link> : null}>
          <div className={s.stack}>
            <p>
              Okres obowiązywania: <strong>od {formatIsoDay(view.window.from)}</strong>
              {view.window.to ? ` do ${formatIsoDay(view.window.to)} (wyłącznie; potem obowiązuje następny zestaw)` : " bez daty końcowej"}.
            </p>
            {view.entries.length === 0 ? (
              <Notice tone="neutral" title="Brak zmian w parametrach" hideToneWord>
                Szkic ma te same wartości co obowiązujący zestaw. Publikacja jest niedostępna.
              </Notice>
            ) : (
              <div className={s.tableWrap} tabIndex={0} role="region" aria-label="Tabela — można przewijać w poziomie">
                <table className={s.table}>
                  <caption>Zmienione parametry ({view.entries.length})</caption>
                  <thead>
                    <tr>
                      <th scope="col">Parametr</th>
                      <th scope="col">Grupa</th>
                      <th scope="col" className={s.num}>
                        Obowiązuje
                      </th>
                      <th scope="col" className={s.num}>
                        Szkic
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.entries.map((d) => (
                      <tr key={d.path}>
                        <th scope="row" style={{ fontWeight: 600 }}>
                          {d.label}
                          <br />
                          <span className={s.muted}>{d.path}</span>
                        </th>
                        <td>{groupTitle[d.group]}</td>
                        <td className={s.num}>{d.fromText}</td>
                        <td className={s.num}>
                          <strong>{d.toText}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
        <RegressionPanel
          id={id}
          isDraft={set.status === "draft"}
          validFrom={set.payload.validFrom}
          window={view.window}
          diffCount={view.entries.length}
          baseLabel={view.base?.label ?? null}
          replaces={view.replaces}
          today={today()}
          initial={fresh}
          stale={Boolean(last && !fresh)}
        />
      </div>
    </>
  );
}

/** A sample id lets the static shell (global nav reads the pathname) prerender; set data always streams per request. */
export async function generateStaticParams() {
  return [{ id: "2026-01-01" }];
}

export default function Page({ params }: PageProps<"/admin/parametry/[id]/porownanie">) {
  return (
    <>
      <AdminNav />
      <Suspense fallback={<CardSkeleton count={2} lines={5} />}>
        {params.then(({ id }) => (
          <CompareContent id={id} />
        ))}
      </Suspense>
    </>
  );
}
