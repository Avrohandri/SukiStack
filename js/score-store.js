// ============================================================
// SCORE STORE — abstraksi penyimpanan skor (Tugas 6)
// Implementasi sekarang: localStorage.
// Swap ke Supabase/Firebase nanti: ganti class ini saja.
// ============================================================

import { BEST_KEY } from './config.js';

export class ScoreStore {
  /**
   * Baca skor terbaik. Kembalikan 0 jika tidak ada / error.
   * @returns {number}
   */
  static getBest() {
    try {
      return parseInt(localStorage.getItem(BEST_KEY), 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  /**
   * Simpan skor baru jika lebih tinggi dari yang tersimpan.
   * @param {number} score
   * @returns {boolean} true jika rekor baru
   */
  static save(score) {
    const current = ScoreStore.getBest();
    if (score > current) {
      try { localStorage.setItem(BEST_KEY, String(score)); } catch (e) {}
      return true;
    }
    return false;
  }
}
