import cors from "@fastify/cors";
import Fastify from "fastify";
import { z } from "zod";
import { getUserIdFromRequest } from "./lib/auth.js";
import { duplicateCountFromOwned } from "./lib/duplicates.js";
import { prisma } from "./lib/prisma.js";
import { sseBroadcast, sseSubscribe } from "./lib/sse-hub.js";

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? "0.0.0.0";

const patchBodySchema = z.object({
  ownedCount: z.number().int().min(0).max(999),
});

function parseOrigins(): string[] {
  const raw = process.env.FRONTEND_ORIGINS ?? "http://localhost:3000";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const app = Fastify({ logger: true });

app.get("/health", async () => ({ ok: true }));

app.get("/v1/stickers", async (_req, reply) => {
  const stickers = await prisma.sticker.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      isSpecial: true,
      stickerKind: true,
      nationCode: true,
      sortOrder: true,
    },
  });
  return reply.send({ stickers });
});

app.get("/v1/me/collection", async (request, reply) => {
  const userId = await getUserIdFromRequest(request, reply);
  if (!userId) return;

  const rows = await prisma.userSticker.findMany({
    where: { userId },
    include: {
      sticker: {
        select: {
          id: true,
          code: true,
          name: true,
          isSpecial: true,
          stickerKind: true,
          nationCode: true,
          sortOrder: true,
        },
      },
    },
    orderBy: { sticker: { sortOrder: "asc" } },
  });

  return reply.send({
    items: rows.map((r) => ({
      stickerId: r.stickerId,
      ownedCount: r.ownedCount,
      duplicateCount: r.duplicateCount,
      sticker: r.sticker,
    })),
  });
});

app.patch<{ Params: { stickerId: string }; Body: unknown }>(
  "/v1/me/collection/:stickerId",
  async (request, reply) => {
    const userId = await getUserIdFromRequest(request, reply);
    if (!userId) return;

    const parsed = patchBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", details: parsed.error.flatten() });
    }

    const { stickerId } = request.params;
    const { ownedCount } = parsed.data;
    const duplicateCount = duplicateCountFromOwned(ownedCount);

    const sticker = await prisma.sticker.findUnique({ where: { id: stickerId } });
    if (!sticker) {
      return reply.code(404).send({ error: "sticker_not_found" });
    }

    const row = await prisma.userSticker.upsert({
      where: { userId_stickerId: { userId, stickerId } },
      create: { userId, stickerId, ownedCount, duplicateCount },
      update: { ownedCount, duplicateCount },
      include: {
        sticker: {
          select: {
            id: true,
            code: true,
            name: true,
            isSpecial: true,
            stickerKind: true,
            nationCode: true,
            sortOrder: true,
          },
        },
      },
    });

    sseBroadcast(userId, { type: "collection_updated", stickerId, ownedCount, duplicateCount });

    return reply.send({
      item: {
        stickerId: row.stickerId,
        ownedCount: row.ownedCount,
        duplicateCount: row.duplicateCount,
        sticker: row.sticker,
      },
    });
  },
);

app.get("/v1/me/stream", async (request, reply) => {
  const userId = await getUserIdFromRequest(request, reply);
  if (!userId) return;

  const origin = request.headers.origin;
  const allowed = parseOrigins();
  const allowOrigin = origin && allowed.includes(origin) ? origin : allowed[0] ?? "*";

  reply.hijack();
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Credentials": "true",
    "X-Accel-Buffering": "no",
  });

  const write = (chunk: string) => {
    reply.raw.write(chunk);
  };

  const end = () => {
    try {
      reply.raw.end();
    } catch {
      /* ignore */
    }
  };

  const client = { userId, write, end };
  const unsubscribe = sseSubscribe(client);

  write(": connected\n\n");
  write(`data: ${JSON.stringify({ type: "hello", userId })}\n\n`);

  const keepAlive = setInterval(() => {
    write(`: ping ${Date.now()}\n\n`);
  }, 25000);

  request.raw.on("close", () => {
    clearInterval(keepAlive);
    unsubscribe();
    end();
  });
});

async function main() {
  await app.register(cors, {
    origin: (origin, cb) => {
      const allowed = parseOrigins();
    if (!origin) return cb(null, true);
    if (allowed.includes(origin)) return cb(null, true);
    return cb(null, false);
    },
    credentials: true,
  });

  try {
    await app.listen({ port: PORT, host: HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
