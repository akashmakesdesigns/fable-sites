import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mountBanner } from '@shared/banner.js';
import { keyframes, scrollStage, captions, clamp01, smooth } from '@shared/scroll3d.js';

mountBanner('04-oriel');
const $ = (s, r = document) => r.querySelector(s);
const TAU = Math.PI * 2;

/* ---------- Renderer ---------- */
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.03).texture;
const camera = new THREE.PerspectiveCamera(30, 1, 1, 800);
const key = new THREE.DirectionalLight(0xfff2dd, 2.2); key.position.set(40, 90, 60); scene.add(key);
const rim = new THREE.DirectionalLight(0x9fe0d8, 1.4); rim.position.set(-70, -30, -50); scene.add(rim);

/* ---------- Textures drawn in code ---------- */
function canvasTex(size, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  return t;
}
// Côtes de Genève: soft diagonal stripes
const stripes = canvasTex(256, (x, s) => {
  for (let i = 0; i < 4; i++) {
    const g = x.createLinearGradient(i * 64, 0, i * 64 + 64, 0);
    g.addColorStop(0, '#8d9197'); g.addColorStop(0.45, '#f4f5f6'); g.addColorStop(1, '#a4a8ae');
    x.fillStyle = g; x.fillRect(i * 64, 0, 64, s);
  }
}, 0.07);
stripes.rotation = 0.5;
// perlage: overlapping circular graining
const perlage = canvasTex(512, (x, s) => {
  x.fillStyle = '#b9bcc1'; x.fillRect(0, 0, s, s);
  for (let r = 0; r < 18; r++) for (let c = 0; c < 18; c++) {
    const cx = c * 30 + (r % 2 ? 15 : 0), cy = r * 30;
    const g = x.createRadialGradient(cx - 5, cy - 5, 1, cx, cy, 20);
    g.addColorStop(0, '#f2f3f4'); g.addColorStop(0.7, '#a9adb3'); g.addColorStop(1, '#8b8f96');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, 20, 0, TAU); x.fill();
  }
});

const dials = [
  { name: 'Salmon dial, chestnut strap', hex: '#d9977a', ink: '#3a1e14', strap: 0x4a2c1c },
  { name: 'Petrol dial, black strap', hex: '#1d5560', ink: '#f1ead9', strap: 0x17191b },
  { name: 'Silver dial, navy strap', hex: '#cfd3d6', ink: '#1c2430', strap: 0x1c2740 },
];
function dialTexture({ hex, ink }) {
  return canvasTex(1024, (x, s) => {
    const base = new THREE.Color(hex);
    const g = x.createConicGradient(-Math.PI / 2, s / 2, s / 2);
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * TAU;
      const k = 0.7 + 0.42 * (0.5 + 0.5 * Math.cos(a * 2)) ** 1.6 + ((i * 7919) % 13) / 13 * 0.05;
      g.addColorStop(i / 96, `#${base.clone().multiplyScalar(k).getHexString()}`);
    }
    x.fillStyle = g; x.fillRect(0, 0, s, s);
    x.translate(s / 2, s / 2);
    for (let i = 0; i < 900; i++) { // fine brushing
      const a = ((i * 2654435761) % 100000) / 100000 * TAU;
      x.strokeStyle = i % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)';
      x.beginPath(); x.moveTo(Math.cos(a) * 20, Math.sin(a) * 20); x.lineTo(Math.cos(a) * 520, Math.sin(a) * 520); x.stroke();
    }
    x.fillStyle = ink;
    for (let i = 0; i < 60; i++) { // minute track
      x.save(); x.rotate((i / 60) * TAU);
      i % 5 ? x.fillRect(-1.5, -492, 3, 16) : x.fillRect(-3, -496, 6, 26);
      x.restore();
    }
    x.textAlign = 'center';
    x.font = '600 50px "Cormorant Garamond", Georgia, serif';
    try { x.letterSpacing = '12px'; } catch { /* older browsers */ }
    x.fillText('ORIEL', 6, -196);
    try { x.letterSpacing = '0px'; } catch { /* older browsers */ }
    x.font = 'italic 400 34px "Cormorant Garamond", Georgia, serif';
    x.fillText('Automatic', 0, 214);
    x.font = '500 20px "Albert Sans", sans-serif';
    x.fillText('68 hours', 0, 250);
  });
}

