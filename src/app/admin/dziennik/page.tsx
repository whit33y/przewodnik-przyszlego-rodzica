import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdminPage } from "@/server/admin-auth";
import { AUDIT_ACTIONS, listAudit } from "@/server/admin-repo";
import { Button } from "@/ui/components/Button/Button";
import { Card } from "@/ui/components/Card/Card";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";
import { CardSkeleton } from "@/ui/components/Skeleton/Skeleton";
import { AdminNav } from "../_components/AdminNav";
import { AuditTable } from "../_components/AuditTable";
import { actionLabel } from "../_components/format";
import s from "../Admin.module.css";

export const metadata: Metadata = { title: "Dziennik zmian" };

async function AuditContent({ searchParams }: { searchParams: PageProps<"/admin/dziennik">["searchParams"] }) {
  await requireAdminPage();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const action = (AUDIT_ACTIONS as readonly string[]).includes(one(sp.akcja)) ? one(sp.akcja) : "";
  const entityId = /^[A-Za-z0-9._~*-]{1,40}$/.test(one(sp.zestaw)) ? one(sp.zestaw) : "";
  const rows = listAudit({ action: action || undefined, entityId: entityId || undefined, limit: 500 });
  return (
    <div className={s.stack}>
      <Card heading="Filtry">
        <form method="get" className={s.filters}>
          <div className={s.stack} style={{ gap: 8 }}>
            <label htmlFor="f-akcja" className={s.small} style={{ fontWeight: 600 }}>
              Działanie
            </label>
            <select id="f-akcja" name="akcja" defaultValue={action} className={s.select}>
              <option value="">Wszystkie</option>
              {AUDIT_ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {actionLabel[a] ?? a}
                </option>
              ))}
            </select>
          </div>
          <div className={s.stack} style={{ gap: 8 }}>
            <label htmlFor="f-zestaw" className={s.small} style={{ fontWeight: 600 }}>
              Identyfikator zestawu
            </label>
            <input id="f-zestaw" name="zestaw" defaultValue={entityId} className={s.select} autoComplete="off" />
          </div>
          <div>
            <Button type="submit" variant="secondary" icon="search">
              Filtruj
            </Button>
          </div>
        </form>
      </Card>
      <AuditTable rows={rows} caption={`Wpisy dziennika (${rows.length}${rows.length === 500 ? ", najnowsze" : ""})`} />
    </div>
  );
}

export default function Page({ searchParams }: PageProps<"/admin/dziennik">) {
  return (
    <>
      <AdminNav current="audit" />
      <PageHeader title="Dziennik zmian" lead="Każde działanie w panelu — logowanie, zapis szkicu, sprawdzenie, publikacja, archiwizacja, przywrócenie stanu ustawowego. Wpisów nie można zmieniać ani usuwać." />
      <Suspense fallback={<CardSkeleton count={1} lines={6} />}>
        <AuditContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
