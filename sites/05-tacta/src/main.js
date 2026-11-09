import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mountBanner } from '@shared/banner.js';
import { keyframes, scrollStage, captions, clamp01, smooth } from '@shared/scroll3d.js';

mountBanner('05-tacta');
const $ = (s, r = document) => r.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Layout: a 75% board, 84 keys. [legend, width in key units, kind, KeyboardEvent.code] ---------- */
const letters = (s, kind = 'a') => [...s].map((c) => [c, 1, kind, `Key${c}`]);
const rows = [
  [['esc', 1, 'x', 'Escape'], ...Array.from({ length: 12 }, (_, i) => [`F${i + 1}`, 1, Math.floor(i / 4) % 2 ? 'm' : 'a', `F${i + 1}`]), ['del', 1, 'm', 'Delete']],
  [['`', 1, 'a', 'Backquote'], ...[...'1234567890'].map((c) => [c, 1, 'a', `Digit${c}`]), ['-', 1, 'a', 'Minus'], ['=', 1, 'a', 'Equal'], ['back', 2, 'm', 'Backspace'], ['home', 1, 'm', 'Home']],
  [['tab', 1.5, 'm', 'Tab'], ...letters('QWERTYUIOP'), ['[', 1, 'a', 'BracketLeft'], [']', 1, 'a', 'BracketRight'], ['\\', 1.5, 'a', 'Backslash'], ['pgup', 1, 'm', 'PageUp']],
  [['caps', 1.75, 'm', 'CapsLock'], ...letters('ASDFGHJKL'), [';', 1, 'a', 'Semicolon'], ["'", 1, 'a', 'Quote'], ['enter', 2.25, 'x', 'Enter'], ['pgdn', 1, 'm', 'PageDown']],
  [['shift', 2.25, 'm', 'ShiftLeft'], ...letters('ZXCVBNM'), [',', 1, 'a', 'Comma'], ['.', 1, 'a', 'Period'], ['/', 1, 'a', 'Slash'], ['shift', 1.75, 'm', 'ShiftRight'], ['↑', 1, 'm', 'ArrowUp'], ['end', 1, 'm', 'End']],
  [['ctrl', 1.25, 'm', 'ControlLeft'], ['opt', 1.25, 'm', 'AltLeft'], ['cmd', 1.25, 'm', 'MetaLeft'], ['', 6.25, 'a', 'Space'], ['cmd', 1, 'm', 'MetaRight'], ['fn', 1, 'm', 'Fn'], ['ctrl', 1, 'm', 'ControlRight'], ['←', 1, 'm', 'ArrowLeft'], ['↓', 1, 'm', 'ArrowDown'], ['→', 1, 'm', 'ArrowRight']],
];
const rowZ = [-3.25, -2, -1, 0, 1, 2];
const CZ = -0.625; // centre of the key field, front to back
const keys = [];
rows.forEach((row, r) => {
  let x = -8;
  row.forEach(([label, w, kind, code]) => { keys.push({ label, w, kind, code, x: x + w / 2, z: rowZ[r], press: 0 }); x += w; });
});
const byCode = Object.fromEntries(keys.map((k, i) => [k.code, i]));

const ways = {
  canteen: { name: 'Canteen', a: '#ece5d2', m: '#67754b', x: '#f2622e', la: '#2c2e27', lm: '#f1ebd9', lx: '#ffffff', body: '#a7ab95', stem: '#f2622e' },
  arcade: { name: 'Arcade', a: '#f7f6fc', m: '#8a73ee', x: '#ffd23f', la: '#2a2540', lm: '#ffffff', lx: '#2a2540', body: '#c6bcf4', stem: '#ffd23f' },
  nightbus: { name: 'Night bus', a: '#2d3038', m: '#1c2843', x: '#e5383b', la: '#dfe2ea', lm: '#a9b9e0', lx: '#ffffff', body: '#1d1e22', stem: '#e5383b' },
};

