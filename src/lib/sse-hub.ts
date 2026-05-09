export type SseClient = {
  userId: string;
  write: (chunk: string) => void;
  end: () => void;
};

const clientsByUser = new Map<string, Set<SseClient>>();

function getSet(userId: string): Set<SseClient> {
  let set = clientsByUser.get(userId);
  if (!set) {
    set = new Set();
    clientsByUser.set(userId, set);
  }
  return set;
}

export function sseSubscribe(client: SseClient): () => void {
  const set = getSet(client.userId);
  set.add(client);
  return () => {
    set.delete(client);
    if (set.size === 0) clientsByUser.delete(client.userId);
  };
}

export function sseBroadcast(userId: string, payload: unknown): void {
  const set = clientsByUser.get(userId);
  if (!set?.size) return;
  const body = `data: ${JSON.stringify(payload)}\n\n`;
  for (const c of set) {
    try {
      c.write(body);
    } catch {
      c.end();
    }
  }
}
