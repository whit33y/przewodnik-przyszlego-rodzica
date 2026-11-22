import { listPersonaFiles } from "@/server/persona-store";

export async function GET() {
  return Response.json({ items: listPersonaFiles().map(({ id, label, oneLiner, journey }) => ({ id, label, oneLiner, journey })) });
}
