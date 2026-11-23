import Link from "next/link";
import GameLoader from "@/components/GameLoader";

export default function PlayPage() {
  return (
    <main className="flex h-dvh w-screen flex-col overflow-hidden bg-black">
      <div className="flex items-center justify-between px-4 py-2 text-sm text-slate-400">
        <Link href="/" className="rounded px-2 py-1 hover:text-cyan-300">
          &larr; Menu
        </Link>
        <span>Esc: jeda</span>
      </div>
      <div className="min-h-0 flex-1">
        <GameLoader />
      </div>
    </main>
  );
}
