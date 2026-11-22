/** Only same-site paths made of plain characters (no "//", no backslash, no scheme, no query tricks). */
export function safeNext(raw: unknown): string | null {
  const next = typeof raw === "string" ? raw : "";
  if (!/^\/[A-Za-z0-9\-_/]*$/.test(next) || next.startsWith("//")) return null;
  return next;
}