/* ---------- Materials ---------- */
const M = {
  polished: new THREE.MeshStandardMaterial({ color: 0xe2e4e6, metalness: 1, roughness: 0.12, side: THREE.DoubleSide }),
  brushed: new THREE.MeshStandardMaterial({ color: 0xcfd2d5, metalness: 1, roughness: 0.38, side: THREE.DoubleSide }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd8b25e, metalness: 1, roughness: 0.24 }),
  plate: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.95, roughness: 0.32, map: perlage }),
  bridge: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.95, roughness: 0.28, map: stripes }),
  blued: new THREE.MeshStandardMaterial({ color: 0x24389c, metalness: 1, roughness: 0.22 }),
  ruby: new THREE.MeshStandardMaterial({ color: 0xc4124a, metalness: 0.1, roughness: 0.08, emissive: 0x4a0318 }),
  tungsten: new THREE.MeshStandardMaterial({ color: 0x5c6066, metalness: 1, roughness: 0.3 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0, transmission: 1, thickness: 1.5, ior: 1.76, transparent: true, opacity: 1, side: THREE.DoubleSide }),
  leather: new THREE.MeshStandardMaterial({ color: dials[0].strap, metalness: 0, roughness: 0.82, transparent: true }),
  dialSide: new THREE.MeshStandardMaterial({ color: 0x3a3028, metalness: 0.6, roughness: 0.5 }),
  dialFace: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.75, roughness: 0.36, map: dialTexture(dials[0]) }),
};

/* ---------- Geometry helpers ---------- */
const lathe = (pts, mat, seg = 128) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat);
const cyl = (r, h, mat, seg = 48) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
// extrude a 2D shape and lay it flat: shape +y becomes world -z (towards 12 o'clock), thickness goes up
function flat(shape, depth, mat, bevel = 0) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 48 });
  g.rotateX(-Math.PI / 2);
  return new THREE.Mesh(g, mat);
}
function gear(r, teeth, mat = M.gold) {
  const s = new THREE.Shape();
  const n = teeth * 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, rr = i % 4 < 2 ? r : r - Math.min(0.42, r * 0.14);
    i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(rr, 0);
  }
  s.closePath();
  for (let i = 0; i < 5; i++) { // spoked wheel
    const a = (i / 5) * TAU, h = new THREE.Path();
    h.absarc(Math.cos(a) * r * 0.52, Math.sin(a) * r * 0.52, r * 0.21, 0, TAU, true);
    s.holes.push(h);
  }
  return flat(s, 0.28, mat);
}
function screw(x, y, z, r = 0.75) {
  const g = new THREE.Group();
  g.add(cyl(r, 0.3, M.blued, 20));
  const slot = new THREE.Mesh(new THREE.BoxGeometry(r * 1.7, 0.32, 0.14), M.tungsten);
  slot.rotation.y = x * 3 + z; g.add(slot);
  g.position.set(x, y, z);
  return g;
}
function jewel(x, y, z) {
  const g = new THREE.Group();
  g.add(cyl(0.95, 0.16, M.gold, 24));
  const j = cyl(0.56, 0.24, M.ruby, 24); g.add(j);
  g.position.set(x, y, z);
  return g;
}

/* ---------- The watch: built from the crystal down ---------- */
const watch = new THREE.Group();
scene.add(watch);
const parts = [];
function part(obj, y, spread, label, sub, labelR = 18, extra = 0) {
  obj.position.y = y;
  watch.add(obj);
  parts.push({ obj, y, spread, label, sub, labelR, extra });
  return obj;
}

// crystal
part(lathe([[0, 5.05], [8, 4.98], [13.5, 4.78], [16.9, 4.3], [16.9, 3.3], [0, 3.3]], M.glass, 96), 0, 31, 'Sapphire crystal', 'Domed, 2.4 mm');
// bezel
part(lathe([[17, 3], [19.1, 3], [18.8, 4], [17.7, 4.55], [17, 4.55], [17, 3]], M.polished), 0, 24, 'Bezel', 'Polished 316L steel', 20);