/* ---------- Renderer ---------- */
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.03).texture;
scene.environmentIntensity = 0.85;
const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 300);
const sun = new THREE.DirectionalLight(0xffffff, 2.4); sun.position.set(-8, 20, 12); scene.add(sun);

/* ---------- Helpers ---------- */
function rr(w, h, r, cx = 0, cy = 0, Cls = THREE.Shape) {
  const s = new Cls(), x = cx - w / 2, y = cy - h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
// extrude a plan-view shape and lay it flat (shape y maps to world -z), thickness going up from y = 0
function flat(shape, depth, mat, bevel = 0) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 10 });
  g.rotateX(-Math.PI / 2);
  return new THREE.Mesh(g, mat);
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8;
  return t;
}

/* ---------- Materials ---------- */
const std = (o) => new THREE.MeshStandardMaterial(o);
const M = {
  a: std({ roughness: 0.68 }), m: std({ roughness: 0.68 }), x: std({ roughness: 0.6 }),
  body: std({ metalness: 0.85, roughness: 0.42 }),
  brass: std({ color: 0xd4a94e, metalness: 1, roughness: 0.3 }),
  foam: std({ color: 0x2b2c30, roughness: 1 }),
  swBase: std({ color: 0x1a1b1e, roughness: 0.5 }),
  swTop: std({ color: 0x9aa3b5, roughness: 0.15, transparent: true, opacity: 0.6 }),
  stem: std({ roughness: 0.4 }),
  gasket: std({ roughness: 0.9 }),
  rubber: std({ color: 0x111214, roughness: 0.95 }),
  led: std({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.4 }),
};

/* ---------- Build ---------- */
const board = new THREE.Group();
board.rotation.x = 0.105; // six degrees of typing angle
scene.add(board);
const parts = [];
function part(obj, y, spread, upper, label, sub) {
  obj.position.y = y; board.add(obj);
  parts.push({ obj, y, spread, upper, label, sub });
  return obj;
}

// keycaps
const capGeos = {};
function capGeo(w) {
  if (capGeos[w]) return capGeos[w];
  const g = new RoundedBoxGeometry(w - 0.07, 0.42, 0.93, 4, 0.07);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = clamp01(p.getY(i) / 0.21);
    if (t > 0) p.setXYZ(i, p.getX(i) * (1 - (0.24 / w) * t), p.getY(i) - 0.035 * t * (p.getX(i) / (w / 2)) ** 2, p.getZ(i) * (1 - 0.2 * t) - 0.035 * t);
  }
  g.computeVertexNormals();
  return (capGeos[w] = g);
}
function legendTex(label, w) {
  return canvasTex(Math.round(128 * w), 96, (x, W, H) => {
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#fff'; x.textBaseline = 'middle';
    const big = label.length === 1;
    x.font = `${big ? 800 : 700} ${big ? 50 : 28}px "Red Hat Display", system-ui, sans-serif`;
    x.textAlign = big ? 'center' : 'left';
    x.fillText(label, big ? W / 2 : 20, H / 2 + (big ? 2 : 0));
  });
}
const caps = new THREE.Group();
keys.forEach((k) => {
  k.mesh = new THREE.Mesh(capGeo(k.w), M[k.kind]);
  k.mesh.position.set(k.x, 0, k.z);
  if (k.label) {
    k.legend = new THREE.MeshStandardMaterial({ alphaMap: legendTex(k.label, k.w), transparent: true, roughness: 0.8, depthWrite: false });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(k.w - 0.34, 0.6), k.legend);
    pl.rotation.x = -Math.PI / 2; pl.position.set(0, 0.213, -0.035);
    k.mesh.add(pl);
  }
  caps.add(k.mesh);
});
const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.6, 0.62, 40), std({ metalness: 0.9, roughness: 0.3, flatShading: true }));
knob.position.set(7, 0.1, rowZ[0]); caps.add(knob);
part(caps, 1.78, 5.4, 1, 'Keycaps', 'PBT, legends dyed in');

