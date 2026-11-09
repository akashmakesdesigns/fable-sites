import { mountBanner } from '@shared/banner.js';
mountBanner('02-pith');

const $ = (s, r = document) => r.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const flavours = [
  {
    id: 'orange', name: 'Blood orange', word: 'blood orange', rind: '#ff5a1f', flesh: '#c81d3a', can: ['#ff5a1f', '#ffd23f', '#4a0d1a'],
    from: 'Sicily', line: 'Bitter marmalade, then raspberry, then gone.', notes: ['Marmalade', 'Raspberry', 'Dry finish'],
    note: "We press the whole blood orange, skin included, so you get the bitter edge that juice leaves behind. Then water, bubbles and a pinch of sea salt. That's the can.",
    kcal: '19 kcal', sugar: '3.9 g', vitc: '31% of your day', ing: 'whole blood orange (11%)',
  },
  {
    id: 'yuzu', name: 'Yuzu', word: 'yuzu', rind: '#f4c81e', flesh: '#fff3a0', can: ['#f4e23a', '#ff8a1f', '#17402a'],
    from: 'Kōchi, Japan', line: 'Smells like mandarin, drinks like lemon, costs us a fortune.', notes: ['Floral', 'Sharp', 'Pine at the end'],
    note: 'Yuzu is mostly peel and pips, which suits us fine. The peel is where the perfume is. We press all of it and let the bubbles carry the smell up your nose.',
    kcal: '14 kcal', sugar: '2.6 g', vitc: '44% of your day', ing: 'whole yuzu (8%)',
  },
  {
    id: 'grapefruit', name: 'Pink grapefruit', word: 'grapefruit', rind: '#ffb35c', flesh: '#ff5d7e', can: ['#ff8ea6', '#fff0a8', '#5c1036'],
    from: 'Florida', line: 'The one for people who order a negroni.', notes: ['Properly bitter', 'Rhubarb', 'Long'],
    note: 'Grapefruit pith is the bitterest thing we press, and we leave every bit of it in. If you take your coffee black and your chocolate dark, start here.',
    kcal: '17 kcal', sugar: '3.2 g', vitc: '38% of your day', ing: 'whole pink grapefruit (10%)',
  },
  {
    id: 'lime', name: 'Key lime', word: 'key lime', rind: '#3fa53a', flesh: '#d9f27a', can: ['#96e05a', '#fff36b', '#0d3a2c'],
    from: 'Florida Keys', line: 'A gin and tonic that forgot the gin.', notes: ['Zesty', 'Green', 'Salty edge'],
    note: 'Key limes are the size of a golf ball and twice as sour as the ones in your fruit bowl. Pressed whole, the peel gives a green, almost herbal snap.',
    kcal: '12 kcal', sugar: '2.1 g', vitc: '27% of your day', ing: 'whole key lime (9%)',
  },
];
const byId = Object.fromEntries(flavours.map((f) => [f.id, f]));

