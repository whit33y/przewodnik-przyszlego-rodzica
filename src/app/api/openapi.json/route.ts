import { openApiDocument } from "@/server/openapi";

/** OpenAPI 3.1 document (static — prerendered at build). */
export async function GET() {
  return Response.json(openApiDocument());
}
