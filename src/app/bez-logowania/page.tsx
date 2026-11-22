import type { Metadata } from "next";
import { Button } from "@/ui/components/Button/Button";
import { Notice } from "@/ui/components/Notice/Notice";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";

export const metadata: Metadata = { title: "Policz bez logowania" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Policz bez logowania"
        lead="Wpiszesz kilka informacji o swojej pracy i zarobkach. Wynik będzie mniej dokładny niż po zalogowaniu, bo nie znamy Twojej historii składek."
      />
      <form action="/api/v1/auth/login/confirm" method="post" style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 720 }}>
        <input type="hidden" name="mode" value="manual" />
        <Notice tone="info" title="Co będzie potrzebne">
          <ul style={{ paddingLeft: 20 }}>
            <li>forma zatrudnienia i od kiedy trwa,</li>
            <li>przeciętne miesięczne wynagrodzenie brutto (albo zadeklarowana podstawa składek),</li>
            <li>czy masz ubezpieczenie chorobowe,</li>
            <li>przewidywana data porodu albo data przyjęcia dziecka.</li>
          </ul>
        </Notice>
        <div>
          <Button type="submit" iconAfter="chevron-right">
            Zaczynam
          </Button>
        </div>
      </form>
    </>
  );
}
