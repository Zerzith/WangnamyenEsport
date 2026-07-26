import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="relative mt-auto overflow-hidden border-t border-white/[0.08] bg-zinc-950/70 ">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      <div className="container relative mx-auto px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-7 md:flex-row">
          <div className="text-center md:text-left">
            <div className="mb-2 flex items-center justify-center gap-2 md:justify-start">
              <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_14px_rgb(34_211_238_/_0.9)]" />
              <h3 className="font-display text-lg font-bold uppercase tracking-tight text-white">
                Wang Nam Yen <span className="text-primary">Technical College</span>
              </h3>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              ระบบจัดการการแข่งขันกีฬาอีสปอร์ตวิทยาลัยเทคนิควังน้ำเย็น
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm font-medium text-muted-foreground">
            <Link href="/about">
              <span className="cursor-pointer transition-colors hover:text-primary">เกี่ยวกับเรา</span>
            </Link>
            <Link href="/contact">
              <span className="cursor-pointer transition-colors hover:text-primary">ติดต่อ</span>
            </Link>
            <Link href="/privacy">
              <span className="cursor-pointer transition-colors hover:text-primary">นโยบายความเป็นส่วนตัว</span>
            </Link>
          </div>
        </div>
        <div className="mt-8 border-t border-white/[0.06] pt-6 text-center text-xs font-medium tracking-wide text-muted-foreground/70">
          © 2026 WNY Esports. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