// hands
const hands = new THREE.Group();
function hand(len, w, tail, mat) {
  const s = new THREE.Shape();
  s.moveTo(0, -tail); s.lineTo(w / 2, 0); s.lineTo(w * 0.16, len); s.lineTo(-w * 0.16, len); s.lineTo(-w / 2, 0); s.closePath();
  return flat(s, 0.2, mat, 0.06);
}
const hHour = hand(8.4, 2.0, 2.2, M.polished);
const hMin = hand(13.2, 1.6, 2.4, M.polished); hMin.position.y = 0.42;
const hSec = new THREE.Group();
const secBar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 18), M.gold); secBar.position.z = -5.2; hSec.add(secBar);
const secDisc = cyl(0.9, 0.1, M.gold, 24); secDisc.position.z = 3; hSec.add(secDisc);
hSec.position.y = 0.84;
const cap = cyl(0.8, 1.2, M.polished, 24); cap.position.y = 0.5;
hands.add(hHour, hMin, hSec, cap);
part(hands, 2.25, 17, 'Hands', 'Diamond-polished', 12);

// dial
const dial = new THREE.Group();
dial.add(cyl(16.9, 0.5, M.dialSide, 96));
const face = new THREE.Mesh(new THREE.CircleGeometry(16.9, 96), M.dialFace);
face.rotation.x = -Math.PI / 2; face.position.y = 0.26; dial.add(face);
for (let i = 0; i < 12; i++) {
  const a = (i / 12) * TAU;
  const mk = (off, w) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, i % 3 ? 2.6 : 3.8), M.polished);
    m.position.set(Math.sin(a) * 13.3 + Math.cos(a) * off, 0.5, -Math.cos(a) * 13.3 + Math.sin(a) * off);
    m.rotation.y = -a; dial.add(m);
  };
  i === 0 ? (mk(-0.75, 0.9), mk(0.75, 0.9)) : mk(0, 0.95);
}
part(dial, 1.55, 10, 'Sunray dial', 'Brass, twelve applied markers');

// case, lugs, crown, strap
const caseG = new THREE.Group();
caseG.add(lathe([[17.2, -3.6], [18.7, -3.6], [19.6, -2.7], [19.95, -0.2], [19.7, 2.1], [19, 3], [17.2, 3], [17.2, -3.6]], M.brushed));
const lugShape = new THREE.Shape();
lugShape.moveTo(15, 3); lugShape.lineTo(21.2, 2.1); lugShape.quadraticCurveTo(25.9, 0.6, 25.7, -3); lugShape.lineTo(24.7, -3.9); lugShape.lineTo(21.5, -3.6); lugShape.lineTo(15, -3.6); lugShape.closePath();
const lugGeo = new THREE.ExtrudeGeometry(lugShape, { depth: 3, bevelEnabled: true, bevelSize: 0.3, bevelThickness: 0.3, bevelSegments: 3, curveSegments: 16 });
lugGeo.translate(0, 0, -1.5);
for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
  const l = new THREE.Mesh(lugGeo, M.brushed);
  l.rotation.y = sz > 0 ? -Math.PI / 2 : Math.PI / 2;
  l.position.x = sx * 11.9; caseG.add(l);
}
const crown = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 2.8, 26), new THREE.MeshStandardMaterial({ color: 0xd4d7da, metalness: 1, roughness: 0.25, flatShading: true }));
crown.rotation.z = Math.PI / 2; crown.position.set(21.9, -0.2, 0); caseG.add(crown);
const stem = cyl(1.5, 2, M.polished, 20); stem.rotation.z = Math.PI / 2; stem.position.set(20.3, -0.2, 0); caseG.add(stem);
function strapGeo() {
  const g = new THREE.BoxGeometry(19.3, 2.3, 56, 8, 2, 48);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = (p.getZ(i) + 28) / 56;
    p.setXYZ(i, p.getX(i) * (1 - 0.17 * t), p.getY(i) - 1 - 20 * t * t, 19.2 + t * 56 * (1 - 0.16 * t * t));
  }
  g.computeVertexNormals();
  return g;
}
const sg = strapGeo();
const strapA = new THREE.Mesh(sg, M.leather), strapB = new THREE.Mesh(sg, M.leather);
strapB.rotation.y = Math.PI; caseG.add(strapA, strapB);
part(caseG, 0, 0, 'Case', '38 mm, brushed 316L steel', 21);

