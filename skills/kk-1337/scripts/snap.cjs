#!/usr/bin/env node
const HELP = `Render a design the way a person will see it, then measure its noise.

Usage: node snap.cjs <url|file.html|screenshot.png> [options]
  --out DIR          output folder (default: a new folder per run under the system temp folder,
                     so nothing lands in the user's project and earlier runs stay for comparison)
  --widths LIST      desktop browser widths, comma-separated (default 1440; 1116 is a MacBook app window)
  --devices LIST     real devices, comma-separated Playwright names, or none (default "iPhone 15": the
                     first look is a desktop and an iPhone). Each renders with its screen size, pixel density,
                     touch, the mobile viewport rules (a page without a viewport meta tag shows zoomed out,
                     as on a phone) and its user agent, and its first screen is as tall as the browser
                     really shows (393×659 on an iPhone 15 in Safari). Others: "Pixel 7", "iPhone 15 Pro Max",
                     "iPad Pro 11 landscape", "iPad Mini". Apple devices use Safari's engine when it is
                     installed (npx playwright install webkit, about 100 MB; ask first), Chromium otherwise
  --thorough         the check at the end of the work: an iPhone 15, a Galaxy S24 (the narrowest common
                     Android width) and an iPad Pro 11, next to the desktop widths
  --dark             emulate prefers-color-scheme: dark (files get a -dark suffix)
  --scale N          device pixel ratio (default 1 for widths, and each device's own capped at 2: density
                     changes the pixels, not the layout; 2 makes small UI text and icons readable)
  --scope SELECTOR   the object under review, when it sits inside a wrapper page (a report,
                     a storybook, an app shell): the audit counts only elements inside the
                     matches, and each match (up to 6) is also shot on its own
  --wait MS          extra wait after load, for fonts and scripts (default 600)
  --screen-wait MS   how long each screen settles after a scroll, for sticky pictures that swap and
                     scroll-triggered animations (default 900)
  --no-squint        skip the squint and grayscale views
  --motion           the motion check, for the end of the work (or earlier when asked), at the first desktop
                     width; writes motion.txt and motion.json. Rhythm: every duration and easing the page
                     declares. Hover: what each control on the first screen sets moving, with its timing (view-
                     only). Hands: whatever moves under the hand (cards, lists, maps, canvases, sliders,
                     splitters) gets a snake path and chaotic fast moves, traced every frame and checked
                     against the laws: the held thing follows the hand, nothing teleports, the ground does not
                     move under the hand, no jitter, no overlap, a gliding landing, rest within a second. The
                     hand tests run only on a local file or with --sandbox, because a drop on live data can
                     move real things: the snake ends with a drop, the chaos with Escape where it started.
                     A video with the pointer drawn in goes next to the numbers
  --sandbox          this URL is a copy: hand tests may press, drag and drop
  --drag SELECTOR    what to drag, when the check cannot find it (default: found by a grab or resize cursor,
                     draggable and sortable-list markers, maps and large canvases)
  --gemini           after the hand tests, ask Gemini 3.8 Flash (the Antigravity CLI, ~/.local/bin/agy) to
                     review our own recording against the same laws: motion-gemini.md. A smoke detector that
                     sees about one frame a second, never a measure: check its claims against the numbers

Output, per target W: a width (1440) or a device (iphone-15, galaxy-s24, ipad-pro-11); with --dark, W-dark:
  W-viewport.png                   the first screen: what is seen in the first second
  W-screen-NN.png                  the page screen by screen, scrolled the way a person scrolls (the mouse
                                   wheel, one screen less a little overlap at a time), each shot after it
                                   settles: sticky and fixed pictures, and what scrolling triggers, show as
                                   they do on the page. Read these for detail
  W-full.png                       the whole page in one image, for the overall shape only: it shrinks when
                                   viewed, and it shows a sticky or fixed element once, where it starts
                                   (the script warns when the page has one)
  W-squint.png, W-gray.png         the first screen blurred, and in grayscale
  W-full-squint.png, W-full-gray.png   the whole page blurred, and in grayscale
  W-scope-N.png (-squint, -gray)   each --scope match on its own
  audit.txt, audit.json            (audit-dark.* with --dark) every distinct value with its count, for
                                   font sizes, weights, families, line heights, colours, backgrounds,
                                   radii, shadows and borders; text below WCAG AA contrast, grouped
                                   by colour pair; text blocks over 90 characters per line; horizontal
                                   overflow of the page, and boxes whose content is cut off or scrolls
                                   sideways; images that failed to load. Then the interaction on the first
                                   screen: the controls by layer (fixed and sticky layers apart from the
                                   content) with their sizes and the targets below 24 px (44 on a touch
                                   device); text that runs under a fixed or sticky layer; short marks repeated
                                   on the screen; a rough order of what stands out (size × weight × contrast
                                   × how rare its colour is), to hold against your own first-second note;
                                   and the x-height of every type size in CSS px and in degrees of visual
                                   angle (0.0213° per px on a desktop, a laptop at arm's length; 0.0287° on a
                                   phone held at about 33 cm; 0.0275° on a tablet at about 40 cm): below about
                                   0.15° reading slows, from 0.2° it is fluent

Given a screenshot (.png, .jpg, .webp) instead of a page, it makes image-squint.png and image-gray.png,
plus image-NN.png tiles when the image is tall. There is no DOM, so there is no audit: count sizes,
colours and boxes by eye. Pass --scale 2 for a 2x screenshot, so the blur matches a 1x render.

The script prints only where the files are, so the audit does not reach you before your first
look at the screenshots. Read audit.txt after the first-second note.

Reading the audit:
  - fontFamily is the first family declared in CSS, not proof that the font loaded. Check the render.
  - Contrast is measured against the nearest solid background colour. Text over an image or a gradient is
    measured against that colour, which may be wrong, and a parent's opacity is ignored: check such text on the render.
  - Text inside a scaled SVG (a chart with a viewBox) is counted at its CSS size, not the size it is drawn at.
  - A form field counts by the text it shows: its value, or its placeholder in the placeholder's own colour
    when it is empty. A select counts by its chosen option.
  - A broken image in a local copy is usually a missing file, not a design decision.

Playwright is found through require('playwright') from this folder or its parents, then
PLAYWRIGHT_MODULE=<path to a node_modules/playwright folder>, then a global install. If it is not
found, the error message says how to find a copy or install one.`;

