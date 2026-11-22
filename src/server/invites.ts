import "server-only";
import { sealData, unsealData } from "iron-session";
import { password } from "./session";

/**
 * Invitation of the other parent to the shared plan. The link carries the inviter's session id, sealed (encrypted and
 * signed) with the session secret, valid 14 days. The other parent opens it and signs in with his or her OWN mObywatel:
 * nobody reads another person's registry data without that person signing in.
 */
const TTL = 60 * 60 * 24 * 14;

export async function createInvite(sid: string): Promise<string> {
  return sealData({ sid, v: 1 }, { password: password(), ttl: TTL });
}

export async function readInvite(token: string): Promise<{ sid: string } | null> {
  if (!token || token.length > 2000) return null;
  try {
    const data = await unsealData<{ sid?: string; v?: number }>(token, { password: password(), ttl: TTL });
    return typeof data.sid === "string" && data.sid ? { sid: data.sid } : null;
  } catch {
    return null;
  }
}
