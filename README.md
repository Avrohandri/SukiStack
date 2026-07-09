# MENARA 3D — Stack (Isometrik)

Versi 3D dari game stack, visual dan mekanik seperti game *Stack* klasik: balok bergantian sumbu X/Z, kamera isometrik ortografik, warna pastel bergeser hue, latar gradien ikut berubah.

## Cara Menjalankan

> **Wajib pakai server lokal** (ES modules tidak jalan via `file://`)

```bash
# Opsi 1 — npx (tidak perlu install)
npx serve .

# Opsi 2 — Python
python -m http.server 8080

# Opsi 3 — VS Code Live Server
# Klik kanan index.html → "Open with Live Server"
```

Buka browser ke `http://localhost:3000` (atau port yang tampil di terminal).  
Game **offline-ready** — Three.js r128 disimpan di `lib/three.min.js`.

## Struktur File

```
SukiStack/
├── index.html          ← HTML utama (shell + HUD markup)
├── style.css           ← semua CSS
├── lib/
│   └── three.min.js    ← Three.js r128 lokal (offline-ready)
└── js/
    ├── config.js       ← SEMUA konstanta tuning + tema
    ├── audio.js        ← Web Audio prosedural
    ← score-store.js   ← abstraksi penyimpanan skor
    ├── game.js         ← inti logika + Three.js setup
    └── main.js         ← entry point, input, tombol
```

## Teknologi

- **Three.js r128** (lokal, tanpa build step) — rendering 3D
- Kamera `OrthographicCamera` isometrik (20, 20, 20)
- `MeshLambertMaterial` + 2 directional light — look flat-isometrik
- `PCFSoftShadowMap` + `THREE.Fog` — kedalaman atmosfer
- Web Audio API — suara prosedural, tanpa file audio
- ES Modules native — refactor bersih tanpa bundler

## Mekanik

| Fitur | Detail |
|---|---|
| Dua arah | Balok ganjil sumbu X, genap sumbu Z |
| Pemotongan 3D | Bagian meleset jatuh dengan gravitasi + rotasi |
| Perfect (±0.25 u) | Ring putih melebar, pitch naik per combo |
| Combo ≥2 | Balok tumbuh +0.5 unit (maks. ukuran awal) |
| **Slow-motion ×5** | Combo ×5 → dt×0.5 selama 5 detik, bar kuning di HUD |
| Kamera | Lerp naik ikuti menara; game over → zoom-out |
| Bayangan | `PCFSoftShadowMap` pada directional light utama |
| Fog | `THREE.Fog` warna ikut gradien latar |
| **3 Tema warna** | Langit (unlock 0) / Lava (50) / Hutan (100) |
| Rekor lokal | `localStorage` via `ScoreStore` (mudah swap ke DB) |

## Fitur Terperinci

### Slow-Motion Power-Up
Aktif tiap **combo perfect ×5** (atau kelipatan ×5, ×10, …).  
- `dt` gameplay dikali `0.5` → balok dan debris bergerak setengah kecepatan  
- Bar kuning ⚡ SLOW MOTION muncul di bawah layar, mengosong dalam 5 detik  
- Suara turun saat aktif, naik singkat saat selesai

### Skin / Tema
Muncul di layar *Game Over*. Tiga palet:

| Tema | Unlock | Hue awal balok | Gradien latar |
|------|--------|---------------|---------------|
| Langit | 0 | Ungu 250° | Biru–hijau |
| Lava | 50 | Merah 0° | Oranye–kuning |
| Hutan | 100 | Hijau 120° | Hijau tua–terang |

Pilihan tersimpan di `localStorage` (`menara3d_theme`).

### ScoreStore (abstraksi skor)
`js/score-store.js` ekspos `ScoreStore.getBest()` dan `ScoreStore.save(score)`.  
Ganti isi class ini dengan panggilan Supabase/Firebase untuk leaderboard online — tanpa ubah kode game.

## Skor & Smoothness

- **Delta-time** — frame-independent, konsisten 60 Hz/120 Hz
- **Gerakan sinus** — osilasi halus, tidak belok patah
- **Animasi pop** — squash & settle spring ke scale 1
- **Spawn fade-in** — ease-out cubic
- **HUD skor memantul** — cubic-bezier overshoot
- **Kamera & zoom lerp** — `1-pow(1-k, dt)` agar akurat di semua frame rate
