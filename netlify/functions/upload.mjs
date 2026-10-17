// Screenshot inbox: anyone with the site link can send in picks / bet slip screenshots.
// POST /api/upload  {who, note, image: "data:image/jpeg;base64,..."}  -> stores it privately in Netlify Blobs
// GET  /api/upload  -> public summary only (who has sent something in the last 7 days), never the images.
import { getStore } from "@netlify/blobs";

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const clean = (s, n) => String(s ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, n);

export default async (req) => {
  const store = getStore("inbox");

  if (req.method === "GET") {
    const since = Date.now() - 7 * 864e5;
    const { blobs } = await store.list();
    const recent = [];
    for (const b of blobs.slice(-200)) {
      const ts = Number(b.key.split("-")[0]);
      if (ts < since) continue;
      const m = (await store.getMetadata(b.key))?.metadata || {};
      recent.push({ who: m.who || "?", at: m.at || new Date(ts).toISOString() });
    }
    return Response.json({ recent }, { headers: { "Cache-Control": "no-store" } });
  }

  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }

  const code = process.env.UPLOAD_CODE;
  if (code && clean(body.code, 60).toLowerCase() !== code.toLowerCase())
    return Response.json({ error: "Wrong syndicate code" }, { status: 403 });

  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(body.image || "");
  if (!m) return Response.json({ error: "Please send a JPG, PNG or WebP image" }, { status: 400 });
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length > MAX_BYTES) return Response.json({ error: "Image too big (4 MB max)" }, { status: 413 });

  const { blobs } = await store.list();
  if (blobs.length >= 300) return Response.json({ error: "Inbox is full, tell Jack to clear it" }, { status: 507 });

  const now = Date.now();
  const key = `${now}-${Math.random().toString(36).slice(2, 8)}.${TYPES[m[1]]}`;
  const meta = { who: clean(body.who, 40) || "Someone", note: clean(body.note, 280), type: m[1], at: new Date(now).toISOString(), size: bytes.length };
  await store.set(key, bytes, { metadata: meta });
  return Response.json({ ok: true, key });
};

export const config = { path: "/api/upload" };