// mainplate
const plate = new THREE.Group();
plate.add(new THREE.Mesh(new THREE.CylinderGeometry(15.2, 15.2, 1.6, 96), [M.brushed, M.plate, M.plate]));
part(plate, 0.1, -9, 'Mainplate', 'Circular-grained brass, rhodium plated');

// gear train, bridges and balance: this is the face you see through the caseback
const train = new THREE.Group();
const wheels = [ // x, z, radius, teeth, turns per second
  [-6.4, -3.4, 5.7, 64, 0.02], [0, 0, 4.3, 48, -0.06], [5.3, 3.5, 3.4, 40, 0.22], [2.4, 8.7, 3.0, 36, -0.5], [-3.2, 10.4, 1.9, 15, 1.3],
];
const spinning = wheels.map(([x, z, r, teeth, v], i) => {
  const w = gear(r, teeth, i === 4 ? M.polished : M.gold);
  w.position.set(x, 0.55 - i * 0.07, z);
  train.add(w);
  return { w, v };
});
// barrel bridge: a half plate over the mainspring barrel and centre wheel
const half = new THREE.Shape();
half.absarc(0, 0, 14.7, 0.12, Math.PI + 0.3, false);
half.lineTo(-3.4, -1.6); half.lineTo(2.6, -1.4); half.closePath();
const bridgeA = flat(half, 0.7, M.bridge, 0.08); bridgeA.position.y = -0.5; train.add(bridgeA);
train.add(jewel(-6.4, -0.6, -3.4), jewel(0, -0.6, 0), screw(-12, -0.62, -5), screw(-3, -0.62, -12.6), screw(9.5, -0.62, -8.6), screw(11.6, -0.62, -2.8));
// finger bridges for the smaller wheels
function finger(x, z, w = 2.3) {
  const len = 14.6 - Math.hypot(x, z);
  const s = new THREE.Shape();
  s.absarc(0, 0, w / 2 + 0.35, Math.PI / 2, Math.PI * 1.5, false);
  s.lineTo(len, -w / 2 - 0.5); s.lineTo(len, w / 2 + 0.5); s.closePath();
  const m = flat(s, 0.6, M.bridge, 0.07);
  m.rotation.y = Math.atan2(-z, x);
  m.position.set(x, -0.42, z);
  const d = Math.hypot(x, z);
  train.add(m, jewel(x, -0.5, z), screw(x + (x / d) * (len - 1.5), -0.52, z + (z / d) * (len - 1.5), 0.6));
}
wheels.slice(2).forEach(([x, z]) => finger(x, z));
// balance wheel with hairspring, under its own cock
const balance = new THREE.Group();
const rimGeo = new THREE.TorusGeometry(4.3, 0.34, 12, 72); rimGeo.rotateX(Math.PI / 2);
balance.add(new THREE.Mesh(rimGeo, M.gold));
for (let i = 0; i < 3; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.2, 0.42), M.gold); sp.rotation.y = (i / 3) * Math.PI; balance.add(sp); }
const spiral = new THREE.CatmullRomCurve3(Array.from({ length: 120 }, (_, i) => { const a = i * 0.32; return new THREE.Vector3(Math.cos(a) * (0.5 + i * 0.021), 0, Math.sin(a) * (0.5 + i * 0.021)); }));
const hair = new THREE.Mesh(new THREE.TubeGeometry(spiral, 400, 0.045, 5), M.blued); hair.position.y = -0.3; balance.add(hair);
balance.position.set(-8.6, 0.3, 5.6);
train.add(balance);
finger(-8.6, 5.6, 3);
part(train, -1.5, -18, 'Gear train and bridges', '27 jewels, striped bridges');

// rotor
const rotor = new THREE.Group();
const web = new THREE.Shape(); web.absarc(0, 0, 14.3, 0, Math.PI, false); web.absarc(0, 0, 2.6, Math.PI, 0, true); web.closePath();
[0.5, 1.6, 2.6].forEach((a) => { const h = new THREE.Path(); h.absarc(Math.cos(a) * 7.4, Math.sin(a) * 7.4, 2.5, 0, TAU, true); web.holes.push(h); });
const webM = flat(web, 0.45, M.bridge, 0.05); rotor.add(webM);
const heavy = new THREE.Shape(); heavy.absarc(0, 0, 14.4, 0, Math.PI, false); heavy.absarc(0, 0, 11.4, Math.PI, 0, true); heavy.closePath();
const heavyM = flat(heavy, 1.15, M.gold, 0.12); heavyM.position.y = -0.8; rotor.add(heavyM);
const hub = cyl(2.9, 0.7, M.polished, 40); hub.position.y = 0.1; rotor.add(hub, screw(0, -0.3, 0, 1));
part(rotor, -2.75, -25, 'Winding rotor', 'Tungsten rim, ceramic bearings', 16, 1);

