"use client";

import { audio } from "@/game/audio/AudioEngine";
import { useAudioState } from "./useAudioState";

/** Tombol nyala/mati semua suara (juga bisa dengan tombol M). Pilihan tersimpan di localStorage. */
export default function SoundToggle({ className = "" }: { className?: string }) {
  const { muted } = useAudioState();

  return (
    <button
      type="button"
      onClick={() => audio.toggleMuted()}
      aria-label={muted ? "Nyalakan suara" : "Matikan suara"}
      title="Suara (tombol M)"
      className={`rounded-md border border-slate-700 p-2 text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300 ${className}`}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" />
        {muted ? (
          <>
            <path d="m16 9 5 6" />
            <path d="m21 9-5 6" />
          </>
        ) : (
          <>
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
          </>
        )}
      </svg>
    </button>
  );
}
