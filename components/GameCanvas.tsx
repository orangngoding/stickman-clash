"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Game } from "@/game/core/Game";
import type { MatchResult } from "@/game/types";
import { useUiSounds } from "./audio/useUiSounds";
import PauseMenu from "./ui/PauseMenu";
import ResultScreen from "./ui/ResultScreen";

export default function GameCanvas() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);

  // Bunyi hover dan klik untuk semua tombol (menu jeda, layar hasil, tombol menu).
  useUiSounds();

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Menu jeda dan layar hasil adalah UI React di atas canvas, digerakkan oleh callback dari Game.
    const game = new Game(canvas, container, {
      onPauseChange: setPaused,
      onMatchEnd: setResult,
    });
    gameRef.current = game;
    game.start();

    // Wajib dibersihkan: listener, requestAnimationFrame, dan ResizeObserver (GDD Bagian 18).
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  return (
    <div ref={containerRef} className="relative flex h-full w-full items-center justify-center bg-black">
      <canvas ref={canvasRef} className="block" role="img" aria-label="Arena pertarungan Stickman Clash" />

      {paused && (
        <PauseMenu
          onResume={() => gameRef.current?.resume()}
          onRestart={() => gameRef.current?.restartMatch()}
          onMenu={() => router.push("/")}
        />
      )}
      {result && (
        <ResultScreen
          result={result}
          onPlayAgain={() => gameRef.current?.restartMatch()}
          onMenu={() => router.push("/")}
        />
      )}
    </div>
  );
}
