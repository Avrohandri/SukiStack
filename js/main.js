// ============================================================
// MAIN.JS — entry point, input, tombol, init
// ============================================================

import { resize, reset, drop, animate, loadThemePreference, getBest } from './game.js';
import { beep } from './audio.js';

// Resize
window.addEventListener('resize', resize);
resize();

// Load preferensi tema berdasarkan best score
loadThemePreference(getBest());

// ── Ghost-touch guard: hanya cegah bounce dari btn-retry (80ms) ──
// Tidak lock tap player sama sekali — hitbox aktif seluruh layar.
let recentBtnTouch = false;
function markBtnTouch() {
  recentBtnTouch = true;
  setTimeout(() => { recentBtnTouch = false; }, 80);
}

function onAction() {
  drop();
}

// Mouse click (desktop)
window.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.big-btn') || e.target.closest('.theme-btn')) return;
  if (e.pointerType === 'touch') return; // handled by touchstart
  onAction();
});

// Touch tap (mobile / DevTools)
window.addEventListener('touchstart', (e) => {
  if (e.target.closest('.big-btn') || e.target.closest('.theme-btn')) return;
  if (recentBtnTouch) return; // abaikan ghost-touch dari btn-retry
  e.preventDefault();
  onAction();
}, { passive: false });

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); onAction(); }
});

// ── Tombol retry ──
function doReset() {
  markBtnTouch();  // flag pendek cegah ghost-click ke onAction
  const overEl = document.getElementById('over-screen');
  overEl.classList.add('hidden');
  overEl.style.display = 'none';  // langsung hapus dari layout, tanpa nunggu CSS transition
  reset();
  beep(440, 0.1, 'triangle', 0.15);
}

// touchend + preventDefault cegah browser generate click susulan
document.getElementById('btn-retry').addEventListener('touchend', (e) => {
  e.preventDefault();
  doReset();
});
// fallback untuk mouse desktop
document.getElementById('btn-retry').addEventListener('click', (e) => {
  if (e.detail === 0) return; // synthetic click — sudah ditangani touchend
  doReset();
});

// Mulai loop render + langsung mulai game
requestAnimationFrame(animate);
reset();
beep(440, 0.1, 'triangle', 0.15);

