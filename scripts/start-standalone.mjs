#!/usr/bin/env node
/** Runs the production entry point exactly as the Docker image does (static assets + data copied next to server.js). */
import { cpSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";

const out = ".next/standalone";
if (!existsSync(`${out}/server.js`)) {
  console.error("Run `npm run build` first.");
  process.exit(1);
}
cpSync(".next/static", `${out}/.next/static`, { recursive: true });
if (existsSync("public")) cpSync("public", `${out}/public`, { recursive: true });
for (const d of ["data/params", "data/cases", "data/personas", "data/content", "drizzle"]) if (existsSync(d)) cpSync(d, `${out}/${d}`, { recursive: true });
const port = process.argv[2] ?? process.env.PORT ?? "3000";
const child = spawn(process.execPath, ["server.js"], { cwd: out, stdio: "inherit", env: { ...process.env, PORT: port, HOSTNAME: "127.0.0.1", DATABASE_PATH: process.env.DATABASE_PATH ? new URL(process.env.DATABASE_PATH, `file://${process.cwd()}/`).pathname : undefined } });
child.on("exit", (code) => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
