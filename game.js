'use strict';

const $ = i => document.getElementById(i), R = Math.random, LX = [-2.2, 0, 2.2];
const LS = {
  g(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch(e) { return d; } },
  s(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} }
};

let AX, mute = false;
function snd(f, d = .1, t = 'square', v = .04, s = 0) {
  if (mute) return;
  try {
    AX = AX || new (window.AudioContext || window.webkitAudioContext)();
    if (AX.state === 'suspended') AX.resume();
    const n = AX.currentTime, o = AX.createOscillator(), g = AX.createGain();
    o.type = t;
    o.frequency.setValueAtTime(f, n);
    if (s) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + s), n + d);
    g.gain.setValueAtTime(v, n);
    g.gain.exponentialRampToValueAtTime(.001, n + d);
    o.connect(g).connect(AX.destination);
    o.start();
    o.stop(n + d);
  } catch(e) {}
}

/* ---------- THREE.JS 3D ARCADE ENGINE ---------- */
if (!window.THREE) {
  document.body.insertAdjacentHTML('beforeend', '<div class="nogl">Could not load 3D graphics engine. Check connection.</div>');
  throw new Error('three.js missing');
}

// Capped pixel ratio for silky smooth 60fps on mobile and 120Hz displays
const rd = new THREE.WebGLRenderer({ canvas: $('c'), antialias: devicePixelRatio < 1.5, powerPreference: 'high-performance' });
rd.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

const sc = new THREE.Scene();
sc.background = new THREE.Color(0x020610);
sc.fog = new THREE.FogExp2(0x030d1a, 0.012);

const cam = new THREE.PerspectiveCamera(65, 1, .1, 300);
const _camTarget = new THREE.Vector3();
const _tmpCol = new THREE.Color();

function rs() {
  const w = window.innerWidth, h = window.innerHeight;
  rd.setSize(w, h);
  cam.aspect = w / h;
  cam.updateProjectionMatrix();
}
addEventListener('resize', rs, { passive: true });
rs();

sc.add(new THREE.AmbientLight(0x4070a0, 0.95));
const dl = new THREE.DirectionalLight(0x00ff88, 0.85);
dl.position.set(3, 10, 5);
sc.add(dl);

const pl = new THREE.PointLight(0x00ff88, 1.5, 24);
pl.position.set(0, 3, -2);
sc.add(pl);

const M = (c, i = .4) => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: i });

function ctex(w, h, fn, rx, ry) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  fn(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  return t;
}

// Floor texture: GFG emerald neon tracks with Bennett blue boundaries & code matrix
const fT = ctex(256, 256, (x, w, h) => {
  x.fillStyle = '#030814';
  x.fillRect(0, 0, w, h);
  
  // Neon GFG green track dividers
  x.lineWidth = 4;
  x.strokeStyle = '#00e676';
  [85, 171].forEach(a => {
    x.beginPath(); x.moveTo(a, 0); x.lineTo(a, h);
    x.stroke();
  });
  
  // Bennett cyan outer borders
  x.strokeStyle = '#0284c7';
  x.lineWidth = 8;
  [3, 253].forEach(a => {
    x.beginPath(); x.moveTo(a, 0); x.lineTo(a, h);
    x.stroke();
  });
  
  // Cross grid line
  x.strokeStyle = 'rgba(0, 255, 136, 0.4)';
  x.lineWidth = 3;
  x.beginPath(); x.moveTo(0, 1); x.lineTo(w, 1); x.stroke();
  
  // Bennett & GFG coding syntax marks
  x.fillStyle = 'rgba(56, 189, 248, 0.35)';
  x.font = 'bold 14px "JetBrains Mono", monospace';
  ['GFG', 'BENNETT', 'O(1)', 'while()', '0xBU', 'malloc'].forEach((s, i) => {
    x.fillText(s, 16 + (i % 3) * 85, 58 + i * 36);
  });
}, 1, 40);

// Side cyber server walls
const wT = () => ctex(256, 256, (x, w, h) => {
  x.fillStyle = '#020610';
  x.fillRect(0, 0, w, h);
  x.fillStyle = '#00b84f';
  for (let i = 0; i < 8; i++) x.fillRect(i * 32 + 14, 0, 3, h);
  x.fillStyle = '#38bdf8';
  x.fillRect(0, 196, w, 5);
  x.fillStyle = 'rgba(0, 255, 136, 0.7)';
  x.fillRect(40, 60, 50, 8);
  x.fillRect(150, 110, 30, 8);
}, 40, 1);

const wL = wT(), wR = wT();
const flMesh = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 240), new THREE.MeshBasicMaterial({ map: fT }));
flMesh.rotation.x = -Math.PI / 2;
flMesh.position.z = -100;
sc.add(flMesh);

[[-4.2, wL, Math.PI / 2], [4.2, wR, -Math.PI / 2]].forEach(([x, t, r]) => {
  const w = new THREE.Mesh(new THREE.PlaneGeometry(240, 7), new THREE.MeshBasicMaterial({ map: t }));
  w.position.set(x, 3.5, -100);
  w.rotation.y = r;
  sc.add(w);
});

// Cyber background stars
{
  const g = new THREE.BufferGeometry(), a = [];
  for (let i = 0; i < 450; i++) a.push((R() - .5) * 200, R() * 60 + 8, -R() * 200);
  g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
  sc.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x38bdf8, size: .55, fog: false })));
}

/* ---------- ATMOSPHERE & ARCHES ---------- */
function rtex(stops) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

const GLOW = rtex([[0, 'rgba(255,255,255,1)'], [.25, 'rgba(255,255,255,.45)'], [1, 'rgba(255,255,255,0)']]);
const glowMat = (c, o = 1) => new THREE.SpriteMaterial({ map: GLOW, color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });

const HZ = new THREE.Sprite(glowMat(0x00b84f, .95));
HZ.material.fog = false; HZ.position.set(0, 4, -170); HZ.scale.set(140, 70, 1); sc.add(HZ);

