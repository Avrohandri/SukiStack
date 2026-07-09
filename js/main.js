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

// ── Input lock: cegah ghost-touch setelah reset ──
let inputLocked = false;
function lockInput(ms = 350) {
  inputLocked = true;
  setTimeout(() => { inputLocked = false; }, ms);
}

function onAction() {
  if (inputLocked) return;
  drop();
}

window.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.big-btn') || e.target.closest('.theme-btn')) return;
  if (e.pointerType === 'touch') return; // handled by touchstart
  onAction();
});
window.addEventListener('touchstart', (e) => {
  if (e.target.closest('.big-btn') || e.target.closest('.theme-btn')) return;
  e.preventDefault();
  onAction();
}, { passive: false });
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); onAction(); }
});

function doReset() {
  document.getElementById('over-screen').classList.add('hidden');
  lockInput(350);   // blokir ghost-touch dari tap tombol retry
  reset();
  beep(440, 0.1, 'triangle', 0.15);
}

document.getElementById('btn-retry').addEventListener('click', doReset);
document.getElementById('btn-retry').addEventListener('touchend', (e) => {
  e.preventDefault(); // cegah click event ikut fire
  doReset();
});

// Mulai loop render + langsung mulai game
requestAnimationFrame(animate);
lockInput(200); // blokir tap pertama saat halaman baru load
reset();
beep(440, 0.1, 'triangle', 0.15);