/* ---------- Drawn in code: citrus slice + can ---------- */
function slice({ rind, flesh }, segs = 10) {
  const wedges = [];
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2 + 0.07, a1 = ((i + 1) / segs) * Math.PI * 2 - 0.07;
    const p = (a, r) => `${(50 + Math.cos(a) * r).toFixed(2)},${(50 + Math.sin(a) * r).toFixed(2)}`;
    wedges.push(`<path d="M${p((a0 + a1) / 2, 6)} L${p(a0, 36)} A36 36 0 0 1 ${p(a1, 36)} Z" fill="${flesh}" stroke="${flesh}" stroke-width="3" stroke-linejoin="round"/>`);
  }
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="49" fill="${rind}"/><circle cx="50" cy="50" r="43" fill="#fff8e6"/>${wedges.join('')}</svg>`;
}

function canHTML(f) {
  return `<div class="can-top"></div><div class="can-base"></div>
    <div class="can-body"><div class="can-stripe"></div>
      <div class="can-label">
        <div class="can-brand">pith</div>
        <div class="can-slice">${slice(f)}</div>
        <div><div class="can-name">${f.name.toLowerCase()}</div><div class="can-small" style="margin-top:.9em">sparkling, peel and all<br/>330 ml</div></div>
      </div>
      <div class="can-shade"></div>
    </div>`;
}
function paintCan(node, f) {
  node.style.setProperty('--c1', f.can[0]);
  node.style.setProperty('--c2', f.can[1]);
  node.style.setProperty('--c3', f.can[2]);
}

/* ---------- Hero + flavour switching ---------- */
const heroCan = $('#heroCan');
heroCan.innerHTML = canHTML(flavours[0]);
paintCan(heroCan, flavours[0]);

const picker = $('#picker');
flavours.forEach((f) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.setAttribute('role', 'radio');
  b.setAttribute('aria-label', f.name);
  b.dataset.id = f.id;
  b.innerHTML = `${slice(f)}<span>${f.name}</span>`;
  b.addEventListener('click', () => setFlavour(f.id));
  picker.append(b);
});

function fillMarquee(f) {
  const bit = `<span>peel and all ${slice(f)} nothing added ${slice(f)} pressed whole ${slice(f)} very fizzy ${slice(f)}</span>`;
  $('#marquee').innerHTML = bit.repeat(4);
}

let current = null;
function setFlavour(id, instant = false) {
  if (id === current) return;
  current = id;
  const f = byId[id];
  document.body.dataset.flavour = id;
  picker.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', b.dataset.id === id));
  document.querySelectorAll('.card').forEach((c) => c.classList.toggle('on', c.dataset.id === id));

  const word = $('#heroWord');
  const label = $('.can-label', heroCan);
  const swap = () => {
    word.textContent = f.word;
    word.style.fontSize = f.word.length > 9 ? 'clamp(90px, 17.5vw, 330px)' : '';
    heroCan.innerHTML = canHTML(f);
    paintCan(heroCan, f);
    $('#heroNote').textContent = f.note;
    $('#kcal').textContent = f.kcal;
    $('#sugar').textContent = f.sugar;
    $('#vitc').textContent = f.vitc;
    $('#ingFruit').textContent = f.ing;
    document.querySelector('[data-art="fruit"]').innerHTML = slice(f, 9);
    fillMarquee(f);
  };
  if (instant || reduce) return swap();
  word.classList.add('swap');
  label.classList.add('out');
  setTimeout(() => {
    swap();
    const fresh = $('.can-label', heroCan);
    fresh.classList.add('pre');
    fresh.getBoundingClientRect();
    fresh.classList.remove('pre');
    word.classList.remove('swap');
  }, 300);
}

/* ---------- Ingredient drawings ---------- */
$('[data-art="water"]').innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <path d="M50 6 C68 34 84 50 84 66 A34 34 0 0 1 16 66 C16 50 32 34 50 6Z" fill="#7fd0ff" stroke="var(--deep)" stroke-width="4"/>
  <circle cx="40" cy="70" r="6" fill="#fff"/><circle cx="58" cy="56" r="4" fill="#fff"/><circle cx="60" cy="78" r="3" fill="#fff"/></svg>`;
