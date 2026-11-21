import { getMutableSession } from "@/server/session";

export async function POST(request: Request) {
  const session = await getMutableSession();
  session.destroy();
  return Response.redirect(new URL("/", request.url), 303);
}
