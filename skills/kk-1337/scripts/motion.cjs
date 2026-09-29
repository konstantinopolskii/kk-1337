#!/usr/bin/env node
const HELP = `Record what a page does after an action: a state behind a click, or motion.

Usage:
  node motion.cjs <url|file.html> [--setup STEPS] --steps STEPS [options]    one sequence
  node motion.cjs --config config.json                                        several sequences

STEPS is a JSON list, run in order:
  [{"click": "css"}, {"press": "Escape"}, {"hover": "css"}, {"type": ["css", "text"]},
   {"wait": 300}, {"eval": "document.body.dataset.state = 'empty'"}, {"reload": true}]
--setup runs before recording (open a menu, fill a form); --steps is the action that is recorded.

Options (one sequence):
  --name NAME        folder and file prefix (default: seq)
  --watch LIST       comma-separated selectors whose box and opacity are traced every frame
                     (the element that moves, its backdrop, the thing it came from)
  --capture MS       how long to record from the start of the action (default 900). 0 takes one
                     screenshot after the action: use it for a state behind a click
  --width N --height N   viewport (default 1440 x 900)
  --clip x,y,w,h     record only this region
  --touch            emulate a touch phone (use with --width 390 --height 844)
  --reduced-motion   emulate prefers-reduced-motion: reduce (check that it is honoured)
  --out DIR          output folder (default: a new folder under the system temp folder)
config.json: {"target": "...", "width": 1440, "height": 900, "touch": false, "reducedMotion": false,
  "sequences": [{"name": "...", "setup": [...], "steps": [...], "capture": 900, "watch": [...], "clip": null,
                 "freshLoad": true}]}

Output, per sequence NAME:
  NAME-sheet.png           up to 24 frames in a grid, each labelled with its time: look at this first
  NAME/fNNNNN.png          every frame, named by milliseconds from the start of the action
  NAME/state.png           with --capture 0: the screen after the action
  NAME/trace.json          per frame: each watched element's box, opacity and transform
  NAME/animations.json     the running CSS transitions, CSS animations and Web Animations, with duration,
                           delay, easing and keyframes, sampled 20, 60 and 140 ms after the action
  summary.json             per watched element: from and to, when it started, time to 90% of the travel,
                           settle time, overshoot past the end value, the largest jump between two frames

Frames come about every 50 ms (screenshots take time), so a jump or a flash shorter than that can fall
between frames: the trace, sampled every animation frame, catches it. A frame shows where things are,
not how they feel: step through the frames and read the trace against kk-motion's laws.

Playwright is found the same way as in snap.cjs: require('playwright') from this folder or its parents,
then PLAYWRIGHT_MODULE=<path to a node_modules/playwright folder>, then a global install.`;

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
if (!args.length || args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(args.length ? 0 : 1); }
const opt = (name, def) => { const i = args.indexOf(name); return i > -1 && args[i + 1] !== undefined ? args[i + 1] : def; };
const json = (name, text) => { try { return JSON.parse(text); } catch (e) { console.error(`${name} is not valid JSON: ${e.message}`); process.exit(1); } };