const HZ2 = new THREE.Sprite(glowMat(0x0284c7, .65));
HZ2.material.fog = false; HZ2.position.set(0, 2, -165); HZ2.scale.set(60, 20, 1); sc.add(HZ2);

const EG = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), LM = {};
function edge(o, c) {
  LM[c] = LM[c] || new THREE.LineBasicMaterial({ color: c });
  o.add(new THREE.LineSegments(EG, LM[c]));
  return o;
}

// Server gateway arches that stream past
const AR = [], AN = 12, AS = 20, aM = M(0x051329, .25);
for (let i = 0; i < AN; i++) {
  const g = new THREE.Group(), c = i % 2 ? 0x00e676 : 0x0284c7;
  [-4, 4].forEach(x => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), aM);
    p.scale.set(.45, 7.4, .45); p.position.set(x, 3.7, 0);
    g.add(edge(p, c));
  });
  const t = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), aM);
  t.scale.set(8.9, .4, .6); t.position.y = 7.5;
  g.add(edge(t, c));
  const lamp = new THREE.Sprite(glowMat(c, .85));
  lamp.scale.set(2.4, 2.4, 1); lamp.position.y = 7.5;
  g.add(lamp);
  g.position.z = -i * AS;
  sc.add(g);
  AR.push(g);
}

const SHD = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: rtex([[0, 'rgba(0,0,0,.75)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false }));
SHD.rotation.x = -Math.PI / 2; SHD.position.y = .03; sc.add(SHD);

/* ---------- PLAYER ---------- */
const gB = new THREE.BoxGeometry(1, 1, 1), P = new THREE.Group(), body = new THREE.Group();
P.add(body); sc.add(P);
function box(m, sx, sy, sz, x, y, z, p) {
  const o = new THREE.Mesh(gB, m);
  o.scale.set(sx, sy, sz); o.position.set(x, y, z);
  p && p.add(o);
  return o;
}

// GFG Green & Bennett Blue Runner Avatar
box(M(0x00b84f, .55), .7, .9, .45, 0, 1.2, 0, body);
box(M(0x0284c7, .55), .5, .6, .25, 0, 1.25, .33, body);
const hd = new THREE.Mesh(new THREE.SphereGeometry(.28, 12, 10), M(0xffd8a8, .3));
hd.position.y = 1.9; body.add(hd);
const hat = new THREE.Mesh(new THREE.ConeGeometry(.42, .28, 10), M(0x002b49, .4));
hat.position.y = 2.15; body.add(hat);

function limb(x, y, w, h, c) {
  const g = new THREE.Group(); g.position.set(x, y, 0);
  box(M(c, .4), w, h, w, 0, -h / 2, 0, g);
  body.add(g);
  return g;
}
const lgL = limb(-.18, .8, .25, .8, 0x0f381e);
const lgR = limb(.18, .8, .25, .8, 0x0f381e);
const amL = limb(-.5, 1.6, .2, .7, 0xffd8a8);
const amR = limb(.5, 1.6, .2, .7, 0xffd8a8);
const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, .06, 8, 24), new THREE.MeshBasicMaterial({ color: 0x00ff88 }));
ring.position.y = 1.2; ring.rotation.x = Math.PI / 2; P.add(ring);

/* Bug Monster: The Compiler Bug */
const BG = new THREE.Group(); sc.add(BG);
{
  const b = new THREE.Mesh(new THREE.SphereGeometry(.9, 14, 10), M(0x7c1fb5, .6));
  b.scale.set(1.2, .9, 1.1); BG.add(b);
  [-.35, .35].forEach(x => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(.17, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00ff88 }));
    e.position.set(x, .3, -.85); BG.add(e);
  });
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, c = new THREE.Mesh(new THREE.ConeGeometry(.16, .9, 6), M(0xe11d48, .7));
    c.position.set(Math.cos(a) * 1.1, Math.sin(a) * .8, 0);
    c.rotation.z = a - Math.PI / 2; BG.add(c);
  }
  [-.4, .4].forEach(x => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(.12, .6, 6), M(0xffffff, 1));
    m.position.set(x, -.45, -.9); m.rotation.x = -Math.PI / 2; BG.add(m);
  });
}

/* ---------- GAME OBJECTS & TEXTURES ---------- */
const MT = {
  wall: M(0xe11d48, .7),
  low: M(0xf59e0b, .8),
  high: M(0x8b5cf6, .8),
  pit: new THREE.MeshBasicMaterial({ color: 0x000000 }),
  fr: new THREE.MeshBasicMaterial({ color: 0xf59e0b }),
  ok: new THREE.MeshBasicMaterial({ color: 0x00ff88 }),
  coin: new THREE.MeshBasicMaterial({ color: 0x00ff88 }),
  fog: new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: .35, depthWrite: false })
};

const gSp = new THREE.SphereGeometry(1.6, 10, 8), gC = new THREE.CylinderGeometry(.35, .35, .1, 12);
gC.rotateX(Math.PI / 2);

const LC = {};
function lab(t, col, sz, w, h) {
  const k = t + col + sz;
  if (!LC[k]) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.font = 'bold ' + sz + 'px "JetBrains Mono", monospace';
    x.textAlign = 'center';
    x.fillStyle = col;
    x.shadowColor = col;
    x.shadowBlur = 12;
    x.fillText(t, w / 2, h * .7);
    LC[k] = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false });
  }
  const s = new THREE.Sprite(LC[k]);
  s.scale.set(4, 1, 1);
  return s;
}

const OB = [], CO = [], PK = [];
let ZB = -115;