const NO_PLAYWRIGHT = `Playwright not found. Either:
  - point to a copy that already exists:
      PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node snap.cjs ...
    Look in the project's node_modules, in \`npm root -g\`, or run:
      find ~ -maxdepth 7 -path '*/node_modules/playwright/package.json' 2>/dev/null
  - or install one into a scratch folder, not into the user's project:
      cd <scratch folder> && npm i playwright && npx playwright install chromium
    (a browser download of about 150 MB; ask first on someone else's machine), then
      PLAYWRIGHT_MODULE=<scratch folder>/node_modules/playwright node snap.cjs ...`;

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const args = process.argv.slice(2);
if (!args.length || args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(args.length ? 0 : 1); }
const opt = (name, def) => { const i = args.indexOf(name); return i > -1 && args[i + 1] !== undefined ? args[i + 1] : def; };
const valued = new Set(['--out', '--widths', '--devices', '--scale', '--scope', '--wait', '--screen-wait', '--drag']);
let target = args.find((a, i) => !a.startsWith('--') && !valued.has(args[i - 1]));
if (!target) { console.error('No target given.\n\n' + HELP); process.exit(1); }
if (!/^https?:|^file:/.test(target)) target = 'file://' + path.resolve(target);
const out = path.resolve(opt('--out', path.join(os.tmpdir(), 'design-snaps', new Date().toISOString().replace(/[:.]/g, '-'))));
const widths = opt('--widths', '1440').split(',').map(Number).filter(Boolean);
const deviceNames = opt('--devices', args.includes('--thorough') ? 'iPhone 15,Galaxy S24,iPad Pro 11' : 'iPhone 15').split(',').map(s => s.trim()).filter(s => s && s !== 'none');
const dark = args.includes('--dark');
const squint = !args.includes('--no-squint');
const scale = Number(opt('--scale', 1)) || 1;
const scaleGiven = args.includes('--scale');
const motion = args.includes('--motion');
const scope = opt('--scope', null);
const extraWait = Number(opt('--wait', 600));
const screenWait = Number(opt('--screen-wait', 900));
fs.mkdirSync(out, { recursive: true });

