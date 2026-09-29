// The motion check behind `snap.cjs --motion`. Three parts:
//   1. rhythm: every transition and animation the page declares (how many durations and easings);
//   2. hover: what each control on the first screen sets moving, with its timing;
//   3. hands (a sandbox copy or a local file only): a snake path and chaotic fast moves on whatever moves
//      under the hand (cards, lists, maps, canvases, custom sliders, splitters), traced every frame and checked
//      against the laws of solid objects. The same thresholds are written in the kk-motion skill.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const LAW = {
  followP95: 4,      // px: the held thing keeps its offset to the hand (95% of frames within this)
  teleport: 30,      // px: moved this much more than the hand in one frame
  snap: 16,          // px: a neighbour moved this much in one frame, still before and after
  resize: 20,        // px: a container changed size or place this much in one frame
  jitterMs: 150,     // ms: a direction reversal within this time is jitter
  overlap: 4,        // px: two things at rest overlapping this much on both axes
  landingPx: 100,    // px: after release, more travel than this…
  landingMs: 100,    // ms: …within this time reads as a jump, not a glide
  restMs: 1000,      // ms: everything is still this long after release
  routineMs: 300,    // ms: routine motion lands within this
};

// ---------- in the page ----------

function declaredMotion() {
  const all = []; const walk = r => { for (const el of r.querySelectorAll('*')) { all.push(el); if (el.shadowRoot) walk(el.shadowRoot); } }; walk(document);
  const ms = v => { v = v.trim(); return v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000; };
  const durations = {}, easings = {}, count = (m, k) => { m[k] = (m[k] || 0) + 1; };
  for (const el of all) {
    const cs = getComputedStyle(el);
    const tp = cs.transitionProperty.split(','), td = cs.transitionDuration.split(','), te = cs.transitionTimingFunction.split(/,(?![^(]*\))/);
    for (let i = 0; i < tp.length; i++) {
      const d = ms(td[i % td.length]); if (!d || tp[i].trim() === 'none') continue;
      count(durations, d); count(easings, te[i % te.length].trim());
    }
    if (cs.animationName && cs.animationName !== 'none') {
      const ad = cs.animationDuration.split(','), ae = cs.animationTimingFunction.split(/,(?![^(]*\))/);
      cs.animationName.split(',').forEach((n, i) => { const d = ms(ad[i % ad.length]); if (d) { count(durations, d); count(easings, ae[i % ae.length].trim()); } });
    }
  }
  return { durations, easings };
}

