// Weeks published straight from the site's "Add this week's games" panel.
// GET  /api/weeks        -> {weeks:[...]} every week published from the site
// POST /api/weeks        -> {week:{n,date,picks:{CJ:{team,match,odds}}}, by, code?, images?:[dataUrl]}
// Each publish keeps the previous version too, so nothing is lost if someone overwrites a week.
import { getStore } from "@netlify/blobs";

const PLAYERS = ["CJ", "CR", "JS", "MP", "OC", "PM", "TG", "TC", "WD"];
const clean = (s, n) => String(s ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, n);

export default async (req) => {
  const store = getStore("weeks");

  if (req.method === "GET") {
    const { blobs } = await store.list({ prefix: "w/" });
    const weeks = (await Promise.all(blobs.map(b => store.get(b.key, { type: "json" })))).filter(Boolean).sort((a, b) => a.n - b.n);
    return Response.json({ weeks }, { headers: { "Cache-Control": "no-store", "Netlify-CDN-Cache-Control": "public, s-maxage=15" } });
  }
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  const code = process.env.UPLOAD_CODE;
  if (code && clean(body.code, 60).toLowerCase() !== code.toLowerCase())
    return Response.json({ error: "Wrong syndicate code" }, { status: 403 });

  const w = body.week || {};
  const n = Number(w.n);
  if (!Number.isInteger(n) || n < 1 || n > 60) return Response.json({ error: "Week number looks wrong" }, { status: 400 });
  const picks = {};
  for (const [p, pk] of Object.entries(w.picks || {})) {
    if (!PLAYERS.includes(p) || !pk) continue;
    const team = clean(pk.team, 30).toUpperCase();
    const odds = Number(pk.odds);
    if (!team) continue;
    if (!(odds >= 1.01 && odds <= 1000)) return Response.json({ error: `Odds for ${p} look wrong` }, { status: 400 });
    picks[p] = { team, match: clean(pk.match, 60), odds: Math.round(odds * 100) / 100, result: null };
  }
  if (Object.keys(picks).length < 1) return Response.json({ error: "No picks to save" }, { status: 400 });

  const acca = w.acca && Number(w.acca.odds) > 1 ? {
    odds: Number(w.acca.odds), stake: Number(w.acca.stake) || Object.keys(picks).length,
    returns: Number(w.acca.returns) || Math.round(Number(w.acca.odds) * (Number(w.acca.stake) || Object.keys(picks).length) * 100) / 100,
  } : undefined;

  const now = new Date().toISOString();
  const by = clean(body.by, 40) || "Someone";
  const week = { n, date: clean(w.date, 20), treasurer: clean(w.treasurer, 30) || undefined, picks, ...(acca ? { acca } : {}), source: "site", by, at: now };

  const key = `w/${String(n).padStart(2, "0")}`;
  const prev = await store.get(key, { type: "json" });
  if (prev) await store.setJSON(`history/${key.slice(2)}-${Date.now()}`, prev);
  await store.setJSON(key, week);

  // Keep the screenshots privately alongside (visible in /inbox.html), never in the public repo.
  const shots = getStore("inbox");
  for (const s of (body.images || []).slice(0, 4)) {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(s || "");
    if (!m) continue;
    const bytes = Buffer.from(m[2], "base64");
    if (bytes.length > 4 * 1024 * 1024) continue;
    await shots.set(`${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${m[1].split("/")[1].replace("jpeg", "jpg")}`, bytes,
      { metadata: { who: by, note: `Week ${n} slip`, type: m[1], at: now, size: bytes.length } });
  }
  return Response.json({ ok: true, week });
};

export const config = { path: "/api/weeks" };
