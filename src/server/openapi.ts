import "server-only";
import { z } from "zod";
import pkg from "../../package.json";
import { planSchema } from "./plan-service";

/**
 * OpenAPI 3.1 description of the REST API the UI itself uses. Request bodies are generated from
 * the same zod schemas the route handlers validate with, where they are shared; the rest are
 * described here. Served at /api/openapi.json and rendered at /api/docs.
 */

type Json = Record<string, unknown>;
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const jsonBody = (schema: Json, description?: string) => ({ required: true, description, content: { "application/json": { schema } } });
const ok = (description: string, schema?: Json) => ({ description, ...(schema ? { content: { "application/json": { schema } } } : {}) });
const err = { description: "Błąd: `{ error: { code, message, fields? } }`", content: { "application/json": { schema: ref("Error") } } };
const session = [{ session: [] }];
const adminSession = [{ admin: [] }];
const isoDate = { type: "string", format: "date", examples: ["2027-03-12"] };

const sources = ["mobywatel", "zus-konto", "zus-platnik", "zus-saldo", "zus-ezla", "zus-swiadczenia", "zus-postepowania", "ceidg", "krs", "rsc"];

interface Op {
  method: "get" | "post" | "put" | "delete";
  path: string;
  tag: string;
  summary: string;
  description?: string;
  auth?: boolean | "admin";
  params?: Json[];
  body?: Json;
  responses: Json;
}

