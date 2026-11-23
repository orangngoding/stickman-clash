# Stickman Clash

Game fighting 2D bergaya stickman berbasis web. Versi ini satu pemain: **PLAY** melawan CPU. Dibangun dengan Next.js (App Router), TypeScript strict, HTML5 Canvas 2D, dan Tailwind CSS v3.
Projek mata kuliah Berpikir Komputasional, Teknologi Rekayasa Perangkat Lunak, Sekolah Vokasi IPB University.

Semua grafis digambar lewat kode (tanpa sprite) dan semua suara (musik dan efek) dihasilkan lewat Web Audio API (tanpa file audio).

## Cara menjalankan

Butuh Node.js 20 atau lebih baru.

```bash
npm install
npm run dev
```

Buka http://localhost:3000 lalu klik **PLAY** (satu tombol, lawan CPU).

Perintah lain: `npm run build` (build produksi), `npm run lint`, `npm run typecheck`.

## Status milestone

| Milestone | Isi | Status |
| --- | --- | --- |
| M0 | Setup projek, struktur folder, canvas 1280x720 responsif | Selesai |
| M1 | Game loop timestep tetap, Input, state machine, tampilan FPS | Selesai |
| M2 | Skeleton stickman, animasi idle dan walk, menghadap kiri/kanan | Selesai |
| M3 | Fisika dan gerak: gravitasi, lompat, jongkok, dash, batas arena, pushbox | Selesai |
| M4 | Combat: hitbox, serangan, blok, stamina, Rage, HP, combo, knockdown | Selesai |
| M5 | Ronde best of 3, timer, hitung mundur, KO slow motion, HUD final, menu jeda, layar hasil | Selesai |
| Versi simpel | Satu mode: PLAY melawan CPU. Senjata digambar dari garis (pedang ronde 2, tombak ronde 3). AI CPU dengan tiga tingkat kesulitan | Selesai |
| Audio | Musik menu, tiga lagu pertarungan (satu per ronde), jingle menang/kalah, lebih dari 40 efek suara, volume dan mute | Selesai |
| M6, M8 sampai M10 | Pilih karakter, mode lain, efek visual, polish | Tidak dikerjakan (diganti versi simpel) |

## Kontrol

Kamu memakai keyboard sebagai Pemain 1. Lawan (P2) adalah CPU.

| Aksi | Tombol |
| --- | --- |
| Jalan kiri / kanan | A / D |
| Lompat | W |
| Jongkok (tahan) | S |
| Blok | Tahan arah menjauhi lawan, atau jongkok |
| Dash / menghindar | U |
| Pukulan ringan (J, J, K = combo) | J |
| Tendangan | K |
| Serangan senjata (hanya ronde 2 dan 3) | L |
| Spesial (Rage penuh) | I |
| Sapuan | S + K |
| Jeda | Esc |
| Suara nyala / mati | M |

Tombol **H** menampilkan mode uji: kotak tabrakan (hijau = hurtbox, biru putus-putus = pushbox, merah = hitbox aktif) dan panel info state.

Dash bergerak 140 px dalam 10 frame, kebal 8 frame pertama (tubuh tampak transparan), cooldown 30 frame. Arahnya mengikuti tombol arah yang ditahan (maju bila tidak ada). Lompat dengan tombol arah ditahan membawa momentum ke depan, dan tinggi lompat cukup untuk melewati lawan.


## Struktur folder

```
app/                 halaman Next.js (menu utama dengan tombol PLAY, /play)
components/          GameLoader (dynamic import tanpa SSR), GameCanvas (mounting engine)
components/audio/    MenuAudio (musik menu), SoundToggle, AudioControls (slider volume), useUiSounds, useAudioState
components/ui/       PauseMenu, ResultScreen, useDialogFocus
game/core/           Game (state game), World (urutan satu tick), Match (skor dan timer), Events (bus peristiwa), Loop, StateMachine, Input, Camera, Time, math
game/entities/       Fighter
game/ai/             AIController (otak CPU, mengisi tombol virtual)
game/render/         Skeleton, StickmanRenderer, ArenaRenderer, HudRenderer (HUD + banner), DebugRenderer, pose, colors
game/data/           characters, moves, weapons, combat, movement, boxes, animations, keymaps (semua angka penyeimbang di sini)
game/systems/        PhysicsSystem, CollisionSystem (pushbox), CombatSystem (hit, damage, blok)
game/audio/          AudioEngine (konteks, volume, mute), Sfx (efek), Music + tracks (lagu), GameAudio (peristiwa -> suara), synth
lib/storage.ts       penyimpanan localStorage dengan versi data
```

