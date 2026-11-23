import Link from "next/link";

// Aturan singkat yang ditampilkan di menu. Senjata tiap ronde mengikuti game/data/weapons.ts.
const ROUNDS = [
  { round: "Ronde 1", weapon: "Tangan kosong", note: "CPU mudah" },
  { round: "Ronde 2", weapon: "Pedang", note: "CPU sedang" },
  { round: "Ronde 3", weapon: "Tombak", note: "CPU sulit" },
] as const;

const CONTROLS = [
  { keys: "A / D", action: "Jalan kiri / kanan" },
  { keys: "W", action: "Lompat" },
  { keys: "S", action: "Jongkok (tahan)" },
  { keys: "Tahan arah mundur", action: "Blok" },
  { keys: "U", action: "Dash / menghindar" },
  { keys: "J", action: "Pukulan (J, J, K = combo)" },
  { keys: "K", action: "Tendangan (S + K = sapuan)" },
  { keys: "L", action: "Serangan senjata (ronde 2 dan 3)" },
  { keys: "I", action: "Spesial (saat Rage penuh)" },
  { keys: "Esc", action: "Jeda" },
] as const;

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-12">
      <header className="text-center">
        <h1 className="font-display text-5xl tracking-wide text-cyan-400 sm:text-7xl">
          STICKMAN <span className="text-orange-400">CLASH</span>
        </h1>
        <p className="mt-3 text-sm text-slate-400 sm:text-base">
          Game fighting 2D bergaya stickman. Projek Berpikir Komputasional, SV IPB University.
        </p>
      </header>

      <nav aria-label="Menu utama" className="w-full max-w-sm">
        <Link
          href="/play"
          className="block rounded-md bg-cyan-500 px-5 py-4 text-center font-display text-2xl text-slate-950 transition hover:bg-cyan-300"
        >
          PLAY
        </Link>
        <p className="mt-2 text-center text-xs text-slate-500">Lawan CPU, best of 3 ronde.</p>
      </nav>

      <section aria-labelledby="rounds-title" className="w-full max-w-sm">
        <h2 id="rounds-title" className="mb-2 font-display text-lg text-orange-400">
          Ronde
        </h2>
        <ul className="flex flex-col gap-1 text-sm">
          {ROUNDS.map((r) => (
            <li key={r.round} className="flex items-center justify-between border-b border-slate-800 py-1">
              <span className="text-slate-300">{r.round}</span>
              <span className="text-slate-100">{r.weapon}</span>
              <span className="text-xs text-slate-500">{r.note}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="controls-title" className="w-full max-w-sm">
        <h2 id="controls-title" className="mb-2 font-display text-lg text-orange-400">
          Kontrol
        </h2>
        <dl className="flex flex-col gap-1 text-sm">
          {CONTROLS.map((c) => (
            <div key={c.keys} className="flex justify-between gap-4 border-b border-slate-800 py-1">
              <dt className="font-display text-cyan-300">{c.keys}</dt>
              <dd className="text-right text-slate-300">{c.action}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
