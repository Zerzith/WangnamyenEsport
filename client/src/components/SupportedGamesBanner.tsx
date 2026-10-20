import { ArrowRight } from "lucide-react";
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
      <div className="relative mx-auto max-w-[1500px] overflow-hidden rounded-2xl border border-white/10 bg-[#080e1b] px-4 py-6 sm:rounded-3xl sm:px-7 sm:py-8 lg:px-10 lg:py-10">
        <div className="grid gap-7 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-10">
          <div className="flex flex-col items-start">
            <h2 className="max-w-xl font-display text-2xl font-bold leading-[1.55] text-white sm:text-3xl lg:text-4xl">
              รองรับการแข่งขันเกม
              <span className="mt-1 block pt-0.5 leading-[1.6] text-sky-300">
                ที่คุณชื่นชอบ
              </span>
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-300 sm:text-base">
              ติดตามรายการแข่งขันและสายการแข่งขันล่าสุดได้ในระบบบริหารการจัดการแข่งขันอีสปอร์ต
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
                className="group relative isolate aspect-[16/9] overflow-hidden rounded-xl border border-white/10 bg-slate-900/80 transition-colors duration-200 hover:border-sky-300/40 sm:rounded-2xl"
              >
                <img
                  src={game.image}
                  alt={`แบนเนอร์เกม ${game.name}`}
                  loading="lazy"
                  className={`absolute inset-0 h-full w-full object-cover opacity-70 transition-opacity duration-300 group-hover:opacity-90 ${game.imagePosition}`}
                />
                <div className="absolute inset-0 bg-slate-950/45" />
                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                  <span className="mb-1 block text-[8px] font-bold tracking-[0.16em] text-sky-200/85 sm:text-[9px]">
                    {game.category}
                  </span>
                  <span className="block break-words font-display text-sm font-extrabold tracking-wide text-white sm:text-lg">
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
