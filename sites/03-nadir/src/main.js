import { mountBanner } from '@shared/banner.js';
mountBanner('03-nadir');

const $ = (s, r = document) => r.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const dpr = () => Math.min(devicePixelRatio || 1, 2);

// small seeded generator so the sky is the same sky on every load
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/* ---------- Red-light mode ---------- */
$('#red').addEventListener('click', (e) => {
  const on = document.body.classList.toggle('red');
  e.currentTarget.setAttribute('aria-pressed', on);
});
const isRed = () => document.body.classList.contains('red');

/* ---------- Hero: stars turn about the south celestial pole; scroll opens the shutter ---------- */
const sky = $('#sky');
const sctx = sky.getContext('2d');
const R = rng(20261110);
const tints = ['#ffffff', '#ffffff', '#dfe6ff', '#cfd9ff', '#ffe9cf', '#ffd9b0'];
const stars = Array.from({ length: 1900 }, () => {
  const m = R() ** 2.4; // most stars faint, a few bright
  return { r: Math.sqrt(R()) * 1.25, a: R() * Math.PI * 2, w: 0.6 + (1 - m) * 0.4 + (m < 0.03 ? 1.5 : 0), o: 0.4 + (1 - m) * 0.6 * R(), c: tints[(R() * tints.length) | 0] };
});
// a denser river of faint stars for the Milky Way
for (let i = 0; i < 1400; i++) {
  const t = R() * 2 - 1, off = (R() + R() + R() - 1.5) * 0.11;
  const x = t * 1.1 + off * 0.5, y = t * 0.55 - 0.1 + off;
  stars.push({ r: Math.hypot(x, y), a: Math.atan2(y, x), w: 0.45, o: 0.12 + R() * 0.3, c: '#dfe6ff' });
}
let SW = 0, SH = 0, progress = 0, shown = 0;
function sizeSky() {
  const b = sky.getBoundingClientRect();
  SW = sky.width = b.width * dpr();
  SH = sky.height = b.height * dpr();
}
const expoLabel = (p) => {
  const secs = Math.round(1 + p ** 2.2 * 5399);
  if (secs < 60) return `${secs} s`;
  if (secs < 3600) return `${Math.round(secs / 60)} min`;
  return `${(secs / 3600).toFixed(1)} h`;
};
function drawSky(time) {
  shown += (progress - shown) * 0.08;
  const p = reduce ? progress : shown;
  sctx.clearRect(0, 0, SW, SH);
  const px = SW * 0.7, py = SH * 0.36, unit = Math.max(SW, SH);
  const spin = (reduce ? 0 : time * 0.0000085) + p * 0.5;
  const arc = 0.0008 + p ** 2.2 * 0.62; // radians of trail, about 2.4 hours at the far end
  const red = isRed();
  sctx.lineCap = 'round';
  for (const s of stars) {
    const rad = s.r * unit;
    const a0 = s.a + spin;
    sctx.globalAlpha = s.o * (1 - p * 0.35);
    sctx.strokeStyle = red ? '#ff5a4c' : s.c;
    sctx.lineWidth = s.w * dpr() * (1 + (1 - p) * 0.5);
    sctx.beginPath();
    sctx.arc(px, py, rad, a0, a0 + arc);
    sctx.stroke();
  }
  sctx.globalAlpha = 1;
  $('#expo').textContent = expoLabel(p);
  requestAnimationFrame(drawSky);
}
function onScroll() {
  const hero = $('#hero');
  const span = hero.offsetHeight - innerHeight;
  progress = Math.min(1, Math.max(0, (scrollY - hero.offsetTop) / span));
  const fade = Math.max(0, 1 - progress * 2.2);
  $('.hero-copy').style.opacity = fade;
  $('.hero-copy').style.transform = `translateY(${-progress * 60}px)`;
}
sizeSky();
addEventListener('resize', () => { sizeSky(); sizeBortle(); drawBortle(); });
addEventListener('scroll', onScroll, { passive: true });
onScroll();
requestAnimationFrame(drawSky);

