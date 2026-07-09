// ============================================================
// GAME.JS — inti logika permainan MENARA 3D
// Bergantung pada THREE (global dari three.min.js)
// ============================================================

import {
  BLOCK_H, BASE_SIZE, MOVE_RANGE, PERFECT_TOL, GROW_PERFECT,
  SPEED_START, SPEED_MAX, SPEED_ACCEL, VIEW, CAM_LERP, ZOOM_LERP,
  DEBRIS_VY, DEBRIS_VH, DEBRIS_GRAVITY, RING_FADE, RING_GROW,
  SLOWMO_COMBO, SLOWMO_DT, SLOWMO_DURATION,
  THEMES, THEME_KEY,
  MOVING_BLOCK_BONUS, ROUND_HUES,
} from './config.js';
import { ScoreStore }          from './score-store.js';
import { beep, beepSlowmo, beepSlowmoEnd } from './audio.js';

// ── Three.js global (dimuat via <script> non-module sebelum main.js) ──
const THREE = window.THREE;

// ============================================================
// RENDERER & KAMERA
// ============================================================
const canvas   = document.getElementById('game');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Shadow map — lembut (Tugas 3)
renderer.shadowMap.enabled  = true;
renderer.shadowMap.type     = THREE.PCFSoftShadowMap;

export const scene = new THREE.Scene();

// Fog mengikuti gradien latar (Tugas 3) — warna diperbarui tiap skor
scene.fog = new THREE.Fog(0x2b5876, 60, 160);

let aspect = window.innerWidth / window.innerHeight;
export const camera = new THREE.OrthographicCamera(
  -VIEW * aspect, VIEW * aspect, VIEW, -VIEW, -100, 200
);
camera.position.set(20, 20, 20);
camera.lookAt(0, 0, 0);

export function resize() {
  aspect = window.innerWidth / window.innerHeight;
  camera.left   = -VIEW * aspect;
  camera.right  =  VIEW * aspect;
  camera.top    =  VIEW;
  camera.bottom = -VIEW;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ============================================================
// CAHAYA (+ shadow)
// ============================================================
scene.add(new THREE.AmbientLight(0xffffff, 0.55));

const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
dirLight.position.set(15, 30, 10);
dirLight.castShadow              = true;
dirLight.shadow.mapSize.width    = 1024;
dirLight.shadow.mapSize.height   = 1024;
dirLight.shadow.camera.near      = 0.5;
dirLight.shadow.camera.far       = 200;
dirLight.shadow.camera.left      = -40;
dirLight.shadow.camera.right     =  40;
dirLight.shadow.camera.top       =  80;
dirLight.shadow.camera.bottom    = -10;
dirLight.shadow.bias             = -0.001;
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.25);
fillLight.position.set(-15, 10, -10);
scene.add(fillLight);

// ============================================================
// TEMA / SKIN (Tugas 5)
// ============================================================
let currentThemeIdx = 0;

export function getTheme() { return THEMES[currentThemeIdx]; }

export function loadThemePreference(best) {
  try {
    const saved = parseInt(localStorage.getItem(THEME_KEY), 10);
    if (!isNaN(saved)) currentThemeIdx = clampThemeIdx(saved, best);
  } catch (e) {}
}

function clampThemeIdx(idx, best) {
  // pastikan tema terpilih sudah ter-unlock
  let valid = 0;
  for (let i = 0; i < THEMES.length; i++) {
    if (THEMES[i].unlockAt <= best && i <= idx) valid = i;
  }
  return valid;
}

export function setTheme(idx, best) {
  currentThemeIdx = clampThemeIdx(idx, best);
  try { localStorage.setItem(THEME_KEY, String(currentThemeIdx)); } catch (e) {}
}

export function blockColor(i) {
  const t = getTheme();
  // Hue dasar = hue tema + offset ronde (dari ROUND_HUES)
  const roundHueOffset = ROUND_HUES[roundIdx % ROUND_HUES.length];
  const hue = (roundHueOffset + i * t.blockHueStep) % 360;
  return new THREE.Color(`hsl(${hue}, 60%, ${62 - (i % 6)}%)`);
}

