import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/[0.08] bg-zinc-950/70">
      <div className="w-full px-2 sm:px-4 lg:px-6 py-10">
        <div className="flex flex-col items-center justify-between gap-7 md:flex-row">
          <div className="text-center md:text-left">
            <h3 className="mb-2 font-display text-lg font-bold uppercase tracking-tight text-white">
              Wang Nam Yen <span className="text-primary">Technical College</span>
            </h3>
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