function loadPlaywright() {
  const candidates = ['playwright', process.env.PLAYWRIGHT_MODULE].filter(Boolean);
  try { candidates.push(path.join(execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright')); } catch (e) {}
  for (const c of candidates) { try { return require(c); } catch (e) {} }
  console.error(NO_PLAYWRIGHT);
  process.exit(1);
}

function audit({ scope }) {
  const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0; };
  const count = (m, k) => { if (k) m[k] = (m[k] || 0) + 1; };
  const parse = c => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const bgOf = el => { for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.9) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
  const rgb = c => `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`;

  // A form field shows its value, or its placeholder (styled by ::placeholder) when empty; neither is a
  // child text node. A select shows its chosen option; a list box's options count as elements of their own.
  const fieldText = el => {
    if (el.tagName === 'SELECT') { const o = el.selectedOptions[0]; return !el.multiple && el.size <= 1 && o && o.text.trim() ? { text: o.text, cs: getComputedStyle(el) } : null; }
    if (el.tagName === 'INPUT' && /^(hidden|checkbox|radio|range|color|file|image)$/.test(el.type)) return null;
    if (el.value.trim()) return { text: el.type === 'password' ? '(password)' : el.value, cs: getComputedStyle(el) };
    if (el.placeholder.trim()) { const ph = getComputedStyle(el, '::placeholder'); return { text: el.placeholder, cs: ph.color ? ph : getComputedStyle(el) }; }
    return null;
  };

  const roots = scope ? [...document.querySelectorAll(scope)] : [document.body];
  const els = new Set();
  for (const r of roots) { if (scope) els.add(r); r.querySelectorAll('*').forEach(e => els.add(e)); }

  const inv = { fontSize: {}, fontWeight: {}, fontFamily: {}, lineHeight: {}, color: {}, background: {}, radius: {}, shadow: {}, border: {} };
  const pairs = {}; let lowTotal = 0; const longLines = []; const clipped = []; let textNodes = 0;
  for (const el of els) {
    if (!vis(el)) continue;
    const cs = getComputedStyle(el);
    const field = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
    const shown = field ? fieldText(el) : [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) ? { text: el.textContent, cs } : null;
    if (shown) {
      const ts = shown.cs; // the style the text is drawn in: a placeholder has its own
      textNodes++;
      count(inv.fontSize, ts.fontSize); count(inv.fontWeight, ts.fontWeight);
      count(inv.fontFamily, ts.fontFamily.split(',')[0].replace(/["']/g, '').trim());
      count(inv.lineHeight, ts.lineHeight); count(inv.color, ts.color);
      const fg0 = parse(ts.color), bg = bgOf(el);
      if (fg0) {
        const fg = fg0.a < 1 ? { r: fg0.r * fg0.a + bg.r * (1 - fg0.a), g: fg0.g * fg0.a + bg.g * (1 - fg0.a), b: fg0.b * fg0.a + bg.b * (1 - fg0.a) } : fg0;
        const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        const size = parseFloat(ts.fontSize); const bold = +ts.fontWeight >= 700;
        const need = (size >= 24 || (bold && size >= 18.66)) ? 3 : 4.5;
        if (ratio < need) {
          lowTotal++;
          const key = `${rgb(fg)} on ${rgb(bg)}`;
          const p = pairs[key] || (pairs[key] = { pair: key, ratio: +ratio.toFixed(2), need, count: 0, sizes: {}, examples: [] });
          p.count++; count(p.sizes, ts.fontSize);
          const t = shown.text.trim().replace(/\s+/g, ' ').slice(0, 40);
          if (p.examples.length < 4 && !p.examples.includes(t)) p.examples.push(t);
        }
      }
      if (!field && !cs.display.startsWith('inline')) {
        const size = parseFloat(cs.fontSize);
        const lh = cs.lineHeight === 'normal' ? size * 1.2 : parseFloat(cs.lineHeight);
        const h = el.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        const lines = Math.max(1, Math.round(h / lh));
        const chars = el.textContent.trim().replace(/\s+/g, ' ').length / lines;
        if (chars > 90 && longLines.length < 10) longLines.push({ tag: el.tagName.toLowerCase(), text: el.textContent.trim().slice(0, 40), approxCharsPerLine: Math.round(chars), lines });
      }
    }
    const bgc = parse(cs.backgroundColor); if (bgc && bgc.a > 0) count(inv.background, cs.backgroundColor);
    if (cs.borderRadius !== '0px') count(inv.radius, cs.borderRadius);
    if (cs.boxShadow !== 'none') count(inv.shadow, cs.boxShadow);
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) if (cs[`border${side}Style`] !== 'none' && cs[`border${side}Width`] !== '0px') count(inv.border, `${cs[`border${side}Width`]} ${cs[`border${side}Style`]} ${cs[`border${side}Color`]}`);
    if (/(hidden|auto|scroll|clip)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1 && clipped.length < 10) clipped.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 40), hiddenPx: el.scrollWidth - el.clientWidth, scrolls: /(auto|scroll)/.test(cs.overflowX), text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 30) });
  }
  const brokenImages = [...els].filter(e => e.tagName === 'IMG' && e.complete && e.naturalWidth === 0).map(e => e.getAttribute('src') || '(no src)');
  const summary = {}; for (const k in inv) summary[k] = { distinct: Object.keys(inv[k]).length, values: Object.entries(inv[k]).sort((a, b) => b[1] - a[1]) };
  const docW = document.documentElement.scrollWidth, winW = window.innerWidth;
  return {
    scope: scope ? { selector: scope, matched: roots.length } : null,
    textNodes, summary,
    lowContrast: { total: lowTotal, pairs: Object.values(pairs).sort((a, b) => b.count - a.count) },
    longLines, clipped, brokenImages,
    horizontalOverflow: docW > winW + 1 ? docW - winW : 0,
    pageHeight: document.documentElement.scrollHeight,
  };
}

