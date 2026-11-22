import type { Metadata } from "next";
import { openApiDocument } from "@/server/openapi";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";
import { TextLink } from "@/ui/components/TextLink/TextLink";
import { Icon } from "@/ui/icons/Icon";
import s from "./Docs.module.css";

export const metadata: Metadata = { title: "Dokumentacja API" };

interface OpDoc {
  tags: string[];
  summary: string;
  description?: string;
  security?: unknown[];
  parameters?: { name: string; in: string; required?: boolean; schema?: unknown }[];
  requestBody?: { content: { "application/json": { schema: unknown } } };
  responses: Record<string, { description: string }>;
}

/** Self-rendered docs (no third-party scripts — the CSP forbids them). */
export default function Page() {
  const doc = openApiDocument() as { info: { description: string; version: string }; tags: { name: string }[]; paths: Record<string, Record<string, OpDoc>> };
  const entries = Object.entries(doc.paths).flatMap(([path, ops]) => Object.entries(ops).map(([method, op]) => ({ path, method, op })));
  return (
    <>
      <PageHeader eyebrow={`REST API · wersja ${doc.info.version}`} title="Dokumentacja API" lead={doc.info.description} />
      <p>
        Specyfikacja OpenAPI 3.1: <TextLink href="/api/openapi.json">/api/openapi.json</TextLink>. Endpointy oznaczone kłódką wymagają sesji po symulowanym logowaniu.
      </p>
      {doc.tags.map((t) => (
        <section key={t.name} className={s.section} aria-labelledby={`tag-${t.name}`}>
          <h2 id={`tag-${t.name}`}>{t.name}</h2>
          <ul className={s.ops}>
            {entries
              .filter((e) => e.op.tags.includes(t.name))
              .map(({ path, method, op }) => (
                <li key={method + path} className={s.op}>
                  <details>
                    <summary className={s.summary}>
                      <span className={s.method} data-method={method}>
                        {method.toUpperCase()}
                      </span>
                      <code className={s.path}>{path}</code>
                      <span className={s.opTitle}>
                        {op.summary}
                        {op.security ? <Icon name="lock" size={16} label="wymaga sesji" style={{ display: "inline", verticalAlign: "-2px", marginLeft: 6 }} /> : null}
                      </span>
                    </summary>
                    <div className={s.body}>
                      {op.description ? <p>{op.description}</p> : null}
                      {op.parameters?.length ? (
                        <>
                          <h3>Parametry</h3>
                          <ul>
                            {op.parameters.map((p) => (
                              <li key={p.name}>
                                <code>{p.name}</code> ({p.in}
                                {p.required ? ", wymagany" : ""})
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : null}
                      {op.requestBody ? (
                        <>
                          <h3>Treść żądania</h3>
                          <pre className={s.pre} tabIndex={0} aria-label="Schemat treści żądania">{JSON.stringify(op.requestBody.content["application/json"].schema, null, 2)}</pre>
                        </>
                      ) : null}
                      <h3>Odpowiedzi</h3>
                      <ul>
                        {Object.entries(op.responses).map(([code, r]) => (
                          <li key={code}>
                            <code>{code}</code> — {r.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </details>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </>
  );
}