function startWatch() {
  const roots = () => { const all = [document]; const walk = r => { for (const el of r.querySelectorAll('*')) if (el.shadowRoot) { all.push(el.shadowRoot); walk(el.shadowRoot); } }; walk(document); return all; };
  const desc = el => { if (!el) return ''; const c = String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '').split(' ').filter(Boolean)[0]; return el.tagName.toLowerCase() + (c ? '.' + c : ''); };
  const seen = new WeakSet(); for (const r of roots()) for (const a of r.getAnimations()) seen.add(a);
  window.__watch = { on: true, out: [] };
  const tick = () => {
    for (const r of roots()) for (const a of r.getAnimations()) {
      if (seen.has(a)) continue; seen.add(a);
      let t = {}, kf = []; try { t = a.effect.getTiming(); kf = a.effect.getKeyframes(); } catch (e) {}
      const props = a.transitionProperty || [...new Set(kf.flatMap(k => Object.keys(k).filter(x => !['offset', 'easing', 'composite', 'computedOffset'].includes(x))))].join(',');
      const kfe = kf.find(k => k.easing && k.easing !== 'linear');
      window.__watch.out.push({ target: desc(a.effect && a.effect.target), props, duration: Math.round(Number(t.duration) || 0), delay: Math.round(t.delay || 0), easing: t.easing === 'linear' && kfe ? kfe.easing : t.easing });
    }
    if (window.__watch.on) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function stopWatch() { window.__watch.on = false; return window.__watch.out; }

function hoverTargets(limit) {
  const W = innerWidth, H = innerHeight, out = [], seen = new Set();
  const sel = 'a[href],button,[role=button],[role=tab],[role=menuitem],input,select,textarea,summary,[tabindex]:not([tabindex="-1"])';
  const cands = [...document.querySelectorAll(sel)].concat([...document.querySelectorAll('body *')].filter(e => getComputedStyle(e).cursor === 'pointer'));
  for (const el of cands) {
    if (out.length >= limit) break;
    const r = el.getBoundingClientRect(); if (r.width < 8 || r.height < 8 || r.width * r.height > W * H / 4 || r.bottom < 0 || r.top > H - 4 || r.right < 0 || r.left > W - 4) continue;
    const k = Math.round(r.x / 8) + ',' + Math.round(r.y / 8); if (seen.has(k)) continue; seen.add(k);
    const label = (el.getAttribute('aria-label') || el.innerText || el.value || el.title || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 30);
    out.push({ x: Math.round(r.x + r.width / 2), y: Math.round(r.y + Math.min(r.height / 2, 12)), label });
  }
  return out;
}

function findMovables(dragSel) {
  const W = innerWidth, H = innerHeight;
  const visible = r => r.width >= 8 && r.height >= 8 && r.bottom > 0 && r.top < H && r.right > 0 && r.left < W;
  const label = el => (el.getAttribute('aria-label') || el.innerText || el.getAttribute('class') || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 30);
  const pick = (el, kind) => { const r = el.getBoundingClientRect(); return visible(r) ? { kind, label: label(el), x: Math.round(r.x + Math.min(r.width / 2, 40)), y: Math.round(r.y + Math.min(r.height / 2, 12)), w: Math.round(r.width), h: Math.round(r.height) } : null; };
  if (dragSel) return [...document.querySelectorAll(dragSel)].map(e => pick(e, 'named')).filter(Boolean).slice(0, 3);
  const found = [], add = (el, kind) => { if (found.some(f => f.kind === kind)) return; const p = pick(el, kind); if (p) found.push(p); };
  for (const el of document.querySelectorAll('.leaflet-container,.mapboxgl-map,.maplibregl-map,.ol-viewport,[class*="map-container"]')) add(el, 'map');
  for (const el of document.querySelectorAll('[draggable="true"],[data-rbd-draggable-id],[data-rfd-draggable-id],[aria-roledescription="draggable"],[aria-roledescription="sortable"],.sortable-item,[data-sortable-id]')) add(el, 'drag');
  for (const el of document.querySelectorAll('body *')) {
    const c = getComputedStyle(el).cursor;
    if (/^(grab|grabbing|move|all-scroll)$/.test(c)) { const r = el.getBoundingClientRect(); add(el, r.width * r.height > 30000 ? 'pan' : 'drag'); }
    else if (/resize$/.test(c)) add(el, 'resize');
  }
  for (const el of document.querySelectorAll('canvas')) { const r = el.getBoundingClientRect(); if (r.width * r.height > 40000) add(el, 'canvas'); }
  return found.slice(0, 3);
}

function startTrace([x, y]) {
  const el = document.elementFromPoint(x, y); if (!el) return 0;
  const ids = new WeakMap(); let next = 0; const id = e => { if (!ids.has(e)) ids.set(e, next++); return ids.get(e); };
  const tracked = new Set([el]); const kinds = new Map([[el, 'held?']]);
  for (let e = el.parentElement, i = 0; e && e !== document.body && i < 4; e = e.parentElement, i++) { tracked.add(e); kinds.set(e, 'container'); for (const s of e.children) if (tracked.size < 300 && !tracked.has(s)) { tracked.add(s); kinds.set(s, 'neighbour'); } }
  window.__trace = { frames: [], kinds: {}, ptr: [x, y], on: true };
  const tag = e => { const k = kinds.get(e) || 'added'; window.__trace.kinds[id(e)] = k; };
  tracked.forEach(tag);
  window.__traceObs = new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && tracked.size < 400) { tracked.add(n); tag(n); } });
  window.__traceObs.observe(document.body, { childList: true, subtree: true });
  window.__tracePtr = e => { window.__trace.ptr = [e.clientX, e.clientY]; };
  addEventListener('pointermove', window.__tracePtr, true); addEventListener('mousemove', window.__tracePtr, true);
  const tick = t => {
    if (!window.__trace.on) return;
    const b = {}; for (const e of tracked) if (e.isConnected) { const r = e.getBoundingClientRect(); if (r.width || r.height) b[id(e)] = [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; }
    window.__trace.frames.push({ t: Math.round(t), p: window.__trace.ptr.slice(), b, phase: window.__trace.phase || 'drag' });
    if (window.__trace.frames.length < 6000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return tracked.size;
}

function stopTrace() {
  window.__trace.on = false; window.__traceObs.disconnect();
  removeEventListener('pointermove', window.__tracePtr, true); removeEventListener('mousemove', window.__tracePtr, true);
  return window.__trace;
}

const POINTER_DOT = () => {
  addEventListener('DOMContentLoaded', () => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;z-index:2147483647;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;background:#ff2d55;box-shadow:0 0 0 2px #fff;pointer-events:none;left:-20px;top:-20px';
    document.body.appendChild(d);
    const move = e => { d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; };
    addEventListener('mousemove', move, true); addEventListener('pointermove', move, true);
  });
};

// ---------- analysis ----------

const pct = (a, q) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * q))]; };

