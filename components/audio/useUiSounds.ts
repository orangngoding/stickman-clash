"use client";

import { useEffect } from "react";
import { audio } from "@/game/audio/AudioEngine";

const INTERACTIVE = "button, a[href], [role='button']";

function interactiveFrom(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest<HTMLElement>(INTERACTIVE);
  if (!el || el.hasAttribute("disabled") || el.dataset.sfx === "none") return null;
  return el;
}

/**
 * Suara antarmuka untuk semua tombol dan tautan di halaman: tik saat disorot (mouse atau keyboard)
 * dan bunyi saat diklik. Memakai satu pendengar di document, jadi komponen tidak perlu diubah satu per satu.
 *
 * Jenis bunyi klik bisa dipilih lewat atribut data-sfx pada elemen:
 * "start" (mulai main), "back" (kembali), "none" (tanpa bunyi). Bawaan: klik biasa.
 */
export function useUiSounds(): void {
  useEffect(() => {
    const onOver = (event: PointerEvent): void => {
      if (event.pointerType === "touch") return;
      const el = interactiveFrom(event.target);
      if (!el) return;
      // Hanya saat pointer MASUK ke elemen, bukan saat berpindah antar anaknya.
      if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return;
      audio.sfx.play("uiHover");
    };

    const onFocus = (event: FocusEvent): void => {
      const el = interactiveFrom(event.target);
      if (!el) return;
      try {
        // Hanya fokus dari keyboard (Tab), bukan klik mouse.
        if (!el.matches(":focus-visible")) return;
      } catch {
        return;
      }
      audio.sfx.play("uiHover");
    };

    const onClick = (event: MouseEvent): void => {
      const el = interactiveFrom(event.target);
      if (!el) return;
      const kind = el.dataset.sfx;
      audio.sfx.play(kind === "start" ? "uiStart" : kind === "back" ? "uiBack" : "uiClick");
    };

    document.addEventListener("pointerover", onOver);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("click", onClick);
    };
  }, []);
}
