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

// Input
function onAction() {
  drop();
}

window.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.big-btn') || e.target.closest('.theme-btn')) return;
  onAction();
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); onAction(); }
});

document.getElementById('btn-retry').addEventListener('click', () => {
  document.getElementById('over-screen').classList.add('hidden');
  reset();
  beep(440, 0.1, 'triangle', 0.15);
});

// Mulai loop render + langsung mulai game
requestAnimationFrame(animate);
reset();
beep(440, 0.1, 'triangle', 0.15);
