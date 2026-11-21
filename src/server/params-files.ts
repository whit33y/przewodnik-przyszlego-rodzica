import "server-only";
import fs from "node:fs";
import path from "node:path";

export interface ParameterSetFile {
  id: string;
  validFrom: string;
  label: string;
  [key: string]: unknown;
}

/** Statutory defaults shipped in the repo (data/params). Always available, even without a database. */
export function readParameterFiles(): ParameterSetFile[] {
  const dir = path.join(process.cwd(), "data", "params");
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as ParameterSetFile);
}
