import { randomInt, randomUUID } from "node:crypto";
import { json } from "@/server/api";

/** Simulated mObywatel challenge: a one-time code the user "confirms in the app". */
export async function POST() {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  return json({ challengeId: randomUUID(), code: `${code.slice(0, 3)} ${code.slice(3)}`, expiresInSec: 120 });
}
