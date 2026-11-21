import { z } from "zod";
import type { ISODate, TitleEndReason } from "@/engine/types";
import type { Answers } from "@/integrations/types";
import { apiError, json, parseJson, requireContext } from "@/server/api";
import { buildAssembled } from "@/server/context";
import { updateState } from "@/server/session-state";

const TITLE_END_REASONS = [
  "fixedTermExpired", "extendedToBirth", "resignation", "mutualAgreement",
  "employerLiquidation", "employerBankruptcy", "employerDeath",
  "unlawfulTerminationJudgment", "businessClosed", "businessSuspended",
  "deregisteredBenefitConcurrence", "deregisteredOnRequest", "contractEnded", "other",
] as const satisfies readonly TitleEndReason[];

const shiftYears = (iso: ISODate, years: number) => `${Number(iso.slice(0, 4)) + years}${iso.slice(4)}`;

/** Answers schema; dates are bounded to a sane window around the session's "today". */
function answersSchema(asOf: ISODate) {
  const date = (minYears: number, maxYears: number) =>
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Podaj datę w formacie RRRR-MM-DD.")
      .refine((v) => {
        const d = new Date(`${v}T00:00:00Z`);
        return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
      }, "Taka data nie istnieje.")
      .refine((v) => v >= shiftYears(asOf, minYears) && v <= shiftYears(asOf, maxYears), "Data jest poza możliwym zakresem.");
  const fraction = z.object({ num: z.number().int().positive().max(8), den: z.number().int().positive().max(8) }).refine((f) => f.num <= f.den, "Wymiar etatu nie może przekraczać 1.");
  const roles = z.enum(["mother", "father", "adoptive", "foster", "otherFamily"]);
  const grosze = z.number().int().nonnegative().max(100_000_000);
  return z
    .object({
      expectedDate: date(-1, 1).optional(),
      childrenCount: z.number().int().min(1).max(6).optional(),
      zaZyciem: z.boolean().optional(),
      eventKind: z.enum(["birth", "adoption", "foster"]).optional(),
      care: z
        .object({ takenIntoCareOn: date(-20, 1).optional(), fosterType: z.enum(["nonProfessional", "professional"]).optional(), petitionFiledOn: date(-20, 1).optional(), childBirthDate: date(-20, 0).optional(), schoolDeferred: z.boolean().optional() })
        .strict()
        .optional(),
      plannedEnd: z.object({ titleId: z.string().max(40), date: date(-1, 2), reason: z.enum(TITLE_END_REASONS) }).strict().nullable().optional(),
      arrears: z.boolean().optional(),
      whatIf: z.object({ hospital: z.object({ category: z.enum(["none", "preterm", "extreme", "term"]), days: z.number().int().min(0).max(400) }).strict().optional() }).strict().optional(),
      otherParent: z
        .object({ mode: z.enum(["consent", "estimate", "none"]), insured: z.enum(["yes", "no", "krus", "abroad", "unknown"]).optional(), estimatedGross: grosze.optional(), role: roles.optional() })
        .strict()
        .optional(),
      manual: z
        .object({
          role: roles,
          sex: z.enum(["F", "M"]),
          work: z.enum(["employment", "mandate", "selfEmployed", "none"]),
          since: date(-60, 1),
          fraction: fraction.optional(),
          monthlyGross: grosze.optional(),
          sicknessInsurance: z.enum(["mandatory", "voluntary", "none"]),
          arrears: z.boolean().optional(),
          over20Insured: z.boolean().optional(),
        })
        .strict()
        .optional(),
    })
    .strict();
}

export async function PUT(req: Request) {
  const ctx = await requireContext();
  if (ctx instanceof Response) return ctx;
  const data = await parseJson(req, answersSchema(ctx.assembled.facts.asOf));
  if (data instanceof Response) return data;
  if (data.plannedEnd && !ctx.assembled.facts.claimant.titles.some((t) => t.id === data.plannedEnd!.titleId)) {
    return apiError(422, "VALIDATION", "Sprawdź wprowadzone dane.", { "plannedEnd.titleId": "Nie ma takiego tytułu ubezpieczenia." });
  }
  const answers = { ...ctx.state.answers, ...data } as Answers;
  updateState(ctx.state.sid, { answers });
  const { assembled } = buildAssembled({ ...ctx.state, answers }, ctx.persona, ctx.statuses, ctx.deductionBps);
  return json({ questions: assembled.missing, unverified: assembled.unverified });
}