export function updateBackground(i) {
  const t = getTheme();
  const h1 = (t.bgH1 + i * t.bgH1Step) % 360;
  const h2 = (t.bgH2 + i * t.bgH2Step) % 360;
  const c1 = `hsl(${h1},40%,32%)`;
  const c2 = `hsl(${h2},60%,62%)`;
  document.getElementById('bg').style.background =
    `linear-gradient(180deg, ${c1} 0%, ${c2} 100%)`;
  // Fog ikut warna langit atas (perkiraan dari h1)
  scene.fog.color.setHSL(h1 / 360, 0.4, 0.32);
}

// ============================================================
// STATE
// ============================================================
let stack    = [];   // {mesh, size:{x,z}, pos:{x,z}, y}
let moving   = null; // {mesh, axis, t, speed, size, pos, spawn}
let debris   = [];   // {mesh, vy, vx, vz, rotAxis, rotSpeed}
let sparkles = [];   // {mesh, life}
let pops     = [];   // {mesh, vel}

let score = 0, combo = 0;
let best  = ScoreStore.getBest();
let state = 'idle';  // idle | playing | over
let cameraTargetY = 0;
let roundIdx = 0;  // indeks ronde untuk gilir warna

// Slow-motion state (Tugas 4)
let slowmoActive    = false;
let slowmoRemaining = 0;    // ms tersisa

export function getState()  { return state; }
export function getBest()   { return best; }
export function getScore()  { return score; }

// ============================================================
// MESH HELPER
// ============================================================
function makeBlockMesh(sx, sz, color) {
  const geo = new THREE.BoxGeometry(sx, BLOCK_H, sz);
  const mat = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow    = true;
  mesh.receiveShadow = true;
  return mesh;
}

function clearScene() {
  [...stack.map(s => s.mesh), ...(moving ? [moving.mesh] : []),
   ...debris.map(d => d.mesh), ...sparkles.map(p => p.mesh)]
    .forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
  stack = []; debris = []; sparkles = []; pops = []; moving = null;
}

export function reset() {
  clearScene();
  score = 0; combo = 0;
  cameraTargetY = 0;
  slowmoActive    = false;
  slowmoRemaining = 0;
  roundIdx++;  // ganti palet warna tiap ronde baru
  camera.position.set(20, 20, 20);
  camera.lookAt(0, 0, 0);

  const baseColor = blockColor(0);
  const base = makeBlockMesh(BASE_SIZE, BASE_SIZE, baseColor);
  base.scale.y = 8;
  base.position.set(0, -BLOCK_H * 4 + BLOCK_H / 2 - 3, 0);
  scene.add(base);

  stack.push({ mesh: base, size: { x: BASE_SIZE, z: BASE_SIZE }, pos: { x: 0, z: 0 }, y: 0 });
  updateBackground(0);
  spawnMoving();
  updateHUD();
  updateSlowmoHUD(false);
  document.getElementById('score').classList.add('show');
  state = 'playing';
}

function topBlock() { return stack[stack.length - 1]; }
function layerY(i)  { return i * BLOCK_H; }

function spawnMoving() {
  const top   = topBlock();
  const i     = stack.length;
  const axis  = i % 2 === 1 ? 'x' : 'z';
  const speed = Math.min(SPEED_START + i * SPEED_ACCEL, SPEED_MAX);
  const color = blockColor(i);

  // Mesh visual lebih besar MOVING_BLOCK_BONUS per sisi agar lebih mudah dilihat.
  // moving.size tetap ukuran AKTUAL untuk logika potong — tidak mengubah gameplay.
  const visSx = top.size.x + MOVING_BLOCK_BONUS;
  const visSz = top.size.z + MOVING_BLOCK_BONUS;
  const mesh = makeBlockMesh(visSx, visSz, color);
  mesh.material.transparent = true;
  mesh.material.opacity     = 0;
  const y = layerY(i) + BLOCK_H / 2 - 3;

  if (axis === 'x') mesh.position.set(top.pos.x - MOVE_RANGE, y, top.pos.z);
  else              mesh.position.set(top.pos.x, y, top.pos.z - MOVE_RANGE);

  scene.add(mesh);
  moving = {
    mesh, axis, t: -Math.PI / 2, speed,
    size: { x: top.size.x, z: top.size.z },  // ukuran AKTUAL (logika)
    pos:  { x: top.pos.x,  z: top.pos.z },
    spawn: 0,
  };
}

