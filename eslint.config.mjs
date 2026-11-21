import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const engineForbidden = [
  "next", "next/*", "react", "react-dom", "react/*", "node:*", "fs", "path", "better-sqlite3",
  "drizzle-orm", "drizzle-orm/*", "zod", "@/*",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      eqeqeq: ["error", "always", { null: "ignore" }],
    },
  },
  {
    // The rules engine is pure: no framework, I/O, clock or randomness. Only relative imports.
    files: ["src/engine/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: engineForbidden.map((group) => ({ group: [group], message: "src/engine must stay pure (relative imports only)." })) }],
      "no-restricted-syntax": [
        "error",
        { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: "No wall-clock access in the engine; pass dates in." },
        { selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']", message: "No wall-clock access in the engine." },
        { selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']", message: "The engine must be deterministic." },
      ],
      "no-restricted-globals": ["error", "process", "fetch", "window", "document"],
    },
  },
  {
    files: ["src/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: ["@/integrations/*", "@/server/*"], message: "The design system must not import integrations or server code." }] }],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", ".work/**", "docs/**", "playwright-report/**", "test-results/**", "coverage/**"]),
]);

export default eslintConfig;