// caseback
const back = new THREE.Group();
back.add(lathe([[15.6, -3.6], [19, -3.6], [18.3, -4.7], [15.6, -4.7], [15.6, -3.6]], M.polished));
const win = cyl(15.6, 0.6, M.glass, 96); win.position.y = -4.2; back.add(win);
for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.26; back.add(screw(Math.cos(a) * 17.3, -4.75, Math.sin(a) * 17.3, 0.55)); }
part(back, 0, -37, 'Caseback', 'Sapphire window, six screws', 20, 1);

/* ---------- Labels pinned to the exploded layers ---------- */
const labelsEl = $('#labels');
parts.forEach((p) => {
  p.el = document.createElement('div');
  p.el.className = 'lbl';
  p.el.innerHTML = `${p.label}<small>${p.sub}</small>`;
  labelsEl.append(p.el);
});

/* ---------- Dial picker ---------- */
const dialsEl = $('#dials');
dials.forEach((d, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', d.name); b.setAttribute('aria-checked', i === 0);
  b.style.setProperty('--c', d.hex);
  b.addEventListener('click', () => setDial(i));
  dialsEl.append(b);
});
let dialIndex = 0;
function setDial(i) {
  dialIndex = i;
  M.dialFace.map.dispose();
  M.dialFace.map = dialTexture(dials[i]);
  M.leather.color.setHex(dials[i].strap);
  $('#dialName').textContent = dials[i].name;
  [...dialsEl.children].forEach((b, j) => b.setAttribute('aria-checked', j === i));
}
document.fonts.ready.then(() => setDial(dialIndex)); // redraw once the dial lettering font has loaded

/* ---------- Choreography ---------- */
// pos/tgt: camera and look-at in mm. ex: how far the layers are pulled apart.
// low: pushes rotor and caseback clear so the camera can get under the movement.
// ox/oy: shifts the watch on screen (fraction of the viewport) to make room for the caption.
const path = keyframes([
  { p: 0.0, pos: [0, 92, 108], tgt: [0, 0, 0], ex: 0, low: 0, ox: 0, oy: 0.15 },
  { p: 0.06, pos: [10, 86, 112], tgt: [0, 0, 0], ex: 0, low: 0, ox: 0, oy: 0.12 },
  { p: 0.2, pos: [136, 36, 124], tgt: [0, 0, 0], ex: 1, low: 0, ox: 0.13, oy: 0 },
  { p: 0.3, pos: [118, 44, 140], tgt: [0, 0, 0], ex: 1, low: 0, ox: 0.13, oy: 0 },
  { p: 0.39, pos: [56, 76, 66], tgt: [0, 26, 0], ex: 1, low: 0, ox: -0.15, oy: 0 },
  { p: 0.44, pos: [50, 74, 70], tgt: [0, 26, 0], ex: 1, low: 0, ox: -0.15, oy: 0 },
  { p: 0.53, pos: [8, 66, 52], tgt: [0, 11, 0], ex: 1, low: 0, ox: 0.16, oy: 0 },
  { p: 0.58, pos: [14, 64, 54], tgt: [0, 11, 0], ex: 1, low: 0, ox: 0.16, oy: 0 },
  { p: 0.67, pos: [30, -70, 40], tgt: [0, -18, 0], ex: 1, low: 1, ox: -0.16, oy: 0 },
  { p: 0.72, pos: [22, -72, 38], tgt: [0, -18, 0], ex: 1, low: 1, ox: -0.16, oy: 0 },
  { p: 0.81, pos: [-40, -104, 62], tgt: [0, -29, 0], ex: 1, low: 0, ox: 0.16, oy: 0 },
  { p: 0.86, pos: [-30, -108, 58], tgt: [0, -27, 0], ex: 1, low: 0, ox: 0.16, oy: 0 },
  { p: 0.94, pos: [40, 50, 110], tgt: [0, 0, 0], ex: 0, low: 0, ox: 0.15, oy: 0 },
  { p: 1.0, pos: [0, 118, 36], tgt: [0, 0, 0], ex: 0, low: 0, ox: 0.15, oy: 0 },
]);

