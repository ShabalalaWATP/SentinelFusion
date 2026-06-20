import type { FastifyRequest } from "fastify";

export function isAuthorised(
  request: FastifyRequest,
  expectedToken: string | undefined
): boolean {
  if (!expectedToken) {
    return true;
  }

  const bearer = request.headers.authorization;
  if (bearer === `Bearer ${expectedToken}`) {
    return true;
  }

  const header = request.headers["x-analysis-token"];
  if (typeof header === "string") {
    return header === expectedToken;
  }

  return Array.isArray(header) ? header.includes(expectedToken) : false;
}
