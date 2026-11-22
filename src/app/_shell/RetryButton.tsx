import type { SystemId } from "@/integrations/types";
import { Button } from "@/ui/components/Button/Button";

/** Plain form POST, so it works before hydration: asks the registry again and returns to `next`. */
export function RetryButton({ source, next }: { source: SystemId; next: string }) {
  return (
    <form action="/api/v1/integrations/retry" method="post">
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="next" value={next} />
      <Button type="submit" size="sm" variant="secondary" icon="refresh">
        Spróbuj ponownie
      </Button>
    </form>
  );
}
