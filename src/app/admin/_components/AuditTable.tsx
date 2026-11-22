import Link from "next/link";
import { describeAudit, type AuditRow } from "@/server/admin-repo";
import { actionLabel, formatTimestamp } from "./format";
import s from "../Admin.module.css";

export function AuditTable({ rows, caption }: { rows: AuditRow[]; caption: string }) {
  if (rows.length === 0) return <p className={s.muted}>Brak wpisów.</p>;
  return (
    <div className={s.tableWrap} tabIndex={0} role="region" aria-label="Tabela — można przewijać w poziomie">
      <table className={s.table}>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Kiedy</th>
            <th scope="col">Kto</th>
            <th scope="col">Działanie</th>
            <th scope="col">Zestaw</th>
            <th scope="col">Szczegóły</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="tabular" style={{ whiteSpace: "nowrap" }}>
                {formatTimestamp(r.at)}
              </td>
              <td>{r.actor}</td>
              <td>{actionLabel[r.action] ?? r.action}</td>
              <td>{r.entity === "parameter_set" && r.entityId !== "*" ? <Link href={`/admin/parametry/${r.entityId}`}>{r.entityId}</Link> : r.entityId}</td>
              <td>{describeAudit(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
