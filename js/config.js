// ============================================================
// KONFIGURASI — semua angka tuning di sini
// ============================================================

// Ukuran & Mekanik
export const BLOCK_H            = 1;
export const BASE_SIZE          = 10;
export const MOVE_RANGE         = 14;
export const PERFECT_TOL        = 0.25;
export const GROW_PERFECT       = 0.5;
export const SPEED_START        = 0.028;
export const SPEED_MAX          = 0.075;
export const SPEED_ACCEL        = 0.0015; // Pertambahan kecepatan per block (lebih lambat)

// Balok bergerak ditampilkan 1 unit lebih besar per sisi (visual saja, tidak ubah logika potong)
export const MOVING_BLOCK_BONUS = 1;

// Hue dasar per ronde — berganti setiap reset()
// Urutan: hijau, merah, biru, oranye, ungu, cyan, kuning, pink
export const ROUND_HUES = [120, 0, 220, 30, 280, 180, 55, 340];

// Kamera
export const VIEW          = 22;   // setengah tinggi ortografik
export const CAM_LERP      = 0.06;
export const ZOOM_LERP     = 0.04;

// Debris fisika
export const DEBRIS_VY     = 0.05;
export const DEBRIS_VH     = 0.08;
export const DEBRIS_GRAVITY= 0.012;

// Ring perfect
export const RING_FADE     = 0.03;
export const RING_GROW     = 0.6;

// Slow-motion power-up (Tugas 4)
export const SLOWMO_COMBO  = 5;    // trigger setelah combo perfect × ini
export const SLOWMO_DT     = 0.5;  // faktor pelambatan dt gameplay
export const SLOWMO_DURATION = 5000; // ms

// Skin/tema (Tugas 5) — unlock berdasarkan best score
export const THEMES = [
  {
    name: 'Langit',
    unlockAt: 0,
    blockHue: 250,      // hue awal balok
    blockHueStep: 5,    // hue bergeser tiap lantai
    bgH1: 200, bgH2: 140,
    bgH1Step: 3, bgH2Step: 3,
  },
  {
    name: 'Lava',
    unlockAt: 50,
    blockHue: 0,
    blockHueStep: 6,
    bgH1: 10, bgH2: 40,
    bgH1Step: 2, bgH2Step: 2,
  },
  {
    name: 'Hutan',
    unlockAt: 100,
    blockHue: 120,
    blockHueStep: 4,
    bgH1: 150, bgH2: 90,
    bgH1Step: 2, bgH2Step: 2,
  },
];

// localStorage keys
export const BEST_KEY  = 'menara3d_best';
export const THEME_KEY = 'menara3d_theme';
