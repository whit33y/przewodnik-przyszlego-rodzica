import { z } from "zod";
import { json, parseJson, requireContext } from "@/server/api";
import { buildAssembled } from "@/server/context";
import { updateState } from "@/server/session-state";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const fraction = z.object({ num: z.number().int().positive(), den: z.number().int().positive() });
const roles = z.enum(["mother", "father", "adoptive", "foster", "otherFamily"]);

const answersSchema = z
  .object({
    expectedDate: isoDate.optional(),
    childrenCount: z.number().int().min(1).max(6).optional(),
    zaZyciem: z.boolean().optional(),
    eventKind: z.enum(["birth", "adoption", "foster"]).optional(),
    care: z.object({ takenIntoCareOn: isoDate.optional(), fosterType: z.enum(["nonProfessional", "professional"]).optional(), petitionFiledOn: isoDate.optional(), childBirthDate: isoDate.optional(), schoolDeferred: z.boolean().optional() }).optional(),
    plannedEnd: z.object({ titleId: z.string(), date: isoDate, reason: z.string() }).nullable().optional(),
    otherParent: z.object({ mode: z.enum(["consent", "estimate", "none"]), insured: z.enum(["yes", "no", "krus", "abroad", "unknown"]).optional(), estimatedBase: z.number().int().nonnegative().optional(), role: roles.optional() }).optional(),
    whatIf: z.object({ hospital: z.object({ category: z.enum(["none", "preterm", "extreme", "term"]), days: z.number().int().min(0).max(400) }).optional() }).optional(),
    manual: z
      .object({
        role: roles,
        sex: z.enum(["F", "M"]),
        work: z.enum(["employment", "mandate", "selfEmployed", "none"]),
        since: isoDate,
        fraction: fraction.optional(),
        monthlyGross: z.number().int().nonnegative().optional(),
        sicknessInsurance: z.enum(["mandatory", "voluntary", "none"]),
        arrears: z.boolean().optional(),
        over20Insured: z.boolean().optional(),
      })
      .optional(),
  })
  .strict();

export async function PUT(req: Request) {
  const ctx = await requireContext();
  if (ctx instanceof Response) return ctx;
  const data = await parseJson(req, answersSchema);
  if (data instanceof Response) return data;
  const answers = { ...ctx.state.answers, ...data } as typeof ctx.state.answers;
  updateState(ctx.state.sid, { answers });
  const { assembled } = buildAssembled({ ...ctx.state, answers }, ctx.persona, ctx.statuses);
  return json({ questions: assembled.missing });
}