// The interaction on the first screen: what the hand can reach, what runs under the controls, what repeats,
// what stands out, and how big the type is for the eye. Walks shadow roots too (an app shell often lives in one).
async function interaction({ scope, touch, phone }) {
  await document.fonts.ready;
  const W = innerWidth, H = innerHeight, degPerPx = phone ? 0.0287 : touch ? 0.0275 : 0.0213, minTarget = touch ? 44 : 24;
  const all = []; const walk = r => { for (const el of r.querySelectorAll('*')) { all.push(el); if (el.shadowRoot) walk(el.shadowRoot); } }; walk(document);
  const up = el => el.parentElement || (el.getRootNode && el.getRootNode() !== document ? el.getRootNode().host : null) || null;
  const within = (a, b) => { for (let e = b; e; e = up(e)) if (e === a) return true; return false; };
  const roots = scope ? [...document.querySelectorAll(scope)] : null;
  const inScope = el => !roots || roots.some(r => within(r, el));
  const onScreen = r => r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < H && r.left < W;
  const shown = el => { const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && (+cs.opacity > 0.05 || (el.tagName === 'INPUT' && /^(checkbox|radio)$/.test(el.type))); };
  const layerOf = el => { for (let e = el; e; e = up(e)) if (e.nodeType === 1 && /^(fixed|sticky)$/.test(getComputedStyle(e).position)) return e; return null; };
  const nameOf = el => el.tagName.toLowerCase() + (el.classList && el.classList.length ? '.' + el.classList[0] : '');
  const clean = s => (s || '').replace(/\s+/g, ' ').trim();
  const labelOf = el => clean(el.getAttribute('aria-label') || el.innerText || el.value || el.placeholder || el.title || (el.shadowRoot ? el.shadowRoot.textContent : '')).slice(0, 40);
  const direct = el => clean([...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' '));
  const parse = c => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const bgOf = el => { for (let e = el; e; e = up(e)) { if (e.nodeType !== 1) continue; const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.9) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
  const rgb = c => `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`;
  const chroma = c => (Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b)) / 255;
  const hue = c => { const r = c.r / 255, g = c.g / 255, b = c.b / 255, mx = Math.max(r, g, b), d = mx - Math.min(r, g, b); if (!d) return 0; const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (h * 60 + 360) % 360; };

  // Controls: the outermost interactive element of each target, on the first screen, by layer.
  const CTRL = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=tab],[role=menuitem],[role=checkbox],[role=switch],[role=option],[tabindex]:not([tabindex="-1"]),[contenteditable="true"],[contenteditable=""]';
  const isCtrl = el => el.nodeType === 1 && el.matches(CTRL);
  const controls = [];
  for (const el of all) {
    if (!isCtrl(el) || !inScope(el) || !shown(el)) continue;
    let nested = false; for (let e = up(el); e; e = up(e)) if (isCtrl(e)) { nested = true; break; }
    // A field's target is its label too: a radio inside a tappable row is as big as the row.
    const r = [...(el.labels || [])].map(l => l.getBoundingClientRect()).reduce((a, b) => (b.width * b.height > a.width * a.height ? b : a), el.getBoundingClientRect());
    if (nested || !onScreen(r)) continue;
    const cs = getComputedStyle(el), p = el.parentElement;
    const inlineText = cs.display === 'inline' && p && clean(p.innerText).length > clean(el.innerText).length + 10; // a link inside a sentence
    const layer = layerOf(el);
    controls.push({ el: nameOf(el), label: labelOf(el), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      layer: layer ? nameOf(layer) : '', small: !inlineText && (r.width < minTarget || r.height < minTarget) });
  }

  // Text that runs under a fixed or sticky layer it does not belong to.
  const texts = all.filter(el => el.nodeType === 1 && inScope(el) && direct(el) && shown(el));
  const covered = {};
  for (const el of texts) {
    const r = el.getBoundingClientRect(); if (!onScreen(r)) continue;
    const y = r.top + r.height / 2; if (y < 0 || y >= H) continue;
    for (const x of [r.left + Math.min(6, r.width / 2), r.left + r.width / 2]) {
      if (x < 0 || x >= W) continue;
      let hit = document.elementFromPoint(x, y);
      while (hit && hit.shadowRoot) { const inner = hit.shadowRoot.elementFromPoint(x, y); if (!inner || inner === hit) break; hit = inner; }
      if (!hit || hit === el || within(el, hit) || within(hit, el)) continue;
      const cover = layerOf(hit); if (!cover || within(cover, el)) continue;
      const k = `${nameOf(cover)} "${labelOf(cover).slice(0, 30)}"`;
      const c = covered[k] || (covered[k] = { cover: k, count: 0, examples: [] });
      c.count++; const t = direct(el).slice(0, 36); if (c.examples.length < 4 && !c.examples.includes(t)) c.examples.push(t);
      break;
    }
  }

  // Short marks repeated on the first screen: repetition eats novelty.
  const rep = {};
  for (const el of texts) {
    const t = direct(el); if (t.length > 24) continue;
    const k = t + '|' + getComputedStyle(el).color;
    const e = rep[k] || (rep[k] = { text: t, color: getComputedStyle(el).color, screen: 0, page: 0 });
    e.page++; if (onScreen(el.getBoundingClientRect())) e.screen++;
  }

  // What stands out, roughly: size × weight × luminance contrast × how rare its hue is on the screen; pictures by area.
  const seen = texts.filter(el => onScreen(el.getBoundingClientRect()));
  const inks = seen.map(el => parse(getComputedStyle(el).color)).filter(Boolean);
  const items = {};
  for (const el of seen) {
    const cs = getComputedStyle(el), fg0 = parse(cs.color); if (!fg0) continue;
    const bg = bgOf(el), fg = fg0.a < 1 ? { r: fg0.r * fg0.a + bg.r * (1 - fg0.a), g: fg0.g * fg0.a + bg.g * (1 - fg0.a), b: fg0.b * fg0.a + bg.b * (1 - fg0.a) } : fg0;
    const L1 = lum(fg), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    let pop = 1;
    if (chroma(fg) > 0.25) {
      const h = hue(fg), same = inks.filter(c => chroma(c) > 0.25 && Math.min(Math.abs(hue(c) - h), 360 - Math.abs(hue(c) - h)) < 25).length;
      pop = 1 + 3 * chroma(fg) * (1 - same / inks.length);
    }
    const score = parseFloat(cs.fontSize) * ((+cs.fontWeight || 400) / 400) * (Math.log(ratio) / Math.log(21)) * pop;
    const t = direct(el).slice(0, 36), k = [t, cs.fontSize, cs.fontWeight, cs.color].join('|'), r = el.getBoundingClientRect();
    const it = items[k] || (items[k] = { text: t, size: cs.fontSize, weight: cs.fontWeight, color: rgb(fg), score: +score.toFixed(1), n: 0, x: Math.round(r.x), y: Math.round(r.y) });
    it.n++;
  }
  for (const el of all) {
    if (!/^(img|svg|canvas|video)$/i.test(el.tagName) || !inScope(el) || !shown(el)) continue;
    const r = el.getBoundingClientRect(); if (!onScreen(r)) continue;
    const area = Math.max(0, Math.min(r.right, W) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, H) - Math.max(r.top, 0));
    if (area < 48 * 48) continue;
    items['pic|' + Object.keys(items).length] = { text: `(${el.tagName.toLowerCase()}${el.alt ? ` "${el.alt.slice(0, 24)}"` : ''})`, size: `${Math.round(r.width)}×${Math.round(r.height)}`, weight: '', color: '', score: +(Math.sqrt(area) / 3).toFixed(1), n: 1, x: Math.round(r.x), y: Math.round(r.y) };
  }

  // The x-height of every type size in use, in CSS px and in degrees of visual angle.
  const ctx = document.createElement('canvas').getContext('2d'), xh = {};
  for (const el of texts) {
    const cs = getComputedStyle(el), k = [cs.fontFamily, cs.fontSize, cs.fontWeight, cs.fontStyle].join('|');
    if (!xh[k]) {
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const x = ctx.measureText('x').actualBoundingBoxAscent || parseFloat(cs.fontSize) * 0.5;
      xh[k] = { family: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), size: cs.fontSize, weight: cs.fontWeight, xPx: +x.toFixed(1), deg: +(x * degPerPx).toFixed(3), count: 0 };
    }
    xh[k].count++;
  }

  return {
    viewport: { width: W, height: H }, degPerPx, minTarget, controls,
    covered: Object.values(covered).sort((a, b) => b.count - a.count),
    repeats: Object.values(rep).filter(e => e.screen >= 4).sort((a, b) => b.screen - a.screen).slice(0, 10),
    standsOut: Object.values(items).sort((a, b) => b.score - a.score).slice(0, 12),
    xHeights: Object.values(xh).sort((a, b) => a.deg - b.deg),
  };
}

