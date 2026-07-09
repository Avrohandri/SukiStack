// ============================================================
// AUDIO PROSEDURAL — Web Audio API tanpa file aset
// ============================================================

let audioCtx = null;

/**
 * Mainkan nada prosedural.
 * @param {number} freq    - frekuensi Hz
 * @param {number} dur     - durasi detik
 * @param {string} type    - OscillatorType ('sine'|'triangle'|'square'|'sawtooth')
 * @param {number} vol     - volume 0..1
 */
export function beep(freq, dur = 0.1, type = 'sine', vol = 0.15) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + dur);
  } catch (e) {}
}

/**
 * Suara slow-motion aktif — nada menurun lambat
 */
export function beepSlowmo() {
  beep(220, 0.4, 'sine', 0.12);
  setTimeout(() => beep(180, 0.3, 'sine', 0.08), 200);
}

/**
 * Suara slow-motion selesai — nada naik singkat
 */
export function beepSlowmoEnd() {
  beep(300, 0.15, 'triangle', 0.1);
  setTimeout(() => beep(400, 0.1, 'triangle', 0.08), 100);
}