// ============================================================
// DROP — inti logika potong
// ============================================================
export function drop() {
  if (state !== 'playing' || !moving) return;

  const top    = topBlock();
  const axis   = moving.axis;
  const mPos   = axis === 'x' ? moving.mesh.position.x : moving.mesh.position.z;
  const tPos   = top.pos[axis];
  const size   = moving.size[axis];
  const delta  = mPos - tPos;
  const overlap = size - Math.abs(delta);

  if (overlap <= 0) {
    spawnDebris(moving.mesh.position.clone(), moving.size.x, moving.size.z,
      moving.mesh.material.color, axis, Math.sign(delta) || 1);
    scene.remove(moving.mesh);
    moving = null;
    gameOver();
    return;
  }

  const i   = stack.length;
  const y   = layerY(i) + BLOCK_H / 2 - 3;
  let newSize = { ...moving.size };
  let newPos  = { ...top.pos };

  if (Math.abs(delta) <= PERFECT_TOL) {
    // ===== PERFECT =====
    combo++;
    if (combo >= 2) {
      newSize.x = Math.min(newSize.x + GROW_PERFECT, BASE_SIZE);
      newSize.z = Math.min(newSize.z + GROW_PERFECT, BASE_SIZE);
    }
    beep(500 + Math.min(combo, 10) * 90, 0.12, 'triangle', 0.2);
    spawnRing(newPos.x, y - BLOCK_H / 2, newPos.z, newSize.x, newSize.z);
    showCombo();

    // Slow-motion: trigger tiap kelipatan SLOWMO_COMBO (Tugas 4)
    if (combo > 0 && combo % SLOWMO_COMBO === 0) activateSlowmo();
  } else {
    // ===== TERPOTONG =====
    combo = 0;
    hideCombo();
    beep(200, 0.07, 'square', 0.09);

    newSize[axis] = overlap;
    newPos[axis]  = tPos + delta / 2;

    const cutSize = size - overlap;
    const cutPos  = moving.mesh.position.clone();
    if (axis === 'x') {
      cutPos.x = newPos.x + Math.sign(delta) * (overlap / 2 + cutSize / 2);
      spawnDebris(cutPos, cutSize, moving.size.z, moving.mesh.material.color, axis, Math.sign(delta));
    } else {
      cutPos.z = newPos.z + Math.sign(delta) * (overlap / 2 + cutSize / 2);
      spawnDebris(cutPos, moving.size.x, cutSize, moving.mesh.material.color, axis, Math.sign(delta));
    }
  }

  scene.remove(moving.mesh);
  moving.mesh.geometry.dispose();

  const placed = makeBlockMesh(newSize.x, newSize.z, moving.mesh.material.color);
  placed.position.set(newPos.x, y, newPos.z);
  scene.add(placed);
  stack.push({ mesh: placed, size: newSize, pos: newPos, y });

  const fromScale = Math.abs(delta) <= PERFECT_TOL && combo >= 2
    ? { x: moving.size.x / newSize.x, y: 1.25, z: moving.size.z / newSize.z }
    : { x: 1, y: 1.3, z: 1 };
  placed.scale.set(fromScale.x, fromScale.y, fromScale.z);
  pops.push({ mesh: placed, vel: 0 });

  score++;
  popScoreHUD();
  updateHUD();
  updateBackground(score);

  cameraTargetY = layerY(stack.length) - 3;
  moving = null;
  spawnMoving();
}

