import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { AvatarCustom } from "@/components/ui/avatar-custom";
import { LogOut, LogIn } from "lucide-react";
import { useLocation, Link } from "wouter";

export function Navigation() {
  const [location] = useLocation();
  const { user, signOut } = useAuth();

  const navItems = [
    { href: "/", label: "หน้าแรก" },
    { href: "/bracket", label: "สายการแข่งขัน" },
    { href: "/rules", label: "กฎการแข่ง" },
    { href: "/chat", label: "แชทสด" },
  ];

  const adminItem = { href: "/admin", label: "จัดการระบบ" };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-zinc-950/95">
      <div className="flex min-h-[4rem] sm:min-h-[4.5rem] items-center gap-2 px-2 sm:px-4 lg:px-6">
        {}
        <Link href="/" className="flex flex-shrink-0 items-center gap-2">
          <img
            src="/logo.png"
            alt="WNYTC Esports Championship"
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg object-contain"
          />
          <span className="hidden sm:block whitespace-nowrap font-display text-xs sm:text-sm lg:text-base font-bold uppercase tracking-tight text-white">
            WangNamYen<span className="text-primary">Esports</span>
          </span>
        </Link>

        {}
        <div className="scrollbar-hide flex flex-1 items-center gap-0.5 sm:gap-1 overflow-x-auto ml-1 sm:ml-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <span
                  className={`
                    cursor-pointer px-1.5 py-1.5 sm:px-2 sm:py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap rounded-md
                    ${isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-white hover:bg-white/[0.05]'}
                  `}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {user?.role === "admin" && (
            <Link href={adminItem.href}>
              <span
                className={`
                  cursor-pointer px-1.5 py-1.5 sm:px-2 sm:py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap rounded-md
                  ${location === adminItem.href ? 'text-accent bg-accent/10' : 'text-accent/80 hover:text-accent hover:bg-accent/5'}
                `}
              >
                {adminItem.label}
              </span>
            </Link>
          )}
        </div>


        <div className="flex flex-shrink-0 items-center gap-1 sm:gap-3">
          {user ? (
            <>
              <span className="hidden lg:block whitespace-nowrap text-sm font-medium leading-none text-white">
                {user.displayName || 'Gamer'}
              </span>
              <Link href="/profile">
                <div className="cursor-pointer transition-transform duration-200 hover:scale-105">
                  <AvatarCustom
                    src={user.photoURL}
                    name={user.displayName || "Gamer"}
                    size="sm"
                    className="h-8 w-8"
                  />
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="h-8 w-8 text-muted-foreground hover:text-destructive sm:h-10 sm:w-10"
              >
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm" className="h-9 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm whitespace-nowrap">
                <LogIn className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">เข้าสู่ระบบ</span>
                <span className="sm:hidden">Login</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
