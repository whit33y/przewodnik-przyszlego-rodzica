import "server-only";
import { createHash } from "node:crypto";
import { cacheLife, cacheTag } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, isBuildPhase } from "./db/client";
import { parameterSets } from "./db/schema";
import { readParameterFiles, type ParameterSetFile } from "./params-files";

export interface PublishedParams {
  version: string;
  sets: ParameterSetFile[];
}

function loadPublished(): ParameterSetFile[] {
  if (isBuildPhase()) return readParameterFiles();
  try {
    const rows = getDb().select().from(parameterSets).where(eq(parameterSets.status, "published")).all();
    if (rows.length === 0) return readParameterFiles();
    return rows.map((r) => JSON.parse(r.payload) as ParameterSetFile).sort((a, b) => a.validFrom.localeCompare(b.validFrom));
  } catch (err) {
    console.error("[params] database unavailable, serving statutory defaults", err);
    return readParameterFiles();
  }
}

/** All published parameter sets, oldest first. Cached and invalidated by revalidateTag('params') on publish. */
export async function getPublishedParams(): Promise<PublishedParams> {
  "use cache";
  cacheTag("params");
  cacheLife("max");
  const sets = loadPublished();
  const hash = createHash("sha256").update(JSON.stringify(sets)).digest("hex").slice(0, 8);
  return { version: `${sets.map((s) => s.id).join("+")}#${hash}`, sets };
}