const ops: Op[] = [
  { method: "get", path: "/api/health", tag: "System", summary: "Stan usługi", description: "Baza danych, konfiguracja sesji i wersja opublikowanych parametrów prawnych.", responses: { 200: ok("Usługa działa"), 503: ok("Usługa niesprawna") } },
  { method: "get", path: "/api/v1/params/current", tag: "Parametry prawne", summary: "Opublikowane zestawy parametrów", description: "Stawki, wymiary urlopów, kwoty minimalne — każdy zestaw ma datę obowiązywania (`validFrom`). Silnik wybiera zestaw obowiązujący w dniu powstania prawa.", responses: { 200: ok("Lista zestawów", { type: "object", properties: { version: { type: "string" }, sets: { type: "array", items: { type: "object" } } } }) } },

  { method: "post", path: "/api/v1/auth/login/start", tag: "Logowanie (symulacja)", summary: "Rozpocznij logowanie mObywatelem", description: "Zwraca jednorazowy kod do „potwierdzenia w aplikacji”. Logowanie jest symulowane.", responses: { 200: ok("Kod", { type: "object", properties: { challengeId: { type: "string" }, code: { type: "string", examples: ["482 913"] }, expiresInSec: { type: "integer" } } }) } },
  { method: "post", path: "/api/v1/auth/login/confirm", tag: "Logowanie (symulacja)", summary: "Potwierdź logowanie (formularz)", description: "`application/x-www-form-urlencoded`: `personaId` (profil testowy) albo `caseId` (sprawa z zestawu ZUS) albo `mode=manual`. Ustawia szyfrowane ciasteczko sesji, od razu pobiera dane ze wszystkich rejestrów i odpowiada 303 do sytuacji.", responses: { 303: ok("Przekierowanie do sytuacji") } },
  { method: "post", path: "/api/v1/auth/logout", tag: "Logowanie (symulacja)", summary: "Wyloguj", auth: true, responses: { 303: ok("Przekierowanie na stronę główną") } },
  { method: "get", path: "/api/v1/personas", tag: "Logowanie (symulacja)", summary: "Profile testowe", responses: { 200: ok("Lista fikcyjnych osób") } },

  { method: "get", path: "/api/v1/integrations/status", tag: "Rejestry (symulacja)", summary: "Stan pobierania danych z rejestrów", description: "Po zalogowaniu mObywatelem wszystkie rejestry są odpytywane od razu — bez osobnego ekranu zgód.", auth: true, responses: { 200: ok("Stan każdego rejestru: pending / ok / unavailable / skipped"), 401: err } },
  { method: "post", path: "/api/v1/integrations/retry", tag: "Rejestry (symulacja)", summary: "Ponów pobieranie z niedostępnego rejestru", description: "JSON → 200; zwykły formularz (`source`, `next`) → 303 z powrotem na stronę.", auth: true, body: jsonBody({ type: "object", required: ["source"], properties: { source: { enum: sources } } }), responses: { 200: ok("Ponowiono"), 401: err, 422: err } },
  {
    method: "get",
    path: "/api/v1/integrations/{source}",
    tag: "Rejestry (symulacja)",
    summary: "Dane pobrane z jednego rejestru",
    description: "Na przykład dane o ubezpieczeniu z ZUS, zaległości w składkach, zwolnienia e-ZLA. Każda wartość ma źródło i datę stanu.",
    auth: true,
    params: [{ name: "source", in: "path", required: true, schema: { enum: sources } }],
    responses: { 200: ok("`{ value, source, asOf, fetchedAt }`"), 404: err, 409: err },
  },
  { method: "get", path: "/api/v1/debt-certificate", tag: "Rejestry (symulacja)", summary: "Zaświadczenie o stanie zadłużenia (symulacja)", description: "Stan zaległości w składkach na dzień powstania prawa do świadczenia (domyślnie: dzień porodu).", auth: true, params: [{ name: "onDate", in: "query", schema: isoDate }], responses: { 200: ok("Kwota, próg 1% minimalnego wynagrodzenia, czy blokuje wypłatę"), 401: err } },

  { method: "get", path: "/api/v1/situation", tag: "Sytuacja", summary: "Złożone fakty z rejestrów, odpowiedzi i poprawek", description: "Zwraca fakty dla silnika, mapę pochodzenia danych (ścieżka faktu → źródło) i pytania, na które odpowiedzieć może tylko użytkownik.", auth: true, responses: { 200: ok("Sytuacja"), 401: err } },
  { method: "put", path: "/api/v1/answers", tag: "Sytuacja", summary: "Zapisz odpowiedzi użytkownika", description: "Termin porodu, liczba dzieci, „Za życiem”, planowane zakończenie umowy, drugi rodzic, scenariusz „co jeśli”, dane w trybie bez logowania.", auth: true, body: jsonBody({ type: "object", additionalProperties: false, properties: { expectedDate: isoDate, childrenCount: { type: "integer", minimum: 1, maximum: 6 }, zaZyciem: { type: "boolean" }, eventKind: { enum: ["birth", "adoption", "foster"] }, otherParent: { type: "object", description: "`{ mode: \"estimate\" | \"none\", insured?, estimatedGross?, role? }` — dołączenie drugiego rodzica idzie przez /api/v1/invites" }, plannedEnd: { type: ["object", "null"] }, whatIf: { type: "object" }, manual: { type: "object" } } }), responses: { 200: ok("Pozostałe pytania"), 401: err, 422: err } },
  { method: "post", path: "/api/v1/invites", tag: "Sytuacja", summary: "Zaproś drugiego rodzica do wspólnego planu", description: "Tworzy link ważny 14 dni (zaszyfrowany i podpisany). Drugi rodzic otwiera go i loguje się własnym mObywatelem — dopiero wtedy jego dane z ZUS trafiają do wspólnego planu. JSON → 201 `{ url }`; formularz → 303.", auth: true, responses: { 201: ok("`{ url }`"), 303: ok("Przekierowanie do sytuacji"), 401: err } },
  { method: "post", path: "/api/v1/invites/accept", tag: "Sytuacja", summary: "Przyjmij zaproszenie (formularz, symulacja logowania drugiego rodzica)", description: "`application/x-www-form-urlencoded`: `token`. Odpowiada 303 do strony zaproszenia z wynikiem.", responses: { 303: ok("Przekierowanie do /dolacz/{token}") } },
  { method: "post", path: "/api/v1/overrides", tag: "Sytuacja", summary: "Popraw wartość z rejestru", description: "Wartość z rejestru jest zachowana; poprawka jest oznaczona jako „poprawione przez Ciebie — ZUS zweryfikuje”.", auth: true, body: jsonBody({ type: "object", required: ["path", "value"], properties: { path: { type: "string", examples: ["facts.event.expectedDate"] }, value: {}, note: { type: "string" } } }), responses: { 200: ok("Zapisano"), 401: err, 422: err } },
  { method: "delete", path: "/api/v1/overrides", tag: "Sytuacja", summary: "Cofnij poprawkę", auth: true, params: [{ name: "path", in: "query", required: true, schema: { type: "string" } }], responses: { 200: ok("Cofnięto"), 401: err } },
  { method: "post", path: "/api/v1/pue/queries", tag: "Sytuacja", summary: "Zadaj pytanie w PUE/eZUS (symulacja)", description: "JSON → 201 z numerem zgłoszenia; zwykły formularz (z /wnioski/pytanie-pue) → 303 do potwierdzenia. Nic nie jest wysyłane poza serwer.", auth: true, body: jsonBody({ type: "object", required: ["message"], properties: { topic: { type: "string" }, path: { type: "string" }, ref: { type: "string" }, message: { type: "string", minLength: 5, maxLength: 2000 } } }), responses: { 201: ok("Numer zgłoszenia"), 303: ok("Przekierowanie do potwierdzenia"), 401: err, 422: err } },

  {
    method: "post",
    path: "/api/v1/evaluate",
    tag: "Obliczenia",
    summary: "Policz uprawnienia i zasiłek",
    description: "Bez `facts` — liczy dla faktów z sesji. Z `facts` i `plan` — obliczenie bezstanowe (do integracji). Wynik zawiera uprawnienia, okresy, kwoty miesiąc po miesiącu, ostrzeżenia z terminami, dokumenty i pełny ślad rozumowania z podstawą prawną.",
    body: jsonBody({ type: "object", properties: { facts: { type: "object", description: "Facts (src/engine/types.ts)" }, plan: { anyOf: [ref("Plan"), { type: "null" }] } } }),
    responses: { 200: ok("`{ result: Result, paramsVersion }`"), 401: err, 422: err },
  },
  { method: "get", path: "/api/v1/plan", tag: "Plan rodzicielski", summary: "Aktualny plan urlopów z wynikiem", description: "Zapisany plan, a jeśli go nie ma — wniosek z akt (tryb sprawy) albo plan domyślny z maksymalnym wymiarem. Wynik liczony dla obu wariantów stawki (81,5% oraz 100%/70%).", auth: true, responses: { 200: ok("`{ plan, origin, result, alt }`"), 401: err } },
  { method: "put", path: "/api/v1/plan", tag: "Plan rodzicielski", summary: "Zapisz i przelicz plan", auth: true, body: jsonBody({ type: "object", required: ["plan"], properties: { plan: ref("Plan") } }), responses: { 200: ok("`{ result, alt, savedAt }`"), 401: err, 422: err } },
  { method: "delete", path: "/api/v1/plan", tag: "Plan rodzicielski", summary: "Przywróć plan domyślny", auth: true, responses: { 200: ok("Plan domyślny z wynikiem"), 401: err } },

  { method: "get", path: "/api/v1/cases", tag: "Przykładowe sprawy ZUS", summary: "Lista spraw", description: "Tytuły scenariuszy i identyfikatory — bez danych osobowych.", params: [{ name: "scenario", in: "query", schema: { type: "string" } }, { name: "outcome", in: "query", schema: { enum: ["granted", "refused", "partial"] } }, { name: "q", in: "query", schema: { type: "string" } }], responses: { 200: ok("`{ total, items }`") } },
  { method: "get", path: "/api/v1/cases/{id}", tag: "Przykładowe sprawy ZUS", summary: "Sprawa", params: [{ name: "id", in: "path", required: true, schema: { type: "string", examples: ["B2-13"] } }], responses: { 200: ok("Opis sprawy"), 404: err } },
  { method: "post", path: "/api/v1/cases/match", tag: "Przykładowe sprawy ZUS", summary: "Rozpoznaj plik sprawy po skrócie", description: "Przyjmuje wyłącznie skróty SHA-256 (pliku i znormalizowanej nazwy) — sam plik PDF nie opuszcza przeglądarki.", body: jsonBody({ type: "object", properties: { pdfSha256: { type: "string", pattern: "^[a-f0-9]{64}$" }, fileNameSha256: { type: "string", pattern: "^[a-f0-9]{64}$" } } }), responses: { 200: ok("`{ id }`"), 404: err } },
  { method: "get", path: "/api/v1/cases/{id}/compare", tag: "Przykładowe sprawy ZUS", summary: "Wynik silnika vs rozstrzygnięcie ZUS", description: "Ponowne rozstrzygnięcie sprawy i porównanie pole po polu (rozstrzygnięcie, okresy, kwoty) z wartościami wydrukowanymi w aktach.", params: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: ok("`{ result, fields, summary }`"), 404: err } },
  { method: "get", path: "/api/v1/steps", tag: "Co i kiedy", summary: "Lista kroków z terminami", description: "Kroki pogrupowane według etapu (teraz, przed porodem, po porodzie…), każdy z terminem, adresatem i podstawą prawną.", auth: true, responses: { 200: ok("`{ routing, missingEvent, groups }`"), 401: err } },
  { method: "get", path: "/api/v1/steps.ics", tag: "Co i kiedy", summary: "Terminy jako plik kalendarza (iCalendar)", description: "Tylko tytuły i daty kroków — bez danych osobowych.", auth: true, responses: { 200: { description: "Plik .ics", content: { "text/calendar": { schema: { type: "string" } } } }, 401: err } },
  { method: "get", path: "/api/v1/forms", tag: "Wnioski", summary: "Wnioski i dokumenty potrzebne w tej sytuacji", description: "Każdy z adresatem (pracodawca, ZUS, USC), statusem i — gdy jeszcze za wcześnie — powodem.", auth: true, responses: { 200: ok("`{ routing, forms }`"), 401: err } },
  { method: "get", path: "/api/v1/forms/{kind}", tag: "Wnioski", summary: "Dane do wypełnienia jednego wniosku", description: "Pola wstępnie wypełnione danymi z rejestrów i planu urlopów.", auth: true, params: [{ name: "kind", in: "path", required: true, schema: { type: "string", examples: ["urlop-macierzynski"] } }], responses: { 200: ok("Pola wniosku"), 401: err, 404: err } },
  { method: "get", path: "/api/v1/submissions", tag: "Wnioski", summary: "Wysłane wnioski (symulacja)", auth: true, responses: { 200: ok("`{ submissions }`"), 401: err } },
  { method: "post", path: "/api/v1/submissions", tag: "Wnioski", summary: "Wyślij wniosek (symulacja)", description: "JSON `{ kind, payload: { fields } }` → 201; zwykły formularz z /wnioski/{kind} → 303 do potwierdzenia. Nic nie opuszcza serwera.", auth: true, body: jsonBody({ type: "object", required: ["kind"], properties: { kind: { type: "string" }, payload: { type: "object", properties: { fields: { type: "object", additionalProperties: { type: "string", maxLength: 500 } } } } } }), responses: { 201: ok("`{ id, createdAt, kind, recipient, title, simulated }`"), 303: ok("Przekierowanie do potwierdzenia"), 401: err, 404: err, 409: err, 422: err } },

  { method: "post", path: "/api/v1/admin/login", tag: "Administracja", summary: "Zaloguj administratora", description: "Hasło z `ADMIN_PASSWORD`. Po 5 nieudanych próbach w 10 minut — 429. Ustawia osobne ciasteczko `pr_admin`.", body: jsonBody({ type: "object", required: ["password"], properties: { password: { type: "string" } } }), responses: { 200: ok("Zalogowano"), 401: err, 429: err } },
  { method: "post", path: "/api/v1/admin/logout", tag: "Administracja", summary: "Wyloguj administratora", responses: { 200: ok("Wylogowano"), 303: ok("Przekierowanie") } },
  { method: "get", path: "/api/v1/admin/params", tag: "Administracja", summary: "Wszystkie zestawy parametrów", description: "Robocze, opublikowane i zarchiwizowane — oraz zestaw obowiązujący dziś.", auth: "admin", responses: { 200: ok("Lista zestawów"), 401: err } },
  { method: "post", path: "/api/v1/admin/params", tag: "Administracja", summary: "Nowy projekt zestawu (kopia istniejącego)", auth: "admin", body: jsonBody({ type: "object", required: ["fromId"], properties: { fromId: { type: "string" } } }), responses: { 201: ok("Projekt"), 401: err, 422: err } },
  { method: "get", path: "/api/v1/admin/params/{id}", tag: "Administracja", summary: "Zestaw parametrów", auth: "admin", params: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: ok("Status, metadane i wartości"), 401: err, 404: err } },
  { method: "put", path: "/api/v1/admin/params/{id}", tag: "Administracja", summary: "Zapisz projekt", description: "Opublikowanych i zarchiwizowanych zestawów nie można zmieniać.", auth: "admin", params: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], body: jsonBody({ type: "object", required: ["payload"], properties: { payload: { type: "object" } } }), responses: { 200: ok("Zapisano"), 401: err, 409: err, 422: err } },
  { method: "get", path: "/api/v1/admin/params/{id}/diff", tag: "Administracja", summary: "Zmiany względem zestawu, który projekt zastępuje", auth: "admin", params: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: ok("Lista zmienionych parametrów"), 401: err, 404: err } },
  { method: "get", path: "/api/v1/admin/params/{id}/regression", tag: "Administracja", summary: "Ostatni wynik testu regresji", auth: "admin", params: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: ok("Podsumowanie albo null"), 401: err } },
  { method: "post", path: "/api/v1/admin/params/{id}/regression", tag: "Administracja", summary: "Uruchom regresję na 86 sprawach i profilach testowych", description: "Porównuje wyniki z obecnymi parametrami i z tym projektem.", auth: "admin", params: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: ok("Podsumowanie i lista różnic"), 401: err } },
  { method: "post", path: "/api/v1/admin/params/{id}/publish", tag: "Administracja", summary: "Opublikuj z datą wejścia w życie", description: "Wymaga przepisania daty `validFrom` jako potwierdzenia.", auth: "admin", params: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], body: jsonBody({ type: "object", required: ["confirmValidFrom"], properties: { confirmValidFrom: isoDate } }), responses: { 200: ok("Opublikowano"), 401: err, 409: err, 422: err } },
  { method: "post", path: "/api/v1/admin/params/{id}/archive", tag: "Administracja", summary: "Archiwizuj zestaw", auth: "admin", params: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: ok("Zarchiwizowano"), 401: err, 409: err } },
  { method: "get", path: "/api/v1/admin/params/{id}/export", tag: "Administracja", summary: "Pobierz zestaw jako JSON", auth: "admin", params: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: ok("Plik w formacie data/params/*.json"), 401: err } },
  { method: "post", path: "/api/v1/admin/params/reset", tag: "Administracja", summary: "Przywróć parametry ustawowe z repozytorium", auth: "admin", body: jsonBody({ type: "object", required: ["confirm"], properties: { confirm: { const: "PRZYWRÓĆ" } } }), responses: { 200: ok("Przywrócono"), 401: err, 422: err } },
  { method: "get", path: "/api/v1/admin/audit", tag: "Administracja", summary: "Dziennik zmian", description: "Tylko do dopisywania, najnowsze na górze.", auth: "admin", params: [{ name: "action", in: "query", schema: { type: "string" } }, { name: "entityId", in: "query", schema: { type: "string" } }, { name: "limit", in: "query", schema: { type: "integer" } }], responses: { 200: ok("Wpisy dziennika"), 401: err } },

  { method: "get", path: "/api/v1/cases/report", tag: "Przykładowe sprawy ZUS", summary: "Tablica zgodności dla wszystkich spraw", responses: { 200: ok("Zgodność rozstrzygnięć, okresów i kwot") } },
];