/* ---------- Tonight: real moon phase from today's date ---------- */
const SYNODIC = 29.530588853;
const REF_NEW = Date.UTC(2000, 0, 6, 18, 14); // a known new moon
const now = new Date();
const age = (((now - REF_NEW) / 864e5) % SYNODIC + SYNODIC) % SYNODIC;
const lit = (1 - Math.cos((age / SYNODIC) * 2 * Math.PI)) / 2;
const waxing = age < SYNODIC / 2;
const daysToNew = SYNODIC - age;

const phaseName = (() => {
  const f = age / SYNODIC;
  if (f < 0.03 || f > 0.97) return 'New moon';
  if (f < 0.22) return 'Waxing crescent';
  if (f < 0.28) return 'First quarter';
  if (f < 0.47) return 'Waxing gibbous';
  if (f < 0.53) return 'Full moon';
  if (f < 0.72) return 'Waning gibbous';
  if (f < 0.78) return 'Last quarter';
  return 'Waning crescent';
})();

(function drawMoon() {
  const r = 86, cx = 100, cy = 100;
  // terminator is half an ellipse whose x-radius follows the lit fraction
  const rx = Math.abs(1 - 2 * lit) * r;
  // southern hemisphere: a waxing moon is lit on the left
  const litLeft = waxing;
  const outerSweep = litLeft ? 0 : 1;
  const innerSweep = lit > 0.5 ? outerSweep : 1 - outerSweep;
  const d = `M${cx} ${cy - r} A${r} ${r} 0 0 ${outerSweep} ${cx} ${cy + r} A${rx} ${r} 0 0 ${innerSweep} ${cx} ${cy - r}Z`;
  const craters = [[70, 70, 14], [118, 62, 9], [132, 112, 17], [84, 128, 11], [104, 96, 6], [60, 104, 7], [112, 146, 8]];
  $('#moon').innerHTML = `
    <defs><clipPath id="mc"><path d="${d}"/></clipPath></defs>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="currentColor" opacity=".07"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="currentColor" stroke-width=".6" opacity=".5"/>
    <g clip-path="url(#mc)"><circle cx="${cx}" cy="${cy}" r="${r}" fill="currentColor"/>
      ${craters.map(([x, y, s]) => `<circle cx="${x}" cy="${y}" r="${s}" fill="#0b1030" opacity=".13"/>`).join('')}</g>`;
})();

const month = now.getMonth();
const targets = [
  'Orion Nebula, straight overhead', 'Eta Carinae Nebula', 'Omega Centauri rising', 'The Jewel Box in Crux',
  'Omega Centauri at its highest', 'The galactic centre overhead', 'The Lagoon and Trifid nebulae', 'Milky Way core, horizon to horizon',
  'The Helix Nebula', '47 Tucanae and the Small Cloud', 'Both Magellanic Clouds, high up', 'The Tarantula Nebula',
];
// hours of astronomical darkness at 30° S: about 7.5 at midsummer, 11 at midwinter
const darkHours = 9.25 + 1.75 * Math.cos(((month - 5.7) / 12) * 2 * Math.PI);
const moonPenalty = lit > 0.5 ? darkHours * (lit - 0.5) * 1.3 : 0;

$('#dateLine').textContent = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
$('#moonTitle').textContent = `${phaseName} tonight`;
$('#moonText').textContent = lit < 0.25
  ? 'A thin moon or none at all. This is the kind of night the lodge was built for: the Milky Way is bright enough to see your hand against it.'
  : lit < 0.7
    ? `The moon is up for part of the night. ${waxing ? 'It sets after midnight, so the best of the sky comes in the small hours.' : 'It rises late, so the evening session is properly dark.'}`
    : 'A bright moon washes out the faint things, so tonight we turn the telescope on the moon itself, on Saturn and on double stars. Come back in two weeks for the deep sky.';
$('#rLit').textContent = `${Math.round(lit * 100)}%`;
$('#rNew').textContent = daysToNew < 1 ? 'Tonight' : `${Math.round(daysToNew)}`;
$('#rDark').textContent = `${Math.max(0, darkHours - moonPenalty).toFixed(1)}`;
$('#rTarget').textContent = targets[month];