function analyse(trace) {
  const F = trace.frames, drag = F.filter(f => f.phase === 'drag'), after = F.filter(f => f.phase === 'after');
  const ids = Object.keys(trace.kinds);
  // The held thing: the element that moved the most while keeping the steadiest offset to the hand.
  let held = null, best = Infinity;
  for (const id of ids) {
    const fr = drag.filter(f => f.b[id]); if (fr.length < drag.length * 0.5) continue;
    let travel = 0; for (let i = 1; i < fr.length; i++) travel += Math.hypot(fr[i].b[id][0] - fr[i - 1].b[id][0], fr[i].b[id][1] - fr[i - 1].b[id][1]);
    if (travel < 50) continue;
    const ox = fr.map(f => f.p[0] - f.b[id][0]), oy = fr.map(f => f.p[1] - f.b[id][1]), mx = pct(ox, .5), my = pct(oy, .5);
    const dev = pct(fr.map((f, i) => Math.hypot(ox[i] - mx, oy[i] - my)), .95);
    if (dev < best) { best = dev; held = id; }
  }
  const heldName = { 'held?': 'the pressed element', added: 'a layer added during the drag', neighbour: 'a neighbour', container: 'a container' };
  const r = { frames: F.length, seconds: F.length ? +((F[F.length - 1].t - F[0].t) / 1000).toFixed(1) : 0, held: held ? heldName[trace.kinds[held]] : null };
  if (held) {
    const fr = drag.filter(f => f.b[held]);
    const ox = fr.map(f => f.p[0] - f.b[held][0]), oy = fr.map(f => f.p[1] - f.b[held][1]), mx = pct(ox, .5), my = pct(oy, .5);
    const dev = fr.map((f, i) => Math.hypot(ox[i] - mx, oy[i] - my));
    r.follow = { p50: +pct(dev, .5).toFixed(1), p95: +pct(dev, .95).toFixed(1), max: +Math.max(...dev).toFixed(1) };
    let tp = 0; for (let i = 1; i < fr.length; i++) { const dh = Math.hypot(fr[i].b[held][0] - fr[i - 1].b[held][0], fr[i].b[held][1] - fr[i - 1].b[held][1]); const dp = Math.hypot(fr[i].p[0] - fr[i - 1].p[0], fr[i].p[1] - fr[i - 1].p[1]); if (dh - dp > LAW.teleport) tp++; }
    r.teleports = tp;
  }
  // The ground: neighbours that snap, containers that jump, jitter, overlap.
  let snaps = 0, glides = 0, jumps = 0, jitter = 0; const who = {};
  for (const id of ids) {
    if (id === held) continue; const kind = trace.kinds[id];
    const s = drag.map(f => f.b[id] || null); let lastDir = 0, lastT = -1e9;
    for (let i = 1; i < s.length; i++) {
      if (!s[i] || !s[i - 1]) continue;
      const dx = s[i][0] - s[i - 1][0], dy = s[i][1] - s[i - 1][1], d = Math.hypot(dx, dy), ds = Math.abs(s[i][2] - s[i - 1][2]) + Math.abs(s[i][3] - s[i - 1][3]);
      if (kind === 'container' && ds + d >= LAW.resize) jumps++;
      if (kind !== 'container' && d >= LAW.snap) {
        const b = i > 1 && s[i - 2] ? Math.hypot(s[i - 1][0] - s[i - 2][0], s[i - 1][1] - s[i - 2][1]) : 0, a = s[i + 1] ? Math.hypot(s[i + 1][0] - s[i][0], s[i + 1][1] - s[i][1]) : 0;
        if (b < 2 && a < 2) { snaps++; who[kind] = (who[kind] || 0) + 1; } else glides++;
      }
      const dir = Math.sign(Math.abs(dy) >= Math.abs(dx) ? dy : dx); const t = drag[i].t;
      if (d >= 2 && dir) { if (lastDir && dir !== lastDir && t - lastT < LAW.jitterMs) jitter++; lastDir = dir; lastT = t; }
    }
  }
  let overlap = 0; const nb = ids.filter(id => id !== held && trace.kinds[id] === 'neighbour');
  for (const f of drag) for (let i = 0; i < nb.length; i++) for (let j = i + 1; j < nb.length; j++) { const a = f.b[nb[i]], b = f.b[nb[j]]; if (!a || !b) continue; const w = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]), h = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]); if (w > LAW.overlap && h > LAW.overlap) overlap++; }
  Object.assign(r, { neighbourSnaps: snaps, neighbourGlides: glides, containerJumps: jumps, jitter, overlapFrames: overlap });
  // Landing: travel in the first 100 ms after release, and when everything comes to rest.
  const seq = [drag[drag.length - 1], ...after].filter(Boolean); // from the last frame under the hand
  if (seq.length > 1) {
    const t0 = seq[0].t; let travel = 0, lastMove = t0;
    for (let i = 1; i < seq.length; i++) for (const id of Object.keys(seq[i].b)) { const a = seq[i].b[id], b = seq[i - 1].b[id]; if (!a || !b) continue; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (d >= 1) { lastMove = seq[i].t; if (seq[i].t - t0 <= LAW.landingMs && id === held) travel += d; } }
    r.landing = { firstMsTravel: Math.round(travel), restAfterMs: Math.round(lastMove - t0) };
  }
  return r;
}