// switches (instanced: 84 of everything)
const sw = new THREE.Group();
const topGeo = new THREE.BoxGeometry(0.72, 0.28, 0.72);
{ const p = topGeo.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setXYZ(i, p.getX(i) * 0.8, p.getY(i), p.getZ(i) * 0.8); topGeo.computeVertexNormals(); }
const stemGeo = mergeGeometries([new THREE.BoxGeometry(0.3, 0.24, 0.1), new THREE.BoxGeometry(0.1, 0.24, 0.3)]);
const pinGeo = mergeGeometries([new THREE.CylinderGeometry(0.035, 0.035, 0.26, 6).translate(-0.2, -0.28, 0.12), new THREE.CylinderGeometry(0.035, 0.035, 0.26, 6).translate(0.16, -0.28, 0.24), new THREE.CylinderGeometry(0.11, 0.11, 0.2, 10).translate(0, -0.25, 0)]);
const inst = [
  [new THREE.BoxGeometry(0.76, 0.3, 0.76), M.swBase, 0.15], [topGeo, M.swTop, 0.44], [stemGeo, M.stem, 0.68], [pinGeo, M.brass, 0.15],
].map(([geo, mat, y]) => {
  const im = new THREE.InstancedMesh(geo, mat, keys.length);
  const mx = new THREE.Matrix4();
  keys.forEach((k, i) => im.setMatrixAt(i, mx.makeTranslation(k.x, y, k.z)));
  sw.add(im);
  return im;
});
part(sw, 0.68, 3.7, 1, 'Switches', 'Linear, 45 g, hot-swappable');
parts.at(-1).ly = 0.75; // label sits at the stems, clear of the frame's label

// top frame
const outer = () => rr(17.4, 7.55, 0.6, 0, -CZ);
const frameShape = outer(); frameShape.holes.push(rr(16.26, 6.48, 0.22, 0, -CZ, THREE.Path));
part(flat(frameShape, 0.34, M.body, 0.05), 1.3, 2.5, 1, 'Top frame', 'Milled aluminium');

// plate + gaskets
const plateG = new THREE.Group();
const plateShape = rr(16.3, 6.5, 0.2, 0, -CZ);
keys.forEach((k) => plateShape.holes.push(rr(0.74, 0.74, 0.04, k.x, -k.z, THREE.Path)));
plateG.add(flat(plateShape, 0.08, M.brass));
const gasketGeo = new THREE.BoxGeometry(1, 0.16, 0.2);
[-6, -2, 2, 6].forEach((x) => [CZ - 3.3, CZ + 3.3].forEach((z) => { const g = new THREE.Mesh(gasketGeo, M.gasket); g.position.set(x, 0.04, z); plateG.add(g); }));
[-8.2, 8.2].forEach((x) => { const g = new THREE.Mesh(gasketGeo, M.gasket); g.rotation.y = Math.PI / 2; g.position.set(x, 0.04, CZ); plateG.add(g); });
part(plateG, 0.98, 1.5, 1, 'Plate and gaskets', 'Brass, hung on silicone');

