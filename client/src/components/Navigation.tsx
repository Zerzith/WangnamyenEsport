import { useEffect, useLayoutEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { AvatarCustom } from "@/components/ui/avatar-custom";
import { LogIn, LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { useLocation, Link } from "wouter";

type ThemeMode = "dark" | "light";

function getSavedTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  try {
    return window.localStorage.getItem("wangnamyen-esport-theme") === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function Navigation() {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(getSavedTheme);
  const { user, signOut } = useAuth();

  const navItems = [
    { href: "/", label: "หน้าแรก" },
    { href: "/bracket", label: "สายการแข่งขัน" },
    { href: "/rules", label: "กฎการแข่ง" },
    { href: "/chat", label: "แชทสด" },
  ];

  const adminItem = { href: "/admin", label: "จัดการระบบ" };

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem("wangnamyen-esport-theme", theme);
    } catch {
      // Continue with the selected theme when browser storage is unavailable.
    }
  }, [theme]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  return (
    <nav aria-label="เมนูหลัก" className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
      <div className="flex min-h-[4rem] items-center gap-2 px-3 sm:min-h-[4.5rem] sm:px-4 lg:px-6">
        <Link href="/" aria-label="ระบบบริหารการจัดการแข่งขันอีสปอร์ต" className="flex shrink-0 items-center gap-2">
          <img
            src="/assets/wangnamyen-esport-crown-emblem.webp"
            alt="โลโก้ Wangnamyen Esport"
            className="h-9 w-9 rounded-lg object-contain sm:h-10 sm:w-10"
          />
          <span className="hidden whitespace-nowrap font-display text-xs font-bold tracking-tight text-foreground sm:block lg:text-sm">
            ระบบบริหารการจัดการแข่งขันอีสปอร์ต
          </span>
        </Link>

        <div className="ml-3 hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto lg:flex">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <span
                  className={`cursor-pointer whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
                    isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {user?.role === "admin" && (
            <Link href={adminItem.href}>
              <span
                className={`cursor-pointer whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
                  location === adminItem.href ? "bg-accent/15 text-accent" : "text-accent/90 hover:bg-accent/10 hover:text-accent"
                }`}
              >
                {adminItem.label}
              </span>
            </Link>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={theme === "dark" ? "เปลี่ยนเป็นโทนสว่าง" : "เปลี่ยนเป็นโทนดำ"}
            title={theme === "dark" ? "เปลี่ยนเป็นโทนสว่าง" : "เปลี่ยนเป็นโทนดำ"}
            aria-pressed={theme === "light"}
            onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
            className="h-10 gap-2 px-2 text-foreground hover:bg-muted"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
            <span className="hidden whitespace-nowrap text-xs font-medium lg:inline">
              {theme === "dark" ? "โทนสว่าง" : "โทนดำ"}
            </span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={menuOpen ? "ปิดเมนูหลัก" : "เปิดเมนูหลัก"}
            aria-controls="mobile-primary-navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="h-10 w-10 text-foreground hover:bg-muted lg:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </Button>

          {user ? (
            <>
              <span className="hidden whitespace-nowrap text-sm font-medium leading-none text-foreground xl:block">
                {user.displayName || "Gamer"}
              </span>
              <Link href="/profile" aria-label="ไปหน้าโปรไฟล์">
                <div className="cursor-pointer">
                  <AvatarCustom
                    src={user.photoURL}
                    name={user.displayName || "Gamer"}
                    size="sm"
                    className="h-8 w-8"
                  />
                </div>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => { setMenuOpen(false); void signOut(); }}
                aria-label="ออกจากระบบ"
                className="h-9 w-9 text-muted-foreground hover:text-destructive sm:h-10 sm:w-10"
              >
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm" className="h-9 whitespace-nowrap px-3 text-xs sm:h-10 sm:px-4 sm:text-sm">
                <LogIn className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">เข้าสู่ระบบ</span>
                <span className="sm:hidden">Login</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {menuOpen && (
        <div className="absolute inset-x-0 top-full border-b border-border bg-card p-3 shadow-xl lg:hidden">
          <div id="mobile-primary-navigation" role="group" className="flex flex-col gap-1" aria-label="เมนูหลักบนมือถือ">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <span
                    onClick={() => setMenuOpen(false)}
                    className={`block cursor-pointer rounded-md px-3 py-3 text-sm font-medium ${
                      isActive ? "bg-primary/15 text-primary" : "text-foreground hover:bg-foreground/5"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
            {user?.role === "admin" && (
              <Link href={adminItem.href}>
                <span
                  onClick={() => setMenuOpen(false)}
                  className={`block cursor-pointer rounded-md px-3 py-3 text-sm font-medium ${
                    location === adminItem.href ? "bg-accent/15 text-accent" : "text-accent/90 hover:bg-accent/10"
                  }`}
                >
                  {adminItem.label}
                </span>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