const stage = scrollStage($('#stage'));
window.__stage = stage;
const showCaptions = captions($('.sticky'));
const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener('pointermove', (e) => { pointer.x = e.clientX / innerWidth - 0.5; pointer.y = e.clientY / innerHeight - 0.5; });

let W = 0, H = 0;
function resize() {
  W = canvas.clientWidth; H = canvas.clientHeight;
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
}
addEventListener('resize', resize);
resize();

const tgt = new THREE.Vector3(), v = new THREE.Vector3(), right = new THREE.Vector3();
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let visible = true;
new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe($('#stage'));

function frame(ms) {
  requestAnimationFrame(frame);
  if (!visible) return;
  const t = ms / 1000;
  const p = stage.tick();
  const k = path(p);
  const narrow = W < 860;

  // layers
  for (const part of parts) part.obj.position.y = part.y + part.spread * k.ex - part.extra * k.low * 46;

  // the strap steps out of the way while the watch is apart
  M.leather.opacity = 1 - smooth(clamp01(k.ex * 1.8));
  strapA.visible = strapB.visible = M.leather.opacity > 0.01;

  // the mechanism runs in real time
  const now = new Date();
  const secs = now.getSeconds() + now.getMilliseconds() / 1000;
  const mins = now.getMinutes() + secs / 60, hrs = (now.getHours() % 12) + mins / 60;
  hSec.rotation.y = -(Math.floor(secs * 8) / 8 / 60) * TAU; // eight ticks a second
  hMin.rotation.y = -(mins / 60) * TAU;
  hHour.rotation.y = -(hrs / 12) * TAU;
  for (const s of spinning) s.w.rotation.y = t * s.v * TAU;
  balance.rotation.y = Math.sin(t * TAU * 4) * 1.3;
  rotor.rotation.y = reduce ? 0.6 : t * 0.5 + Math.sin(t * 0.7) * 0.6;

  // camera
  pointer.sx += (pointer.x - pointer.sx) * 0.05; pointer.sy += (pointer.y - pointer.sy) * 0.05;
  watch.rotation.y = reduce ? 0 : pointer.sx * 0.22;
  watch.rotation.x = reduce ? 0 : pointer.sy * 0.1;
  const pull = narrow ? 1.5 : Math.max(1, 1.5 / camera.aspect); // step back on tall screens
  tgt.fromArray(k.tgt);
  camera.position.fromArray(k.pos).sub(tgt).multiplyScalar(pull).add(tgt);
  camera.lookAt(tgt);
  camera.setViewOffset(W, H, narrow ? 0 : -k.ox * W, narrow ? H * 0.12 : k.oy * H, W, H);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();

  // labels sit to the right of each layer while the watch is fully apart
  const labelK = smooth(clamp01((p - 0.165) / 0.03)) * smooth(clamp01((0.305 - p) / 0.03)) * (k.ex > 0.9 ? 1 : 0);
  if (labelK > 0.01) {
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    for (const part of parts) {
      part.obj.getWorldPosition(v).addScaledVector(right, part.labelR).project(camera);
      part.el.style.transform = `translate(${((v.x + 1) / 2) * W}px, ${((1 - v.y) / 2) * H}px)`;
      part.el.style.opacity = labelK;
    }
  } else if (parts[0].el.style.opacity !== '0') parts.forEach((x) => (x.el.style.opacity = '0'));

  showCaptions(p);
  $('#railFill').style.transform = `scaleX(${p})`;
  $('#hint').style.opacity = p > 0.015 ? 0 : 1;
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

setInterval(() => { $('#clock').textContent = new Date().toLocaleTimeString('en-GB'); }, 500);

/* ---------- Reserve form ---------- */
$('#form').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = $('#email').value.trim();
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  $('#msg').textContent = ok
    ? `Number 41 of 60 is held for ${email}. This is a demo, so no deposit has been taken.`
    : 'Enter an email address like name@example.com so we can send your number.';
});
