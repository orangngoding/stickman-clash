"use client";

import { useEffect, useRef } from "react";
import type { KeyboardEvent, RefObject } from "react";

const FOCUSABLE = "button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])";

/**
 * Aksesibilitas dialog (GDD Bagian 13): fokus langsung ke tombol pertama saat dialog muncul,
 * dan Tab berputar di dalam dialog sehingga menu bisa dioperasikan penuh dengan keyboard.
 */
export function useDialogFocus<T extends HTMLElement>(): {
  ref: RefObject<T | null>;
  onKeyDown: (event: KeyboardEvent<T>) => void;
} {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }, []);

  const onKeyDown = (event: KeyboardEvent<T>): void => {
    if (event.key !== "Tab" || !ref.current) return;
    const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return { ref, onKeyDown };
}
