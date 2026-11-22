import { json, requireContext, seeOther } from "@/server/api";
import { createInvite } from "@/server/invites";
import { updateState } from "@/server/session-state";

/** Create (or re-create) the invitation link for the other parent. JSON → 201 `{ url }`; form POST → 303 to /sytuacja. */
export async function POST(req: Request) {
  const isForm = (req.headers.get("content-type") ?? "").includes("form");
  const ctx = await requireContext();
  if (ctx instanceof Response) return isForm ? seeOther("/logowanie") : ctx;
  const token = await createInvite(ctx.state.sid);
  const role = ctx.assembled.facts.claimant.role === "father" ? "mother" : "father";
  updateState(ctx.state.sid, { answers: { ...ctx.state.answers, otherParent: { mode: "invited", role, invite: token } } });
  const url = `/dolacz/${encodeURIComponent(token)}`;
  return isForm ? seeOther("/sytuacja") : json({ url }, { status: 201 });
}
