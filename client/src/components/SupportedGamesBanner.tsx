import { ArrowRight } from "lucide-react";
import { Link } from "wouter";

const supportedGames = [
  {
    name: "Free Fire",
    image: "/assets/freefire-banner.png",
    imagePosition: "object-[center_42%]",
  },
  {
    name: "RoV",
    image: "/assets/rov-banner.png",
    imagePosition: "object-center",
  },
  {
    name: "VALORANT",
    image: "/assets/valorant-banner.png",
    imagePosition: "object-center",
  },
];

export function SupportedGamesBanner() {
  return (
    <section className="border-b border-white/10 bg-[#11181d]">
      <div className="w-full px-3 py-10 sm:px-4 sm:py-12 lg:px-5 xl:px-6">
        <div className="grid gap-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-10">
          <div>
            <p className="mb-2 text-sm font-medium text-primary">เกมที่รองรับ</p>
            <h2 className="max-w-lg font-display text-2xl font-bold leading-snug text-white sm:text-3xl">
              เลือกรายการแข่งขันที่คุณสนใจ
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-slate-300">
              ติดตามกำหนดการ สายการแข่งขัน และผลการแข่งขันของ Free Fire, RoV และ VALORANT
            </p>
            <Link
              href="/bracket"
              className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary hover:text-sky-200"
            >
              ไปที่สายการแข่งขัน
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {supportedGames.map((game) => (
              <Link
                key={game.name}
                href="/bracket"
                aria-label={`ดูการแข่งขันเกม ${game.name}`}
                className="group relative isolate aspect-[16/9] overflow-hidden rounded-md border border-white/10 bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <img
                  src={game.image}
                  alt={`แบนเนอร์เกม ${game.name}`}
                  loading="lazy"
                  className={`absolute inset-0 h-full w-full object-cover ${game.imagePosition}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-transparent" />
                <span className="absolute bottom-3 left-3 font-display text-lg font-bold text-white sm:bottom-4 sm:left-4 sm:text-xl">
                  {game.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