/* ---------- Bortle slider ---------- */
const bc = $('#bortle');
const bctx = bc.getContext('2d');
const B = rng(4711);
// magnitudes follow the real-sky rule that each magnitude deeper roughly triples the count
const field = Array.from({ length: 13000 }, () => {
  const m = 7.7 + Math.log10(B() * 0.9995 + 0.0005) / 0.51;
  return { x: B(), y: B(), m, c: tints[(B() * tints.length) | 0] };
}).sort((a, b) => a.m - b.m);
const names = ['Inner city', 'City', 'Edge of town', 'Bright suburb', 'Suburb', 'Farmland', 'Open country', 'Remote', 'Nadir Lodge'];
let BW = 0, BH = 0;
function sizeBortle() {
  const b = bc.getBoundingClientRect();
  BW = bc.width = b.width * dpr();
  BH = bc.height = b.height * dpr();
}
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
function drawBortle() {
  const t = +$('#bSlider').value / 800; // 0 city, 1 lodge
  const bortle = 9 - t * 8;
  const limit = 4.0 + t * 3.6; // faintest magnitude the eye can reach
  const red = isRed();
  const top = mix([70, 58, 62], [5, 7, 24], t ** 0.7), low = mix([196, 128, 70], [20, 24, 66], t ** 0.55);
  const g = bctx.createLinearGradient(0, 0, 0, BH);
  g.addColorStop(0, red ? `rgb(${top[0] / 2 + 6},2,3)` : `rgb(${top})`);
  g.addColorStop(1, red ? `rgb(${low[0] / 2 + 10},4,5)` : `rgb(${low})`);
  bctx.fillStyle = g;
  bctx.fillRect(0, 0, BW, BH);
  if (t > 0.45) { // the Milky Way only shows once the sky is dark enough
    bctx.save();
    bctx.translate(BW / 2, BH / 2); bctx.rotate(-0.42);
    const mw = bctx.createLinearGradient(0, -BH * 0.3, 0, BH * 0.3);
    const a = (t - 0.45) * 0.34;
    mw.addColorStop(0, 'rgba(160,170,230,0)'); mw.addColorStop(0.5, red ? `rgba(255,80,60,${a})` : `rgba(170,180,235,${a})`); mw.addColorStop(1, 'rgba(160,170,230,0)');
    bctx.fillStyle = mw; bctx.fillRect(-BW, -BH * 0.3, BW * 2, BH * 0.6);
    bctx.restore();
  }
  let n = 0;
  for (const s of field) {
    if (s.m > limit) break;
    n++;
    const bright = Math.min(1, (limit - s.m) / 3 + 0.18);
    const size = Math.max(0.5, (5.4 - s.m) * 0.42 + 0.7) * dpr();
    bctx.globalAlpha = bright;
    bctx.fillStyle = red ? '#ff6a5c' : s.c;
    bctx.beginPath(); bctx.arc(s.x * BW, s.y * BH, size / 2, 0, 6.283); bctx.fill();
  }
  bctx.globalAlpha = 1;
  const count = 0.5 * 10 ** (0.51 * limit + 0.61); // stars above the horizon at that limit
  const nice = count < 1000 ? Math.round(count / 10) * 10 : Math.round(count / 100) * 100;
  $('#bClass').textContent = bortle.toFixed(bortle % 1 < 0.05 || bortle % 1 > 0.95 ? 0 : 1);
  $('#bName').textContent = names[Math.round(t * 8)];
  $('#bCount').textContent = `about ${nice.toLocaleString('en-GB')} stars`;
}
$('#bSlider').addEventListener('input', drawBortle);
$('#red').addEventListener('click', drawBortle);
sizeBortle();
drawBortle();