function mk(k, x, z, txt, col) {
  const g = new THREE.Group(), o = { k, x, z, g, hw: 1, hz: .5 };
  if (k == 'wall') {
    edge(box(MT.wall, 2, 3, 1.2, 0, 1.5, 0, g), 0xff99bb);
    o.hz = .7;
  } else if (k == 'low') {
    edge(box(MT.low, 2, .9, .8, 0, .45, 0, g), 0xffe29a);
  } else if (k == 'high') {
    edge(box(MT.high, 6.6, .7, .6, 0, 2, 0, g), 0xddd6fe);
    o.hw = 4;
  } else if (k == 'pit') {
    box(MT.pit, 6.6, .06, 3, 0, .03, 0, g);
    box(MT.fr, 6.6, .08, .15, 0, .06, 1.5, g);
    box(MT.fr, 6.6, .08, .15, 0, .06, -1.5, g);
    o.hw = 4; o.hz = 1.5;
  } else if (k == 'fog') {
    const s = new THREE.Mesh(gSp, MT.fog);
    s.position.y = 1.5;
    g.add(s);
    o.hz = 1.6;
  }
  if (txt) {
    const l = lab(txt, col, 34, 256, 64);
    l.position.y = k == 'pit' ? 1.3 : k == 'high' ? 3.2 : k == 'low' ? 1.7 : 4;
    l.scale.set(3.6, .9, 1);
    g.add(l);
  }
  g.position.set(x, 0, z);
  sc.add(g);
  OB.push(o);
}

function gate(z, txt) {
  const open = R() * 3 | 0, g = new THREE.Group(), o = { k: 'gate', x: 0, z, g, open, hw: 5, hz: .8 };
  for (let l = 0; l < 3; l++) {
    if (l == open) {
      box(MT.ok, .15, 4.5, .3, LX[l] - 1.05, 2.25, 0, g);
      box(MT.ok, .15, 4.5, .3, LX[l] + 1.05, 2.25, 0, g);
    } else {
      edge(box(MT.wall, 2.1, 4.5, .8, LX[l], 2.25, 0, g), 0xff99bb);
    }
  }
  const og = new THREE.Sprite(glowMat(0x00ff88, .8));
  og.position.set(LX[open], 2.2, .4);
  og.scale.set(3, 5, 1);
  g.add(og);

  const l = lab(txt, '#00ff88', 34, 256, 64);
  l.position.y = 5.4;
  l.scale.set(6, 1.5, 1);
  g.add(l);
  g.position.z = z;
  sc.add(g);
  OB.push(o);
}

const coinGlow = glowMat(0x00ff88, .6);
function coin(x, y, z) {
  const m = new THREE.Mesh(gC, MT.coin), h = new THREE.Sprite(coinGlow);
  h.scale.set(1.5, 1.5, 1);
  m.add(h);
  m.position.set(x, y, z);
  sc.add(m);
  CO.push({ m, x, y, z });
}

function coinLine(l, z, n) {
  for (let i = 0; i < n; i++) coin(LX[l], 1, z - i * 2.0);
}

const PU = [
  ['shield', 'STACK SHIELD', '#00ff88', 0x00ff88],
  ['bs', 'BINARY SEARCH', '#38bdf8', 0x38bdf8],
  ['queue', 'QUEUE SPRINT', '#f59e0b', 0xf59e0b],
  ['magnet', 'HASH MAP MAGNET', '#c084fc', 0xc084fc],
  ['dp', 'DYNAMIC PROG +1 LIFE', '#f472b6', 0xf472b6]
];
const SY = [['{ }', '#00ff88'], ['[ ]', '#38bdf8'], ['< >', '#f59e0b']];

function pick(type, i, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 1.3, z);
  let l;
  if (type == 'pu') {
    g.add(new THREE.Mesh(new THREE.OctahedronGeometry(.55), M(PU[i][3], 1)));
    const h = new THREE.Sprite(glowMat(PU[i][3], .75));
    h.scale.set(2.6, 2.6, 1);
    g.add(h);
    l = lab(PU[i][1], PU[i][2], 34, 256, 64);
    l.position.y = 1.2;
    l.scale.set(3.4, .85, 1);
  } else {
    l = lab(SY[i][0], SY[i][1], 90, 128, 128);
    l.scale.set(1.8, 1.8, 1);
  }
  g.add(l);
  sc.add(g);
  PK.push({ type, i, x, z, g });
}

/* ---------- HIGHER FREQUENCY DYNAMIC OBSTACLE SPAWNER ---------- */
function spawn(customZ) {
  const d = S.dist, z = customZ !== undefined ? customZ : -105, L = R() * 3 | 0, r = R();

  // Milestone compile boss gates every 1000m
  if (d >= S.nb) {
    S.nb += 1000;
    gate(z, 'RUNTIME ERROR');
    gate(z - 16, 'EXCEPTION');
    coinLine(1, z - 5, 4);
    return 36;
  }

  // Tighter obstacle spacings for continuous engagement:
  if (r < .14) {
    coinLine(L, z, 7);
    return 10;
  }
  if (r < .28) {
    mk('pit', 0, z, 'NULL POINTER PIT', '#f59e0b');
    for (let i = 0; i < 4; i++) coin(LX[L], 1 + 2.1 * Math.sin(i / 3 * Math.PI), z + 2.0 - i * 1.1);
    return 12;
  }
  if (r < .46) {
    const open = R() < .35 ? [L, (L + 1) % 3] : [L];
    for (let l = 0; l < 3; l++) {
      if (!open.includes(l)) mk('wall', LX[l], z, l == (L + 1) % 3 || l == (L + 2) % 3 ? 'STACK OVERFLOW' : 0, '#e11d48');
    }
    coinLine(L, z + 7, 4);
    return 11;
  }
  if (r < .58 && d > 60) {
    const L2 = L;
    for (let i = 0; i < 3; i++) {
      for (let l = 0; l < 3; l++) {
        if (l != (L2 + i) % 3) mk('low', LX[l], z - i * 7, i == 0 && l == (L2 + 1) % 3 ? 'INFINITE LOOP' : 0, '#a855f7');
      }
    }
    return 22;
  }
  if (r < .68 && d > 120) {
    mk('wall', LX[0], z, 'OFF-BY-ONE', '#e11d48');
    mk('wall', LX[2], z);
    mk('wall', LX[0], z - 8);
    mk('wall', LX[1], z - 8);
    return 20;
  }
  if (r < .78) {
    mk('high', 0, z, 'SEGFAULT BEAM: SLIDE', '#8b5cf6');
    return 12;
  }
  if (r < .85 && d > 80) {
    mk('fog', LX[L], z, 'MEMORY LEAK', '#0284c7');
    return 11;
  }

  // Power-ups and Fever Syntax Token pickups
  if (R() < .55) {
    pick('pu', R() * 5 | 0, LX[L], z);
  } else {
    const i = R() * 3 | 0;
    for (let k = 0; k < 3; k++) pick('sy', i, LX[L], z - k * 5);
  }
  return 14;
}