async function imageViews(browser) {
  // A screenshot has no DOM: make the squint and grayscale views, and tiles when it is tall.
  const html = path.join(out, '_image.html');
  fs.writeFileSync(html, `<!doctype html><html><body style="margin:0;background:#fff"><img id="i" src="${target}" style="display:block"></body></html>`);
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: scale });
  await page.goto('file://' + html);
  const size = await page.evaluate(async () => { const i = document.getElementById('i'); if (!i.complete) await new Promise(r => { i.onload = r; i.onerror = r; }); return { w: i.naturalWidth, h: i.naturalHeight }; });
  if (!size.w) { console.error('Could not load the image: ' + target); await browser.close(); process.exit(1); }
  const w = Math.ceil(size.w / scale), h = Math.ceil(size.h / scale);
  await page.evaluate(({ w }) => { document.getElementById('i').style.width = w + 'px'; }, { w });
  await page.setViewportSize({ width: w, height: Math.min(h, 1000) });
  const files = [];
  const shot = async (opts, name) => { await page.screenshot({ path: path.join(out, name), fullPage: true, ...opts }); files.push(name); };
  if (h > 1400) for (let i = 0, y = 0; y < h && i < 30; i++, y += 840) await shot({ clip: { x: 0, y, width: w, height: Math.min(900, h - y) } }, `image-${String(i + 1).padStart(2, '0')}.png`);
  if (squint) {
    await page.addStyleTag({ content: 'html{filter:blur(5px) !important}' });
    await shot({}, 'image-squint.png');
    await page.addStyleTag({ content: 'html{filter:grayscale(1) !important}' });
    await shot({}, 'image-gray.png');
  }
  await browser.close();
  fs.unlinkSync(html);
  console.log(`Wrote ${files.length} images to ${out}: ${files.join(', ')}`);
  console.log('A screenshot has no DOM, so there is no audit: count sizes, colours and boxes by eye. Look at the screenshot itself first.');
}

