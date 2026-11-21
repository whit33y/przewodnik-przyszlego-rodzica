import { Button } from "@/ui/components/Button/Button";
import { Notice } from "@/ui/components/Notice/Notice";

/** Shown in place of personalised content when there is no simulated session. */
export function NeedsSession() {
  return (
    <Notice
      tone="info"
      title="Zaloguj się, żeby zobaczyć swoje dane"
      actions={
        <>
          <Button href="/logowanie" icon="lock" uppercase={false}>
            Zaloguj się przez mObywatel
          </Button>
          <Button href="/bez-logowania" variant="secondary">
            Policz bez logowania
          </Button>
        </>
      }
    >
      <p>Po zalogowaniu pobierzemy dane z ZUS i rejestrów. Możesz też wpisać najważniejsze informacje samodzielnie.</p>
    </Notice>
  );
}