// circuit board
const PW = 16.3, PD = 6.45;
const pcbTex = canvasTex(2048, 810, (x, W, H) => {
  const fx = (v) => ((v + PW / 2) / PW) * W, fy = (z) => ((z - CZ + PD / 2) / PD) * H, u = W / PW;
  x.fillStyle = '#0c3a2c'; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#17604a'; x.lineWidth = 3;
  rowZ.forEach((z) => { for (let j = -1; j <= 1; j++) { x.beginPath(); x.moveTo(fx(-7.9), fy(z) + j * 9 + 28); x.lineTo(fx(7.9), fy(z) + j * 9 + 28); x.stroke(); } });
  keys.forEach((k, i) => { // a trace from every switch up towards the controller
    x.beginPath(); x.moveTo(fx(k.x) + 12, fy(k.z)); x.lineTo(fx(k.x) + 12 + (i % 3) * 8, fy(k.z) - 0.42 * u); x.lineTo(fx(k.x) + 40, fy(k.z) - 0.5 * u); x.stroke();
  });
  keys.forEach((k) => {
    const cx = fx(k.x), cy = fy(k.z);
    x.strokeStyle = '#d9efe6'; x.lineWidth = 2; x.strokeRect(cx - 0.36 * u, cy - 0.36 * u, 0.72 * u, 0.72 * u);
    x.fillStyle = '#e7c15a';
    [[-0.2, 0.12], [0.16, 0.24]].forEach(([dx, dz]) => { x.beginPath(); x.arc(cx + dx * u, cy + dz * u, 9, 0, 6.283); x.fill(); });
    x.fillStyle = '#06241b'; x.beginPath(); x.arc(cx, cy, 15, 0, 6.283); x.fill();
  });
  // controller, radio can and silkscreen
  x.fillStyle = '#101114'; x.fillRect(fx(4.7), fy(-2.72), 0.62 * u, 0.5 * u);
  x.fillStyle = '#c9ccd1'; x.fillRect(fx(5.6), fy(-2.75), 0.9 * u, 0.56 * u);
  x.fillStyle = '#d9efe6'; x.font = '700 30px "Red Hat Display", sans-serif';
  x.fillText('TACTA 75  REV C', fx(-7.9), fy(2.72)); x.fillText('BT 5.2 / 2.4G / USB-C', fx(3.2), fy(2.72));
});
pcbTex.colorSpace = THREE.SRGBColorSpace;
pcbTex.wrapS = pcbTex.wrapT = THREE.RepeatWrapping;
pcbTex.repeat.set(1 / PW, 1 / PD); pcbTex.offset.set(0.5, 0.5 - CZ / PD);
const pcbG = new THREE.Group();
pcbG.add(flat(rr(PW, PD, 0.2, 0, -CZ), 0.08, [std({ map: pcbTex, roughness: 0.45, metalness: 0.2 }), std({ color: 0x0c3a2c, roughness: 0.6 })]));
const leds = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.05, 0.12), M.led, keys.length);
{ const mx = new THREE.Matrix4(); keys.forEach((k, i) => leds.setMatrixAt(i, mx.makeTranslation(k.x, 0.1, k.z - 0.3))); }
pcbG.add(leds);
part(pcbG, 0.6, 0.5, 0, 'Circuit board', 'A light under every key');

// foam
part(flat(rr(16.2, 6.4, 0.2, 0, -CZ), 0.22, M.foam), 0.32, -0.6, 0, 'Foam', 'Soaks up the ping');

// case
const caseG = new THREE.Group();
caseG.add(flat(outer(), 0.3, M.body, 0.05));
const wallShape = outer(); wallShape.holes.push(rr(16.5, 6.68, 0.3, 0, -CZ, THREE.Path));
const walls = flat(wallShape, 1.02, M.body); walls.position.y = 0.3; caseG.add(walls);
const weight = flat(rr(9, 2.4, 0.3, 0, -CZ), 0.12, M.brass, 0.03); weight.position.y = -0.14; caseG.add(weight);
[[-7.4, 2.4], [7.4, 2.4], [-7.4, -3.6], [7.4, -3.6]].forEach(([x, z]) => { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.14, 24), M.rubber); f.position.set(x, -0.1, z); caseG.add(f); });
const usb = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.32, 0.2, 3, 0.1), M.rubber); usb.position.set(-5.5, 0.82, CZ - 3.74); caseG.add(usb);
part(caseG, 0, -1.9, 0, 'Case', 'Aluminium, brass weight, 1.9 kg');

