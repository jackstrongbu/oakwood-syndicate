/* Oakwood Syndicate public-site extras: live scores + screenshot upload.
   Lives outside index.html so weekly rebuilds of the main page keep it: index.html only needs
   <script src="extras.js" defer></script> before </body>. Reads the page's DATA constant. */
(() => {
  const D = typeof DATA !== "undefined" ? DATA : null;
  if (!D) return;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const names = (D.meta && D.meta.names) || {};
  const players = (D.meta && D.meta.players) || Object.keys(names);
  const full = p => names[p] || p;

  /* ---------- styles ---------- */
  const css = `
  .xnav{display:flex;gap:8px;flex-wrap:wrap}
  .xnav a{font-family:var(--display);font-weight:700;letter-spacing:.05em;text-transform:uppercase;font-size:.85rem;text-decoration:none;color:var(--accent);border:1px solid var(--rule);background:var(--paper);border-radius:999px;padding:5px 12px}
  .xnav a .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--muted);margin-right:6px;vertical-align:1px}
  .xnav a.on .dot{background:var(--down)}
  .lv-top{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:end;gap:10px}
  .lv-h{display:flex;align-items:center;gap:8px}
  .pulse{width:10px;height:10px;border-radius:50%;background:var(--muted)}
  .pulse.on{background:var(--down)}
  @media (prefers-reduced-motion:no-preference){.pulse.on{animation:lvp 1.4s ease-in-out infinite}@keyframes lvp{50%{opacity:.25}}}
  .lv-sum{display:flex;flex-wrap:wrap;gap:6px}
  .lv-sum .chip b{font-variant-numeric:tabular-nums}
  .lv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:8px}
  .lv{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:10px 12px;border-radius:8px;border:1px solid var(--rule);background:var(--paper);min-width:0}
  .lv.ahead{background:var(--win);color:var(--win-ink);border-color:transparent}
  .lv.behind{background:var(--loss);color:var(--loss-ink);border-color:transparent}
  .lv.level{background:var(--pend);color:var(--pend-ink);border-color:transparent}
  .lv .bdg{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-family:var(--display);font-weight:800;background:rgba(0,0,0,.08)}
  .lv .mid{min-width:0}
  .lv .tm{font-size:.92rem;line-height:1.3;overflow-wrap:anywhere}
  .lv .tm b{font-family:var(--display);font-size:1.08rem;letter-spacing:.03em;text-transform:uppercase}
  .lv .mt{font-size:.75rem;opacity:.8;margin-top:2px}
  .lv .rt{text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:2px}
  .lv .sc{font-family:var(--mono);font-weight:600;font-size:1.25rem;font-variant-numeric:tabular-nums;white-space:nowrap}
  .lv .ck{font-family:var(--mono);font-size:.72rem;font-weight:600;padding:1px 6px;border-radius:999px;background:rgba(0,0,0,.08);white-space:nowrap}
  .lv .ck.in{background:var(--down);color:#fff}
  .lv .od{font-family:var(--mono);font-size:.7rem;opacity:.75}
  .lv-all{display:flex;flex-direction:column;gap:14px}
  .lg h3{margin:0 0 4px;font-family:var(--display);font-size:1rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
  .fxl{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
  .fxl td{padding:6px 4px;border-bottom:1px solid var(--rule);font-size:.88rem}
  .fxl td.t{width:42%}.fxl td.t.h{text-align:right}
  .fxl td.s{text-align:center;font-family:var(--mono);font-weight:600;white-space:nowrap;width:4.5rem}
  .fxl td.c{font-family:var(--mono);font-size:.72rem;color:var(--muted);white-space:nowrap;width:3.6rem}
  .fxl td.c.in{color:var(--down);font-weight:600}
  .fxl tr.ours td{background:var(--soft);font-weight:600}
  .seg2{display:inline-flex;border:1px solid var(--rule);border-radius:999px;overflow:hidden}
  .seg2 button{all:unset;cursor:pointer;font-family:var(--display);font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-size:.9rem;padding:5px 14px;color:var(--muted)}
  .seg2 button[aria-pressed="true"]{background:var(--accent);color:var(--accent-ink)}
  .seg2 button:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
  .lv-foot{color:var(--muted);font-size:.76rem;margin:0}
  .add-col{display:flex;flex-direction:column;gap:10px;min-width:0;max-width:640px}
  .add-col label{font-size:.78rem;color:var(--muted)}
  .add-col input{font:inherit;color:var(--ink);background:var(--paper);border:1px solid var(--rule);border-radius:6px;padding:7px 8px;min-width:0;box-sizing:border-box}
  .up-btn{font:inherit;font-weight:600;cursor:pointer;border-radius:8px;padding:10px 18px;border:1px solid var(--accent);background:var(--accent);color:var(--accent-ink);align-self:flex-start}
  .up-btn.big{font-family:var(--display);font-size:1.3rem;letter-spacing:.05em;text-transform:uppercase;padding:14px 22px;align-self:stretch}
  .up-btn[disabled]{opacity:.5;cursor:default}
  .lnk{all:unset;cursor:pointer;color:var(--accent);font-weight:600;font-size:.9rem;align-self:flex-start}
  .lnk:focus-visible,.up-btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .up-status{font-size:.88rem;min-height:1.2em;color:var(--muted)}
  .up-status.ok{color:var(--up);font-weight:600}.up-status.err{color:var(--down)}
  .wk-head{font-family:var(--display);font-size:1.25rem;letter-spacing:.03em}
  .wk-row{display:flex;gap:8px;flex-wrap:wrap}
  .wk-row>div{display:flex;flex-direction:column;gap:3px}
  .row2{display:flex;gap:16px;align-items:center;flex-wrap:wrap}
  .games{display:flex;flex-direction:column;gap:8px}
  .gm{border:1px solid var(--rule);border-radius:10px;padding:10px 10px;background:var(--paper);display:flex;flex-direction:column;gap:8px}
  .gm.done{border-color:color-mix(in srgb,var(--up) 55%,var(--rule))}
  .gm-top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
  .gm-t b{font-family:var(--display);font-size:1.2rem;letter-spacing:.03em}
  .gm-o{font-family:var(--mono);font-size:.9rem;font-weight:600}
  .gm-m{font-size:.8rem;color:var(--muted)}
  .gm-x{all:unset;cursor:pointer;color:var(--muted);font-size:1.3rem;line-height:1;padding:0 4px}
  .chips9{display:flex;flex-wrap:wrap;gap:3px}
  .chips9 button{all:unset;cursor:pointer;box-sizing:border-box;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-family:var(--display);font-weight:700;font-size:.9rem;border:1px solid var(--rule);color:var(--ink);background:var(--soft)}
  .chips9 button.used{opacity:.35}
  .chips9 button[aria-pressed="true"]{background:var(--best);color:var(--best-ink);border-color:transparent;opacity:1}
  .chips9 button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .gm details summary{cursor:pointer;font-size:.78rem;color:var(--muted)}
  .gm-fix{display:grid;grid-template-columns:minmax(0,1fr) 5.5rem;gap:6px;margin-top:6px}
  .gm-fix input{font:inherit;color:var(--ink);background:var(--paper);border:1px solid var(--rule);border-radius:6px;padding:6px 8px;min-width:0}
  .gm-fix .wide{grid-column:1/-1}
  #left b{font-family:var(--display);margin-right:2px}
  .tagsite{display:inline-block;font-size:.7rem;font-weight:600;padding:1px 7px;border-radius:999px;background:var(--pend);color:var(--pend-ink)}
  `;
  document.head.insertAdjacentHTML("beforeend", `<style>${css}</style>`);

  /* ---------- markup ---------- */
  const wrap = document.querySelector(".wrap");
  const header = wrap && wrap.querySelector("header");
  if (!wrap || !header) return;
  header.querySelector(".hdr-r")?.insertAdjacentHTML("afterbegin",
    `<nav class="xnav" aria-label="Sections"><a href="#live" id="nav-live"><span class="dot"></span>Live scores</a><a href="#add">Add this week</a></nav>`);
  header.insertAdjacentHTML("afterend", `
  <section class="panel" id="live" aria-labelledby="lv-title">
    <div class="lv-top">
      <div>
        <div class="lv-h"><span class="pulse" id="lv-pulse"></span><h2 id="lv-title">Live scores</h2></div>
        <div class="rs-meta" id="lv-meta">Loading…</div>
      </div>
      <div class="seg2" role="group" aria-label="Which games"><button id="lv-ours" aria-pressed="true">Our picks</button><button id="lv-every" aria-pressed="false">All games today</button></div>
    </div>
    <div class="lv-sum" id="lv-sum"></div>
    <div id="lv-body"></div>
    <p class="lv-foot" id="lv-foot"></p>
  </section>`);
  const lastPanel = [...wrap.querySelectorAll(":scope > section.panel")].pop();
  (lastPanel || wrap.lastElementChild).insertAdjacentHTML("afterend", `
  <section class="panel" id="add" aria-labelledby="add-title">
    <h2 id="add-title">Add this week's games</h2>
    <div id="step1" class="add-col">
      <p class="how">Upload the Sky Bet slip. The games and odds are read off it automatically, then you just tap who picked each one.</p>
      <button class="up-btn big" id="up-btn" type="button">Upload bet slip</button>
      <input type="file" id="up-file" accept="image/*" multiple hidden>
      <div class="up-status" id="read-status" role="status"></div>
      <p class="how" id="cur-note" hidden><span id="cur-text"></span><button class="lnk" id="edit-cur" type="button">edit it</button>.</p>
      <button class="lnk" id="manual" type="button" hidden>Type the games in instead</button>
    </div>
    <div id="step2" class="add-col" hidden>
      <div class="wk-head"><b id="wk-line"></b> <button class="lnk" id="wk-edit" type="button">change</button></div>
      <div class="wk-row" id="wk-fields" hidden>
        <div><label for="add-n">Week</label><input type="number" id="add-n" min="1" max="60" style="width:5rem"></div>
        <div><label for="add-date">Date</label><input type="text" id="add-date" style="width:8.5rem"></div>
        <div><label for="add-acca">Acca odds</label><input type="number" id="add-acca" step="0.01" min="1" style="width:7rem" placeholder="optional"></div>
      </div>
      <p class="how">Tap who picked each game.</p>
      <div id="games" class="games"></div>
      <div class="how" id="left"></div>
      <button class="lnk" id="add-game" type="button">+ Add a game that's missing</button>
      <div id="code-row" hidden><label for="add-code">Syndicate code</label><br><input type="text" id="add-code" autocomplete="off"></div>
      <div class="row2"><button class="up-btn" id="publish" type="button">Publish to the site</button><button class="lnk" id="restart" type="button">Start again</button></div>
      <div class="up-status" id="pub-status" role="status"></div>
    </div>
  </section>`);

  /* ---------- team name matching ---------- */
  const ALIAS = {
    "man utd": "manchester united", "man united": "manchester united", "man city": "manchester city",
    "spurs": "tottenham hotspur", "wolves": "wolverhampton wanderers", "boro": "middlesbrough",
    "nottm forest": "nottingham forest", "forest": "nottingham forest", "west brom": "west bromwich albion",
    "palace": "crystal palace", "villa": "aston villa", "qpr": "queens park rangers", "mk dons": "milton keynes dons",
    "saints": "southampton", "weds": "sheffield wednesday", "sheff wed": "sheffield wednesday", "sheff utd": "sheffield united",
    "hearts": "heart of midlothian", "hibs": "hibernian", "ict": "inverness caledonian thistle", "inverness ct": "inverness caledonian thistle",
    "accies": "hamilton academical", "pars": "dunfermline athletic", "gers": "rangers", "the dons": "aberdeen",
    "brighton": "brighton and hove albion", "wednesday": "sheffield wednesday", "posh": "peterborough united",
    "pompey": "portsmouth", "bristol c": "bristol city", "bristol r": "bristol rovers", "afc wimbledon": "wimbledon", "kiddy": "kidderminster harriers", "harriers": "kidderminster harriers", "the hoops": "queens park rangers", "gas": "bristol rovers", "dale": "rochdale",
  };
  const DROP = new Set(["fc", "afc", "cf", "sc", "the", "and", "&"]);
  function norm(s) {
    let t = String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/&/g, " and ").replace(/[.'’]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
    if (ALIAS[t]) t = ALIAS[t];
    t = t.replace(/\butd\b/g, "united").replace(/\bsheff\b/g, "sheffield").replace(/\bwed\b/g, "wednesday").replace(/\bnottm\b/g, "nottingham").replace(/\bbham\b/g, "birmingham");
    return t.split(" ").filter(w => w && !DROP.has(w));
  }
  function sim(a, b) {
    const A = norm(a), B = norm(b);
    if (!A.length || !B.length) return 0;
    const hit = A.filter(x => B.some(y => x === y || (x.length >= 4 && y.length >= 4 && (x.startsWith(y) || y.startsWith(x))))).length;
    return hit / Math.max(A.length, B.length);
  }
  const best2 = (n, f) => Math.max(sim(n, f.home), f.homeShort ? sim(n, f.homeShort) : 0);
  const best2a = (n, f) => Math.max(sim(n, f.away), f.awayShort ? sim(n, f.awayShort) : 0);
  function splitMatch(m) { const p = String(m || "").split(/\s+(?:v|vs|-|–)\s+/i); return p.length === 2 ? p : null; }
  function findFixture(pk, fixtures) {
    const mm = splitMatch(pk.match);
    let best = null, bs = 0;
    for (const f of fixtures) {
      let s;
      if (mm) {
        const a = best2(mm[0], f), b = best2a(mm[1], f), ar = best2(mm[1], f), br = best2a(mm[0], f);
        s = Math.max(a > .3 && b > .3 ? a + b : 0, ar > .3 && br > .3 ? ar + br - .1 : 0);
      } else if (pk.team) {
        s = Math.max(best2(pk.team, f), best2a(pk.team, f));
        s = s >= .5 ? s : 0;
      }
      if (s > bs) { bs = s; best = f; }
    }
    return best;
  }
  function sideOf(pk, f) {
    if (!pk.team) return null;
    const h = best2(pk.team, f), a = best2a(pk.team, f);
    if (/^draw$/i.test(pk.team)) return "draw";
    if (h === a) return null;
    return h > a ? "home" : "away";
  }

  /* ---------- live scores ---------- */
  let reloadLive = () => {};
  function initLive() {
  const parseDate = s => { const d = s ? new Date(s + " 12:00") : null; return d && !isNaN(d) ? d : null; };
  const stamp = d => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  let wk, wkDate, wkCurrent, from, to;
  function computeWeek() {
    const lvWeeks = [...(D.weeks || [])].sort((a, b) => (a.n || 0) - (b.n || 0));
    wk = lvWeeks[lvWeeks.length - 1];
    wkDate = wk && parseDate(wk.date);
    const today = new Date(); today.setHours(12, 0, 0, 0);
    wkCurrent = wkDate && (today - wkDate) / 864e5 <= 3;
    // Picks week: the day before to three days after the slip date. Otherwise just today's games.
    from = stamp(wkCurrent ? addDays(wkDate, -1) : today);
    to = stamp(wkCurrent ? addDays(wkDate, 3) : today);
  }
  computeWeek();
  let view = "ours", feed = null, timer = null, failCount = 0;

  const ko = iso => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
  const koDay = iso => new Date(iso).toLocaleDateString("en-GB", { weekday: "short", timeZone: "Europe/London" });
  const clockOf = f => f.state === "in" ? (f.clock || "LIVE") : f.state === "post" ? (/aet|pen/i.test(f.detail) ? f.detail.toUpperCase() : "FT") : f.state === "off" ? (f.detail || "OFF").replace(/^status_/i, "") : ko(f.kickoff);
  const scoreOf = f => f.hs == null ? "v" : `${f.hs}–${f.as}`;

  function render() {
    const fixtures = feed ? feed.fixtures : [];
    const anyLive = fixtures.some(f => f.state === "in");
    $("lv-pulse").classList.toggle("on", anyLive);
    $("nav-live").classList.toggle("on", anyLive);
    const upd = feed ? new Date(feed.fetched).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }) : null;

    if (view === "every") {
      $("lv-meta").textContent = `Every game in the feed today${upd ? " · updated " + upd : ""}`;
      $("lv-sum").innerHTML = "";
      const tday = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
      const todays = fixtures.filter(f => new Date(f.kickoff).toLocaleDateString("en-CA", { timeZone: "Europe/London" }) === tday);
      const ourIds = new Set(ourMatches(fixtures).map(x => x.f && x.f.id));
      const groups = {};
      todays.forEach(f => (groups[f.league] = groups[f.league] || []).push(f));
      const order = Object.keys(groups).sort((a, b) => (groups[b].some(f => f.state === "in") - groups[a].some(f => f.state === "in")) || a.localeCompare(b));
      $("lv-body").innerHTML = todays.length ? `<div class="lv-all">${order.map(l => `<div class="lg"><h3>${esc(l)}</h3><table class="fxl"><tbody>${groups[l].sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff)).map(f =>
        `<tr class="${ourIds.has(f.id) ? "ours" : ""}"><td class="c ${f.state === "in" ? "in" : ""}">${esc(clockOf(f))}</td><td class="t h">${esc(f.home)}</td><td class="s">${esc(scoreOf(f))}</td><td class="t">${esc(f.away)}</td></tr>`).join("")}</tbody></table></div>`).join("")}</div>`
        : `<p class="how">${feed ? "No games in the feed today." : "Fetching games…"}</p>`;
      return;
    }

    if (!wk) { $("lv-meta").textContent = "No picks yet"; $("lv-body").innerHTML = ""; return; }
    const rows = ourMatches(fixtures);
    const tally = { ahead: 0, level: 0, behind: 0 }; let dead = false, settled = 0;
    rows.forEach(r => { if (r.st) tally[r.st]++; if (r.f && r.f.state === "post") { settled++; if (r.st !== "ahead") dead = true; } if (r.pk.result === "L") dead = true; });
    $("lv-meta").textContent = `Week ${wk.n}${wk.date ? " · " + wk.date : ""}${wk.source === "site" && wk.by ? " · added by " + full(wk.by) : ""}${wkCurrent ? "" : " · new picks not in yet, showing the last week"}${upd ? " · updated " + upd : ""}`;
    const live = rows.filter(r => r.f && r.f.state === "in").length;
    $("lv-sum").innerHTML = feed ? `<span class="chip">Winning <b>${tally.ahead}</b></span><span class="chip">Drawing <b>${tally.level}</b></span><span class="chip">Losing <b>${tally.behind}</b></span><span class="chip">Live now <b>${live}</b></span><span class="chip">9-fold <b>${dead ? "Dead" : tally.ahead === rows.length && settled === rows.length ? "Landed!" : "Still alive"}</b></span>` : "";
    const ordered = rows.slice().sort((a, b) => rank(a) - rank(b) || (a.f ? new Date(a.f.kickoff) : 0) - (b.f ? new Date(b.f.kickoff) : 0));
    $("lv-body").innerHTML = `<div class="lv-grid">${ordered.map(({ p, pk, f, side, st }) => {
      const team = pk.team || full(p);
      if (!f) return `<div class="lv"><span class="bdg" title="${esc(full(p))}">${esc(p)}</span><div class="mid"><div class="tm"><b>${esc(team)}</b></div><div class="mt">${esc(pk.match || "")}${feed ? " · not in the live feed" : ""}</div></div><div class="rt"><span class="sc">${esc(pk.score || "")}</span>${pk.odds != null ? `<span class="od">@ ${(+pk.odds).toFixed(2)}</span>` : ""}</div></div>`;
      const H = side === "home" ? `<b>${esc(f.home)}</b>` : esc(f.home), A = side === "away" ? `<b>${esc(f.away)}</b>` : esc(f.away);
      return `<div class="lv ${st || ""}"><span class="bdg" title="${esc(full(p))}">${esc(p)}</span><div class="mid"><div class="tm">${H} <span style="opacity:.6">v</span> ${A}</div><div class="mt">${esc(full(p))} · ${esc(team)}${f.state === "pre" ? " · " + koDay(f.kickoff) : ""} · ${esc(f.league)}</div></div><div class="rt"><span class="sc">${esc(scoreOf(f))}</span><span class="ck ${f.state === "in" ? "in" : ""}">${esc(clockOf(f))}</span>${pk.odds != null ? `<span class="od">@ ${(+pk.odds).toFixed(2)}</span>` : ""}</div></div>`;
    }).join("")}</div>`;
    const missing = rows.filter(r => !r.f).length;
    $("lv-foot").textContent = (feed ? `Scores refresh automatically every ${Math.round((feed.refresh || 60) / 60) || 1} min while games are on.` : "") +
      (missing && feed ? ` ${missing} game${missing > 1 ? "s aren't" : " isn't"} covered by the free feed (usually National League or Scottish League One/Two).` : "") +
      " Final results on the table are confirmed by Jack after full time.";
  }
  const rank = r => !r.f ? 4 : r.f.state === "in" ? 0 : r.f.state === "pre" ? 1 : r.f.state === "post" ? 2 : 3;
  function ourMatches(fixtures) {
    if (!wk || !wk.picks) return [];
    return players.filter(p => wk.picks[p]).map(p => {
      const pk = wk.picks[p], f = fixtures.length ? findFixture(pk, fixtures) : null;
      const side = f ? sideOf(pk, f) : null;
      let st = null;
      if (f && f.hs != null && f.state !== "off") {
        const d = side === "home" ? f.hs - f.as : side === "away" ? f.as - f.hs : null;
        st = side === "draw" ? (f.hs === f.as ? "ahead" : "behind") : d == null ? null : d > 0 ? "ahead" : d < 0 ? "behind" : "level";
      }
      return { p, pk, f, side, st };
    });
  }

  const LEAGUES = ["eng.1", "eng.2", "eng.3", "eng.4", "eng.5", "eng.fa", "eng.league_cup", "eng.trophy", "sco.1", "sco.2", "sco.3", "sco.4", "sco.tennents", "sco.cis", "uefa.champions", "uefa.europa", "uefa.europa.conf", "esp.1", "ita.1", "ger.1", "fra.1"];
  async function direct() {
    const lists = await Promise.all(LEAGUES.map(async lg => {
      try {
        const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${lg}/scoreboard?dates=${from}-${to}&limit=400`);
        if (!r.ok) return [];
        const j = await r.json(), ln = j.leagues?.[0]?.name || lg;
        return (j.events || []).map(e => {
          const c = e.competitions?.[0] || {}, side = h => c.competitors?.find(x => x.homeAway === h) || {};
          const H = side("home"), A = side("away"), t = e.status?.type || {};
          const state = /postpon|cancel|abandon|suspend|delay/i.test(t.name || "") ? "off" : t.state === "in" ? "in" : t.state === "post" ? "post" : "pre";
          const n = v => v == null || v === "" ? null : Number(v);
          return { src: "espn", id: "e" + e.id, league: ln, kickoff: e.date, home: H.team?.displayName || "", away: A.team?.displayName || "",
            homeShort: H.team?.shortDisplayName || "", awayShort: A.team?.shortDisplayName || "",
            hs: state === "pre" ? null : n(H.score), as: state === "pre" ? null : n(A.score), state,
            clock: state === "in" ? (e.status?.displayClock || "") : "", detail: t.shortDetail || "" };
        });
      } catch { return []; }
    }));
    const fixtures = lists.flat();
    if (!fixtures.length) throw new Error("no fixtures");
    return { fetched: new Date().toISOString(), refresh: 60, fixtures };
  }
  async function load() {
    clearTimeout(timer);
    let next = 60;
    try {
      const r = await fetch(`/api/scores?from=${from}&to=${to}`);
      if (!r.ok) throw new Error(r.status);
      let j = await r.json();
      if (!Array.isArray(j.fixtures)) throw new Error("bad feed");
      // If the server couldn't reach the feed, fetch it straight from this browser instead.
      if (!j.fixtures.length && (j.errors || []).length) j = await direct().catch(() => j);
      feed = j; failCount = 0;
      $("live").hidden = false; $("nav-live").hidden = false;
      next = Math.max(30, Math.min(feed.refresh || 60, 600));
      render();
    } catch (e) {
      failCount++;
      next = Math.min(60 * 2 ** failCount, 900);
      // No feed at all: hide the live panel rather than show a broken one.
      if (!feed) { $("live").hidden = true; $("nav-live").hidden = true; }
    }
    if (!document.hidden) timer = setTimeout(load, next * 1000);
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) load(); else clearTimeout(timer); });
  const setView = v => { view = v; $("lv-ours").setAttribute("aria-pressed", v === "ours"); $("lv-every").setAttribute("aria-pressed", v === "every"); render(); };
  $("lv-ours").addEventListener("click", () => setView("ours"));
  $("lv-every").addEventListener("click", () => setView("every"));
  reloadLive = () => { computeWeek(); render(); load(); };
  render(); load();
  }

  /* ---------- add this week's games ---------- */
  let shots = [], games = [], fromSite = new Set();
  const st = (id, t, c) => { const s = $(id); s.textContent = t; s.className = "up-status" + (c ? " " + c : ""); };
  const allWeeks = () => [...(D.weeks || [])].sort((a, b) => a.n - b.n);
  const fmtDate = d => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const odds2 = o => o != null && o !== "" && !isNaN(o) ? Number(o).toFixed(2) : "?";

  function guessPlayer(team, taken) {
    // Backed the same team in the last few weeks? Probably theirs again.
    for (const w of allWeeks().slice(-4).reverse()) for (const p of players) {
      const pk = w.picks && w.picks[p];
      if (pk && pk.team && !taken.has(p) && sim(pk.team, team) >= .99) return p;
    }
    return "";
  }
  function nextWeekN() {
    const ws = allWeeks(), last = ws[ws.length - 1];
    if (!last) return 1;
    const open = fromSite.has(last.n) && Object.values(last.picks || {}).every(pk => pk.result == null);
    return open ? last.n : last.n + 1;
  }
  function setWeekLine(n, date) {
    $("add-n").value = n; $("add-date").value = date;
    $("wk-line").textContent = `Week ${n} · ${date}`;
  }
  function renderGames() {
    const taken = {}; games.forEach(g => { if (g.player) taken[g.player] = (taken[g.player] || 0) + 1; });
    $("games").innerHTML = games.map((g, i) => `<div class="gm${g.player ? " done" : ""}" data-i="${i}">
      <div class="gm-top"><div class="gm-t"><b>${esc(g.team || "Unknown team")}</b> <span class="gm-o">@ ${odds2(g.odds)}</span><div class="gm-m">${esc(g.match || "")}${g.kickoff ? " · " + esc(g.kickoff) : ""}</div></div><button class="gm-x" type="button" data-act="del" aria-label="Remove this game">×</button></div>
      <div class="chips9" role="group" aria-label="Who picked ${esc(g.team || "this game")}?">${players.map(p => `<button type="button" data-act="pick" data-p="${esc(p)}" title="${esc(full(p))}" aria-pressed="${g.player === p}" class="${g.player !== p && taken[p] ? "used" : ""}">${esc(p)}</button>`).join("")}</div>
      <details${g.open ? " open" : ""}><summary>Fix this game</summary><div class="gm-fix">
        <input data-f="team" aria-label="Team" placeholder="Team" value="${esc(g.team || "")}">
        <input data-f="odds" aria-label="Odds" type="number" step="0.01" min="1.01" placeholder="Odds" value="${g.odds != null ? esc(g.odds) : ""}">
        <input data-f="match" aria-label="Match" placeholder="Home v Away" value="${esc(g.match || "")}" class="wide">
      </div></details></div>`).join("");
    const left = players.filter(p => !taken[p]);
    $("left").innerHTML = left.length ? `Still to pick: ${left.map(p => `<b title="${esc(full(p))}">${esc(p)}</b>`).join(" ")}` : `Everyone's matched up.`;
  }
  $("games").addEventListener("click", e => {
    const b = e.target.closest("button[data-act]"); if (!b) return;
    const i = +b.closest(".gm").dataset.i;
    if (b.dataset.act === "del") { if (confirm("Remove this game?")) { games.splice(i, 1); renderGames(); } return; }
    const p = b.dataset.p;
    games.forEach((g, j) => { if (j !== i && g.player === p) g.player = ""; }); // one game each
    games[i].player = games[i].player === p ? "" : p;
    renderGames();
  });
  $("games").addEventListener("change", e => {
    const f = e.target.dataset.f; if (!f) return;
    const g = games[+e.target.closest(".gm").dataset.i];
    g[f] = f === "odds" ? (e.target.value === "" ? null : Number(e.target.value)) : f === "team" ? e.target.value.toUpperCase() : e.target.value;
    g.open = true; renderGames();
  });
  $("games").addEventListener("toggle", e => { const gm = e.target.closest && e.target.closest(".gm"); if (gm) games[+gm.dataset.i].open = e.target.open; }, true);
  $("add-game").addEventListener("click", () => { games.push({ team: "", match: "", odds: null, player: "", open: true }); renderGames(); });
  $("wk-edit").addEventListener("click", () => { $("wk-fields").hidden = !$("wk-fields").hidden; });
  ["add-n", "add-date"].forEach(id => $(id).addEventListener("change", () => setWeekLine($("add-n").value, $("add-date").value)));

  function showGames(list, acca, date) {
    games = list;
    $("add-acca").value = acca || "";
    setWeekLine(nextWeekN(), date || fmtDate(new Date()));
    $("step1").hidden = true; $("step2").hidden = false;
    renderGames();
  }
  async function shrink(file) {
    const bmp = await createImageBitmap(file).catch(() => null);
    if (!bmp) return new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
    const k = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  }
  async function readSlip(list) {
    const files = [...list].filter(f => /^image\//.test(f.type)).slice(0, 4);
    if (!files.length) return;
    $("up-btn").disabled = true;
    st("read-status", "Reading the slip… this takes about 10 seconds");
    shots = await Promise.all(files.map(shrink));
    try {
      const lastWeek = {}; const lw = allWeeks().slice(-1)[0];
      if (lw && lw.picks) players.forEach(p => { if (lw.picks[p]) lastWeek[p] = lw.picks[p].team; });
      const r = await fetch("/api/read-slip", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: shots, players: Object.fromEntries(players.map(p => [p, full(p)])), lastWeek }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.message || "Couldn't read the slip.");
      const sels = j.selections || [];
      if (!sels.length) throw new Error("No games found on that screenshot.");
      const taken = new Set(sels.map(x => x.player).filter(p => players.includes(p)));
      const list2 = sels.map(x => {
        let p = players.includes(x.player) ? x.player : guessPlayer(x.team || "", taken);
        if (p) taken.add(p);
        return { team: (x.team || "").toUpperCase(), match: x.match || "", odds: x.odds != null ? Number(x.odds) : null, kickoff: x.kickoff || "", player: p, open: x.odds == null || !x.team };
      });
      st("read-status", "");
      showGames(list2, j.acca && j.acca.odds, j.date);
    } catch (e) {
      st("read-status", `${e.message} You can type the games in instead.`, "err");
      $("manual").hidden = false;
    }
    $("up-btn").disabled = false;
  }
  $("up-btn").addEventListener("click", () => $("up-file").click());
  $("up-file").addEventListener("change", e => { readSlip(e.target.files); e.target.value = ""; });
  const sec = $("add");
  sec.addEventListener("dragover", e => { e.preventDefault(); });
  sec.addEventListener("drop", e => { e.preventDefault(); if ($("step2").hidden) readSlip(e.dataTransfer.files); });
  document.addEventListener("paste", e => { if (e.clipboardData && e.clipboardData.files.length && !e.target.closest("input") && $("step2").hidden) readSlip(e.clipboardData.files); });
  $("manual").addEventListener("click", () => showGames(players.map(() => ({ team: "", match: "", odds: null, player: "", open: true }))));
  $("restart").addEventListener("click", () => { games = []; shots = []; $("step2").hidden = true; $("step1").hidden = false; st("pub-status", ""); st("read-status", ""); });
  $("edit-cur").addEventListener("click", () => {
    const w = allWeeks().find(x => x.n === nextWeekN()); if (!w) return;
    showGames(players.filter(p => w.picks[p]).map(p => ({ ...w.picks[p], player: p })), w.acca && w.acca.odds, w.date);
  });

  $("publish").addEventListener("click", async () => {
    const n = Number($("add-n").value);
    if (!Number.isInteger(n) || n < 1) return st("pub-status", "Week number looks wrong", "err");
    const existing = allWeeks().find(w => w.n === n);
    if (existing && !fromSite.has(n)) return st("pub-status", `Week ${n} is already on the table. Change it to week ${allWeeks().slice(-1)[0].n + 1}.`, "err");
    const unpicked = games.filter(g => !g.player);
    if (unpicked.length) return st("pub-status", `Pick who chose ${unpicked.map(g => g.team || "each game").join(", ")}`, "err");
    const bad = games.find(g => !g.team || !(Number(g.odds) >= 1.01));
    if (bad) { bad.open = true; renderGames(); return st("pub-status", `Check the team and odds for ${bad.team || "the game marked open"}`, "err"); }
    const picks = {}; games.forEach(g => { picks[g.player] = { team: g.team.toUpperCase(), match: g.match, odds: Number(g.odds) }; });
    if (games.length < players.length && !confirm(`Only ${games.length} of ${players.length} picks. Publish anyway?`)) return;
    const acca = Number($("add-acca").value) > 1 ? { odds: Number($("add-acca").value), stake: games.length } : undefined;
    const week = { n, date: $("add-date").value.trim(), treasurer: D.meta && D.meta.treasurer, picks, ...(acca ? { acca } : {}) };
    $("publish").disabled = true; st("pub-status", "Publishing…");
    try {
      const r = await fetch("/api/weeks", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week, by: "Website", code: $("add-code").value, images: shots }) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 403) { $("code-row").hidden = false; throw new Error(j.error || "Enter the syndicate code"); }
      if (!r.ok) throw new Error(j.error || "Couldn't publish");
      mergeWeek(j.week);
      games = []; shots = [];
      $("step2").hidden = true; $("step1").hidden = false; updateStep1();
      st("read-status", `Week ${n} is live on the site.`, "ok");
      ($("live").hidden ? $("grid") : $("live")).scrollIntoView({ behavior: "smooth" });
    } catch (e) { st("pub-status", e.message, "err"); }
    $("publish").disabled = false;
  });
  function updateStep1() {
    const n = nextWeekN(), cur = fromSite.has(n) && allWeeks().find(x => x.n === n);
    $("cur-note").hidden = !cur;
    if (cur) $("cur-text").textContent = `Week ${n} is already up. Upload a new slip to replace it, or `;
  }

  function mergeWeek(w) {
    const arr = D.weeks;
    const i = arr.findIndex(x => x.n === w.n);
    if (i >= 0) { if (!fromSite.has(w.n)) return; arr[i] = w; } else arr.push(w);
    fromSite.add(w.n);
    try { if (typeof window.render === "function") window.render(); } catch { }
    reloadLive();
  }

  /* ---------- start ---------- */
  (async () => {
    try {
      const r = await fetch("/api/weeks");
      if (r.ok) {
        const { weeks: siteWeeks } = await r.json();
        for (const w of siteWeeks || []) {
          if (D.weeks.some(x => x.n === w.n)) continue; // the tracker's copy wins once Jack has entered results
          D.weeks.push(w); fromSite.add(w.n);
        }
        if (fromSite.size) try { window.render(); } catch { }
      }
    } catch { }
    updateStep1();
    initLive();
  })();
})();