// ============================================================
// SLOW-MOTION POWER-UP (Tugas 4)
// ============================================================
function activateSlowmo() {
  slowmoActive    = true;
  slowmoRemaining = SLOWMO_DURATION;
  updateSlowmoHUD(true);
  beepSlowmo();
}

function tickSlowmo(dtMs) {
  if (!slowmoActive) return;
  slowmoRemaining -= dtMs;
  // update progress bar
  const pct = Math.max(0, slowmoRemaining / SLOWMO_DURATION);
  const bar = document.getElementById('slowmo-bar');
  if (bar) bar.style.width = (pct * 100) + '%';
  if (slowmoRemaining <= 0) {
    slowmoActive    = false;
    slowmoRemaining = 0;
    updateSlowmoHUD(false);
    beepSlowmoEnd();
  }
}

function updateSlowmoHUD(active) {
  const el = document.getElementById('slowmo-hud');
  if (!el) return;
  el.style.opacity = active ? '1' : '0';
}

// ============================================================
// DEBRIS & SPARKLES
// ============================================================
function spawnDebris(pos, sx, sz, color, axis, dir) {
  const mesh = makeBlockMesh(sx, sz, color.clone());
  mesh.position.copy(pos);
  scene.add(mesh);
  debris.push({
    mesh,
    vy: DEBRIS_VY,
    vx: axis === 'x' ? dir * DEBRIS_VH : 0,
    vz: axis === 'z' ? dir * DEBRIS_VH : 0,
    rotAxis: axis === 'x' ? 'z' : 'x',
    rotSpeed: dir * (0.04 + Math.random() * 0.04),
  });
}

function spawnRing(x, y, z, sx, sz) {
  const geo = new THREE.PlaneGeometry(sx, sz);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y + 0.02, z);
  scene.add(mesh);
  sparkles.push({ mesh, life: 1 });
}

// ============================================================
// GAME OVER
// ============================================================
let camY = 0;

function gameOver() {
  state = 'over';
  beep(130, 0.5, 'sawtooth', 0.15);
  const isNew = ScoreStore.save(score);
  if (isNew) best = score;
  bestHud.textContent = 'TERBAIK ' + best;
  document.getElementById('new-record').style.display = isNew ? 'block' : 'none';
  document.getElementById('final-score').textContent  = score;
  updateThemeSelector();
  setTimeout(() => {
    document.getElementById('over-screen').classList.remove('hidden');
  }, 700);
}

// ============================================================
// HUD
// ============================================================
const scoreEl  = document.getElementById('score');
const comboEl  = document.getElementById('combo');
const bestHud  = document.getElementById('best-hud');
bestHud.textContent = 'TERBAIK ' + best;

function updateHUD() {
  scoreEl.textContent    = score;
  bestHud.textContent    = 'TERBAIK ' + best;
}

function popScoreHUD() {
  scoreEl.style.transition = 'none';
  scoreEl.style.transform  = 'scale(1.18)';
  requestAnimationFrame(() => {
    scoreEl.style.transition = 'transform .3s cubic-bezier(.2,1.6,.4,1)';
    scoreEl.style.transform  = 'scale(1)';
  });
}

let comboTimer = null;
function showCombo() {
  comboEl.textContent = combo > 1 ? `PERFECT ×${combo}` : 'PERFECT';
  comboEl.classList.add('show');
  clearTimeout(comboTimer);
  comboTimer = setTimeout(hideCombo, 1400);
}
function hideCombo() { comboEl.classList.remove('show'); }

// ============================================================
// TEMA SELECTOR — di layar game over (Tugas 5)
// ============================================================
function updateThemeSelector() {
  const container = document.getElementById('theme-selector');
  if (!container) return;
  container.innerHTML = '';
  THEMES.forEach((t, idx) => {
    const unlocked = best >= t.unlockAt;
    const btn      = document.createElement('button');
    btn.className  = 'theme-btn' + (idx === currentThemeIdx ? ' active' : '')
                     + (unlocked ? '' : ' locked');
    btn.title      = unlocked ? t.name : `Terbuka di skor ${t.unlockAt}`;
    btn.textContent = unlocked ? t.name : `🔒 ${t.unlockAt}`;
    if (unlocked) {
      btn.addEventListener('click', () => {
        setTheme(idx, best);
        updateThemeSelector();
        updateBackground(score);
      });
    }
    container.appendChild(btn);
  });
}