## Alur pertandingan

State game diatur di `game/core/Game.ts`:

```
BOOT -> ROUND_START (RONDE N, 3, 2, 1) -> FIGHTING -> ROUND_END -> ROUND_START (ronde berikut)
                                              |                  \-> MATCH_RESULT
                                              \-> PAUSED (dari FIGHTING, kembali ke FIGHTING)
```

- **Best of 3**: siapa yang lebih dulu memenangi 2 ronde menang. Skor ditampilkan dua titik di bawah bar HP.
- **Senjata tiap ronde** (`weaponIdForRound` di `game/data/weapons.ts`, dipakai kedua petarung): ronde 1 tangan kosong, ronde 2 pedang, ronde 3 tombak. Ronde tambahan (bila seri) memakai tombak. Nama senjata muncul di bawah banner ronde dan di bawah timer.
- **Kesulitan CPU** naik tiap ronde: ronde 1 mudah, ronde 2 sedang, ronde 3 sulit (`aiProfileForRound` di `game/data/ai.ts`).
- **Timer** 60 detik (opsi 30, 60, 99 sudah dibaca dari `settings.roundTime` di penyimpanan). Timer ikut membeku saat hitstop dan saat jeda.
- **Waktu habis**: persentase HP terbanyak menang. Selisih HP di bawah 0.05 persen, atau KO ganda, dihitung seri: tidak ada poin, dan ronde berikutnya menjadi ronde tambahan.
- **KO**: slow motion 0.3x selama 40 frame layar (12 update logika) disertai zoom kamera ke arah yang KO.
- **Akhir ronde**: pemenang mengangkat tangan, yang kalah karena waktu habis tertunduk.
- **Menu jeda dan layar hasil** adalah komponen React (`components/ui`) di atas canvas, digerakkan oleh callback dari `Game`. Keduanya bisa dioperasikan penuh dengan keyboard (fokus otomatis, Tab berputar di dalam dialog, Esc melanjutkan).
- **Layar hasil**: kamu atau CPU yang menang, ronde dimenangkan, total damage, combo terbesar, akurasi serangan, serta tombol Main Lagi dan Menu.

## Senjata

Senjata hanya mengubah serangan tombol **L** (serangan senjata). Di ronde 1 tombol L tidak aktif.

| Senjata | Ronde | Jangkauan | Damage dasar |
| --- | --- | --- | --- |
| Tangan kosong | 1 | (L tidak aktif) | - |
| Pedang | 2 | 130 px | 16 |
| Tombak | 3 | 165 px | 14 |

- Daftar serangan dibuat per senjata oleh `getMoves()` di `game/data/moves.ts` (di-cache), lalu dipilih lewat `Fighter.equip(weaponId)` di awal tiap ronde.
- Senjata digambar dari garis oleh `StickmanRenderer.drawWeapon`, menempel di tangan dekat kamera dan searah lengan bawah, sehingga ikut terayun bersama animasi serangan. Ukuran gambar (`WEAPON_DRAW`) dicocokkan dengan jangkauan hitbox.
- Serangan senjata setinggi kepala, jadi **menunduk menghindarinya** (sapuan dan tendangan tetap mengenai yang menunduk).

## Audio

Semua suara dibuat dengan Web Audio API (osilator dan noise), jadi tidak ada file mp3 atau wav dan tidak ada yang perlu diunduh.

**Aturan browser.** Browser melarang suara sebelum pemain berinteraksi. Karena itu musik menu baru berbunyi setelah klik atau tombol pertama di halaman. Setelah itu musik terus berjalan mulus saat pindah dari menu ke `/play`. Tombol speaker di kanan atas (atau tombol **M**) menyalakan dan mematikan semua suara. Volume musik dan efek diatur di menu jeda (Esc), dan semuanya tersimpan di localStorage (`settings.musicVolume`, `settings.sfxVolume`, `settings.muted`).

