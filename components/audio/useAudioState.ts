"use client";

import { useSyncExternalStore } from "react";
import { audio } from "@/game/audio/AudioEngine";
import type { AudioSnapshot } from "@/game/audio/AudioEngine";

/** Keadaan audio (mute, volume) yang selalu sinkron dengan mesin audio. Aman untuk SSR dan hydration. */
export function useAudioState(): AudioSnapshot {
  return useSyncExternalStore(audio.subscribe, audio.getSnapshot, audio.getServerSnapshot);
}
