import { mountBanner } from '@shared/banner.js';
mountBanner('01-counterpunch');

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, props = {}, html = '') => Object.assign(document.createElement(tag), props, html ? { innerHTML: html } : {});

/* ---------- Catalogue data ---------- */
const families = [
  {
    id: 'hobnail', name: 'Hobnail', css: '"Bricolage Grotesque"', price: 180, bg: 'var(--marigold)',
    blurb: 'A grotesque with its boots on', detail: '56 styles, Light to ExtraBold, Condensed to Normal',
    axes: [
      { tag: 'wght', label: 'Weight', min: 200, max: 800, val: 640 },
      { tag: 'wdth', label: 'Width', min: 75, max: 100, val: 82 },
      { tag: 'opsz', label: 'Optical size', min: 12, max: 96, val: 96 },
    ],
  },
  {
    id: 'quire', name: 'Quire', css: '"Fraunces"', price: 220, bg: 'var(--rose)',
    blurb: 'An old-style serif that can go soft', detail: '72 styles, with Softness and Wonk axes',
    axes: [
      { tag: 'wght', label: 'Weight', min: 100, max: 900, val: 500 },
      { tag: 'SOFT', label: 'Softness', min: 0, max: 100, val: 60 },
      { tag: 'WONK', label: 'Wonk', min: 0, max: 1, val: 1, step: 1 },
      { tag: 'opsz', label: 'Optical size', min: 9, max: 144, val: 144 },
    ],
  },
  {
    id: 'gantry', name: 'Gantry', css: '"Roboto Flex"', price: 260, bg: 'var(--mint)',
    blurb: 'Signage width, hairline to slab-heavy', detail: '144 styles, Compressed to Extended',
    axes: [
      { tag: 'wght', label: 'Weight', min: 100, max: 1000, val: 760 },
      { tag: 'wdth', label: 'Width', min: 25, max: 151, val: 110 },
      { tag: 'slnt', label: 'Slant', min: -10, max: 0, val: 0 },
      { tag: 'opsz', label: 'Optical size', min: 8, max: 144, val: 144 },
    ],
  },
  {
    id: 'tally', name: 'Tally', css: '"Recursive"', price: 140, bg: '#c9d0ff',
    blurb: 'One file for code and for captions', detail: '40 styles, Mono to Sans, Linear to Casual',
    axes: [
      { tag: 'wght', label: 'Weight', min: 300, max: 1000, val: 600 },
      { tag: 'MONO', label: 'Monospace', min: 0, max: 1, val: 1, step: 0.01 },
      { tag: 'CASL', label: 'Casual', min: 0, max: 1, val: 0, step: 0.01 },
      { tag: 'slnt', label: 'Slant', min: -15, max: 0, val: 0 },
    ],
  },
];

/* ---------- Hero: every letter follows the cursor ---------- */
const hero = $('#heroWord');
const chars = [];
hero.querySelectorAll('.line').forEach((line) => {
  const text = line.textContent;
  line.textContent = '';
  [...text].forEach((c) => {
    const s = el('span', { className: 'ch', textContent: c === ' ' ? ' ' : c });
    s.setAttribute('aria-hidden', 'true');
    line.append(s);
    chars.push(s);
  });
});

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let centres = [];
const measure = () => {
  centres = chars.map((c) => {
    const r = c.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 + scrollY };
  });
};
const setRest = () => chars.forEach((c, i) => {
  // resting state is a slow wave so the headline is never a flat line of one weight
  const t = i / (chars.length - 1);
  c.style.setProperty('--w', Math.round(300 + 500 * Math.sin(t * Math.PI) ** 2));
  c.style.setProperty('--d', Math.round(58 + 22 * Math.cos(t * Math.PI * 2)));
  c.classList.remove('hot');
});
setRest();
document.fonts.ready.then(measure);
addEventListener('resize', measure);

if (!reduce) {
  hero.parentElement.addEventListener('pointermove', (e) => {
    if (!centres.length) measure();
    const radius = Math.max(260, innerWidth * 0.24);
    chars.forEach((c, i) => {
      const dx = e.clientX - centres[i].x;
      const dy = e.clientY + scrollY - centres[i].y;
      const k = Math.max(0, 1 - Math.hypot(dx, dy) / radius);
      const e2 = k * k * (3 - 2 * k);
      c.style.setProperty('--w', Math.round(180 + 820 * e2));
      c.style.setProperty('--d', Math.round(40 + 90 * e2));
      c.classList.toggle('hot', k > 0.72);
    });
  });
  hero.parentElement.addEventListener('pointerleave', setRest);
}

/* ---------- Catalogue rows ---------- */
const rows = $('#rows');
families.forEach((f) => {
  const a = el('a', { className: `row r-${f.id}`, href: '#tester' }, `
    <div class="row-name">${f.name}</div>
    <div class="row-meta"><strong>${f.blurb}</strong><span>${f.detail}</span><span class="row-price">from £${f.price}</span></div>`);
  a.style.setProperty('--bg', f.bg);
  a.addEventListener('click', () => selectFamily(f.id));
  rows.append(a);
});

/* ---------- Type tester ---------- */
const specimen = $('#specimen');
const stage = $('#stage');
const state = { fam: families[0], size: 120, vals: {} };