**Cara kerja.** Logika game tidak tahu apa pun soal suara. `Fighter`, `World`, `CombatSystem`, dan `Game` hanya memancarkan peristiwa lewat `EventBus` (`game/core/Events.ts`), jadi logika pertarungan tetap murni dan bisa diuji tanpa browser. `GameAudio` mendengarkan peristiwa itu dan memutuskan bunyi apa yang dimainkan, dengan panning stereo sesuai posisi petarung di arena.

| Kejadian | Suara |
| --- | --- |
| Menu utama | Musik menu (A minor, 96 bpm), tik saat tombol disorot, bunyi klik, bunyi mulai saat PLAY |
| Awal ronde | Gong, bunyi hitung mundur 3, 2, 1, lalu dentuman FIGHT! dan lagu pertarungan |
| Lagu pertarungan | Ronde 1 (126 bpm), ronde 2 (138 bpm), ronde 3 (150 bpm), makin cepat dan intens |
| Jalan, lompat, mendarat, dash, bangun | Langkah kaki, hembusan, bunyi mendarat (ringan dan keras saat jatuh), whoosh dash, kain saat bangun |
| Serangan | Ayunan berbeda untuk pukulan, tendangan, sapuan, serangan lompat, pedang, tombak, dan spesial. Bunyi ayunan keluar tepat saat fase active dimulai |
| Terkena | Benturan berbeda untuk tiap serangan, bunyi blok (logam bila senjata), guard break, dan dentingan untuk combo 3 hit ke atas |
| Rage penuh | Nada naik (milik lawan terdengar lebih rendah dan pelan) |
| Peringatan | Tik timer di 10 detik terakhir (lebih tajam di 3 detik terakhir), detak jantung saat HP pemain di bawah 25 persen |
| Akhir ronde | KO: benturan berat, slow motion, musik teredam. Waktu habis: buzzer. Jingle menang, kalah, atau seri |
| Akhir pertandingan | Fanfare menang atau lagu sedih, lalu musik menu kembali di layar hasil |
| Jeda | Bunyi jeda dan lanjut, musik teredam saat jeda |

**Menambah atau mengubah suara.**
- Efek baru: tambahkan nama di `SfxName` dan resepnya di `RECIPES` (`game/audio/Sfx.ts`), lalu petakan peristiwanya di `GameAudio.ts`.
- Lagu: semuanya data di `game/audio/tracks.ts`. Satu bar adalah 16 langkah, nada bisa ditulis absolut (`A4`) atau relatif terhadap akor (`r t f o`), sehingga satu riff mengikuti perubahan akor.
- Bunyi tombol: tambahkan atribut `data-sfx="start" | "back" | "none"` pada tombol bila ingin bunyi klik yang berbeda.

## Cara kerja CPU

`game/ai/AIController.ts` tidak menyentuh fisika atau combat. AI hanya mengisi `controls` Fighter dengan sembilan tombol virtual yang sama dengan pemain, jadi stamina, cooldown, input buffer, dan blok berlaku sama untuk kamu dan CPU. Tiap update logika:

1. **Mengamati**: serangan lawan baru "terlihat" setelah `reactionFrames` frame. Pukulan ringan hanya 7 frame, jadi CPU mudah tidak sempat memblok jab, sedangkan CPU sulit bisa.
2. **Bereaksi**: dengan peluang `blockChance` CPU memblok, atau menunduk bila serangan lawan setinggi kepala.
3. **Menghukum**: serang balik cepat saat lawan sedang recovery (`punishChance`).
4. **Merantai**: sambung combo P, P, K setelah hit mengenai (`comboChance`).
5. **Taktik**: mendekat, dash, lompat masuk, menjaga jarak, bertahan, atau menyerang sesuai `aggression`. CPU memilih serangan yang benar-benar mengenai pada jarak itu, tidak memukul lawan yang menunduk (memakai sapuan), tidak menyerang lawan yang tergeletak atau kebal, dan beristirahat bila stamina menipis.

Tingkat kesulitan ada di `game/data/ai.ts` (`AI_PROFILES`) dan mudah disetel. Pembangkit angka acak bisa diganti lewat argumen konstruktor, jadi perilaku AI bisa diuji tanpa browser.

## Cara kerja combat

