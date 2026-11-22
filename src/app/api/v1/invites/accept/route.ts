import { seeOther } from "@/server/api";
import { readInvite } from "@/server/invites";
import { resolvePersona } from "@/server/persona-store";
import { readState, updateState } from "@/server/session-state";

/**
 * Form POST from /dolacz/{token}: the other parent signs in (simulated) and joins the plan. In the demo the other
 * parent's registry data is the persona's `otherParent` profile; a persona without one cannot be joined.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const token = String(form.get("token") ?? "");
  const back = `/dolacz/${encodeURIComponent(token)}`;
  const invite = await readInvite(token);
  if (!invite) return seeOther("/dolacz/niewazne");
  const state = readState(invite.sid);
  if (!state) return seeOther("/dolacz/niewazne");
  const persona = resolvePersona(state.personaId);
  if (!persona?.otherParent?.consented) return seeOther(`${back}?wynik=brak`);
  const role = state.answers.otherParent?.role ?? (persona.otherParent.role === "mother" ? "mother" : "father");
  updateState(invite.sid, { answers: { ...state.answers, otherParent: { mode: "consent", role } } });
  return seeOther(`${back}?wynik=ok`);
}