function verdicts(r) {
  const v = [];
  if (!r.held) v.push('nothing in the page moved with the hand: canvas content or an untracked layer, judge it from the video');
  if (r.follow && r.follow.p95 > LAW.followP95) v.push(`the held thing drifts from the hand: p95 ${r.follow.p95}px (law: ≤ ${LAW.followP95}px)`);
  if (r.teleports) v.push(`the held thing jumped ahead of the hand ${r.teleports}× (≥ ${LAW.teleport}px more than the hand in one frame)`);
  if (r.neighbourSnaps) v.push(`neighbours snapped ${r.neighbourSnaps}× (≥ ${LAW.snap}px in one frame with no motion before or after): the ground moves under the hand`);
  if (r.containerJumps) v.push(`containers jumped ${r.containerJumps}× (size or place changed ≥ ${LAW.resize}px in one frame)`);
  if (r.jitter) v.push(`jitter: ${r.jitter} direction reversals within ${LAW.jitterMs} ms`);
  if (r.overlapFrames) v.push(`things at rest overlapped in ${r.overlapFrames} frame-pairs`);
  if (r.landing && r.landing.firstMsTravel > LAW.landingPx) v.push(`the landing is a jump: ${r.landing.firstMsTravel}px within ${LAW.landingMs} ms`);
  if (r.landing && r.landing.restAfterMs > LAW.restMs) v.push(`still moving ${r.landing.restAfterMs} ms after release (law: at rest within ${LAW.restMs} ms)`);
  return v;
}