Satu tick logika berjalan dengan urutan tetap di `game/core/World.ts`: state fighter (niat gerak), fisika, pushbox, lalu deteksi hit. Karena `World` tidak menyentuh canvas, logika pertarungan bisa diuji tanpa browser.

- **Serangan adalah data** (`game/data/moves.ts`): startup, active, recovery, damage, hitstun, knockback, biaya stamina, hitstop, dan hitbox. State `attack` hanya memutar frame dan menunggu fase active.
- **Hit**: hitbox aktif penyerang beririsan dengan hurtbox lawan, dicek dengan AABB. Hit dua pihak di frame yang sama dideteksi dulu baru diterapkan, jadi saling pukul (trade) adil.
- **Hitstop**: seluruh pertarungan membeku 4 frame setelah hit (8 untuk spesial). Tombol yang ditekan saat beku tetap masuk input buffer (6 frame).
- **Combo**: P, P, K bisa dirantai dalam jendela 12 frame setelah hit. Tiap hit berikutnya dalam satu combo bernilai 90 persen dari hit sebelumnya.
- **Blok**: tahan arah menjauhi lawan (atau jongkok). Damage menjadi 20 persen (spesial 50 persen), stamina terkuras sebesar damage dasar, dan stamina habis menyebabkan guard break (stun 40 frame).
- **Knockdown**: sapuan (40 frame) dan spesial (60 frame) menjatuhkan lawan. Saat bangun, fighter kebal 20 frame. Kena pukul saat melayang juga berujung knockdown begitu mendarat.
- **Rage**: terisi 0.8 x damage saat memukul dan 0.5 x damage saat dipukul. Spesial hanya keluar bila Rage penuh dan menghabiskannya.

## Penerapan berpikir komputasional

- **Dekomposisi**: game dipecah menjadi modul terpisah. Loop hanya mengatur waktu, Input hanya membaca tombol, Skeleton hanya menghitung posisi sendi, StickmanRenderer hanya menggambar. State machine Fighter hanya mengatur niat gerak, PhysicsSystem yang memindahkan posisi, CollisionSystem yang memisahkan dua fighter.
- **Pengenalan pola**: pemain dan musuh memakai kelas `Fighter` yang sama. State game dan state fighter memakai satu kelas `StateMachine`. Semua animasi adalah data keyframe di `game/data/animations.ts`, menambah animasi tidak mengubah kode.
- **Abstraksi**: stickman hanyalah satu pose (sembilan sudut) yang dihitung menjadi 12 sendi, bukan gambar rumit. Tombol disederhanakan menjadi sembilan aksi virtual (`ControlState`), sehingga CPU memakai tombol yang sama dengan pemain.
- **Algoritma**: game loop timestep tetap dengan accumulator, forward kinematics untuk sendi, interpolasi pose dengan easing, crossfade antar animasi, state machine, integrasi gerak dengan gravitasi dan gesekan, deteksi tabrakan AABB untuk pushbox dengan penyelesaian dorongan saat salah satu fighter terjepit dinding.

## Asumsi yang diambil