// soft contact shadow on the page
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(26, 14), new THREE.MeshBasicMaterial({
  transparent: true, depthWrite: false,
  map: canvasTex(256, 256, (x) => { const g = x.createRadialGradient(128, 128, 20, 128, 128, 128); g.addColorStop(0, 'rgba(0,0,0,.5)'); g.addColorStop(0.55, 'rgba(0,0,0,.22)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); }),
}));
shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, -0.5, CZ + 0.4); scene.add(shadow);

/* ---------- Colourways ---------- */
let way = 'canteen';
function setWay(id) {
  way = id;
  const w = ways[id];
  document.body.dataset.way = id;
  M.a.color.set(w.a); M.m.color.set(w.m); M.x.color.set(w.x);
  M.body.color.set(w.body); M.stem.color.set(w.stem); M.gasket.color.set(w.x); knob.material.color.set(w.x);
  M.led.color.set(w.x); M.led.emissive.set(w.x);
  keys.forEach((k) => k.legend?.color.set(w[`l${k.kind}`]));
  $('#wayName').textContent = w.name;
  [...$('#ways').children].forEach((b) => b.setAttribute('aria-checked', b.dataset.id === id));
}
Object.entries(ways).forEach(([id, w]) => {
  const b = document.createElement('button');
  b.type = 'button'; b.dataset.id = id; b.setAttribute('role', 'radio');
  b.innerHTML = `<span class="sw"><i style="background:${w.a}"></i><i style="background:${w.m}"></i><i style="background:${w.x}"></i></span>${w.name}`;
  b.addEventListener('click', () => setWay(id));
  $('#ways').append(b);
});
setWay('canteen');
// legends were drawn before the webfont arrived; redraw them once it has
document.fonts.load('800 40px "Red Hat Display"').then(() => keys.forEach((k) => { if (k.legend) { k.legend.alphaMap.dispose(); k.legend.alphaMap = legendTex(k.label, k.w); } }));

/* ---------- Labels ---------- */
parts.forEach((p) => {
  p.el = document.createElement('div');
  p.el.className = 'lbl';
  p.el.innerHTML = `${p.label}<small>${p.sub}</small>`;
  $('#labels').append(p.el);
});

/* ---------- Typing: your keys press ours, with an optional thock ---------- */
let soundOn = false, actx, lastTyped = -1e9;
$('#sound').addEventListener('click', (e) => {
  soundOn = !soundOn;
  e.currentTarget.setAttribute('aria-pressed', soundOn);
  e.currentTarget.textContent = soundOn ? 'Turn sound off' : 'Turn sound on';
  if (soundOn) { actx ??= new AudioContext(); actx.resume(); thock(); }
});
function thock(wide) {
  if (!soundOn || !actx) return;
  const t = actx.currentTime;
  const len = Math.floor(actx.sampleRate * 0.06), buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  const n = actx.createBufferSource(); n.buffer = buf;
  const f = actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = (wide ? 520 : 900) + Math.random() * 260; f.Q.value = 1.1;
  const g = actx.createGain(); g.gain.value = 0.5;
  n.connect(f).connect(g).connect(actx.destination); n.start(t);
  const o = actx.createOscillator(), og = actx.createGain();
  o.frequency.setValueAtTime(wide ? 120 : 165, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.07);
  og.gain.setValueAtTime(0.35, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  o.connect(og).connect(actx.destination); o.start(t); o.stop(t + 0.1);
}
function press(i, real) {
  if (i == null) return;
  keys[i].press = 1;
  if (real) { lastTyped = performance.now(); thock(keys[i].w > 2); }
}
addEventListener('keydown', (e) => { if (!e.repeat) press(byCode[e.code], true); });
// until you type, the board types to itself
const demo = [...'THEQUICKBROWNFOX'].map((c) => byCode[`Key${c}`]);
let demoI = 0;
setInterval(() => {
  if (reduce || stage.value > 0.12 || performance.now() - lastTyped < 4000) return;
  press(demo[demoI++ % demo.length]);
  if (demoI % demo.length === 0) press(byCode.Space);
}, 170);

/* ---------- Choreography ---------- */
const T = (y = 0.8, z = 0) => [0, y, CZ + z];
const path = keyframes([
  { p: 0.0, pos: [0, 15, 27], tgt: T(), ex: 0, hi: 0, ox: 0, oy: -0.19 },
  { p: 0.06, pos: [4, 14, 27], tgt: T(), ex: 0, hi: 0, ox: 0, oy: -0.16 },
  { p: 0.2, pos: [30, 13.5, 35], tgt: T(2.2), ex: 1, hi: 0, ox: 0.03, oy: 0 },
  { p: 0.3, pos: [25, 15.5, 38], tgt: T(2.2), ex: 1, hi: 0, ox: 0.03, oy: 0 },
  { p: 0.39, pos: [11, 14, 16], tgt: [-2, 6.7, CZ], ex: 1, hi: 0, ox: -0.2, oy: 0 },
  { p: 0.44, pos: [9, 14.3, 16.5], tgt: [-2, 6.7, CZ], ex: 1, hi: 0, ox: -0.2, oy: 0 },
  { p: 0.53, pos: [-11, 7.6, 12.5], tgt: [-3, 4.7, CZ], ex: 1, hi: 0, ox: 0.2, oy: 0 },
  { p: 0.58, pos: [-9, 7.8, 13], tgt: [-3, 4.7, CZ], ex: 1, hi: 0, ox: 0.2, oy: 0 },
  { p: 0.67, pos: [16, 7.2, 15], tgt: [3, 2.7, CZ], ex: 1, hi: 0, ox: -0.2, oy: 0 },
  { p: 0.72, pos: [14, 7.5, 15.6], tgt: [3, 2.7, CZ], ex: 1, hi: 0, ox: -0.2, oy: 0 },
  { p: 0.81, pos: [3, 22, 13], tgt: T(1.1, 0.2), ex: 1, hi: 1, ox: 0.2, oy: 0 },
  { p: 0.86, pos: [1, 22.5, 12], tgt: T(1.1, 0.2), ex: 1, hi: 1, ox: 0.2, oy: 0 },
  { p: 0.94, pos: [-12, 13, 27], tgt: T(), ex: 0, hi: 0, ox: 0.15, oy: 0 },
  { p: 1.0, pos: [0, 21, 23], tgt: T(), ex: 0, hi: 0, ox: 0.16, oy: 0 },
]);

const stage = scrollStage($('#stage'));
window.__stage = stage;
const showCaptions = captions($('.sticky'));
const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener('pointermove', (e) => { pointer.x = e.clientX / innerWidth - 0.5; pointer.y = e.clientY / innerHeight - 0.5; });

let W = 0, H = 0;
function resize() { W = canvas.clientWidth; H = canvas.clientHeight; renderer.setSize(W, H, false); camera.aspect = W / H; }
addEventListener('resize', resize);
resize();

const tgt = new THREE.Vector3(), v = new THREE.Vector3(), right = new THREE.Vector3();
let visible = true;
new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe($('#stage'));

function frame() {
  requestAnimationFrame(frame);
  if (!visible) return;
  const p = stage.tick();
  const k = path(p);
  const narrow = W < 860;

  for (const part of parts) part.obj.position.y = part.y + part.spread * k.ex + part.upper * k.hi * 15;
  // keycaps lift off in a wave from left to right, and dip when pressed
  for (const key of keys) {
    const wave = smooth(clamp01(k.ex * 1.6 - ((key.x + 8) / 16) * 0.6));
    key.mesh.position.y = (wave - k.ex) * 5.4 - key.press * 0.15;
    key.mesh.rotation.x = (1 - wave) * k.ex * -0.5;
    key.press *= 0.84;
  }
  M.led.emissiveIntensity = 0.5 + k.ex * 1.6;
  shadow.material.opacity = 1 - k.ex * 0.75;
  shadow.scale.setScalar(1 + k.ex * 0.25);

  pointer.sx += (pointer.x - pointer.sx) * 0.05; pointer.sy += (pointer.y - pointer.sy) * 0.05;
  board.rotation.y = reduce ? 0 : pointer.sx * 0.16;
  const pull = narrow ? 1.9 : Math.max(1, 1.5 / camera.aspect);
  tgt.fromArray(k.tgt);
  camera.position.fromArray(k.pos).sub(tgt).multiplyScalar(pull).add(tgt);
  camera.lookAt(tgt);
  camera.setViewOffset(W, H, narrow ? 0 : -k.ox * W, narrow ? H * 0.1 : k.oy * H, W, H);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();

  const labelK = smooth(clamp01((p - 0.165) / 0.03)) * smooth(clamp01((0.305 - p) / 0.03)) * (k.ex > 0.9 ? 1 : 0);
  if (labelK > 0.01) {
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    for (const part of parts) {
      part.obj.getWorldPosition(v); v.z = CZ; v.y += part.ly || 0; v.addScaledVector(right, 10.4).project(camera);
      part.el.style.transform = `translate(${((v.x + 1) / 2) * W}px, ${((1 - v.y) / 2) * H}px)`;
      part.el.style.opacity = labelK;
    }
  } else if (parts[0].el.style.opacity !== '0') parts.forEach((x) => (x.el.style.opacity = '0'));

  showCaptions(p);
  $('#railFill').style.transform = `scaleX(${p})`;
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

/* ---------- Typing test ---------- */
const sentences = [
  'Good tools make you want to use them, and then they get out of the way.',
  'Six quick jabs of a brass plate will wake the laziest of typing fingers.',
  'The best keyboard is the one you forget about halfway down the page.',
];
const test = { i: 0, pos: 0, errors: 0, start: 0, done: false, timer: 0 };
function renderTest() {
  const s = sentences[test.i];
  $('#testLine').innerHTML = [...s].map((c, j) => `<span class="${j < test.pos ? 'ok' : j === test.pos ? `cur${test.wrong ? ' bad' : ''}` : ''}">${c}</span>`).join('');
}
function stats() {
  const secs = test.start ? ((test.done || performance.now()) - test.start) / 1000 : 0;
  $('#secs').textContent = `${secs.toFixed(1)} s`;
  $('#wpm').textContent = secs > 0.5 ? Math.round(test.pos / 5 / (secs / 60)) : 0;
  $('#acc').textContent = `${test.pos + test.errors ? Math.round((test.pos / (test.pos + test.errors)) * 100) : 100}%`;
}
function resetTest(next) {
  clearInterval(test.timer);
  Object.assign(test, { i: next ? (test.i + 1) % sentences.length : test.i, pos: 0, errors: 0, start: 0, done: false, wrong: false });
  $('#testHint').textContent = 'Click here, then start typing';
  renderTest(); stats();
}
$('#testBox').addEventListener('focus', () => { if (!test.start) $('#testHint').textContent = 'Go on. The clock starts on your first key.'; });
$('#testBox').addEventListener('keydown', (e) => {
  if (e.key.length !== 1 || e.metaKey || e.ctrlKey || test.done) return;
  e.preventDefault();
  const s = sentences[test.i];
  if (!test.start) { test.start = performance.now(); test.timer = setInterval(stats, 100); $('#testHint').textContent = 'Wrong keys are counted but you have to hit the right one to move on.'; }
  if (e.key === s[test.pos]) { test.pos++; test.wrong = false; } else { test.errors++; test.wrong = true; }
  if (test.pos === s.length) {
    test.done = performance.now(); clearInterval(test.timer); stats();
    $('#testHint').textContent = `Done: ${$('#wpm').textContent} words a minute at ${$('#acc').textContent} accuracy. The average office typist manages about 40.`;
  }
  renderTest(); stats();
});
$('#again').addEventListener('click', () => { resetTest(true); $('#testBox').focus(); });
resetTest(false);

/* ---------- Order ---------- */
$('#orderBtn').addEventListener('click', () => {
  $('#orderBtn').textContent = 'Added to basket';
  $('#orderMsg').textContent = `One Tacta 75 in ${ways[way].name} is in your basket. This is a demo, so nothing has been charged.`;
});
