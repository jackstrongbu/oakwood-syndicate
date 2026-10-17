// Live scores for the syndicate's picks.
// GET /api/scores?from=YYYYMMDD&to=YYYYMMDD
// Free source: ESPN's public scoreboard feed (Premier League to League Two, Scottish Prem and Championship, cups, big European leagues).
// Optional: set API_FOOTBALL_KEY in Netlify to also pull API-Football (covers National League, Scottish League One/Two etc.).
// Responses are cached on Netlify's CDN, so the feeds are hit at most once per refresh window however many people are watching.

const ESPN_LEAGUES = [
  "eng.1", "eng.2", "eng.3", "eng.4", "eng.5", "eng.fa", "eng.league_cup", "eng.trophy",
  "sco.1", "sco.2", "sco.3", "sco.4", "sco.tennents", "sco.cis", "sco.challenge",
  "uefa.champions", "uefa.europa", "uefa.europa.conf",
  "esp.1", "ita.1", "ger.1", "fra.1", "ned.1", "por.1", "wal.1", "irl.1",
];

const ymd = s => /^\d{8}$/.test(s || "") ? s : null;
const iso = s => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  "Accept": "application/json,text/plain,*/*", "Accept-Language": "en-GB,en;q=0.9",
  "Referer": "https://www.espn.co.uk/", "Origin": "https://www.espn.co.uk",
};
const diag = [];
async function espnLeague(league, from, to) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${from}-${to}&limit=400`;
  try {
    const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
    if (!r.ok) { diag.push(`${league}:${r.status}`); return []; }
    const j = await r.json();
    const lname = j.leagues?.[0]?.name || league;
    return (j.events || []).map(e => {
      const c = e.competitions?.[0] || {};
      const side = h => c.competitors?.find(x => x.homeAway === h) || {};
      const H = side("home"), A = side("away"), st = e.status?.type || {};
      const state = st.state === "in" ? "in" : st.state === "post" ? "post" : "pre";
      const off = /postpon|cancel|abandon|suspend|delay/i.test(st.name || "") ;
      return {
        src: "espn", id: "e" + e.id, league: lname, kickoff: e.date,
        home: H.team?.displayName || "", away: A.team?.displayName || "",
        homeShort: H.team?.shortDisplayName || "", awayShort: A.team?.shortDisplayName || "",
        hs: state === "pre" ? null : num(H.score), as: state === "pre" ? null : num(A.score),
        state: off ? "off" : state,
        clock: state === "in" ? (e.status?.displayClock || "") : "",
        detail: st.shortDetail || st.description || "",
      };
    });
  } catch (e) { diag.push(`${league}:${e.name}`); return []; }
}
const num = v => v == null || v === "" ? null : Number(v);

async function apiFootball(from, to, key) {
  const out = [];
  const d0 = new Date(iso(from) + "T12:00:00Z"), d1 = new Date(iso(to) + "T12:00:00Z");
  const days = [];
  for (let d = new Date(d0); d <= d1 && days.length < 5; d.setUTCDate(d.getUTCDate() + 1)) days.push(d.toISOString().slice(0, 10));
  // Only fetch today's fixtures: other days rarely change and the free plan allows ~100 calls a day.
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
  for (const day of days.filter(d => d === today)) {
    try {
      const r = await fetch(`https://v3.football.api-sports.io/fixtures?date=${day}&timezone=Europe/London`, {
        headers: { "x-apisports-key": key }, signal: AbortSignal.timeout(9000),
      });
      if (!r.ok) continue;
      const j = await r.json();
      for (const f of j.response || []) {
        const s = f.fixture?.status?.short || "";
        const state = ["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT"].includes(s) ? "in"
          : ["FT", "AET", "PEN", "AWD", "WO"].includes(s) ? "post"
          : ["PST", "CANC", "ABD", "SUSP"].includes(s) ? "off" : "pre";
        out.push({
          src: "af", id: "a" + f.fixture.id, league: `${f.league?.name || ""}${f.league?.country ? " (" + f.league.country + ")" : ""}`,
          kickoff: f.fixture.date, home: f.teams?.home?.name || "", away: f.teams?.away?.name || "",
          homeShort: "", awayShort: "", hs: f.goals?.home, as: f.goals?.away, state,
          clock: state === "in" ? (s === "HT" ? "HT" : (f.fixture.status.elapsed ?? "") + "'") : "",
          detail: f.fixture?.status?.long || s,
        });
      }
    } catch { /* ignore */ }
  }
  return out;
}

export default async (req) => {
  const u = new URL(req.url);
  const from = ymd(u.searchParams.get("from")), to = ymd(u.searchParams.get("to")) || from;
  if (!from) return Response.json({ error: "from=YYYYMMDD required" }, { status: 400 });

  diag.length = 0;
  const lists = await Promise.all(ESPN_LEAGUES.map(l => espnLeague(l, from, to)));
  let fixtures = lists.flat();
  const key = process.env.API_FOOTBALL_KEY;
  if (key) fixtures = fixtures.concat(await apiFootball(from, to, key));

  const live = fixtures.some(f => f.state === "in");
  const soon = fixtures.some(f => f.state === "pre" && Math.abs(new Date(f.kickoff) - Date.now()) < 20 * 60e3);
  const base = Number(process.env.REFRESH_SECONDS) || (key ? 300 : 60);
  const ttl = !fixtures.length && diag.length ? 30 : live || soon ? base : (key ? 1800 : 600);

  return Response.json(
    { fetched: new Date().toISOString(), refresh: ttl, sources: key ? ["espn", "api-football"] : ["espn"], errors: diag.slice(0, 30), fixtures },
    { headers: {
      "Cache-Control": "public, max-age=30",
      "Netlify-Vary": "query=from|to",
      "Netlify-CDN-Cache-Control": `public, durable, s-maxage=${ttl}, stale-while-revalidate=30`,
    } },
  );
};

export const config = { path: "/api/scores" };