- Next.js dikunci di versi 15 (`^15.5.0`) karena itulah versi yang dapat saya pastikan kompatibel dengan konfigurasi ini. Jika ingin versi terbaru: `npx @next/codemod@canary upgrade latest`.
- Tailwind dikunci di v3.4. Tailwind v4 memuat modul ESM lewat `require()` yang gagal (ERR_REQUIRE_ESM) di Node yang lebih lama dari 20.19 / 22.12 saat dipakai bersama Next.js. Semua kelas utilitas yang dipakai tetap sama.
- Tinggi pushbox 90 px (jongkok 60 px) tidak ada di GDD. Dibuat lebih rendah dari tinggi badan agar fighter bisa melompat melewati lawan. Jika pushbox terlalu tinggi, lompatan tidak cukup untuk melewati lawan karena lebar pushbox 40 px.
- Gravitasi memakai integrasi semi-implisit (kecepatan diperbarui dulu, baru posisi), jadi tinggi puncak lompat Blade sekitar 134 px dengan lama di udara sekitar 34 frame.
- Dash hanya dari tanah. Lompat hanya dari idle, jalan, atau blok (tidak dari jongkok).
- Posisi hitbox tiap serangan ditetapkan sendiri (GDD hanya memberi angka frame dan damage). Pukulan dan serangan senjata sengaja setinggi kepala sampai dada, sehingga **menunduk menghindari keduanya**, sedangkan tendangan, sapuan, spesial, dan serangan lompat tetap mengenai yang jongkok. Semua angka ada di `game/data/moves.ts` dan mudah disetel.
- Jangkauan serangan senjata: pedang 130 px dan tombak 165 px dari badan (tangan kosong 60 dan belati 70 tetap ada di data tetapi tidak dipakai). Angka pedang dan tombak dinaikkan dari 95 dan 130 agar bilah dan mata tombak yang digambar sesuai dengan jangkauan hitbox.
- Menahan arah mundur langsung memblok (jalan mundur hanya setengah kecepatan). Untuk mundur cepat gunakan dash mundur.
- Serangan lompat keluar dari tombol pukul atau tendang saat di udara. Fase recovery 10 frame baru berjalan setelah mendarat.
- Biaya stamina: dash 20, tendangan 5, serangan senjata 15, sapuan 8. Stamina pulih 0.6 per frame kecuali saat memblok, dash, atau menyerang.
- Fighter yang tergeletak (knockdown, KO) tidak bisa dipukul dan tidak mendorong fighter lain. Kebal 20 frame saat bangun.
- Efek percikan dan screen shake belum ada. Saat ini hit ditandai hitstop, getaran kecil pada korban, dan suara benturan.
- Saat waktu habis, pemenang ditentukan dari persentase HP (bukan HP mentah) supaya sesuai dengan bar yang terlihat pemain, karena HP maksimum tiap karakter berbeda.
- Hitung mundur: banner "RONDE N" 1 detik, lalu 3, 2, 1 masing-masing 0.6 detik, lalu "FIGHT!". Angka-angka ini ada di `game/data/match.ts`.
- Tombol R (ulang cepat) di demo M4 dihapus karena sudah ada Ulangi di menu jeda.
- Audio dibuat sepenuhnya dengan sintesis (tanpa file), jadi bunyinya bergaya retro/arcade. Bila nanti ingin suara rekaman, ganti isi `Sfx.ts` dan `Music.ts` tanpa menyentuh logika game.
- Musik pertarungan baru mulai saat teks FIGHT! muncul, supaya gong dan hitung mundur terdengar jelas. Jingle ronde dibuat 1 bar agar selesai sebelum ronde berikutnya mulai.
- Tab yang disembunyikan menghentikan semua suara (AudioContext di-suspend), selaras dengan jeda otomatis.
- Pengaturan `muted` ditambahkan ke `settings` di localStorage tanpa menaikkan `SAVE_VERSION`: data lama otomatis memakai nilai bawaan (suara nyala).
- Jeda hanya bisa dari state FIGHTING. Pindah tab saat bertarung otomatis menjeda.
- Menu utama hanya punya satu tombol PLAY. Pemain selalu Blade, CPU selalu Brawler (HP 120, damage x1.15), jadi CPU sedikit lebih kuat di atas kertas. Ronde 1 sengaja diberi CPU mudah agar pemain baru bisa mengenal kontrol.
- Kedua petarung selalu memegang senjata yang sama di tiap ronde supaya adil. Jika ingin senjata lain per ronde, ubah `weaponIdForRound` di `game/data/weapons.ts`.
- Kontrol Pemain 2 (panah, titik koma, dst) masih ada di `game/data/keymaps.ts` tetapi tidak lagi dibaca. CPU mengisi tombol P2.
- Font HUD di canvas memakai font sistem. Font Russo One hanya dipakai di UI React (menu). Penyeragaman font belum dikerjakan.
- Zustand (opsional di GDD) tidak dipasang karena state menu cukup lewat callback dari `Game`.
- Sudut pose bersifat absolut (bukan relatif terhadap tulang induk) agar mudah dibuat dan diinterpolasi. Penjelasan ada di `game/types.ts`.
- Kecepatan karakter diartikan piksel per frame (Blade 5.0 = 300 piksel per detik).
- Saat pause, logika berhenti tetapi render tetap berjalan untuk menampilkan layar PAUSE. Pause juga otomatis aktif saat tab disembunyikan.
- Hitbox tiap serangan tidak ditentukan di GDD, jadi nilainya ditetapkan sendiri dan dicatat di sini.
