import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdminPage } from "@/server/admin-auth";
import { inForceOn, listAudit, listSets, today } from "@/server/admin-repo";
import { Card } from "@/ui/components/Card/Card";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";
import { CardSkeleton } from "@/ui/components/Skeleton/Skeleton";
import { StatusBadge } from "@/ui/components/StatusBadge/StatusBadge";
import { AdminNav } from "./_components/AdminNav";
import { AuditTable } from "./_components/AuditTable";
import { formatIsoDay, formatTimestamp, statusLabel, statusTone } from "./_components/format";
import { ArchiveButton, NewDraftButton, ResetButton } from "./_components/SetActions";
import s from "./Admin.module.css";

export const metadata: Metadata = { title: { absolute: "Panel administracyjny · Przewodnik Rodzica" } };

async function Dashboard() {
  await requireAdminPage();
  const day = today();
  const sets = listSets();
  const current = inForceOn(day);
  const currentRow = sets.find((x) => x.id === current);
  const drafts = sets.filter((x) => x.status === "draft").length;
  return (
    <div className={s.stack}>
      <Card heading="Wersje parametrów" aside={<span className={s.muted}>{drafts ? `Szkice w toku: ${drafts}` : "Brak szkiców w toku"}</span>}>
        <div className={s.stack}>
          <p>
            Dziś ({formatIsoDay(day)}) obowiązuje: <strong>{currentRow ? `${currentRow.label} (od ${formatIsoDay(currentRow.validFrom)})` : "brak opublikowanego zestawu"}</strong>. Kalkulator wybiera zestaw według daty zdarzenia: każdy obowiązuje od swojej daty do dnia przed datą następnego.
          </p>
          {current ? <NewDraftButton fromId={current}>Nowy szkic z obowiązującego</NewDraftButton> : null}
          <div className={s.tableWrap} tabIndex={0} role="region" aria-label="Tabela — można przewijać w poziomie">
            <table className={s.table}>
              <caption className="visually-hidden">Zestawy parametrów — od najnowszego</caption>
              <thead>
                <tr>
                  <th scope="col">Obowiązuje od</th>
                  <th scope="col">Nazwa</th>
                  <th scope="col">Status</th>
                  <th scope="col">Autor</th>
                  <th scope="col">Utworzono / opublikowano</th>
                  <th scope="col">Działania</th>
                </tr>
              </thead>
              <tbody>
                {sets.map((x) => (
                  <tr key={x.id} data-current={x.id === current ? "" : undefined}>
                    <td className="tabular">
                      {formatIsoDay(x.validFrom)}
                      {x.id === current ? (
                        <>
                          <br />
                          <span className={s.marker}>● obowiązuje dziś</span>
                        </>
                      ) : null}
                    </td>
                    <td>
                      <Link href={`/admin/parametry/${x.id}`}>{x.label}</Link>
                      <br />
                      <span className={s.muted}>{x.id}</span>
                    </td>
                    <td>
                      <StatusBadge tone={statusTone[x.status]} label={statusLabel[x.status]} />
                    </td>
                    <td>{x.author}</td>
                    <td className="tabular">
                      {formatTimestamp(x.createdAt)}
                      {x.publishedAt ? (
                        <>
                          <br />
                          <span className={s.muted}>opubl. {formatTimestamp(x.publishedAt)}</span>
                        </>
                      ) : null}
                    </td>
                    <td>
                      <div className={s.actions}>
                        <Link href={`/admin/parametry/${x.id}`}>
                          {x.status === "draft" ? "Edytuj" : "Otwórz"}
                          <span className="visually-hidden"> {x.label}</span>
                        </Link>
                        {x.status === "draft" ? (
                          <Link href={`/admin/parametry/${x.id}/porownanie`}>
                            Porównaj i sprawdź<span className="visually-hidden"> {x.label}</span>
                          </Link>
                        ) : null}
                        {x.status !== "archived" ? <ArchiveButton id={x.id} label={x.label} status={x.status} /> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
      <Card heading="Ostatnie zmiany" aside={<Link href="/admin/dziennik">Cały dziennik</Link>}>
        <AuditTable rows={listAudit({ limit: 20 })} caption="20 ostatnich wpisów dziennika" />
      </Card>
      <Card heading="Stan ustawowy" tone="alt">
        <div className={s.stack}>
          <p>Jeśli zmiany okazały się błędne, możesz wrócić do parametrów ustawowych dostarczonych z aplikacją (pliki data/params). Dotychczasowe zestawy zostaną zarchiwizowane, nic nie jest usuwane.</p>
          <div>
            <ResetButton />
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function Page() {
  return (
    <>
      <AdminNav current="sets" />
      <PageHeader
        title="Parametry prawne kalkulatora"
        lead="Zmień stawkę, wymiar urlopu albo kwotę, sprawdź skutki na 86 prawdziwych sprawach i opublikuj zmianę z datą wejścia w życie — bez wdrażania nowej wersji aplikacji."
      />
      <Suspense fallback={<CardSkeleton count={2} lines={5} />}>
        <Dashboard />
      </Suspense>
    </>
  );
}