const tabs = $('#tabs');
families.forEach((f) => {
  const b = el('button', { type: 'button', textContent: f.name });
  b.setAttribute('role', 'tab');
  b.dataset.id = f.id;
  b.style.fontFamily = f.css;
  b.addEventListener('click', () => selectFamily(f.id));
  tabs.append(b);
});

function slider(label, min, max, val, step, onInput) {
  const wrap = el('label', { className: 'slider' });
  const out = el('output', { textContent: val });
  const input = el('input', { type: 'range', min, max, value: val, step: step ?? 1 });
  input.addEventListener('input', () => { out.textContent = input.value; onInput(+input.value); });
  wrap.append(el('span', { textContent: label }), out, input);
  return wrap;
}

function selectFamily(id) {
  state.fam = families.find((f) => f.id === id);
  state.vals = Object.fromEntries(state.fam.axes.map((a) => [a.tag, a.val]));
  tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', b.dataset.id === id));
  const box = $('#sliders');
  box.innerHTML = '';
  box.append(slider('Size', 28, 260, state.size, 1, (v) => { state.size = v; apply(); }));
  state.fam.axes.forEach((a) => box.append(slider(a.label, a.min, a.max, a.val, a.step, (v) => { state.vals[a.tag] = v; apply(); })));
  apply();
}

function apply() {
  const fvs = Object.entries(state.vals).map(([k, v]) => `"${k}" ${v}`).join(', ');
  specimen.style.fontFamily = state.fam.css;
  specimen.style.fontSize = `clamp(28px, ${(state.size / 14.4).toFixed(2)}vw, ${state.size}px)`;
  specimen.style.fontVariationSettings = fvs;
  $('#cssOut').textContent = `font-family: "${state.fam.name} Variable";\nfont-size: ${state.size}px;\nfont-variation-settings:\n  ${fvs.replaceAll(', ', ',\n  ')};`;
}

const swatches = [
  ['#ffb703', '#101223'], ['#2a3cf0', '#ffffff'], ['#101223', '#b9f2d0'], ['#ff8fb8', '#101223'], ['#ffffff', '#2a3cf0'],
];
swatches.forEach(([bg, fg], i) => {
  const b = el('button', { type: 'button' });
  b.style.background = bg;
  b.setAttribute('aria-label', `Specimen colour ${i + 1}`);
  b.setAttribute('aria-pressed', i === 0);
  b.addEventListener('click', () => {
    stage.style.setProperty('--sbg', bg);
    stage.style.setProperty('--sfg', fg);
    $('#swatches').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
  });
  $('#swatches').append(b);
});

const toast = (msg) => {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('on'), 2200);
};
$('#copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#cssOut').textContent); toast('CSS copied'); }
  catch { toast('Copy failed. Select the CSS and copy it by hand.'); }
});
selectFamily('hobnail');

/* ---------- Licence calculator ---------- */
const uses = [
  { id: 'desktop', label: 'Print and desktop', mult: 1 },
  { id: 'web', label: 'Websites', mult: 0.8 },
  { id: 'app', label: 'Apps and games', mult: 1.6 },
];
const chip = (name, value, label, checked) => el('label', { className: 'chip' }, `<input type="checkbox" name="${name}" value="${value}" ${checked ? 'checked' : ''}/><span>${label}</span>`);
families.forEach((f, i) => $('#famChips').append(chip('fam', f.id, `${f.name} £${f.price}`, i < 2)));
uses.forEach((u, i) => $('#useChips').append(chip('use', u.id, u.label, i === 0)));

let shown = 0;
function tween(to) {
  const from = shown, start = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - start) / 380);
    shown = Math.round(from + (to - from) * (1 - (1 - k) ** 3));
    $('#sum').textContent = `£${shown.toLocaleString('en-GB')}`;
    if (k < 1) requestAnimationFrame(step);
  };
  reduce ? ((shown = to), ($('#sum').textContent = `£${to.toLocaleString('en-GB')}`)) : requestAnimationFrame(step);
}
function recalc() {
  const data = new FormData($('#calc'));
  const fams = data.getAll('fam').map((id) => families.find((f) => f.id === id));
  const us = data.getAll('use').map((id) => uses.find((u) => u.id === id));
  const team = +$('#team').value;
  $('#teamOut').textContent = team === 60 ? '60 or more' : `${team} ${team === 1 ? 'person' : 'people'}`;
  const base = fams.reduce((s, f) => s + f.price, 0);
  const useMult = us.reduce((s, u) => s + u.mult, 0);
  const teamMult = 1 + Math.log2(team) * 0.55;
  const bundle = fams.length === 4 ? 0.75 : fams.length === 3 ? 0.88 : 1;
  const total = Math.round((base * useMult * teamMult * bundle) / 5) * 5;
  tween(total);
  const note = $('#note');
  $('#buy').disabled = !total;
  if (!fams.length) note.textContent = 'Pick at least one family to see a price.';
  else if (!us.length) note.textContent = 'Pick at least one place you will use the fonts.';
  else note.textContent = `${fams.map((f) => f.name).join(', ')} for ${us.map((u) => u.label.toLowerCase()).join(', ')}.${bundle < 1 ? ` Includes ${Math.round((1 - bundle) * 100)}% off for taking ${fams.length} families.` : ''} Pay once, use forever.`;
  return total;
}
$('#calc').addEventListener('input', recalc);
$('#calc').addEventListener('submit', (e) => { e.preventDefault(); toast(`Licence added to basket: £${recalc().toLocaleString('en-GB')}`); });
recalc();
