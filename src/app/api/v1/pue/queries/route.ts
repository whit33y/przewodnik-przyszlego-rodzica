import { z } from "zod";
import { pueCopy } from "@/content/forms";
import { json, parseJson, requireContext, seeOther } from "@/server/api";
import { createSubmission } from "@/server/submissions-repo";

const body = z.object({ path: z.string().max(120).optional(), topic: z.string().max(80).optional(), message: z.string().min(5).max(2000), ref: z.string().max(120).optional() });

/**
 * Simulated PUE/eZUS: "zadaj pytanie / zgłoś niezgodność". Stored, never sent anywhere.
 * JSON (from /sytuacja) → 201 JSON; form POST (from /wnioski/pytanie-pue) → 303 to the confirmation page.
 */
export async function POST(req: Request) {
  const isForm = (req.headers.get("content-type") ?? "").includes("form");
  const ctx = await requireContext();
  if (ctx instanceof Response) return isForm ? seeOther("/logowanie") : ctx;
  let data: z.infer<typeof body>;
  if (isForm) {
    const form = await req.formData();
    const raw = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string" && v.trim()).map(([k, v]) => [k, String(v).trim()]));
    const parsed = body.safeParse(raw);
    if (!parsed.success) return seeOther(`/wnioski/${pueCopy.slug}?blad=tresc`);
    data = parsed.data;
  } else {
    const parsed = await parseJson(req, body);
    if (parsed instanceof Response) return parsed;
    data = parsed;
  }
  const rec = createSubmission(ctx.state.sid, "pue-query", { title: pueCopy.title, recipient: "zus", ...data }, "PUE");
  if (isForm) return seeOther(`/wnioski/wyslane/${rec.id}`);
  return json({ id: rec.id, status: "przyjęto", answerWithinDays: 7 }, { status: 201 });
}
