import { connection } from "next/server";
import { pingDb } from "@/server/db/client";
import { getPublishedParams } from "@/server/params-repo";

export async function GET() {
  await connection();
  const db = pingDb();
  const params = await getPublishedParams();
  const body = {
    status: db ? "ok" : "degraded",
    version: process.env.npm_package_version ?? "0.1.0",
    commit: process.env.APP_COMMIT ?? process.env.RAILWAY_GIT_COMMIT_SHA ?? "local",
    db: db ? "ok" : "unavailable",
    paramsVersion: params.version,
  };
  return Response.json(body, { status: db ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
