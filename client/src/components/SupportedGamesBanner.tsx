import { ArrowRight, Gamepad2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const supportedGames = [
  {
    name: "FREE FIRE",
    image: "/assets/freefire-banner.png",
    category: "BATTLE ROYALE",
    imagePosition: "object-[center_42%]",
  },
  {
    name: "RoV",
    image: "/assets/rov-banner.png",
    category: "MOBILE MOBA",
    imagePosition: "object-center",
  },
  {
    name: "VALORANT",
    image: "/assets/valorant-banner.png",
    category: "TACTICAL FPS",
    imagePosition: "object-center",
  },
];

export function SupportedGamesBanner() {
  return (
    <section className="px-4 py-8 sm:px-6 sm:py-12 lg:px-12">
      <div className="relative isolate mx-auto max-w-[1500px] overflow-hidden rounded-2xl border border-white/10 bg-[#080e1b] px-4 py-6 shadow-[0_24px_70px_-45px_rgba(42,157,220,0.5)] sm:rounded-3xl sm:px-7 sm:py-8 lg:px-10 lg:py-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-sky-500/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 left-1/4 h-64 w-64 rounded-full bg-indigo-600/15 blur-3xl"
        />

        <div className="relative grid gap-7 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-10">
          <div className="flex flex-col items-start">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-sky-200 sm:text-xs">
              <Gamepad2 className="h-4 w-4" aria-hidden="true" />
              WNYTC ESPORTS · OFFICIAL GAMES
            </div>
            <h2 className="max-w-xl font-display text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl">
              รองรับการแข่งขันเกม
              <span className="mt-1 block bg-gradient-to-r from-sky-300 via-cyan-200 to-indigo-300 bg-clip-text text-transparent">
                ที่คุณชื่นชอบ
              </span>
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-300 sm:text-base">
              รวมทุกสนามประลองไว้ที่เดียว ติดตามรายการแข่งขันและสายการแข่งขันล่าสุดจากวิทยาลัยเทคนิควังน้ำเย็น
            </p>
            <Link href="/bracket" className="mt-5 inline-flex">
              <Button className="h-11 rounded-lg bg-primary px-5 font-bold text-primary-foreground hover:bg-primary/90 sm:px-6">
                ดูสายการแข่งขัน
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {supportedGames.map((game) => (
              <Link
                key={game.name}
                href="/bracket"
                aria-label={`ดูการแข่งขันเกม ${game.name}`}
                className="group relative isolate aspect-[16/9] overflow-hidden rounded-xl border border-white/10 bg-slate-900/80 transition duration-200 hover:-translate-y-1 hover:border-sky-300/40 hover:shadow-[0_14px_32px_-20px_rgba(56,189,248,0.75)] sm:rounded-2xl"
              >
                <img
                  src={game.image}
                  alt={`แบนเนอร์เกม ${game.name}`}
                  loading="lazy"
                  className={`absolute inset-0 h-full w-full object-cover opacity-70 transition duration-500 group-hover:scale-105 group-hover:opacity-90 ${game.imagePosition}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-slate-950/10" />
                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                  <span className="mb-1 block text-[8px] font-bold tracking-[0.16em] text-sky-200/85 sm:text-[9px]">
                    {game.category}
                  </span>
                  <span className="block break-words font-display text-sm font-extrabold tracking-wide text-white drop-shadow sm:text-lg">
                    {game.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