/* ---------- PARTICLES & EFFECTS (OPTIMIZED NO-GC) ---------- */
const PN = 240, pp = new Float32Array(PN * 3).fill(-99), pc = new Float32Array(PN * 3), PV = new Float32Array(PN * 4);
let pi = 0;
const pg = new THREE.BufferGeometry();
pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
pg.setAttribute('color', new THREE.BufferAttribute(pc, 3));
const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: .28, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
pts.frustumCulled = false;
sc.add(pts);

function emit(x, y, z, col, n = 10) {
  _tmpCol.set(col);
  for (let i = 0; i < n; i++) {
    pi = (pi + 1) % PN;
    pp.set([x, y, z], pi * 3);
    pc.set([_tmpCol.r, _tmpCol.g, _tmpCol.b], pi * 3);
    PV.set([(R() - .5) * 7, R() * 6, (R() - .5) * 7, .8], pi * 4);
  }
}

const SF = new THREE.Mesh(new THREE.PlaneGeometry(2, 60), new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: .25, blending: THREE.AdditiveBlending, depthWrite: false }));
SF.rotation.x = -Math.PI / 2;
SF.position.set(0, .08, -30);
SF.visible = false;
sc.add(SF);

/* ---------- GAME STATE & PROGRESSIVE SPEED MILESTONES ---------- */
const SPEED_MILESTONES = [
  { score: 300, name: 'SPEED UP! ⚡ 1.2X' },
  { score: 750, name: 'VELOCITY CRUISE! ⚡ 1.4X' },
  { score: 1400, name: 'TURBO SPRINT! ⚡ 1.6X' },
  { score: 2400, name: 'OVERCLOCK ENGAGED! ⚡ 1.8X' },
  { score: 3800, name: 'LIGHTSPEED MATRIX! ⚡ 2.0X' },
  { score: 5500, name: 'HYPERDRIVE ACTIVE! ⚡ 2.2X' },
  { score: 7500, name: 'QUANTUM VELOCITY! ⚡ 2.4X' },
  { score: 10000, name: 'WARP CODER ENGAGED! ⚡ 2.6X' },
  { score: 14000, name: 'TRANSCENDENCE MATRIX! ⚡ 2.8X' },
  { score: 19000, name: 'CYBER TITAN SPEED! ⚡ 3.0X' },
  { score: 25000, name: 'ALGORITHMIC GODMODE! ⚡ 3.2X' },
  { score: 32000, name: 'INFINITE LOOP BREAKOUT! ⚡ 3.4X' },
  { score: 40000, name: 'LIGHTSPEED SYNTAX! ⚡ 3.6X' },
  { score: 50000, name: 'BENNETT APEX RUNNER! ⚡ 4.0X' }
];

const newS = () => ({
  t: 0, dist: 0, bonus: 0, score: 0, coins: 0, lives: 0,
  sh: 0, inv: 0, queue: 0, bs: 0, mg: 0, fv: 0, fg: 0,
  col: 0, sp: 16.5, wait: 0, nb: 1000, nc: 900,
  speedTier: 0,
  sym: { last: -1, n: 0 }, lane: 1, vy: 0, air: 0, sl: 0,
  bug: 0, shake: 0, rt: 0, safe: 1, ct: 0, ready: 0
});

let S = newS(), st = 'menu', paused = false, bt;

function ban(t, c = '#00ff88') {
  const b = $('ban');
  b.textContent = t;
  b.style.color = c;
  b.style.textShadow = '0 0 20px ' + c;
  b.classList.remove('on');
  void b.offsetWidth;
  b.classList.add('on');
  clearTimeout(bt);
  bt = setTimeout(() => b.classList.remove('on'), 1600);
}

function flash(c) {
  const f = $('fl');
  f.style.background = c;
  f.style.opacity = .45;
  setTimeout(() => f.style.opacity = 0, 110);
}

// Genuine Personal Best Display
function updateCampusRecordDisplay() {
  const best = LS.g('gfg_bennett_best', 0);
  const banner = $('campus-banner');
  if (banner) {
    if (best > 0) {
      $('record-title').textContent = 'PERSONAL BEST:';
      $('record-score').textContent = best.toLocaleString() + ' PTS';
      banner.style.display = 'inline-flex';
    } else {
      banner.style.display = 'none';
    }
  }
  if ($('hud-target-disp')) {
    $('hud-target-disp').textContent = best > 0 ? best.toLocaleString() : '0';
  }
}

function show(id) {
  ['menu', 'hud', 'over', 'pz'].forEach(x => $(x).classList.toggle('on', x == id));
}

function clearAll() {
  for (const a of [OB, CO, PK]) {
    a.forEach(o => sc.remove(o.g || o.m));
    a.length = 0;
  }
}

const TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || matchMedia('(pointer:coarse)').matches;
let cdN = 0;