$('[data-art="salt"]').innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <g fill="#fff" stroke="var(--deep)" stroke-width="4" stroke-linejoin="round">
  <rect x="14" y="44" width="34" height="34" rx="4" transform="rotate(-12 31 61)"/>
  <rect x="50" y="20" width="28" height="28" rx="4" transform="rotate(14 64 34)"/>
  <rect x="56" y="58" width="24" height="24" rx="4" transform="rotate(-6 68 70)"/></g></svg>`;

/* ---------- Line-up cards ---------- */
let basket = 0;
const bumpBasket = (n) => {
  basket += n;
  $('#basketN').textContent = basket;
  const b = $('.basket');
  b.classList.remove('bump');
  b.getBoundingClientRect();
  b.classList.add('bump');
};
const lineup = $('#lineup');
flavours.forEach((f) => {
  const card = document.createElement('article');
  card.className = 'card';
  card.dataset.id = f.id;
  card.style.setProperty('--c1', f.can[0]);
  card.innerHTML = `<div class="can">${canHTML(f)}</div>
    <h3>${f.name}</h3><p>${f.line}</p>
    <div class="notes">${f.notes.map((n) => `<span>${n}</span>`).join('')}</div>
    <button type="button">Add 12 cans, £24</button>`;
  paintCan($('.can', card), f);
  card.addEventListener('click', (e) => {
    if (e.target.closest('button')) { bumpBasket(12); e.target.textContent = 'Added 12 cans'; setTimeout(() => (e.target.textContent = 'Add 12 cans, £24'), 1600); }
    setFlavour(f.id);
  });
  lineup.append(card);
});

/* ---------- Build a box ---------- */
const mix = { orange: 3, yuzu: 3, grapefruit: 3, lime: 3 };
const steppers = $('#steppers');
flavours.forEach((f) => {
  const row = document.createElement('div');
  row.className = 'stepper';
  row.innerHTML = `<span class="dot">${slice(f)}</span><strong>${f.name}</strong>
    <span class="ctl"><button type="button" data-d="-1" aria-label="One fewer ${f.name}">−</button><output>${mix[f.id]}</output><button type="button" data-d="1" aria-label="One more ${f.name}">+</button></span>`;
  row.addEventListener('click', (e) => {
    const d = +e.target.dataset?.d;
    if (!d) return;
    mix[f.id] = Math.max(0, mix[f.id] + d);
    renderMix(d > 0 ? f.id : null);
  });
  row.dataset.id = f.id;
  steppers.append(row);
});

function renderMix(added) {
  const total = Object.values(mix).reduce((a, b) => a + b, 0);
  const full = total === 12;
  steppers.querySelectorAll('.stepper').forEach((row) => {
    const id = row.dataset.id;
    $('output', row).textContent = mix[id];
    $('[data-d="-1"]', row).disabled = mix[id] === 0;
    $('[data-d="1"]', row).disabled = total >= 12;
  });
  const cans = flavours.flatMap((f) => Array(mix[f.id]).fill(f));
  const crate = $('#crate');
  const prev = [...crate.children].map((s) => s.dataset.id || '');
  crate.innerHTML = '';
  for (let i = 0; i < 12; i++) {
    const s = document.createElement('div');
    s.className = 'slot';
    const f = cans[i];
    if (f) {
      s.dataset.id = f.id;
      const c = document.createElement('i');
      c.style.setProperty('--sc', f.can[0]);
      if (prev[i] === f.id || (!added && prev.length)) c.style.animation = 'none';
      s.append(c);
    }
    crate.append(s);
  }
  const subOn = $('#sub').checked;
  const price = 24 * (subOn ? 0.85 : 1);
  $('#mixCount').textContent = full ? (subOn ? '12 cans, every month' : '12 cans, one box') : `${total} of 12 cans chosen`;
  $('#mixPrice').textContent = `£${price.toFixed(2)}`;
  const btn = $('#addBox');
  btn.disabled = !full;
  btn.textContent = full ? 'Add box to basket' : `Choose ${12 - total} more ${12 - total === 1 ? 'can' : 'cans'}`;
}
$('#sub').addEventListener('change', () => renderMix());
$('#addBox').addEventListener('click', () => {
  bumpBasket(12);
  const btn = $('#addBox');
  btn.textContent = 'Box added to basket';
  setTimeout(() => renderMix(), 1600);
});

setFlavour('orange', true);
current = 'orange';
renderMix();

/* ---------- Bubbles ---------- */
const cv = $('#bubbles');
const ctx = cv.getContext('2d');
let W, H, bubbles = [];
function size() {
  const r = cv.getBoundingClientRect();
  const d = Math.min(devicePixelRatio, 2);
  W = cv.width = r.width * d; H = cv.height = r.height * d;
  bubbles = Array.from({ length: Math.round(r.width / 16) }, () => spawn(true));
}
function spawn(any) {
  const r = (4 + Math.random() ** 2 * 26) * Math.min(devicePixelRatio, 2);
  return { x: Math.random() * W, y: any ? Math.random() * H : H + r, r, v: 0.3 + Math.random() * 1.2, ph: Math.random() * 6.28 };
}
function tick(t) {
  ctx.clearRect(0, 0, W, H);
  ctx.lineWidth = 2.5;
  for (let i = 0; i < bubbles.length; i++) {
    const b = bubbles[i];
    b.y -= b.v * (b.r / 14 + 0.6);
    const x = b.x + Math.sin(t / 900 + b.ph) * b.r * 0.6;
    if (b.y < -b.r) bubbles[i] = spawn(false);
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.fillStyle = 'rgba(255,255,255,.13)';
    ctx.beginPath(); ctx.arc(x, b.y, b.r, 0, 6.283); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.beginPath(); ctx.arc(x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.16, 0, 6.283); ctx.fill();
  }
  if (!reduce) requestAnimationFrame(tick);
}
size();
addEventListener('resize', size);
requestAnimationFrame(tick);
