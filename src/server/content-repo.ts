import "server-only";
import fs from "node:fs";
import path from "node:path";
import { cacheLife, cacheTag } from "next/cache";

export interface Charity {
  id: string;
  name: string;
  kind: string;
  situations: string[];
  description: string;
  url: string;
  phone?: string;
  krs?: string;
  opp?: boolean | null;
  verifiedOn: string;
}

export interface OfficialLink {
  id: string;
  title: string;
  publisher: string;
  url: string;
  topic: string;
  description: string;
}

function read<T>(file: string): T[] {
  const p = path.join(process.cwd(), "data", "content", file);
  return fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, "utf8")) as T[]) : [];
}

/** Curated content (editable in the admin panel later; invalidated with revalidateTag('content')). */
export async function getCharities(): Promise<Charity[]> {
  "use cache";
  cacheTag("content");
  cacheLife("max");
  return read<Charity>("charities.json");
}

export async function getLinks(): Promise<OfficialLink[]> {
  "use cache";
  cacheTag("content");
  cacheLife("max");
  return read<OfficialLink>("links.json");
}
