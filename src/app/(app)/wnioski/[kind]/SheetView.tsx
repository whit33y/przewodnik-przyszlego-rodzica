import { formsText } from "@/content/forms";
import type { DataSheet } from "@/server/forms";
import { Button } from "@/ui/components/Button/Button";
import { DataList, DataRow } from "@/ui/components/DataRow/DataRow";
import { TextLink } from "@/ui/components/TextLink/TextLink";
import { CopyButton } from "../client";
import { Provenance } from "./LeaveForm";
import s from "../Wnioski.module.css";

/** "Dane do wniosku": each value with a copy button and the link to the official form. */
export function SheetView({ sheet }: { sheet: DataSheet }) {
  return (
    <div className={s.layout}>
      <DataList label={sheet.title}>
        {sheet.rows.map((r) => (
          <DataRow
            key={r.id}
            label={r.label}
            value={
              <>
                {r.value ? <span className={s.sheetValue}>{r.value}</span> : <span className={s.empty}>{formsText.emptyValue}</span>}
                {r.note ? <span className={`${s.note}`} style={{ display: "block" }}>{r.note}</span> : null}
              </>
            }
            source={r.source ? <Provenance source={r.source} /> : undefined}
            action={r.value ? <CopyButton value={r.value} label={r.label} /> : undefined}
          />
        ))}
      </DataList>
      <p>
        <TextLink href={sheet.link.href} external>
          {sheet.link.label}
        </TextLink>
      </p>
      <form method="post" action="/api/v1/submissions" className={s.actions}>
        <input type="hidden" name="kind" value={sheet.slug} />
        <Button type="submit" icon="mail" uppercase={false}>
          {sheet.recipient === "employer" ? formsText.sendEmployer : formsText.sendZus}
        </Button>
        <span className={s.small}>{formsText.simNote}</span>
      </form>
    </div>
  );
}