function start() {
  const n = ($('nick').value.trim() || 'CODER').slice(0, 12);
  LS.s('gfg_bennett_nick', n);
  $('hud-nick-disp').textContent = n.toUpperCase();

  // Set body class to hide header and give full screen to HUD
  document.body.className = 'in-game';

  clearAll();
  S = newS();
  spawn(-35);
  spawn(-55);
  spawn(-75);
  spawn(-95);
  P.visible = true;
  P.position.set(0, 0, 0);
  st = 'play';
  paused = false;
  S.ready = 3;
  cdN = 0;

  $('cdh').textContent = TOUCH ? 'SWIPE ← → TO MOVE · ↑ JUMP · ↓ SLIDE' : '← → MOVE · ↑ JUMP · ↓ SLIDE';
  $('cdh').style.opacity = 1;
  $('sc').textContent = 0;
  $('di').textContent = '0m';
  $('co').textContent = 0;
  $('fv').style.width = 0;
  show('hud');
  chips();
  snd(440, .15, 'sine', .05, 200);
}

function countdown(dt) {
  S.ready -= dt;
  const n = S.ready > 0 ? Math.ceil(S.ready) : 0;
  if (n !== cdN) {
    cdN = n;
    const e = $('cdn');
    e.textContent = n || 'CODE!';
    e.classList.remove('on');
    void e.offsetWidth;
    e.classList.add('on');
    snd(n ? 540 : 1080, n ? .12 : .3, 'sine', .06, n ? 0 : 350);
    if (!n) {
      $('cdh').style.opacity = 0;
      setTimeout(() => { if (!cdN) e.textContent = ''; }, 800);
    }
  }
}

function home() {
  document.body.className = '';
  clearAll();
  S = newS();
  st = 'menu';
  paused = false;
  updateCampusRecordDisplay();
  show('menu');
}

function die() {
  if (st != 'play') return;
  st = 'dying';
  document.body.className = 'game-over';
  snd(90, .8, 'sawtooth', .1, -60);
  emit(P.position.x, 1.2, 0, 0xe11d48, 65);
  P.visible = false;
  flash('#e11d48');

  const prev = LS.g('gfg_bennett_best', 0);
  const isNewBest = S.score > prev && S.score > 0;
  const best = Math.max(S.score, prev);
  LS.s('gfg_bennett_best', best);

  setTimeout(() => {
    $('fs').textContent = S.score.toLocaleString();
    const nbEl = $('nb');
    if (isNewBest) {
      nbEl.textContent = '★ NEW BEST SCORE! ★';
      nbEl.classList.add('on');
    } else {
      nbEl.classList.remove('on');
    }

    const T = (l, v) => `<div class="tile"><small>${l}</small><b>${v}</b></div>`;
    $('fi').innerHTML =
      T('PERSONAL BEST', best.toLocaleString()) +
      T('DISTANCE', Math.floor(S.dist) + 'm') +
      T('BYTES', S.coins);

    updateCampusRecordDisplay();
    st = 'over';
    show('over');
  }, 800);
}

/* ---------- GAMEPLAY MECHANICS (OPTIMIZED FOR RESPONSIVENESS) ---------- */
function jump() {
  if (S.air) return;
  S.vy = 15.2;
  S.air = 1;
  S.sl = 0;
  snd(520, .14, 'square', .04, 400);
}

function slide() {
  if (S.air) S.vy = -28;
  S.sl = .75;
  snd(220, .12, 'sawtooth', .04, -80);
}

function mvL(d) {
  const l = Math.max(0, Math.min(2, S.lane + d));
  if (l != S.lane) {
    S.lane = l;
    snd(380, .05, 'triangle', .03);
  }
}

function hurt(o) {
  if (S.inv > 0 || S.queue > 0) return;
  const kill = () => { o.dead = 1; o.hit = 1; o.g.visible = false; };
  if (S.sh) {
    S.sh = 0; S.inv = 1; kill();
    flash('#00ff88');
    ban('STACK SHIELD POPPED', '#00ff88');
    snd(160, .3, 'square', .07, -60);
    emit(P.position.x, 1.2, 0, 0x00ff88, 30);
    return;
  }
  if (S.lives > 0) {
    S.lives--; S.inv = 1.8; kill();
    S.bug = -1.3; S.shake = .6;
    flash('#f472b6');
    ban('EXTRA LIFE USED (DP MEMO)', '#f472b6');
    snd(130, .4, 'sawtooth', .07, -50);
    return;
  }
  die();
}

function take(k) {
  emit(k.x, 1.3, 0, k.type == 'pu' ? PU[k.i][3] : 0xffffff, 18);
  snd(680, .14, 'triangle', .06, 500);
  if (k.type == 'pu') {
    const id = PU[k.i][0];
    ban(PU[k.i][1], PU[k.i][2]);
    if (id == 'shield') S.sh = 1;
    if (id == 'bs') S.bs = 7;
    if (id == 'queue') S.queue = 5;
    if (id == 'magnet') S.mg = 9;
    if (id == 'dp') S.lives = Math.min(3, S.lives + 1);
  } else {
    if (S.sym.last == k.i) S.sym.n++;
    else { S.sym.last = k.i; S.sym.n = 1; }
    if (S.sym.n >= 3) {
      S.sym = { last: -1, n: 0 };
      S.fv = 8;
      ban('ALGORITHM FEVER ACTIVATED!', '#00ff88');
      snd(320, .6, 'sawtooth', .06, 900);
    }
  }
}

function safeLane() {
  const f = [1e9, 1e9, 1e9];
  for (const o of OB) {
    if (o.dead || o.z > 0 || o.z < -60) continue;
    for (let l = 0; l < 3; l++) {
      if ((o.k == 'wall' || o.k == 'low') && Math.abs(o.x - LX[l]) < 1.3 || o.k == 'gate' && Math.abs(LX[l] - LX[o.open]) > 1) {
        f[l] = Math.min(f[l], -o.z);
      }
    }
  }
  return f.indexOf(Math.max(...f));
}