function loadPlaywright() {
  const candidates = ['playwright', process.env.PLAYWRIGHT_MODULE].filter(Boolean);
  try { candidates.push(path.join(execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright')); } catch (e) {}
  for (const c of candidates) { try { return require(c); } catch (e) {} }
  console.error('Playwright not found. See `node snap.cjs --help` in this folder: it says how to point to a copy or install one.');
  process.exit(1);
}

let cfg;
if (opt('--config', null)) cfg = json('--config', fs.readFileSync(opt('--config'), 'utf8'));
else {
  const valued = new Set(['--setup', '--steps', '--name', '--watch', '--capture', '--width', '--height', '--clip', '--out']);
  const target = args.find((a, i) => !a.startsWith('--') && !valued.has(args[i - 1]));
  if (!target || !opt('--steps', null)) { console.error('Give a target and --steps.\n\n' + HELP); process.exit(1); }
  const clip = opt('--clip', null);
  cfg = {
    target, width: Number(opt('--width', 1440)), height: Number(opt('--height', 900)),
    touch: args.includes('--touch'), reducedMotion: args.includes('--reduced-motion'),
    sequences: [{
      name: opt('--name', 'seq'), setup: json('--setup', opt('--setup', '[]')), steps: json('--steps', opt('--steps')),
      capture: Number(opt('--capture', 900)), watch: (opt('--watch', '') || '').split(',').map(s => s.trim()).filter(Boolean),
      clip: clip ? (([x, y, width, height]) => ({ x, y, width, height }))(clip.split(',').map(Number)) : null,
    }],
  };
}
const out = path.resolve(opt('--out', cfg.out || path.join(os.tmpdir(), 'design-motion', new Date().toISOString().replace(/[:.]/g, '-'))));
let url = cfg.target || cfg.file;
if (!/^https?:|^file:/.test(url)) url = 'file://' + path.resolve(url);

async function doSteps(page, steps) {
  for (const s of steps || []) {
    if (s.click) await page.click(s.click, { timeout: 3000 });
    else if (s.press) await page.keyboard.press(s.press);
    else if (s.hover) await page.hover(s.hover, { timeout: 3000 });
    else if (s.type) await page.fill(s.type[0], s.type[1], { timeout: 3000 });
    else if (s.wait) await page.waitForTimeout(s.wait);
    else if (s.eval) await page.evaluate(s.eval);
    else if (s.reload) { await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(500); }
  }
}

// Every animation frame: each watched element's box, opacity and transform.
const RECORDER = `(() => {
  window.__rec = []; window.__recOn = true; const t0 = performance.now();
  const watch = window.__watch || [];
  function tick(now) {
    if (!window.__recOn) return;
    for (const sel of watch) document.querySelectorAll(sel).forEach((el, i) => {
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      window.__rec.push({ t: Math.round(now - t0), sel, i, x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1),
        h: +r.height.toFixed(1), o: +(+cs.opacity).toFixed(3), vis: cs.visibility, disp: cs.display, tf: cs.transform });
    });
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})()`;

const ANIMS = `(() => document.getAnimations().map(a => {
  const e = a.effect, t = e && e.getTiming ? e.getTiming() : {};
  let kf = []; try { kf = e.getKeyframes().map(k => { const o = {}; for (const [key, v] of Object.entries(k)) if (!['composite', 'computedOffset'].includes(key)) o[key] = v; return o; }); } catch (_) {}
  const tgt = e && e.target;
  const id = tgt ? ((tgt.id ? '#' + tgt.id : '') + (typeof tgt.className === 'string' && tgt.className.trim() ? '.' + tgt.className.trim().split(/\\s+/).join('.') : '') || tgt.tagName) : '';
  return { kind: a.constructor.name, prop: a.transitionProperty || a.animationName || a.id || '', target: id.slice(0, 80),
           duration: t.duration, delay: t.delay, easing: t.easing, fill: t.fill, iterations: t.iterations, playState: a.playState, keyframes: kf.slice(0, 6) };
}))()`;

// From the trace: start, time to 90% of the travel, settle time, overshoot past the end value, largest jump.
function analyze(points, key) {
  const pts = points.filter(p => typeof p[key] === 'number').map(p => [p.t, p[key]]);
  if (pts.length < 3) return null;
  const small = key === 'o' ? 0.02 : 1;
  const v0 = pts[0][1], v1 = pts[pts.length - 1][1], travel = v1 - v0;
  let maxStep = 0; for (let i = 1; i < pts.length; i++) maxStep = Math.max(maxStep, Math.abs(pts[i][1] - pts[i - 1][1]));
  if (Math.abs(travel) < small) {
    const exc = Math.max(...pts.map(([, v]) => Math.abs(v - v0)));
    return exc >= small ? { net: 0, maxExcursion: +exc.toFixed(2), maxStep: +maxStep.toFixed(2) } : null;
  }
  const start = pts.find(([, v]) => Math.abs(v - v0) > Math.abs(travel) * 0.01)[0];
  const t90 = pts.find(([, v]) => Math.abs(v - v0) >= Math.abs(travel) * 0.9)[0];
  const tol = Math.max(Math.abs(travel) * 0.005, key === 'o' ? 0.005 : 0.5);
  const off = pts.filter(([, v]) => Math.abs(v - v1) > tol);
  const settle = off.length ? off[off.length - 1][0] : start;
  const sign = Math.sign(travel);
  const over = Math.max(0, ...pts.map(([, v]) => (v - v1) * sign));
  return { from: +v0.toFixed(2), to: +v1.toFixed(2), startMs: start, t90Ms: t90 - start, settleMs: settle - start,
           overshoot: +over.toFixed(2), overshootPct: +(100 * over / Math.abs(travel)).toFixed(1), maxStep: +maxStep.toFixed(2) };
}

// A CSS animation keeps its timing function on the keyframes, so the effect itself reads as linear.
const easingOf = a => (a.easing === 'linear' && a.keyframes[0] && a.keyframes[0].easing && a.keyframes[0].easing !== 'linear')
  ? `${a.keyframes[0].easing} (per keyframe)` : a.easing;

function summarize(trace) {
  const groups = {};
  for (const p of trace) (groups[`${p.sel}[${p.i}]`] = groups[`${p.sel}[${p.i}]`] || []).push(p);
  const res = {};
  for (const [k, pts] of Object.entries(groups)) {
    const r = {};
    for (const [key, label] of [['x', 'x'], ['y', 'y'], ['w', 'width'], ['h', 'height'], ['o', 'opacity']]) { const a = analyze(pts, key); if (a) r[label] = a; }
    res[k] = Object.keys(r).length ? r : 'no change';
  }
  return res;
}

(async () => {
  const pw = loadPlaywright();
  fs.mkdirSync(out, { recursive: true });
  const browser = await pw.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: cfg.width || 1440, height: cfg.height || 900 },
    reducedMotion: cfg.reducedMotion ? 'reduce' : 'no-preference', hasTouch: !!cfg.touch, isMobile: !!cfg.touch });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  const summary = { target: url, width: cfg.width || 1440, reducedMotion: !!cfg.reducedMotion, sequences: [], pageErrors: errors };
  for (const seq of cfg.sequences) {
    const dir = path.join(out, seq.name);
    fs.mkdirSync(dir, { recursive: true });
    const res = { name: seq.name, frames: [], animations: [], trace: [], error: null };
    try {
      if (seq.freshLoad && summary.sequences.length) { await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(600); }
      await doSteps(page, seq.setup);
      if (seq.capture === 0) {
        await doSteps(page, seq.steps);
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(dir, 'state.png'), clip: seq.clip || undefined });
        summary.sequences.push({ name: seq.name, state: path.join(dir, 'state.png'), error: null });
        continue;
      }
      await page.evaluate(w => { window.__watch = w; }, seq.watch || []);
      await page.evaluate(RECORDER);
      const t0 = Date.now();
      let capturing = true;
      const cap = (async () => {
        while (capturing) {
          const t = Date.now() - t0;
          const f = `f${String(t).padStart(5, '0')}.png`;
          fs.writeFileSync(path.join(dir, f), await page.screenshot({ clip: seq.clip || undefined }));
          res.frames.push({ t, file: f });
        }
      })();
      await doSteps(page, seq.steps);
      for (const d of [20, 60, 140]) { await page.waitForTimeout(d); res.animations.push({ afterMs: Date.now() - t0, anims: await page.evaluate(ANIMS) }); }
      const left = (seq.capture || 900) - (Date.now() - t0);
      if (left > 0) await page.waitForTimeout(left);
      capturing = false;
      await cap;
      res.trace = await page.evaluate(() => { window.__recOn = false; return window.__rec; });
    } catch (e) { res.error = String(e).slice(0, 400); }
    fs.writeFileSync(path.join(dir, 'trace.json'), JSON.stringify(res.trace));
    fs.writeFileSync(path.join(dir, 'animations.json'), JSON.stringify(res.animations, null, 1));
    if (res.frames.length) {
      const frames = res.frames.filter((_, i, a) => a.length <= 24 || i % Math.ceil(a.length / 24) === 0).slice(0, 24);
      const w = Math.round((seq.clip ? seq.clip.width : (cfg.width || 1440)) * (seq.sheetScale || 0.25));
      const html = `<html><body style="margin:0;background:#fff;font:12px system-ui"><div style="display:grid;grid-template-columns:repeat(4,${w}px);gap:6px;padding:6px">` +
        frames.map(f => `<figure style="margin:0"><img src="file://${path.resolve(dir, f.file)}" style="width:${w}px;border:1px solid #ccc;display:block"><figcaption>${f.t} ms</figcaption></figure>`).join('') + '</div></body></html>';
      fs.writeFileSync(path.join(dir, 'sheet.html'), html);
      const sp = await ctx.newPage();
      await sp.setViewportSize({ width: 4 * w + 40, height: 400 });
      await sp.goto('file://' + path.join(dir, 'sheet.html'));
      await sp.waitForTimeout(300);
      await sp.screenshot({ path: path.join(out, `${seq.name}-sheet.png`), fullPage: true });
      await sp.close();
    }
    summary.sequences.push({
      name: seq.name, frames: res.frames.length, frameTimes: res.frames.map(f => f.t), error: res.error,
      elements: summarize(res.trace),
      animations: res.animations.map(s => ({ afterMs: s.afterMs, running: s.anims.map(a => `${a.kind} ${a.target} ${a.prop} ${a.duration} ms, delay ${a.delay}, ${easingOf(a)}`) })),
    });
  }
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary, null, 1));
  await browser.close();
  const failed = summary.sequences.filter(s => s.error);
  console.log(`Written to ${out}\nLook at each *-sheet.png (or state.png) first, then summary.json.` +
    (failed.length ? `\nFailed: ${failed.map(s => `${s.name}: ${s.error}`).join('; ')}` : '') +
    (errors.length ? `\nPage errors: ${errors.slice(0, 3).join(' | ')}` : ''));
})().catch(e => { console.error(e); process.exit(1); });