/* ---------- Cabins, drawn as elevations ---------- */
const starDots = (pts) => pts.map(([x, y, r = 1]) => `<circle class="st" cx="${x}" cy="${y}" r="${r}"/>`).join('');
const cabins = [
  {
    name: 'Crux', who: 'Sleeps two, 24 m²', rate: 310,
    text: 'An A-frame with a glass hatch over the bed. Pull the cord and the roof opens; the Southern Cross crosses it at about two in the morning.',
    art: `${starDots([[40, 22], [92, 12, 1.4], [250, 30], [214, 14, 1.2], [150, 6, 0.8], [20, 60, 0.8]])}
      <rect class="lit" x="134" y="96" width="32" height="38"/>
      <path class="ln" d="M70 150 L150 34 L230 150 M56 150 H244 M134 134 V96 H166 V134 M150 34 L176 72 M159 47 L190 30 L204 50 L176 72"/>`,
  },
  {
    name: 'Carina', who: 'Sleeps four, 46 m²', rate: 440,
    text: 'Two bedrooms and a long deck facing south, with four reclining chairs and a pair of mounted binoculars. The one families ask for.',
    art: `${starDots([[30, 18, 1.2], [120, 10], [200, 26, 1.5], [270, 12], [246, 50, 0.8]])}
      <rect class="lit" x="64" y="98" width="30" height="26"/><rect class="lit" x="150" y="98" width="52" height="26"/>
      <path class="ln" d="M40 150 V84 L236 66 V150 M28 150 H272 M64 124 V98 H94 V124Z M150 124 V98 H202 V124Z M176 98 V124 M112 150 V104 H132 V150 M236 128 H268 M244 128 V150 M260 128 V150 M30 86 L246 66"/>`,
  },
  {
    name: 'Pavo', who: 'Sleeps two, 38 m², private dome', rate: 690,
    text: 'A suite joined to its own three-metre dome with a 25 cm telescope inside. We show you how to drive it on your first night, then leave you to it.',
    art: `${starDots([[26, 30], [80, 12, 1.3], [140, 20], [280, 34, 1.1], [258, 10, 0.8]])}
      <rect class="lit" x="58" y="102" width="36" height="24"/>
      <path class="ln" d="M36 150 V88 H140 V150 M24 150 H276 M58 126 V102 H94 V126Z M108 150 V108 H126 V150 M140 120 H170 M170 150 V110 M250 150 V110 M170 110 A40 40 0 0 1 250 110 M200 72 L212 104 M222 72 L226 104 M200 72 A40 40 0 0 1 222 72 M210 86 L232 50"/>`,
  },
];
cabins.forEach((c) => {
  const a = document.createElement('article');
  a.className = 'cabin';
  a.innerHTML = `<svg viewBox="0 0 300 160" aria-hidden="true">${c.art}</svg>
    <h3>${c.name}</h3><p class="who">${c.who}</p><p>${c.text}</p>
    <div class="rate"><b>US$${c.rate}</b><span>a night for two, with dinner and the telescope</span></div>`;
  $('#cabinList').append(a);
});

/* ---------- Next six new moons ---------- */
const fmt = (d, o) => d.toLocaleDateString('en-GB', o);
let nextNew = new Date(now.getTime() + daysToNew * 864e5);
const avail = [2, 0, 4, 1, 6, 5];
for (let i = 0; i < 6; i++) {
  const from = new Date(nextNew.getTime() - 2 * 864e5), to = new Date(nextNew.getTime() + 2 * 864e5);
  const sameMonth = from.getMonth() === to.getMonth();
  const label = `${fmt(from, sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'long' })} to ${fmt(to, { day: 'numeric', month: 'long', year: 'numeric' })}`;
  const li = document.createElement('li');
  const n = avail[i];
  li.innerHTML = `<span class="dot"></span><span class="when">${label}</span>
    <span class="avail">${n ? `${n} of 6 cabins free` : 'Fully booked'}</span>
    <button type="button" ${n ? '' : 'disabled'}>${n ? 'Hold these nights' : 'No cabins left'}</button>`;
  const btn = $('button', li);
  btn.addEventListener('click', () => {
    const held = li.classList.toggle('held');
    btn.textContent = held ? 'Nights held' : 'Hold these nights';
    $('#holdMsg').textContent = held ? `We're holding a cabin for ${label} for 48 hours. Write to stay@nadir.example to confirm it.` : '';
  });
  $('#moons').append(li);
  nextNew = new Date(nextNew.getTime() + SYNODIC * 864e5);
}
