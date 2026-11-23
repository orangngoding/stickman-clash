"use client";

import type { MatchResult } from "@/game/types";
import { useDialogFocus } from "./useDialogFocus";

interface ResultScreenProps {
  result: MatchResult;
  onPlayAgain: () => void;
  onMenu: () => void;
}

const ROWS: { label: string; read: (stats: MatchResult["p1"]) => string }[] = [
  { label: "Ronde dimenangkan", read: (s) => String(s.roundsWon) },
  { label: "Total damage", read: (s) => String(s.damageDealt) },
  { label: "Combo terbesar", read: (s) => `${s.maxCombo} hit` },
  { label: "Akurasi serangan", read: (s) => `${s.accuracy}%` },
];

export default function ResultScreen({ result, onPlayAgain, onMenu }: ResultScreenProps) {
  const { ref, onKeyDown } = useDialogFocus<HTMLDivElement>();
  const playerWon = result.winner === "p1";

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4">
      <div
        ref={ref}
        onKeyDown={onKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        className="flex w-full max-w-lg flex-col gap-5 rounded-xl border border-slate-700 bg-slate-950/95 p-6"
      >
        <header className="text-center">
          <p className="text-sm text-slate-400">Pertandingan selesai dalam {result.rounds} ronde</p>
          <h2
            id="result-title"
            className={`font-display text-4xl ${playerWon ? "text-emerald-400" : "text-red-400"}`}
          >
            {playerWon ? "KAMU MENANG!" : "CPU MENANG"}
          </h2>
        </header>

        <table className="w-full text-sm">
          <caption className="sr-only">Statistik pertandingan</caption>
          <thead>
            <tr className="text-slate-400">
              <th scope="col" className="py-1 text-left font-normal">
                Statistik
              </th>
              <th scope="col" className="py-1 text-right font-display text-cyan-400">
                Kamu ({result.p1.name})
              </th>
              <th scope="col" className="py-1 text-right font-display text-orange-400">
                CPU ({result.p2.name})
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label} className="border-t border-slate-800">
                <th scope="row" className="py-2 text-left font-normal text-slate-300">
                  {row.label}
                </th>
                <td className="py-2 text-right tabular-nums">{row.read(result.p1)}</td>
                <td className="py-2 text-right tabular-nums">{row.read(result.p2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onPlayAgain}
            data-sfx="start"
            className="flex-1 rounded-md bg-cyan-500 px-5 py-3 font-display text-lg text-slate-950 transition hover:bg-cyan-300"
          >
            Main Lagi
          </button>
          <button
            type="button"
            onClick={onMenu}
            data-sfx="back"
            className="flex-1 rounded-md border border-slate-600 px-5 py-3 font-display text-lg text-slate-100 transition hover:border-cyan-400 hover:text-cyan-300"
          >
            Menu
          </button>
        </div>
      </div>
    </div>
  );
}