(async () => {
  const pw = loadPlaywright();
  let browser;
  try { browser = await pw.chromium.launch(); } catch (e) {
    console.error(String(e).split('\n').slice(0, 3).join('\n') + '\nThis Playwright has no browser build. Run `npx playwright install chromium` from the folder that holds its node_modules.');
    process.exit(1);
  }
  if (/\.(png|jpe?g|webp|gif)$/i.test(target) && target.startsWith('file:')) { await imageViews(browser); return; }
  const report = { target, dark, scope, generatedAt: new Date().toISOString(), targets: {} };
  const files = []; const warnings = [];
  const shot = async (fn, name) => { await fn(path.join(out, name)); files.push(name); };
  // What to render: desktop widths, and real devices with their screen, density, touch, mobile viewport
  // rules and user agent, whose first screen is as tall as the browser really shows.
  const targets = widths.map(w => ({ tag: `${w}`, label: `${w}px`, touch: false, ctx: { viewport: { width: w, height: 900 }, deviceScaleFactor: scale } }));
  for (const name of deviceNames) {
    const d = pw.devices[name];
    if (!d) { warnings.push(`no device "${name}" in this Playwright; names look like "iPhone 15", "Galaxy S24", "Pixel 7", "iPad Pro 11 landscape"`); continue; }
    const { defaultBrowserType, ...ctx } = d;
    ctx.deviceScaleFactor = scaleGiven ? scale : Math.min(d.deviceScaleFactor, 2);
    targets.push({ tag: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, ''), label: name, touch: !!d.hasTouch, engine: defaultBrowserType, ctx });
  }
  let webkit = null, webkitTried = false;
  for (const t of targets) {
    let b = browser;
    if (t.engine === 'webkit') {
      if (!webkitTried) {
        webkitTried = true;
        try { webkit = await pw.webkit.launch(); } catch (e) { warnings.push("Safari's engine (WebKit) is not installed, so Apple devices render in Chromium with their screen, density, touch and user agent; `npx playwright install webkit` adds it (about 100 MB; ask first)."); }
      }
      if (webkit) b = webkit;
    }
    const w = t.ctx.viewport.width, h = t.ctx.viewport.height;
    const page = await b.newPage({ ...t.ctx, colorScheme: dark ? 'dark' : 'light' });
    // A live app keeps a connection open and never goes network-idle: wait for load, then for quiet a few seconds at most.
    await page.goto(target, { waitUntil: 'load', timeout: 60000 }).catch(e => warnings.push('goto: ' + String(e).slice(0, 200)));
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(extraWait);
    const tag = `${t.tag}${dark ? '-dark' : ''}`;
    const matches = scope ? Math.min(await page.locator(scope).count(), 6) : 0;
    if (scope && !matches) warnings.push(`--scope "${scope}" matched nothing at ${t.label}, so the audit covers nothing.`);
    // Element shots scroll the page, and any inner scroll box, to their element. So every first-screen
    // view first puts each scroller back where it was after load (the top, for most pages) and waits
    // two frames: the viewport, squint and grayscale shots then show the same screen.
    const atLoad = await page.evaluateHandle(() => new Map([...document.querySelectorAll('*')].filter(e => e.scrollTop || e.scrollLeft).map(e => [e, [e.scrollLeft, e.scrollTop]])));
    const restore = () => page.evaluate(atLoad => new Promise(done => {
      for (const e of document.querySelectorAll('*')) {
        const [x, y] = atLoad.get(e) || [0, 0];
        if (e.scrollLeft !== x || e.scrollTop !== y) e.scrollTo({ left: x, top: y, behavior: 'instant' });
      }
      requestAnimationFrame(() => requestAnimationFrame(done)); setTimeout(done, 500);
    }), atLoad);
    const firstScreen = async name => { await restore(); await shot(p => page.screenshot({ path: p }), name); };
    await firstScreen(`${tag}-viewport.png`);
    await shot(p => page.screenshot({ path: p, fullPage: true }), `${tag}-full.png`);
    // Screen by screen, the way a person scrolls. Clipping the whole-page image instead would show a sticky
    // picture once, at the top, where on the page it stays and changes with each screen (KK, 25 Sep 2026).
    const stuck = await page.evaluate(() => [...document.querySelectorAll('body *')]
      .filter(e => /^(sticky|fixed)$/.test(getComputedStyle(e).position) && e.getBoundingClientRect().height > 40).length);
    if (stuck) warnings.push(`${stuck} sticky or fixed element(s) at ${t.label}: ${tag}-full.png shows each once; read the ${tag}-screen-NN.png shots.`);
    const scrolled = () => page.evaluate(() => scrollY + [...document.querySelectorAll('body *')].reduce((s, e) => s + e.scrollTop, 0));
    if (await page.evaluate(h => document.documentElement.scrollHeight > h * 1.15 || [...document.querySelectorAll('body *')]
      .some(e => e.scrollHeight > e.clientHeight + 40 && /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.clientHeight > h / 2), h)) {
      await page.mouse.move(w / 2, h / 2);
      for (let i = 0; i < 30; i++) {
        await shot(p => page.screenshot({ path: p }), `${tag}-screen-${String(i + 1).padStart(2, '0')}.png`);
        const before = await scrolled();
        await page.mouse.wheel(0, h - 60);
        await page.waitForTimeout(screenWait);
        if ((await scrolled()) <= before + 2) { await page.evaluate(() => 0); break; }
      }
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForTimeout(300);
    }
    const scopeShots = async suffix => {
      for (let i = 0; i < matches; i++) {
        const el = page.locator(scope).nth(i);
        if (!(await el.isVisible())) { if (!suffix) warnings.push(`--scope match ${i + 1} is hidden at ${t.label}, so it has no shot there.`); continue; }
        await shot(p => el.screenshot({ path: p, timeout: 15000 }), `${tag}-scope-${i + 1}${suffix}.png`);
      }
    };
    await scopeShots('');
    const r = report.targets[t.tag] = { label: t.label, viewport: { width: w, height: h }, touch: t.touch, dpr: t.ctx.deviceScaleFactor, engine: b === webkit ? 'webkit' : 'chromium', ...(await page.evaluate(audit, { scope })) };
    await restore();
    r.interaction = await page.evaluate(interaction, { scope, touch: t.touch, phone: t.touch && w < 600 })
      .catch(e => { warnings.push(`interaction at ${t.label}: ` + String(e).slice(0, 200)); return null; });
    if (squint) {
      await page.addStyleTag({ content: 'html{filter:blur(5px) !important}' });
      await firstScreen(`${tag}-squint.png`);
      await shot(p => page.screenshot({ path: p, fullPage: true }), `${tag}-full-squint.png`);
      await scopeShots('-squint');
      await page.addStyleTag({ content: 'html{filter:grayscale(1) !important}' });
      await firstScreen(`${tag}-gray.png`);
      await shot(p => page.screenshot({ path: p, fullPage: true }), `${tag}-full-gray.png`);
      await scopeShots('-gray');
    }
    await page.close();
  }
  if (motion) {
    const { runMotion, motionText } = require('./motion-check.cjs');
    const mr = await runMotion({ browser, target, out, width: widths[0] || 1440, dark, sandbox: args.includes('--sandbox'), dragSel: opt('--drag', null), gemini: args.includes('--gemini'), warnings });
    fs.writeFileSync(path.join(out, 'motion.json'), JSON.stringify(mr, null, 1));
    fs.writeFileSync(path.join(out, 'motion.txt'), motionText(mr));
  }
  await browser.close();
  if (webkit) await webkit.close();

  const base = dark ? 'audit-dark' : 'audit';
  fs.writeFileSync(path.join(out, `${base}.json`), JSON.stringify(report, null, 1));
  const short = v => (v.length > 40 ? v.slice(0, 40) + '…' : v);
  let txt = `Target: ${target}${dark ? ' (dark)' : ''}${scaleGiven ? ` (scale ${scale})` : ''}\n`;
  for (const t of targets) {
    const r = report.targets[t.tag]; if (!r) continue;
    const kind = `${r.viewport.width}×${r.viewport.height}${r.touch ? `, touch, ${r.engine}` : ''}`;
    txt += `\n== ${r.label}  (${kind}; text elements: ${r.textNodes}, page height: ${r.pageHeight}px${r.horizontalOverflow ? `, HORIZONTAL OVERFLOW ${r.horizontalOverflow}px` : ''})\n`;
    if (r.scope) txt += `scope       "${r.scope.selector}" matched ${r.scope.matched}; everything below counts only inside it\n`;
    for (const [k, v] of Object.entries(r.summary)) {
      const shown = v.values.slice(0, 24).map(([val, n]) => `${short(val)}×${n}`).join(' | ');
      txt += `${k.padEnd(11)} ${String(v.distinct).padStart(3)} distinct: ${shown}${v.values.length > 24 ? ` | … ${v.values.length - 24} more in ${base}.json` : ''}\n`;
    }
    const lc = r.lowContrast;
    if (lc.total) txt += `low contrast: ${lc.total} text elements in ${lc.pairs.length} colour pairs\n` + lc.pairs.slice(0, 12).map(p => `  ${p.pair}  ${p.ratio} < ${p.need}  ×${p.count}  (${Object.keys(p.sizes).join(', ')}) e.g. ${p.examples.map(x => `"${x}"`).join(', ')}\n`).join('');
    if (r.longLines.length) txt += `long lines: ${r.longLines.map(x => `${x.tag} "${x.text}" ~${x.approxCharsPerLine}ch`).join('; ')}\n`;
    if (r.clipped.length) txt += `cut off or scrolling sideways: ${r.clipped.map(x => `${x.tag}${x.cls ? '.' + x.cls.split(' ')[0] : ''} "${x.text}" ${x.hiddenPx}px ${x.scrolls ? 'scrolls' : 'hidden'}`).join('; ')}\n`;
    if (r.brokenImages.length) txt += `broken images (${r.brokenImages.length}): ${r.brokenImages.slice(0, 6).join(', ')}\n`;
    const ia = r.interaction; if (!ia) continue;
    txt += `\ninteraction on the first screen (${ia.viewport.width}×${ia.viewport.height})\n`;
    const layers = {}; for (const c of ia.controls) (layers[c.layer || ''] = layers[c.layer || ''] || []).push(c);
    const content = layers[''] || []; delete layers[''];
    const layerCount = Object.values(layers).reduce((s, l) => s + l.length, 0);
    txt += `controls    ${ia.controls.length} on screen: ${layerCount} in fixed or sticky layers, ${content.length} in the content\n`;
    for (const [name, list] of Object.entries(layers)) txt += `  layer ${name}: ${list.map(c => `${c.el.split('.')[0]} "${c.label}" ${c.w}×${c.h} at ${c.x},${c.y}`).join(' · ')}\n`;
    const tally = list => { const m = {}; for (const c of list) { const k = `"${c.label}" ${c.w}×${c.h}`; m[k] = (m[k] || 0) + 1; } return Object.entries(m).sort((a, b) => b[1] - a[1]); };
    const small = ia.controls.filter(c => c.small);
    if (small.length) txt += `  below ${ia.minTarget}px: ${small.length}: ${tally(small).slice(0, 6).map(([k, n]) => `${k}×${n}`).join(', ')}\n`;
    const same = tally(content).filter(([, n]) => n >= 5);
    if (same.length) txt += `  repeated in the content: ${same.slice(0, 6).map(([k, n]) => `${k}×${n}`).join(', ')}\n`;
    if (ia.covered.length) txt += `under a layer ${ia.covered.reduce((s, c) => s + c.count, 0)} text elements: ${ia.covered.map(c => `under ${c.cover} ×${c.count}, e.g. ${c.examples.map(x => `"${x}"`).join(', ')}`).join('; ')}\n`;
    if (ia.repeats.length) txt += `repeats     ${ia.repeats.map(e => `"${e.text}" ×${e.screen} on screen (${e.page} on the page) in ${e.color}`).join('; ')}\n`;
    txt += `stands out  rough: size × weight × contrast × how rare the colour is; hold it against your own first look\n` +
      ia.standsOut.map((s, i) => `  ${String(i + 1).padStart(2)}. ${s.score.toString().padStart(5)}  "${s.text}" ${s.size}${s.weight ? ' ' + s.weight : ''}${s.color ? ' ' + s.color : ''}${s.n > 1 ? ` ×${s.n}` : ''} at ${s.x},${s.y}\n`).join('');
    txt += `x-height    at ${ia.degPerPx}°/px; below about 0.15° reading slows, from 0.2° it is fluent (Legge & Bigelow 2011)\n` +
      ia.xHeights.map(x => `  ${x.size} ${x.weight} ${x.family}: ${x.xPx}px = ${x.deg}° ×${x.count}${x.deg < 0.15 ? '  below 0.15°' : x.deg < 0.2 ? '  at the edge' : ''}\n`).join('');
  }
  fs.writeFileSync(path.join(out, `${base}.txt`), txt);

  const kinds = [['viewport', /-viewport\.png$/], ['screens', /-screen-\d+\.png$/], ['whole page', /-full\.png$/], ['squint', /squint\.png$/], ['grayscale', /gray\.png$/], ['scope', /-scope-\d+\.png$/]];
  console.log(`Wrote ${files.length} screenshots and ${base}.txt / ${base}.json${motion ? ', motion.txt / motion.json' : ''} to ${out}`);
  for (const [name, rx] of kinds) { const n = files.filter(f => rx.test(f)).length; if (n) console.log(`  ${name.padEnd(10)} ${n}`); }
  for (const wmsg of warnings) console.log('warning: ' + wmsg);
  console.log('Look at the *-viewport.png shots first and note the first second; read the audit after that.');
})();
