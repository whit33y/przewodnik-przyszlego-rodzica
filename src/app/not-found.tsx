import { Button } from "@/ui/components/Button/Button";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";

export default function NotFound() {
  return (
    <>
      <PageHeader title="Nie znaleźliśmy tej strony" lead="Adres mógł się zmienić albo zawiera literówkę." />
      <div>
        <Button href="/" icon="home">
          Strona główna
        </Button>
      </div>
    </>
  );
}