let lastBuffSig = '';
function chips() {
  const a = [];
  if (S.sh) a.push(['🛡 STACK SHIELD', '#00ff88']);
  if (S.lives) a.push(['♥ DP LIVES x' + S.lives, '#f472b6']);
  if (S.bs > 0) a.push(['⌕ BINARY SEARCH ' + S.bs.toFixed(1), '#38bdf8']);
  if (S.queue > 0) a.push(['» QUEUE SPRINT ' + S.queue.toFixed(1), '#f59e0b']);
  if (S.mg > 0) a.push(['# HASH MAGNET ' + S.mg.toFixed(1), '#c084fc']);
  if (S.fv > 0) a.push(['★ FEVER ' + S.fv.toFixed(1), '#00ff88']);
  if (S.fg > 0) a.push(['☁ MEMORY LEAK', '#0284c7']);

  const sig = a.map(x => x[0]).join('|');
  if (sig !== lastBuffSig) {
    lastBuffSig = sig;
    $('bf').innerHTML = a.map(([t, c]) => `<span style="--c:${c}">${t}</span>`).join('');
  }
  const y = S.sym.last >= 0 ? SY[S.sym.last] : null;
  $('sy').innerHTML = y ? `<span style="color:${y[1]}">${Array(S.sym.n).fill(y[0]).join(' ')}</span>` : '&nbsp;';
  S.safe = safeLane();
}

function step(dt) {
  S.t += dt;
  for (const k of ['inv', 'queue', 'bs', 'mg', 'fg']) {
    if (S[k] > 0) S[k] = Math.max(0, S[k] - dt);
  }
  if (S.fv > 0) S.fv = Math.max(0, S.fv - dt);

  // Subway Surfers progressive continuous speed scaling (no flatline cap)
  const scoreRoot = Math.sqrt(Math.max(0, S.score));
  const earlyBoost = Math.min(18, scoreRoot * 0.28);
  const continuousClimb = Math.log(1 + Math.max(0, S.score) / 1400) * 4.5 + (S.score * 0.0001);
  const distFactor = Math.min(5, S.dist * 0.001);
  const base = 16.5 + earlyBoost + continuousClimb + distFactor + (S.col > 0 ? 2 : 0);
  const sp = S.sp = base * (S.queue > 0 ? 1.45 : 1);
  S.dist += sp * dt;
  if (S.fv > 0) S.bonus += sp * dt;

  // Adaptive obstacle spacing rhythm
  S.wait -= sp * dt;
  if (S.wait <= 0) S.wait = spawn() + Math.max(3.5, 9 - S.dist / 220);

  // Snappy lane switching (responsive at high velocity)
  const tx = LX[S.lane];
  P.position.x += (tx - P.position.x) * Math.min(1, dt * (20 + (sp - 16.5) * 0.16));

  if (S.air) {
    S.vy -= 39 * dt;
    P.position.y += S.vy * dt;
    if (P.position.y <= 0) {
      P.position.y = 0; S.vy = 0; S.air = 0;
      emit(P.position.x, .1, 0, 0x00ff88, 5);
    }
  }
  if (S.sl > 0) S.sl -= dt;

  const px = P.position.x, py = P.position.y, sl = S.sl > 0;

  // World coins with magnet logic
  for (const c of CO) {
    if (S.mg > 0 && c.z > -16 && Math.abs(c.x - px) < 7) {
      c.x += (px - c.x) * Math.min(1, dt * 8);
      c.y += (py + 1 - c.y) * Math.min(1, dt * 6);
      c.z += 10 * dt;
    }
    c.z += sp * dt;
    c.m.position.set(c.x, c.y, c.z);
    c.m.rotation.y += dt * 5;
  }

  // Obstacles & Pickups forward shift
  for (const a of [OB, PK]) {
    for (const o of a) {
      o.z += sp * dt;
      (o.g).position.z = o.z;
    }
  }

  // Remove passed items
  for (const a of [OB, CO, PK]) {
    for (let i = a.length - 1; i >= 0; i--) {
      if (a[i].z > 10) {
        sc.remove(a[i].g || a[i].m);
        a.splice(i, 1);
      }
    }
  }

  // Obstacle collision checks (with velocity-adaptive hit box to prevent tunneling)
  const hitWindow = o => o.hz + Math.max(.35, sp * dt * .75);
  for (const o of OB) {
    if (o.k == 'gate' && !o.pass && o.z > 1.4) {
      o.pass = 1;
      if (!o.hit) {
        S.bonus += 500;
        ban('BOSS GATE CLEARED +500', '#00ff88');
        snd(880, .3, 'sine', .06, 600);
      }
    }
    if (o.dead || Math.abs(o.z) > hitWindow(o)) continue;
    let h = false;
    if (o.k == 'pit') h = py < .3;
    else if (o.k == 'high') h = !(sl && py < .3);
    else if (o.k == 'low') h = py < .95 && Math.abs(o.x - px) < 1.3;
    else if (o.k == 'wall') h = Math.abs(o.x - px) < 1.35;
    else if (o.k == 'gate') h = Math.abs(LX[o.open] - px) > 1;
    else if (o.k == 'fog' && Math.abs(o.x - px) < 1.8) {
      o.dead = 1; o.g.visible = false;
      S.fg = 6;
      ban('MEMORY LEAK FOG', '#0284c7');
      snd(120, .5, 'sawtooth', .06, -60);
    }
    if (h) hurt(o);
    if (st != 'play') return;
  }

  // Coin pickups (adaptive z-window for high velocity)
  const pickZ = Math.max(1.1, sp * dt * .8);
  for (let i = CO.length - 1; i >= 0; i--) {
    const c = CO[i];
    if (Math.abs(c.z) < pickZ && Math.abs(c.x - px) < 1.2 && Math.abs(c.y - (py + 1)) < 1.6) {
      S.coins++;
      S.bonus += S.fv > 0 ? 30 : 10;
      snd(1200 + Math.min(S.coins, 30) * 15, .05, 'sine', .04);
      emit(c.x, c.y, 0, 0x00ff88, 5);
      sc.remove(c.m);
      CO.splice(i, 1);
    }
  }

  // Token & Buff Pickups
  for (let i = PK.length - 1; i >= 0; i--) {
    const k = PK[i];
    k.g.rotation.y += dt * 3;
    k.g.position.y = 1.3 + Math.sin(S.t * 4 + i) * .2;
    if (Math.abs(k.z) < pickZ && Math.abs(k.x - px) < 1.3 && py < 2) {
      take(k);
      sc.remove(k.g);
      PK.splice(i, 1);
    }
  }

  // Milestones & score
  S.score = Math.floor(S.dist + S.bonus);

  // Subway Surfers progressive speed milestones (keeps escalating)
  if (S.speedTier < SPEED_MILESTONES.length && S.score >= SPEED_MILESTONES[S.speedTier].score) {
    const tier = SPEED_MILESTONES[S.speedTier];
    S.speedTier++;
    ban(tier.name, '#00ff88');
    flash('#00ff88');
    snd(580 + Math.min(S.speedTier, 10) * 60, .25, 'sine', .07, 260);
  } else if (S.speedTier >= SPEED_MILESTONES.length && S.score >= 50000 + (S.speedTier - SPEED_MILESTONES.length + 1) * 10000) {
    S.speedTier++;
    const mult = (4.0 + (S.speedTier - SPEED_MILESTONES.length) * 0.25).toFixed(1);
    ban(`APEX OVERCLOCK ⚡ ${mult}X`, '#00ff88');
    flash('#00ff88');
    snd(980, .25, 'sine', .08, 300);
  }

  if (S.score >= S.nc) {
    S.nc += 1400;
    S.col = 3; S.shake = 1;
    flash('#f59e0b');
    ban('⚠ SERVER COLLAPSE IMMINENT ⚠', '#f59e0b');
    snd(70, 1.2, 'sawtooth', .1, -30);
  }
  if (S.col > 0) {
    S.col -= dt;
    S.shake = Math.max(S.shake, .7);
    emit(R() * 10 - 5, 9, -R() * 25, 0x00ff88, 2);
  }

  S.bug = Math.min(0, S.bug + dt * .7);
  S.shake = Math.max(0, S.shake - dt * .8);

  S.ct -= dt;
  if (S.ct <= 0) {
    S.ct = .15;
    chips();
    SF.visible = S.bs > 0;
  }
  if (S.bs > 0) SF.position.x += (LX[S.safe] - SF.position.x) * Math.min(1, dt * 12);

  $('sc').textContent = S.score.toLocaleString();
  $('di').textContent = Math.floor(S.dist) + 'm';
  $('co').textContent = S.coins;
  $('fv').style.width = (S.fv / 8 * 100) + '%';
}