// ---------- gestures ----------

function snakePath(W, H, x0, y0) {
  const pts = [], cols = [0.12, 0.31, 0.5, 0.69, 0.88].map(f => Math.round(W * f)), top = Math.round(H * 0.18), bottom = Math.round(H * 0.82);
  const profiles = [['steady', 40, 1100], ['fast', 6, 140], ['jerk', 28, 650], ['ease', 34, 850], ['fast', 6, 120]];
  let x = x0, y = y0;
  const seg = (x1, y1, n, ms, prof) => { for (let i = 1; i <= n; i++) { let u = i / n; if (prof === 'ease') u = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; if (prof === 'jerk') u = Math.max(0, Math.min(1, u + (Math.random() - .5) * 0.25)); pts.push([Math.round(x + (x1 - x) * u), Math.round(y + (y1 - y) * u), ms / n]); if (i === Math.round(n / 2) && prof !== 'fast') pts.push([null, null, 260]); } x = x1; y = y1; };
  cols.forEach((cx, i) => { seg(cx, y, 10, 200, 'ease'); seg(cx, i % 2 ? top : bottom, ...profiles[i].slice(1).concat([profiles[i][0]])); });
  seg(Math.round((x0 + W / 2) / 2), Math.round(H / 2), 12, 300, 'ease');
  return pts;
}

function chaosPath(W, H, x0, y0) {
  const pts = []; let x = x0, y = y0;
  for (let i = 0; i < 60; i++) {
    const back = Math.random() < 0.3; const dx = (Math.random() - .5) * (back ? 60 : 320), dy = (Math.random() - .5) * (back ? 60 : 240);
    x = Math.max(4, Math.min(W - 4, x0 + (x - x0) * 0.5 + dx)); y = Math.max(4, Math.min(H - 4, y0 + (y - y0) * 0.5 + dy));
    pts.push([Math.round(x), Math.round(y), 8 + Math.random() * 16]);
  }
  pts.push([x0, y0, 16]);
  return pts;
}

async function gesture(page, m, pts, end) {
  await page.mouse.move(m.x, m.y); await page.waitForTimeout(150);
  await page.evaluate(startTrace, [m.x, m.y]);
  await page.mouse.down();
  for (let i = 1; i <= 4; i++) { await page.mouse.move(m.x + i * 2, m.y + i); await page.waitForTimeout(30); } // pass the drag threshold
  for (const [x, y, dt] of pts) { if (x !== null) await page.mouse.move(x, y); if (dt > 4) await page.waitForTimeout(dt); }
  await page.evaluate(() => { window.__trace.phase = 'after'; });
  if (end === 'cancel') await page.keyboard.press('Escape');
  await page.mouse.up();
  await page.waitForTimeout(1500);
  return page.evaluate(stopTrace);
}

// ---------- the check ----------