// ============================================================
// GAME LOOP
// ============================================================
let lastTime = performance.now();

export function animate(now) {
  requestAnimationFrame(animate);
  const rawDt = Math.min((now - lastTime) / 16.667, 3);
  lastTime    = now;

  // Slow-mo: skala dt untuk simulasi gameplay, bukan UI/kamera
  const gameplayDt = (state === 'playing' && slowmoActive)
    ? rawDt * SLOWMO_DT
    : rawDt;

  // Tick slowmo timer (pakai waktu nyata rawDt × 16.667 ms)
  if (state === 'playing' && slowmoActive) {
    tickSlowmo(rawDt * 16.667);
  }

  // Gerakan balok aktif
  if (state === 'playing' && moving) {
    moving.t += moving.speed * gameplayDt;
    const key    = moving.axis;
    const center = topBlock().pos[key];
    moving.mesh.position[key] = center + Math.sin(moving.t) * MOVE_RANGE;

    if (moving.spawn < 1) {
      moving.spawn = Math.min(moving.spawn + 0.08 * rawDt, 1);
      const e = 1 - Math.pow(1 - moving.spawn, 3);
      moving.mesh.material.opacity = e;
      moving.mesh.scale.y = 0.6 + 0.4 * e;
    }
  }

  // Animasi pop (spring)
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i];
    const s = p.mesh.scale;
    let done = true;
    ['x', 'y', 'z'].forEach(k => {
      s[k] += (1 - s[k]) * 0.18 * rawDt;
      if (Math.abs(1 - s[k]) > 0.004) done = false;
    });
    if (done) { s.set(1, 1, 1); pops.splice(i, 1); }
  }

  // Kamera lerp
  const targetY   = state === 'over' ? cameraTargetY * 0.4 : cameraTargetY;
  camY           += (targetY - camY) * (1 - Math.pow(1 - CAM_LERP, rawDt));
  const zoomTarget = state === 'over'
    ? Math.max(1, (stack.length * BLOCK_H) / (VIEW * 1.2))
    : 1;
  camera.zoom += ((1 / zoomTarget) - camera.zoom) * (1 - Math.pow(1 - ZOOM_LERP, rawDt));
  camera.updateProjectionMatrix();
  camera.position.set(20, 20 + camY, 20);
  camera.lookAt(0, camY, 0);

  // Debris fisika (gunakan gameplayDt agar lambat saat slowmo — efek lebih dramatis)
  for (let i = debris.length - 1; i >= 0; i--) {
    const d = debris[i];
    d.vy -= DEBRIS_GRAVITY * gameplayDt;
    d.mesh.position.y += d.vy         * gameplayDt;
    d.mesh.position.x += d.vx         * gameplayDt;
    d.mesh.position.z += d.vz         * gameplayDt;
    d.mesh.rotation[d.rotAxis] += d.rotSpeed * gameplayDt;
    if (d.mesh.position.y < camY - 40) {
      scene.remove(d.mesh);
      d.mesh.geometry.dispose(); d.mesh.material.dispose();
      debris.splice(i, 1);
    }
  }

  // Ring perfect
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const p = sparkles[i];
    p.life -= RING_FADE * rawDt;
    p.mesh.scale.setScalar(1 + (1 - p.life) * RING_GROW);
    p.mesh.material.opacity = Math.max(p.life, 0) * 0.8;
    if (p.life <= 0) {
      scene.remove(p.mesh);
      p.mesh.geometry.dispose(); p.mesh.material.dispose();
      sparkles.splice(i, 1);
    }
  }

  renderer.render(scene, camera);
}
