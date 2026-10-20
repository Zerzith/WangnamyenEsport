import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/[0.08] bg-zinc-950/70">
      <div className="w-full px-2 py-10 sm:px-4 lg:px-6">
        <div className="flex flex-col items-center justify-between gap-7 md:flex-row">
          <div className="text-center md:text-left">
            <h3 className="mb-2 font-display text-lg font-bold tracking-tight text-white">
              ระบบบริหารการจัดการแข่งขันอีสปอร์ต
            </h3>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              จัดการรายการแข่งขัน สายการแข่งขัน และผลการแข่งขันได้ในที่เดียว
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
          © 2026 ระบบบริหารการจัดการแข่งขันอีสปอร์ต. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