export function openApiDocument(): Json {
  const paths: Record<string, Record<string, Json>> = {};
  for (const op of ops) {
    paths[op.path] ??= {};
    paths[op.path][op.method] = {
      tags: [op.tag],
      summary: op.summary,
      ...(op.description ? { description: op.description } : {}),
      ...(op.auth ? { security: op.auth === "admin" ? adminSession : session } : {}),
      ...(op.params ? { parameters: op.params } : {}),
      ...(op.body ? { requestBody: op.body } : {}),
      responses: op.responses,
    };
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "Przewodnik Rodzica — REST API",
      version: pkg.version,
      description:
        "API, z którego korzysta interfejs Przewodnika Rodzica. Logowanie mObywatelem i rejestry państwowe są symulowane. Kwoty w groszach (liczby całkowite), stawki w punktach bazowych (10000 = 100%), daty jako RRRR-MM-DD.",
    },
    servers: [{ url: "/" }],
    tags: [...new Set(ops.map((o) => o.tag))].map((name) => ({ name })),
    paths,
    components: {
      securitySchemes: { session: { type: "apiKey", in: "cookie", name: "pr_session", description: "Szyfrowana sesja (iron-session) ustawiana po symulowanym logowaniu." },
        admin: { type: "apiKey", in: "cookie", name: "pr_admin", description: "Osobna sesja administratora (2 h), ustawiana po POST /api/v1/admin/login." },
      },
      schemas: {
        Error: { type: "object", required: ["error"], properties: { error: { type: "object", required: ["code", "message"], properties: { code: { type: "string" }, message: { type: "string" }, fields: { type: "object", additionalProperties: { type: "string" } } } } } },
        Plan: z.toJSONSchema(planSchema, { target: "openapi-3.0" }) as Json,
      },
    },
  };
}
