"use client";

import { useDialogFocus } from "./useDialogFocus";

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
}

const BUTTON =
  "rounded-md border border-slate-600 px-5 py-3 text-left font-display text-lg text-slate-100 transition hover:border-cyan-400 hover:text-cyan-300";

export default function PauseMenu({ onResume, onRestart, onMenu }: PauseMenuProps) {
  const { ref, onKeyDown } = useDialogFocus<HTMLDivElement>();

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-4">
      <div
        ref={ref}
        onKeyDown={onKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-title"
        className="flex w-full max-w-xs flex-col gap-3 rounded-xl border border-slate-700 bg-slate-950/95 p-6"
      >
        <h2 id="pause-title" className="mb-1 font-display text-3xl text-cyan-400">
          JEDA
        </h2>
        <button type="button" onClick={onResume} className={BUTTON}>
          Lanjut
        </button>
        <button type="button" onClick={onRestart} className={BUTTON}>
          Ulangi
        </button>
        <button type="button" onClick={onMenu} className={BUTTON}>
          Kembali ke Menu
        </button>
        <p className="mt-1 text-xs text-slate-500">Tekan Esc untuk melanjutkan.</p>
      </div>
    </div>
  );
}