async function runMotion({ browser, target, out, width, dark, sandbox, dragSel, gemini, warnings }) {
  const report = { width, laws: LAW };
  const hands = sandbox || target.startsWith('file:');
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: dark ? 'dark' : 'light', ...(hands ? { recordVideo: { dir: path.join(out, '_video'), size: { width, height: 900 } } } : {}) });
  await ctx.addInitScript(`(${POINTER_DOT})()`);
  const page = await ctx.newPage();
  await page.goto(target, { waitUntil: 'load', timeout: 60000 }).catch(e => warnings.push('motion goto: ' + String(e).slice(0, 160)));
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);

  report.declared = await page.evaluate(declaredMotion);

  // Hover sweep: view-only.
  report.hover = [];
  for (const h of await page.evaluate(hoverTargets, 20)) {
    await page.mouse.move(-5, -5); await page.waitForTimeout(400); // off the page, so leaving it moves nothing
    await page.evaluate(startWatch);
    await page.mouse.move(h.x, h.y); await page.waitForTimeout(450);
    const anims = await page.evaluate(stopWatch);
    if (anims.length) report.hover.push({ label: h.label, anims });
  }
  await page.mouse.move(2, 2);

  // Hand tests: only where a drop cannot change real data.
  report.movables = await page.evaluate(findMovables, dragSel || null);
  report.hands = [];
  if (!hands && report.movables.length) warnings.push(`motion: ${report.movables.length} thing(s) move under the hand here (${report.movables.map(m => m.kind).join(', ')}); the snake and chaos tests run only on a sandbox copy or a local file: pass --sandbox when this URL is a copy`);
  if (hands) {
    for (const [i, m] of report.movables.entries()) {
      for (const [name, make, end] of [['snake', snakePath, 'drop'], ['chaos', chaosPath, 'cancel']]) {
        await page.goto(target, { waitUntil: 'load' }).catch(() => {}); await page.waitForTimeout(800);
        const fresh = (await page.evaluate(findMovables, dragSel || null))[i] || m;
        const trace = await gesture(page, fresh, make(width, 900, fresh.x, fresh.y), end).catch(e => { warnings.push(`motion ${name} on ${m.kind}: ` + String(e).slice(0, 160)); return null; });
        if (!trace) continue;
        if (process.env.MOTION_TRACE) fs.writeFileSync(path.join(out, `trace-${name}-${i}.json`), JSON.stringify(trace));
        const res = analyse(trace);
        report.hands.push({ test: name, movable: `${m.kind} "${m.label}"`, ...res, verdicts: verdicts(res) });
      }
    }
  }
  const video = page.video();
  await ctx.close();
  if (video) {
    const webm = await video.path(), mp4 = path.join(out, 'motion-hands.mp4');
    const ff = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', mp4]);
    report.video = ff.status === 0 ? 'motion-hands.mp4' : path.relative(out, webm);
    if (ff.status === 0) fs.rmSync(path.join(out, '_video'), { recursive: true, force: true });
    if (gemini && report.hands.length) report.gemini = askGemini(out, report.video, warnings);
  }
  return report;
}

// Gemini 3.8 Flash through the Antigravity CLI, on our own recording only. A smoke detector, never a measure.
function askGemini(out, video, warnings) {
  const agy = path.join(os.homedir(), '.local/bin/agy');
  if (!fs.existsSync(agy)) { warnings.push('--gemini: the Antigravity CLI (~/.local/bin/agy) is not installed'); return null; }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'motion-gemini-'));
  fs.copyFileSync(path.join(out, video), path.join(dir, path.basename(video)));
  const prompt = `Open the video file ${path.basename(video)} in this folder with your file viewing tool (it shows videos to you). Do not run terminal commands.

It is a real-time screen recording of an interface. The red dot is the pointer, drawn by the test. A test grabs something that moves under the hand and moves it along a snake path through the screen at changing speeds, with pauses, then along chaotic fast moves, and each time presses Escape and lets go where it started.

Judge the motion as a physicist who knows how solid objects behave in the real world and in good cartoons:
- Continuity: nothing teleports; it passes through the places between.
- Permanence: nothing vanishes or appears without a visible cause and path.
- Solidity: things at rest do not pass through each other and no text lies on other text; a lifted object may float above the others.
- The held object follows the hand one to one, with no lag and no drift.
- Things at rest stay at rest unless pushed: the ground does not move under the hand.
- The parts of one object move together.
- Smoothness: no jitter, no quick back-and-forth, no stutter.
- Damping: motion the interface starts lands without overshoot and nothing keeps bouncing.

List every violation: the video timestamp, which object, which law, how bad (minor, noticeable, severe). Mark each SEEN or INFERRED and do not guess about what you cannot see. Then a three-line verdict.`;
  const run = spawnSync(agy, ['-p', prompt, '--mode', 'plan', '--sandbox', '--model', 'gemini-3.8-flash-high'], { cwd: dir, encoding: 'utf8', timeout: 240000 });
  fs.rmSync(dir, { recursive: true, force: true });
  if (run.status !== 0 || !run.stdout.trim()) { warnings.push('--gemini: no answer (' + String(run.stderr || run.error || '').slice(0, 160) + ')'); return null; }
  fs.writeFileSync(path.join(out, 'motion-gemini.md'), run.stdout);
  return 'motion-gemini.md';
}

