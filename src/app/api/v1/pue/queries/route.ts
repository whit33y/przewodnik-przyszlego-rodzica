import { randomUUID } from "node:crypto";
import { z } from "zod";
import { json, parseJson, requireContext } from "@/server/api";
import { getDb } from "@/server/db/client";
import { submissions } from "@/server/db/schema";

const body = z.object({ path: z.string().max(120).optional(), topic: z.string().max(80).optional(), message: z.string().min(5).max(2000) });

/** Simulated PUE/eZUS: "zadaj pytanie / zgłoś niezgodność". Stored, never sent anywhere. */
export async function POST(req: Request) {
  const ctx = await requireContext();
  if (ctx instanceof Response) return ctx;
  const data = await parseJson(req, body);
  if (data instanceof Response) return data;
  const id = `PUE-${new Date().getFullYear()}-${randomUUID().slice(0, 6).toUpperCase()}`;
  getDb().insert(submissions).values({ id, sessionId: ctx.state.sid, kind: "pue-query", payload: JSON.stringify(data), createdAt: new Date().toISOString() }).run();
  return json({ id, status: "przyjęto", answerWithinDays: 7 }, { status: 201 });
}
