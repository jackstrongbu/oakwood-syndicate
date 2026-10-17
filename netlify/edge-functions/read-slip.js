// Reads a Sky Bet slip (and optionally WhatsApp picks) screenshot with Claude and returns the week's selections.
// POST /api/read-slip {images:["data:image/jpeg;base64,..."], players:{CJ:"Charlie Johnson",...}, lastWeek:{CJ:"WREXHAM",...}}
// Needs ANTHROPIC_API_KEY set in Netlify. Runs as an edge function because reading images can take longer than 10s.

const MODEL = "claude-sonnet-5-5";

function prompt(players, lastWeek) {
  const roster = Object.entries(players || {}).map(([k, v]) => `${k} = ${v}`).join("\n");
  return `These screenshots are for a 9-person football syndicate. One is a Sky Bet bet slip (usually an accumulator listing every selection). There may also be WhatsApp messages where each person says their pick.

Players (initials = name; WhatsApp may show first names or nicknames; JS / Jack Strong is the person whose messages are green on the right):
${roster}
${lastWeek ? `Last week's picks, for nickname hints: ${JSON.stringify(lastWeek)}` : ""}

Read every selection on the bet slip. Reply with ONLY a JSON object, no prose:
{"date":"17 Oct 2026" or null,
 "acca":{"odds":number|null,"stake":number|null,"returns":number|null} or null,
 "selections":[{"team":"SHORT UPPER-CASE TEAM NAME BACKED","match":"Home v Away","odds":decimal number,"kickoff":"Sat 15:00" or null,"player":"initials" or null}]}

Rules: odds must be decimal (convert fractional a/b to a/b+1, round to 2dp; "Evs" = 2.0). Team names short like WREXHAM, SAINTS, MAN CITY. match uses short club names ("Derby v Wrexham"). Set player only when a WhatsApp message makes it clear who picked that team. Include every selection on the slip even if unreadable parts are null. If the date isn't shown, use null.`;
}

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const key = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!key) return Response.json({ error: "no_key", message: "Automatic reading isn't switched on yet, fill the table in by hand." }, { status: 501 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "bad_request" }, { status: 400 }); }
  const imgs = (body.images || []).slice(0, 4).map(s => /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(s)).filter(Boolean);
  if (!imgs.length) return Response.json({ error: "no_images" }, { status: 400 });

  const content = [
    ...imgs.map(m => ({ type: "image", source: { type: "base64", media_type: m[1], data: m[2] } })),
    { type: "text", text: prompt(body.players, body.lastWeek) },
  ];
  let r;
  try {
    r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 2000, messages: [{ role: "user", content }] }),
      signal: AbortSignal.timeout(38000),
    });
  } catch {
    return Response.json({ error: "timeout", message: "Reading took too long, try again or fill it in by hand." }, { status: 504 });
  }
  if (!r.ok) return Response.json({ error: "api", message: `Couldn't read the screenshot (${r.status}).` }, { status: 502 });
  const j = await r.json();
  const text = (j.content || []).filter(c => c.type === "text").map(c => c.text).join("");
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  try {
    const out = JSON.parse(text.slice(s, e + 1));
    return Response.json(out);
  } catch {
    return Response.json({ error: "parse", message: "Couldn't make sense of that screenshot." }, { status: 422 });
  }
};

export const config = { path: "/api/read-slip" };
