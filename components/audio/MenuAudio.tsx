"use client";

import { useEffect } from "react";
import { audio } from "@/game/audio/AudioEngine";
import SoundToggle from "./SoundToggle";
import { useAudioState } from "./useAudioState";
import { useUiSounds } from "./useUiSounds";

/**
 * Suara halaman menu: musik menu, suara tombol, tombol mute, dan pintasan M.
 * Browser melarang suara sebelum pemain berinteraksi, jadi musik baru mulai pada klik atau
 * tombol pertama (permintaan diputar disimpan dulu oleh mesin audio).
 */
export default function MenuAudio() {
  const { running, muted } = useAudioState();
  useUiSounds();

  useEffect(() => {
    audio.installUnlock();
    audio.music.play("menu", { fadeIn: 1 });

    const onKey = (event: KeyboardEvent): void => {
      if (event.code === "KeyM" && !event.ctrlKey && !event.metaKey && !event.altKey) audio.toggleMuted();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed right-4 top-4 z-10 flex items-center gap-3">
      {!running && !muted && (
        <span className="hidden text-xs text-slate-500 sm:inline">Klik atau tekan tombol apa saja untuk menyalakan musik</span>
      )}
      <SoundToggle />
    </div>
  );
}
