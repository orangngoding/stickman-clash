"use client";

import dynamic from "next/dynamic";

// Canvas memakai window dan document, jadi wajib dimuat tanpa SSR (GDD Bagian 3).
// next/dynamic dengan ssr:false hanya boleh dipanggil dari client component, maka ada file pembungkus ini.
const GameCanvas = dynamic(() => import("./GameCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-slate-400">
      Memuat game...
    </div>
  ),
});

export default function GameLoader() {
  return <GameCanvas />;
}
