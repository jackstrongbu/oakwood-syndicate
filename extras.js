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
  .up-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}
  @media (max-width:760px){.up-grid{grid-template-columns:1fr}}
  .up-form{display:flex;flex-direction:column;gap:10px}
  .up-form label{font-size:.8rem;color:var(--muted)}
  .up-form select,.up-form input[type=text]{font:inherit;color:var(--ink);background:var(--paper);border:1px solid var(--rule);border-radius:6px;padding:8px;width:100%;box-sizing:border-box}
  .up-drop{border:1.5px dashed var(--rule);border-radius:8px;padding:18px;text-align:center;color:var(--muted);background:var(--soft);cursor:pointer}
  .up-drop.over{border-color:var(--accent);color:var(--accent)}
  .up-thumbs{display:flex;flex-wrap:wrap;gap:6px}
  .up-thumbs img{height:72px;border-radius:4px;border:1px solid var(--rule)}
  .up-btn{font:inherit;font-weight:600;cursor:pointer;border-radius:6px;padding:10px 16px;border:1px solid var(--accent);background:var(--accent);color:var(--accent-ink);align-self:flex-start}
  .up-btn[disabled]{opacity:.5;cursor:default}
  .up-status{font-size:.85rem;min-height:1.2em;color:var(--muted)}
  .up-status.ok{color:var(--up)}.up-status.err{color:var(--down)}
  .rcv{display:flex;flex-wrap:wrap;gap:6px}
  .rcv span{font-family:var(--display);font-weight:700;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;border:1px solid var(--rule);color:var(--muted)}
  .rcv span.y{background:var(--best);color:var(--best-ink);border-color:transparent}
  `;
  document.head.insertAdjacentHTML("beforeend", `<style>${css}</style>`);

  /* ---------- markup ---------- */
  const wrap = document.querySelector(".wrap");
  const header = wrap && wrap.querySelector("header");
  if (!wrap || !header) return;
  header.querySelector(".hdr-r")?.insertAdjacentHTML("afterbegin",
    `<nav class="xnav" aria-label="Sections"><a href="#live" id="nav-live"><span class="dot"></span>Live scores</a><a href="#send">Send screenshots</a></nav>`);
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
  <section class="panel" id="send" aria-labelledby="up-title">
    <h2 id="up-title">Send screenshots</h2>
    <p class="how">Got the WhatsApp picks or the Sky Bet slip? Drop the screenshots here and they go straight to Jack's inbox to be added to the tracker. They're private, nobody else sees them.</p>
    <div class="up-grid">
      <form class="up-form" id="up-form">
        <div><label for="up-who">Who's sending?</label>
          <select id="up-who"><option value="">Choose your name</option>${players.map(p => `<option value="${esc(p)}">${esc(full(p))}</option>`).join("")}<option value="Other">Someone else</option></select></div>
        <div class="up-drop" id="up-drop" tabindex="0" role="button">Tap to choose screenshots, or drop them here</div>
        <input type="file" id="up-file" accept="image/*" multiple hidden>
        <div class="up-thumbs" id="up-thumbs"></div>
        <div><label for="up-note">Note (optional)</label><input type="text" id="up-note" maxlength="280" placeholder="e.g. week 10 slip, or my pick changed"></div>
        <div id="up-code-row" hidden><label for="up-code">Syndicate code</label><input type="text" id="up-code" autocomplete="off"></div>
        <button class="up-btn" id="up-send" type="submit" disabled>Send</button>
        <div class="up-status" id="up-status" role="status"></div>
      </form>
      <div class="card" style="background:var(--soft);border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:10px">
        <h3 style="margin:0;font-family:var(--display);text-transform:uppercase;letter-spacing:.04em">Received this week</h3>
        <div class="rcv" id="rcv">${players.map(p => `<span data-p="${esc(p)}" title="${esc(full(p))}">${esc(p)}</span>`).join("")}</div>
        <p class="how" id="rcv-note">Green means something's arrived from them in the last 7 days.</p>
      </div>
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
  const weeks = [...(D.weeks || [])].sort((a, b) => (a.n || 0) - (b.n || 0));
  const wk = weeks[weeks.length - 1];
  const parseDate = s => { const d = s ? new Date(s + " 12:00") : null; return d && !isNaN(d) ? d : null; };
  const wkDate = wk && parseDate(wk.date);
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const stamp = d => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const wkCurrent = wkDate && (today - wkDate) / 864e5 <= 3;
  // Picks week: the Friday before to the Tuesday after the slip date. Otherwise just today's games.
  const from = stamp(wkCurrent ? addDays(wkDate, -1) : today);
  const to = stamp(wkCurrent ? addDays(wkDate, 3) : today);
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
    $("lv-meta").textContent = `Week ${wk.n}${wk.date ? " · " + wk.date : ""}${wkCurrent ? "" : " · new picks not in yet, showing the last week"}${upd ? " · updated " + upd : ""}`;
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

  async function load() {
    clearTimeout(timer);
    let next = 60;
    try {
      const r = await fetch(`/api/scores?from=${from}&to=${to}`);
      if (!r.ok) throw new Error(r.status);
      feed = await r.json(); failCount = 0;
      next = Math.max(30, Math.min(feed.refresh || 60, 600));
      render();
    } catch (e) {
      failCount++;
      next = Math.min(60 * 2 ** failCount, 900);
      if (!feed) { $("lv-meta").textContent = "Live scores aren't available right now"; $("lv-foot").textContent = ""; render(); }
    }
    if (!document.hidden) timer = setTimeout(load, next * 1000);
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) load(); else clearTimeout(timer); });
  const setView = v => { view = v; $("lv-ours").setAttribute("aria-pressed", v === "ours"); $("lv-every").setAttribute("aria-pressed", v === "every"); render(); };
  $("lv-ours").addEventListener("click", () => setView("ours"));
  $("lv-every").addEventListener("click", () => setView("every"));
  render(); load();

  /* ---------- uploads ---------- */
  let shots = [];
  const status = (t, c) => { const s = $("up-status"); s.textContent = t; s.className = "up-status" + (c ? " " + c : ""); };
  const ready = () => { $("up-send").disabled = !shots.length || !$("up-who").value; };
  try { const w = localStorage.getItem("oak-who"); if (w) $("up-who").value = w; } catch { }
  $("up-who").addEventListener("change", () => { try { localStorage.setItem("oak-who", $("up-who").value); } catch { } ready(); });
  function addFiles(list) {
    [...list].filter(f => /^image\//.test(f.type)).slice(0, 8 - shots.length).forEach(f => shots.push(f));
    $("up-thumbs").innerHTML = shots.map(f => `<img alt="" src="${URL.createObjectURL(f)}">`).join("");
    status(shots.length ? `${shots.length} screenshot${shots.length > 1 ? "s" : ""} ready` : "");
    ready();
  }
  const drop = $("up-drop");
  drop.addEventListener("click", () => $("up-file").click());
  drop.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("up-file").click(); } });
  $("up-file").addEventListener("change", e => addFiles(e.target.files));
  drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", e => { e.preventDefault(); drop.classList.remove("over"); addFiles(e.dataTransfer.files); });
  document.addEventListener("paste", e => { if (e.clipboardData && e.clipboardData.files.length) addFiles(e.clipboardData.files); });

  async function shrink(file) {
    const bmp = await createImageBitmap(file).catch(() => null);
    if (!bmp) return new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
    const max = 1800, k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  }
  $("up-form").addEventListener("submit", async e => {
    e.preventDefault();
    if (!shots.length || !$("up-who").value) return;
    $("up-send").disabled = true;
    let sent = 0;
    for (const f of shots) {
      status(`Sending ${sent + 1} of ${shots.length}…`);
      try {
        const r = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ who: $("up-who").value, note: $("up-note").value, code: $("up-code").value, image: await shrink(f) }) });
        const j = await r.json().catch(() => ({}));
        if (r.status === 403) { $("up-code-row").hidden = false; status(j.error || "Enter the syndicate code", "err"); ready(); return; }
        if (!r.ok) throw new Error(j.error || "Upload failed");
        sent++;
      } catch (err) { status(`${err.message}. ${sent} of ${shots.length} sent.`, "err"); ready(); return; }
    }
    shots = []; $("up-thumbs").innerHTML = ""; $("up-note").value = ""; $("up-file").value = "";
    status(`Sent ${sent} screenshot${sent > 1 ? "s" : ""}. Cheers!`, "ok");
    loadReceived();
  });
  async function loadReceived() {
    try {
      const r = await fetch("/api/upload"); if (!r.ok) return;
      const { recent } = await r.json(); const who = new Set(recent.map(x => x.who));
      document.querySelectorAll("#rcv span").forEach(s => s.classList.toggle("y", who.has(s.dataset.p)));
    } catch { }
  }
  loadReceived();
})();
