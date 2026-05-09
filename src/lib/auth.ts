import { verifyToken } from "@clerk/backend";
import type { FastifyReply, FastifyRequest } from "fastify";

const BEARER = /^Bearer\s+(.+)$/i;

export async function getUserIdFromRequest(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<string | null> {
  const header = request.headers.authorization;
  if (!header || typeof header !== "string") {
    reply.code(401).send({ error: "missing_authorization" });
    return null;
  }
  const m = header.match(BEARER);
  if (!m?.[1]) {
    reply.code(401).send({ error: "invalid_authorization" });
    return null;
  }
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    reply.code(500).send({ error: "server_misconfigured" });
    return null;
  }
  try {
    const { sub } = await verifyToken(m[1], { secretKey });
    if (!sub) {
      reply.code(401).send({ error: "invalid_token" });
      return null;
    }
    return sub;
  } catch {
    reply.code(401).send({ error: "invalid_token" });
    return null;
  }
}
