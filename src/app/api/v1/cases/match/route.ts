import { z } from "zod";
import { apiError, json, parseJson } from "@/server/api";
import { matchCase } from "@/server/cases-repo";

const hex = z.string().regex(/^[a-f0-9]{64}$/);
const body = z.object({ pdfSha256: hex.optional(), fileNameSha256: hex.optional() }).refine((b) => b.pdfSha256 || b.fileNameSha256, "Podaj skrót pliku.");

/** Only SHA-256 hashes arrive here — the PDF never leaves the juror's computer. */
export async function POST(req: Request) {
  const data = await parseJson(req, body);
  if (data instanceof Response) return data;
  const id = await matchCase(data);
  return id ? json({ id }) : apiError(404, "NO_MATCH", "Nie rozpoznaliśmy pliku. Wybierz sprawę z listy.");
}
