import { connection } from "next/server";
import pkg from "../../../../package.json";
import { pingDb } from "@/server/db/client";
import { sessionConfigured } from "@/server/session";
import { getPublishedParams } from "@/server/params-repo";

export async function GET() {
  await connection();
  const db = pingDb();
  const session = sessionConfigured();
  const params = await getPublishedParams();
  const healthy = db && session;
  const body = {
    status: healthy ? "ok" : "degraded",
    version: pkg.version,
    session: session ? "ok" : "misconfigured",
    commit: process.env.APP_COMMIT ?? process.env.RAILWAY_GIT_COMMIT_SHA ?? "local",
    db: db ? "ok" : "unavailable",
    paramsVersion: params.version,
  };
  return Response.json(body, { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