function world(dt, sp) {
  const u = sp * dt / 6;
  fT.offset.y += u;
  wL.offset.x += u;
  wR.offset.x -= u;

  S.rt += dt * (6 + sp * .45);
  const s = Math.sin(S.rt), air = P.position.y > .05;

  lgL.rotation.x = air ? .8 : s * .9;
  lgR.rotation.x = air ? -.6 : -s * .9;
  amL.rotation.x = air ? -1.4 : -s * .8;
  amR.rotation.x = air ? -1.4 : s * .8;

  body.position.y = air ? 0 : Math.abs(s) * .07;
  body.scale.y = S.sl > 0 ? .5 : 1;
  P.visible = st == 'dying' || st == 'over' ? false : true;

  ring.visible = !!S.sh;
  ring.rotation.z += dt * 3;
  body.visible = S.inv > 0 ? Math.floor(S.t * 20) % 2 == 0 : true;

  BG.position.set(P.position.x * .8, .95 + Math.sin(S.rt * 1.5) * .15, 3.2 + S.bug + (S.queue > 0 ? 2.5 : 0));
  BG.rotation.z = Math.sin(S.rt) * .12;
  BG.scale.setScalar(1 + Math.sin(S.rt * 2) * .05);

  for (const a of AR) {
    a.position.z += sp * dt;
    if (a.position.z > 12) a.position.z -= AN * AS;
  }

  SHD.visible = P.visible;
  SHD.position.x = P.position.x;
  SHD.scale.setScalar(Math.max(.35, 1 - P.position.y * .18));
  SHD.material.opacity = Math.max(.2, 1 - P.position.y * .15);

  HZ.material.color.set(S.fv > 0 ? 0x00ff88 : S.col > 0 ? 0xe11d48 : 0x00b84f);
  HZ.scale.x = 140 + Math.sin(S.rt * .3) * 8;

  pl.position.set(P.position.x, 3, -2);
  pl.color.set(S.fv > 0 ? 0x00ff88 : 0x38bdf8);

  for (let i = 0; i < PN; i++) {
    if (PV[i * 4 + 3] > 0) {
      PV[i * 4 + 3] -= dt;
      PV[i * 4 + 1] -= 9 * dt;
      pp[i * 3] += PV[i * 4] * dt;
      pp[i * 3 + 1] += PV[i * 4 + 1] * dt;
      pp[i * 3 + 2] += PV[i * 4 + 2] * dt;
      if (PV[i * 4 + 3] <= 0) pp[i * 3 + 1] = -99;
    }
  }
  pg.attributes.position.needsUpdate = true;
  pg.attributes.color.needsUpdate = true;

  if (S.fv > 0 && st == 'play') emit(P.position.x, .2, 0, 0x00ff88, 1);

  // Smooth camera following with dynamic speed FOV expansion
  const sh = S.shake * .5;
  const speedFov = Math.min(14, Math.max(0, (S.sp - 16.5) * 0.32));
  const tf = (cam.aspect < .8 ? 76 : 65) + speedFov + (S.fv > 0 ? 8 : 0) + (S.queue > 0 ? 8 : 0);
  cam.fov += (tf - cam.fov) * Math.min(1, dt * 5);
  cam.updateProjectionMatrix();

  sc.fog.density += ((S.fg > 0 ? .075 : .012) - sc.fog.density) * Math.min(1, dt * 3);
  cam.position.x += ((P.position.x * .4 + (R() - .5) * sh) - cam.position.x) * Math.min(1, dt * 14);
  cam.position.y += ((4.5 + P.position.y * .2 + (R() - .5) * sh) - cam.position.y) * Math.min(1, dt * 14);
  cam.position.z = 8.2;
  _camTarget.set(P.position.x * .25, 1.4, -7);
  cam.lookAt(_camTarget);
}

