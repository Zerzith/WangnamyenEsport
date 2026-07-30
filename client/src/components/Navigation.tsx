import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { AvatarCustom } from "@/components/ui/avatar-custom";
import { 
  Gamepad2, 
  Users, 
  MessageCircle, 
  LogOut, 
  LogIn,
  ShieldCheck
} from "lucide-react";
import { motion } from "framer-motion";
import { useLocation, Link } from "wouter";

export function Navigation() {
  const [location] = useLocation();
  const { user, signOut } = useAuth();

  const navItems = [
    { href: "/", label: "หน้าแรก", icon: Gamepad2 },
    { href: "/bracket", label: "สายการแข่งขัน", icon: Users },
    { href: "/rules", label: "กฎการแข่ง", icon: ShieldCheck },
    { href: "/chat", label: "แชทสด", icon: MessageCircle },
  ];

  const adminItem = { href: "/admin", label: "จัดการระบบ", icon: ShieldCheck };

  // เคลียร์เมนูออกทั้งหมด
  const userMenuItems = [];

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-zinc-950/90 shadow-[0_8px_24px_-16px_rgb(0_0_0_/_0.9)]">
        <div className="container mx-auto flex min-h-[4rem] sm:min-h-[4.5rem] items-center justify-between gap-1.5 px-2 sm:px-5">
          {/* Logo Section */}
          <Link href="/">
            <div className="group flex flex-shrink-0 cursor-pointer items-center gap-2.5">
              <img
                src="/logo.png"
                alt="WNYTC Esports Championship"
                className="h-10 w-10 rounded-xl object-contain"
              />
              <span className="hidden whitespace-nowrap font-display text-sm font-bold uppercase tracking-tight text-white transition-colors group-hover:text-primary md:block sm:text-xl">
                WangNamYen<span className="text-primary">Esports</span>
              </span>
            </div>
          </Link>

          {/* Navigation Items */}
          <div className="scrollbar-hide flex flex-1 items-center justify-center overflow-x-auto px-0.5 sm:px-3">
            <div className="flex items-center gap-0.5 sm:gap-1 rounded-xl border border-white/[0.055] bg-white/[0.018] p-0.5 sm:p-1">
              {navItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <div 
                      className={`
                        relative isolate flex cursor-pointer flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 text-[9px] font-semibold transition-all sm:flex-row sm:gap-2 sm:px-3 sm:py-2 sm:text-sm whitespace-nowrap
                        ${isActive ? 'text-primary' : 'text-muted-foreground hover:bg-white/[0.06] hover:text-white'}
                      `}
                    >
                      <item.icon className="relative z-10 h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="relative z-10">{item.label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="nav-pill"
                          className="absolute inset-0 z-0 rounded-lg border border-primary/20 bg-primary/10 shadow-[inset_0_0_18px_rgb(34_211_238_/_0.07),0_0_18px_-10px_rgb(34_211_238_/_0.75)]"
                          initial={false}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                    </div>
                  </Link>
                );
              })}
              
              {user?.role === "admin" && (
                <Link href={adminItem.href}>
                  <div 
                    className={`
                      relative isolate flex cursor-pointer flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 text-[9px] font-semibold transition-all sm:flex-row sm:gap-2 sm:px-3 sm:py-2 sm:text-sm whitespace-nowrap
                      ${location === adminItem.href ? 'text-accent' : 'text-accent/85 hover:bg-accent/10 hover:text-white'}
                    `}
                  >
                    <adminItem.icon className="relative z-10 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="relative z-10">{adminItem.label}</span>
                    {location === adminItem.href && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-0 z-0 rounded-lg border border-accent/25 bg-accent/10 shadow-[inset_0_0_18px_rgb(139_92_246_/_0.08),0_0_18px_-10px_rgb(139_92_246_/_0.75)]"
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </div>
                </Link>
              )}
              {/* ลบปุ่ม Menu (3 ขีด) ออกจากตรงนี้แล้ว */}
            </div>
          </div>

          {/* User Actions Section */}
          <div className="flex flex-shrink-0 items-center gap-1 sm:gap-3">
            {user ? (
                <div className="flex items-center gap-1 sm:gap-3">
                <div className="hidden flex-col items-end lg:flex">
                  <span className="whitespace-nowrap text-sm font-bold leading-none text-white">{user.displayName || 'Gamer'}</span>
                  <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Online</span>
                </div>
                <Link href="/profile">
                  <div className="cursor-pointer transition-transform duration-200 hover:scale-105">
                    <AvatarCustom 
                      src={user.photoURL} 
                      name={user.displayName || "Gamer"} 
                      size="sm" 
                      className="h-8 w-8 ring-2 ring-primary/20"
                    />
                  </div>
                </Link>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={signOut}
                  className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:h-10 sm:w-10"
                >
                  <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button size="sm" className="h-9 border-primary/45 bg-primary px-3 text-xs font-bold text-primary-foreground shadow-[0_10px_24px_-12px_rgb(34_211_238_/_0.9)] hover:bg-primary sm:h-10 sm:px-4 sm:text-sm whitespace-nowrap">
                  <LogIn className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                  เข้าสู่ระบบ
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>
      
    </>
  );
}
