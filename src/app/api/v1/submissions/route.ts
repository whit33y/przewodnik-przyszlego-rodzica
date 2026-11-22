import { z } from "zod";
import { uscCopy } from "@/content/forms";
import { apiError, json, requireContext, seeOther } from "@/server/api";
import { findForm, recipientPrefix } from "@/server/forms";
import { loadGuidance } from "@/server/guidance";
import { createSubmission, listSubmissions } from "@/server/submissions-repo";

const fieldsSchema = z.record(z.string().max(60), z.string().max(500)).refine((r) => Object.keys(r).length <= 40, "Za dużo pól.");
const jsonBody = z.object({ kind: z.string().min(1).max(60), payload: z.object({ fields: fieldsSchema.optional() }).passthrough().optional() });

const uscSchema = z.object({
  type: z.enum(uscCopy.types.map((t) => t.value) as [string, ...string[]]),
  purpose: z.enum(uscCopy.purposes.map((t) => t.value) as [string, ...string[]]),
  delivery: z.enum(uscCopy.delivery.map((t) => t.value) as [string, ...string[]]),
  copies: z.coerce.number().int().min(1).max(3),
});

/** Stored submissions of this session (simulated sending). */
export async function GET() {
  const ctx = await requireContext();
  if (ctx instanceof Response) return ctx;
  return json({ submissions: listSubmissions(ctx.state.sid) });
}

/**
 * "Send" a form (simulation — nothing leaves the server). JSON `{ kind, payload }` → 201 JSON;
 * a plain form POST from /wnioski/{kind} → 303 to the confirmation page.
 */
export async function POST(req: Request) {
  const isForm = (req.headers.get("content-type") ?? "").includes("form");
  const ctx = await requireContext();
  if (ctx instanceof Response) return isForm ? seeOther("/logowanie") : ctx;

  let kind: string;
  let fields: Record<string, string> = {};
  if (isForm) {
    const form = await req.formData();
    kind = String(form.get("kind") ?? "");
    for (const [k, v] of form.entries()) if (k !== "kind" && typeof v === "string" && v.trim()) fields[k] = v.trim();
    const parsed = fieldsSchema.safeParse(fields);
    if (!parsed.success) return apiError(422, "VALIDATION", "Sprawdź wprowadzone dane.");
  } else {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError(400, "BAD_JSON", "Nieprawidłowe dane.");
    }
    const parsed = jsonBody.safeParse(body);
    if (!parsed.success) return apiError(422, "VALIDATION", "Sprawdź wprowadzone dane.");
    kind = parsed.data.kind;
    fields = parsed.data.payload?.fields ?? {};
  }

  const g = await loadGuidance(ctx);
  const spec = findForm(g.forms, kind);
  if (!spec || spec.kind === "pue-question") return apiError(404, "NOT_APPLICABLE", "Ten wniosek nie dotyczy Twojej sytuacji.");
  if (spec.disabledReason) return apiError(409, "NOT_YET", spec.disabledReason);
  if (spec.kind === "usc-birth") {
    const usc = uscSchema.safeParse(fields);
    if (!usc.success) return apiError(422, "VALIDATION", "Wybierz rodzaj odpisu, cel i sposób odbioru.");
  }

  const rec = createSubmission(ctx.state.sid, spec.slug, { title: spec.title, recipient: spec.recipient, fields }, recipientPrefix[spec.recipient]);
  if (isForm) return seeOther(`/wnioski/wyslane/${rec.id}`);
  return json({ id: rec.id, createdAt: rec.createdAt, kind: rec.kind, recipient: spec.recipient, title: spec.title, simulated: true }, { status: 201 });
}
