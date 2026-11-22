/** JSON fetch for the admin pages (same origin, admin cookie sent automatically). */
export interface ApiFailure {
  ok: false;
  status: number;
  message: string;
  fields?: Record<string, string>;
}

export async function adminFetch<T>(url: string, init: { method?: string; body?: unknown } = {}): Promise<{ ok: true; data: T } | ApiFailure> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? "GET",
      headers: { Accept: "application/json", ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
    });
  } catch {
    return { ok: false, status: 0, message: "Brak połączenia z serwerem. Spróbuj ponownie." };
  }
  const data = await res.json().catch(() => null);
  if (res.ok) return { ok: true, data: data as T };
  const err = (data as { error?: { message?: string; fields?: Record<string, string> } } | null)?.error;
  const message = res.status === 401 ? "Sesja panelu wygasła. Odśwież stronę i zaloguj się ponownie." : err?.message ?? "Operacja nie powiodła się.";
  return { ok: false, status: res.status, message, fields: err?.fields };
}