let last = performance.now();
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min(.045, (t - last) / 1000);
  last = t;
  if (st == 'play') {
    if (!paused) {
      if (S.ready > 0) {
        countdown(dt);
        world(dt, 0);
      } else {
        if (cdN) countdown(0);
        step(dt);
        world(dt, S.sp);
      }
    }
  } else {
    world(dt, st == 'menu' ? 12 : 0);
  }
  rd.render(sc, cam);
}

/* ---------- INPUT & CONTROLS ---------- */
addEventListener('keydown', e => {
  const k = e.code;
  if (k == 'KeyM') return tm();
  if ((st == 'over' || st == 'menu') && k == 'Enter') {
    e.preventDefault();
    return start();
  }
  if (st != 'play') return;
  if (k == 'KeyP' || k == 'Escape') return pause(!paused);
  if (paused || S.ready > 0) return;

  if (k == 'ArrowLeft' || k == 'KeyA') mvL(-1);
  else if (k == 'ArrowRight' || k == 'KeyD') mvL(1);
  else if (k == 'ArrowUp' || k == 'KeyW' || k == 'Space') {
    e.preventDefault();
    jump();
  } else if (k == 'ArrowDown' || k == 'KeyS') {
    e.preventDefault();
    slide();
  }
});

// Balanced, reliable mobile touch swipe gesture engine
let tx0 = null, ty0 = null, touchHandled = false;
const SWIPE_X_THRESH = 36; // balanced horizontal lane swipe (prevents accidental lane shifts)
const SWIPE_Y_THRESH = 32; // distinct vertical swipe (swipe up to jump, swipe down to slide)

addEventListener('touchstart', e => {
  if (e.touches && e.touches.length > 0) {
    tx0 = e.touches[0].clientX;
    ty0 = e.touches[0].clientY;
    touchHandled = false;
  }
}, { passive: true });

addEventListener('touchmove', e => {
  if (st !== 'play' || tx0 === null || ty0 === null) return;
  if (paused || S.ready > 0) return;
  
  if (touchHandled) {
    if (e.cancelable) e.preventDefault();
    return;
  }

  const cx = e.touches[0].clientX;
  const cy = e.touches[0].clientY;
  const dx = cx - tx0;
  const dy = cy - ty0;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (absX >= SWIPE_X_THRESH && absX > absY * 0.9) {
    if (e.cancelable) e.preventDefault();
    mvL(dx > 0 ? 1 : -1);
    touchHandled = true;
  } else if (absY >= SWIPE_Y_THRESH && absY > absX * 0.9) {
    if (e.cancelable) e.preventDefault();
    if (dy < 0) {
      jump(); // Only swipe UP jumps
    } else {
      slide(); // Swipe DOWN slides
    }
    touchHandled = true;
  }
}, { passive: false });

addEventListener('touchend', () => {
  tx0 = null;
  ty0 = null;
  touchHandled = false;
}, { passive: true });

addEventListener('touchcancel', () => {
  tx0 = null;
  ty0 = null;
  touchHandled = false;
}, { passive: true });

function pause(p) {
  if (st != 'play') return;
  paused = p;
  document.body.classList.toggle('game-paused', p);
  $('pz').classList.toggle('on', p);
}

function tm() {
  mute = !mute;
  $('mt').textContent = mute ? '🔇' : '🔊';
  $('top-mt').textContent = mute ? '🔇' : '🔊';
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
  }
}

function nextRunner() {
  $('nick').value = '';
  $('nick').focus();
  home();
}

// Modal logic
const guideModal = $('guide-modal');
const qrModal = $('qr-modal');

function openGuide() { if (guideModal) guideModal.classList.add('open'); }
function closeGuide() { if (guideModal) guideModal.classList.remove('open'); }
function openQR() { if (qrModal) qrModal.classList.add('open'); }
function closeQR() { if (qrModal) qrModal.classList.remove('open'); }

if ($('guide-close')) $('guide-close').onclick = closeGuide;
if ($('qr-close')) $('qr-close').onclick = closeQR;

if (guideModal) guideModal.onclick = e => { if (e.target === guideModal) closeGuide(); };
if (qrModal) qrModal.onclick = e => { if (e.target === qrModal) closeQR(); };

if ($('btn-guide')) $('btn-guide').onclick = openGuide;
if ($('qa-guide')) $('qa-guide').onclick = openGuide;
if ($('guide-play-btn')) $('guide-play-btn').onclick = () => { closeGuide(); start(); };
if ($('qa-qr')) $('qa-qr').onclick = openQR;

// Core Arcade Buttons
$('mt').onclick = tm;
$('top-mt').onclick = tm;
$('pb').onclick = () => pause(true);
$('rsm').onclick = () => pause(false);
$('pm').onclick = home;
$('pz').onclick = e => { if (e.target.id == 'pz') pause(false); };
$('play').onclick = start;
$('again').onclick = start;
$('home').onclick = home;
if ($('qa-next')) $('qa-next').onclick = nextRunner;

$('btn-fs').onclick = toggleFullscreen;
$('hud-fs-btn').onclick = toggleFullscreen;

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause(true);
});

// Initialise storage and start animation
$('nick').value = LS.g('gfg_bennett_nick', '');
updateCampusRecordDisplay();
show('menu');
requestAnimationFrame(loop);
