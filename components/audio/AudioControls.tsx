"use client";

import { audio } from "@/game/audio/AudioEngine";
import { useAudioState } from "./useAudioState";

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

function VolumeSlider({ label, value, onChange }: SliderProps) {
  const percent = Math.round(value * 100);
  return (
    <label className="flex items-center gap-3 text-sm text-slate-300">
      <span className="w-12">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={percent}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
        className="min-w-0 flex-1 accent-cyan-400"
      />
      <span className="w-10 text-right tabular-nums text-slate-400">{percent}%</span>
    </label>
  );
}

/** Pengaturan suara di menu jeda: nyala/mati, volume musik, dan volume efek. */
export default function AudioControls() {
  const { muted, musicVolume, sfxVolume } = useAudioState();

  // Menggeser slider otomatis menyalakan suara kembali.
  const changeMusic = (v: number): void => {
    if (audio.muted) audio.setMuted(false);
    audio.setMusicVolume(v);
  };
  const changeSfx = (v: number): void => {
    if (audio.muted) audio.setMuted(false);
    audio.setSfxVolume(v);
    // Tik contoh agar pemain bisa langsung mendengar tingkat volumenya.
    audio.sfx.play("uiHover", { pitch: 0.8 + v * 0.6 });
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border border-slate-700 p-3">
      <div className="flex items-center justify-between">
        <span className="font-display text-sm text-cyan-300">Suara</span>
        <button
          type="button"
          onClick={() => audio.toggleMuted()}
          className="rounded border border-slate-600 px-2 py-0.5 text-xs text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300"
        >
          {muted ? "Mati" : "Nyala"}
        </button>
      </div>
      <VolumeSlider label="Musik" value={musicVolume} onChange={changeMusic} />
      <VolumeSlider label="Efek" value={sfxVolume} onChange={changeSfx} />
    </div>
  );
}