function motionText(r) {
  const ms = v => `${v}ms`;
  const top = (m, n) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n);
  const d = r.declared, dN = Object.keys(d.durations).length, eN = Object.keys(d.easings).length;
  let t = `Motion check at ${r.width}px. Laws: the held thing within ${LAW.followP95}px of the hand; nothing jumps ${LAW.teleport}px ahead of it; no neighbour snaps ${LAW.snap}px in one frame; containers do not jump ${LAW.resize}px; no reversal within ${LAW.jitterMs} ms; at rest within ${LAW.restMs} ms; routine motion within ${LAW.routineMs} ms, no slow start.\n`;
  t += `\nrhythm      ${dN} distinct durations, ${eN} distinct easings declared${dN > 3 || eN > 2 ? ' (no shared rhythm: one set is about 150 ms for small changes and 250 ms for layout, one easing)' : ''}\n`;
  t += `  durations: ${top(d.durations, 12).map(([k, n]) => `${ms(Math.round(k))}×${n}`).join(' | ')}\n  easings:   ${top(d.easings, 8).map(([k, n]) => `${k}×${n}`).join(' | ')}\n`;
  const slowStart = e => { if (/ease-in(?!-out)/.test(e)) return true; const m = /cubic-bezier\(([^)]+)\)/.exec(e); if (!m) return false; const [x1, y1, x2] = m[1].split(',').map(Number); return x1 >= 0.3 && y1 <= 0.1 && x2 >= 0.8; };
  if (r.hover.length) {
    t += `hover       ${r.hover.length} control(s) set something moving:\n`;
    for (const h of r.hover) {
      const timings = [...new Set(h.anims.map(a => `${a.duration}ms ${a.easing}`))];
      const flags = [timings.length > 1 ? `${timings.length} timings in one hover` : '', h.anims.some(a => a.duration > LAW.routineMs) ? `over ${LAW.routineMs} ms` : '', h.anims.some(a => slowStart(a.easing)) ? 'slow start' : ''].filter(Boolean);
      const g = {}; for (const a of h.anims) { const k = `${a.target} ${a.props || ''} ${a.duration}ms${a.delay ? ` +${a.delay}` : ''} ${a.easing}`; g[k] = (g[k] || 0) + 1; }
      t += `  "${h.label}": ${Object.entries(g).map(([k, n]) => k + (n > 1 ? ` ×${n}` : '')).join('; ')}${flags.length ? '  ← ' + flags.join(', ') : ''}\n`;
    }
  }
  t += `movable     ${r.movables.length ? r.movables.map(m => `${m.kind} "${m.label}" ${m.w}×${m.h} at ${m.x},${m.y}`).join(' · ') : 'nothing found (pass --drag SELECTOR to name it)'}\n`;
  for (const h of r.hands) {
    t += `${h.test.padEnd(11)} ${h.movable}: ${h.frames} frames in ${h.seconds}s; held: ${h.held || 'none'}${h.follow ? `; follow p50 ${h.follow.p50}px, p95 ${h.follow.p95}px, max ${h.follow.max}px; teleports ${h.teleports}` : ''}; neighbour snaps ${h.neighbourSnaps}, glides ${h.neighbourGlides}; container jumps ${h.containerJumps}; jitter ${h.jitter}; overlap ${h.overlapFrames}${h.landing ? `; landing ${h.landing.firstMsTravel}px in the first ${LAW.landingMs} ms, at rest after ${h.landing.restAfterMs} ms` : ''}\n`;
    for (const v of h.verdicts) t += `  ✗ ${v}\n`;
    if (!h.verdicts.length) t += '  ✓ every law holds\n';
  }
  if (r.video) t += `video       ${r.video} (the red dot is the pointer)\n`;
  if (r.gemini) t += `gemini      ${r.gemini}: a smoke detector, not a measure; check each claim against the numbers above\n`;
  return t;
}

module.exports = { runMotion, motionText, LAW };
