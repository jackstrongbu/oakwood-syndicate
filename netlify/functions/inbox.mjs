// Private inbox for Jack. Needs the inbox key (only its SHA-256 lives here; INBOX_KEY in Netlify also works).
// GET  /api/inbox?key=K            -> list of uploads with metadata
// GET  /api/inbox?key=K&id=ID      -> the image itself
// POST /api/inbox?key=K&id=ID&action=delete
import { getStore } from "@netlify/blobs";
import { createHash, timingSafeEqual } from "node:crypto";

const KEY_HASH = "cde410c0dd91e4ebf6cd2b22d4d14e7b40585dfb16741631902789edd107f862";
const sha = s => createHash("sha256").update(String(s)).digest();

function authorised(k) {
  if (!k) return false;
  if (process.env.INBOX_KEY && k === process.env.INBOX_KEY) return true;
  return timingSafeEqual(sha(k), Buffer.from(KEY_HASH, "hex"));
}

export default async (req) => {
  const u = new URL(req.url);
  if (!authorised(u.searchParams.get("key")))
    return Response.json({ error: "Wrong inbox key" }, { status: 401 });
  const store = getStore("inbox");
  const id = u.searchParams.get("id");
  const priv = { "Cache-Control": "private, no-store" };

  if (id && !/^[\w.-]{1,80}$/.test(id)) return Response.json({ error: "Bad id" }, { status: 400 });

  if (req.method === "POST" && id && u.searchParams.get("action") === "delete") {
    await store.delete(id);
    return Response.json({ ok: true }, { headers: priv });
  }
  if (id) {
    const r = await store.getWithMetadata(id, { type: "arrayBuffer" });
    if (!r) return new Response("Not found", { status: 404 });
    return new Response(r.data, { headers: { ...priv, "Content-Type": r.metadata?.type || "image/jpeg",
      "Content-Disposition": `inline; filename="${id}"` } });
  }
  const { blobs } = await store.list();
  const items = [];
  for (const b of blobs) {
    const m = (await store.getMetadata(b.key))?.metadata || {};
    items.push({ id: b.key, ...m });
  }
  items.sort((a, b) => b.id.localeCompare(a.id));
  return Response.json({ items }, { headers: priv });
};

export const config = { path: "/api/inbox" };
