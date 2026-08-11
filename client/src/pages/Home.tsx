import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { ArrowRight, Trophy, Loader2, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, memo } from "react";
import { collection, onSnapshot, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

const HERO_BG = "https://images.unsplash.com/photo-1552820728-8ac41f1ce891?q=80&w=2070&auto=format&fit=crop";

interface Event {
  id: string;
  title: string;
  game: string;
  date: string;
  registrationDeadline?: string;
  bannerUrl?: string;
  maxTeams?: number;
  membersPerTeam?: number;
  maxSubstitutes?: number;
  status?: string;
  registeredTeams?: number;
  logoUrl?: string;
  championTeamId?: string | null;
}

interface News {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  createdAt: any;
  author: string;
}

const formatDate = (dateString?: string) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
};

// ย้าย EventCard ออกมาเป็น top-level component เพื่อป้องกัน re-mount ทุกครั้งที่ parent re-render
const EventCard = memo(({ event, index, registeredCount, user }: {
  event: Event;
  index: number;
  registeredCount: number;
  user: any;
}) => {
  const isFull = event.maxTeams ? registeredCount >= event.maxTeams : false;

  const isExpired = event.registrationDeadline ? (() => {
    const deadline = new Date(event.registrationDeadline);
    if (!event.registrationDeadline.includes('T')) {
      deadline.setHours(23, 59, 59, 999);
    }
    return deadline < new Date();
  })() : false;

  const isOpen = (event.status === 'open' || (event.status !== 'closed' && !isExpired)) && !isFull;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: Math.min(index * 0.08, 0.4) }}
      className={`group relative h-[25rem] overflow-hidden rounded-xl border bg-zinc-900 clip-corner-tr transition-all duration-150 ${
        !isOpen || isFull ? "border-red-500/35 opacity-90 " : "border-white/[0.1] hover:-translate-y-1 hover:border-primary/40 hover:"
      }`}
    >
      <Link href={`/event/${event.id}`}>
        <div className="absolute inset-0 cursor-pointer">
          <img
            src={event.bannerUrl || HERO_BG}
            alt={event.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-70 saturate-[0.88] transition-transform duration-300 group-hover:scale-105 group-hover:saturate-100"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/65 to-zinc-950/5" />
        </div>
      </Link>

      <div className="absolute top-4 right-4 z-10 flex gap-2">
        {!isOpen ? (
          <div className="rounded-md border border-red-400/25 bg-red-500/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-200">
            ปิดรับสมัคร
          </div>
        ) : isFull ? (
          <div className="rounded-md border border-red-400/25 bg-red-500/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-200">
            เต็มแล้ว
          </div>
        ) : (
          <div className="rounded-md border border-emerald-400/25 bg-emerald-400/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
            เปิดรับสมัคร
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 w-full p-6 sm:p-7">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="rounded-md border border-primary/25 bg-primary/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            {event.game}
          </span>
          <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider">
            {event.date}
          </span>
          {event.registrationDeadline && (
            <span className="text-[10px] text-red-400 font-medium">
              ปิด {(() => {
                try {
                  const d = new Date(event.registrationDeadline);
                  const opts: Intl.DateTimeFormatOptions = { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false };
                  return new Intl.DateTimeFormat("th-TH", opts).format(d);
                } catch { return ""; }
              })()}
            </span>
          )}
        </div>

        <h3 className="pointer-events-auto mb-3 font-display text-2xl font-bold text-white transition-colors group-hover:text-primary">
          <Link href={`/event/${event.id}`}>{event.title}</Link>
        </h3>

        <div className="flex items-center justify-between mt-4 gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-md border border-white/10 bg-zinc-950/55 px-3 py-1.5 text-sm">
              <span className={isFull ? "text-red-400 font-bold" : "text-white font-bold"}>
                {registeredCount}/{event.maxTeams || 16} ทีม
              </span>
            </div>
            {event.maxSubstitutes !== undefined && event.maxSubstitutes > 0 && (
              <div className="rounded-md border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs text-primary font-medium">
                สำรอง {event.maxSubstitutes}
              </div>
            )}
          </div>
          {isOpen && !isFull && (
            <Link href={user ? `/event/${event.id}` : "/login"}>
              <Button size="sm" className="pointer-events-auto rounded-md border-primary/45 bg-primary px-4 font-bold text-primary-foreground hover:bg-primary/90">
                สมัครเลย
              </Button>
            </Link>
          )}
          {(!isOpen || isFull) && (
            <Link href={`/event/${event.id}`}>
              <Button size="sm" variant="outline" className="pointer-events-auto rounded-md border-white/15 bg-transparent px-4 font-bold text-white/80 hover:border-primary/35 hover:text-primary">
                ดูรายละเอียด
              </Button>
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
});

export default function Home() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
  const [loading, setLoading] = useState(true);
  const [champions, setChampions] = useState<Event[]>([]);
  // เก็บ registeredCount ทุก event ไว้ใน map เดียว แทนที่จะสร้าง listener แยกทุกการ์ด
  const [registrationCounts, setRegistrationCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    // ดึงข้อมูลการแข่งขัน
    const qEvents = query(
      collection(db, "events"),
      orderBy("createdAt", "desc")
    );

    const unsubEvents = onSnapshot(qEvents, (snapshot) => {
      const eventsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      setEvents(eventsList);
      setChampions(eventsList.filter(e => e.championTeamId));
      setLoading(false);
    });

    // ดึงข้อมูลข่าวสาร
    const qNews = query(collection(db, "news"), orderBy("createdAt", "desc"), limit(5));
    const unsubNews = onSnapshot(qNews, (snapshot) => {
      setNews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    });

    // ดึง registration counts ทั้งหมดในครั้งเดียว (1 listener แทน N listeners)
    const qRegs = query(
      collection(db, "registrations"),
      where("status", "==", "approved")
    );
    const unsubRegs = onSnapshot(qRegs, (snapshot) => {
      const counts: Record<string, number> = {};
      snapshot.docs.forEach(doc => {
        const eventId = doc.data().eventId;
        if (eventId) {
          counts[eventId] = (counts[eventId] || 0) + 1;
        }
      });
      setRegistrationCounts(counts);
    });

    return () => {
      unsubEvents();
      unsubNews();
      unsubRegs();
    };
  }, []);

  return (
    <div className="min-h-screen bg-transparent">
      {/* Hero Section */}
      <section className="relative flex min-h-[calc(100vh-4.5rem)] items-center border-b border-white/[0.06] overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/assets/college-bg.png" 
            alt="Wang Nam Yen Technical College" 
            className="h-full w-full object-cover opacity-[0.25]"
          />
          {/* Cyan/primary glow overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0e17]/98 via-[#0a0e17]/85 to-transparent" />
          {/* Subtle cyan tint */}
          <div className="absolute inset-0 bg-cyan-500/[0.03]" />
        </div>
        
        {/* Animated grid pattern overlay */}
        <div 
          className="absolute inset-0 z-[1] opacity-[0.08]"
          style={{
            backgroundImage: `linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
        
        {/* Radial glow effect */}
        <div className="absolute inset-0 z-[1]">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 left-1/6 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px]" />
        </div>
        
        <div className="relative z-10 w-full px-4 sm:px-8 lg:px-12">
          <div className="max-w-3xl">
            <div className="mb-4 sm:mb-5 inline-flex items-center gap-2 rounded-md border border-primary/25 bg-primary/10 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold tracking-[0.13em] text-primary">
              WANGNAMYEN ESPORTS
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-5 sm:mb-6 max-w-2xl font-display text-3xl font-bold leading-[1.1] tracking-[-0.02em] text-white sm:text-4xl md:text-5xl"
            >
              ยกระดับการแข่งขัน <br />
              <span className="text-primary">ESPORTS</span> ในวิทยาลัยเทคนิควังน้ำเย็น
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6 sm:mb-8 max-w-xl text-sm sm:text-base leading-relaxed text-slate-300"
            >
              แพลตฟอร์มจัดการแข่งขันอีสปอร์ตสำหรับนักเรียน/นักศึกษา วิทยาลัยเทคนิควังน้ำเย็น
              ติดตามสายการแข่งขัน ผลการแข่ง และทำเนียบแชมเปี้ยนได้ที่นี่
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-3 sm:gap-4"
            >
              <Link href="/bracket">
                <Button size="lg" className="h-11 sm:h-12 rounded-lg border-primary/45 bg-primary px-5 sm:px-8 text-sm sm:text-base font-bold text-primary-foreground hover:bg-primary/90">
                  ดูสายการแข่งขัน
                </Button>
              </Link>
              <Link href="/rules">
                <Button size="lg" variant="outline" className="h-11 sm:h-12 rounded-lg border-white/15 bg-transparent px-5 sm:px-8 text-sm sm:text-base font-bold text-white hover:border-primary/40 hover:text-primary">
                  กฎการแข่งขัน
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Champions Section */}
      {champions.length > 0 && (
        <section className="border-y border-white/[0.06] bg-zinc-900/50 py-20">
          <div className="w-full px-2 sm:px-4 lg:px-6">
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-white">ทำเนียบแชมป์เปี้ยน</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {champions.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(index * 0.08, 0.4) }}
                >
                  <Link href={`/event/${event.id}`}>
                    <Card className="group cursor-pointer rounded-xl border-yellow-400/20 bg-zinc-900 p-8 text-center transition-all duration-150 hover:border-yellow-300/35">
                      <h3 className="text-xl font-bold text-white mb-2">{event.title}</h3>
                      <p className="text-yellow-500 font-bold text-xl uppercase tracking-tight">CHAMPION</p>
                      <div className="mt-4 inline-flex items-center text-sm text-muted-foreground group-hover:text-white transition-colors">
                        ดูรายละเอียด <ArrowRight className="ml-2 w-4 h-4" />
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Events Section */}
      <section className="py-24">
        <div className="w-full px-2 sm:px-4 lg:px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
            <div>
              <span className="mb-2 block font-display text-xs font-bold uppercase tracking-[0.2em] text-primary">Tournaments</span>
              <h2 className="font-display text-4xl font-bold uppercase tracking-tight text-white md:text-5xl">การแข่งขันอีสปอร์ต</h2>
              <p className="text-muted-foreground mt-3 text-lg">รายการแข่งขันทั้งหมดของวิทยาลัยเทคนิควังน้ำเย็น</p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-96">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground animate-pulse">กำลังโหลดข้อมูลการแข่งขัน...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="esports-panel mx-auto max-w-3xl border-dashed border-white/15 bg-zinc-900/35 py-24 text-center">
              <Trophy className="w-20 h-20 mx-auto text-white/5 mb-6" />
              <h3 className="text-2xl font-bold text-white/40">ยังไม่มีการแข่งขันในขณะนี้</h3>
              <p className="text-muted-foreground mt-2">โปรดติดตามข่าวสารประกาศเร็วๆ นี้</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
              {events.map((event, i) => (
                <EventCard
                  key={event.id}
                  event={event}
                  index={i}
                  registeredCount={registrationCounts[event.id] ?? (event.registeredTeams || 0)}
                  user={user}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* News Section */}
      {news.length > 0 && (
        <section className="border-y border-white/[0.06] bg-zinc-900/50 py-24">
          <div className="w-full px-2 sm:px-4 lg:px-6">
            <div className="mb-12">
              <h2 className="text-3xl font-display font-bold text-white">ข่าวสารล่าสุด</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {news.map((item) => (
                <Card key={item.id} className="group esports-panel esports-panel-interactive rounded-xl border-white/[0.09] bg-zinc-900 overflow-hidden cursor-pointer" onClick={() => setSelectedNews(item)}>
                  {item.imageUrl && (
                    <div className="w-full aspect-[16/9] overflow-hidden">
                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                  )}
                  <div className="p-6">
                  <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                    {item.createdAt?.toDate ? formatDate(item.createdAt.toDate().toISOString()) : "เมื่อเร็วๆ นี้"}
                  </div>
                  <h3 className="mb-3 line-clamp-2 font-display text-xl font-bold text-white transition-colors group-hover:text-primary">{item.title}</h3>
                  {/* Content shown only in modal */}
                  <div className="flex items-center justify-between border-t border-white/[0.07] pt-4">
                    <span className="text-xs text-white/40">โดย {item.author || "Admin"}</span>
                    <Button variant="ghost" size="sm" className="h-auto p-0 font-medium text-primary hover:bg-transparent hover:text-cyan-200" onClick={() => setSelectedNews(item)}>
                      อ่านต่อ
                    </Button>
                  </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* News Detail Modal */}
      <Dialog open={!!selectedNews} onOpenChange={(open) => { if (!open) setSelectedNews(null); }}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-white/10 text-white p-0 overflow-hidden max-h-[85vh] overflow-y-auto custom-scrollbar">
          {selectedNews && (
            <>
              {selectedNews.imageUrl && (
                <div className="w-full aspect-[16/7] overflow-hidden">
                  <img src={selectedNews.imageUrl} alt={selectedNews.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-6">
                <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  {selectedNews.createdAt?.toDate ? formatDate(selectedNews.createdAt.toDate().toISOString()) : "เมื่อเร็วๆ นี้"}
                </div>
                <DialogTitle className="text-2xl font-display font-bold text-white mb-3">
                  {selectedNews.title}
                </DialogTitle>
                <DialogDescription className="text-white/70 text-base leading-relaxed whitespace-pre-wrap">
                  {selectedNews.content}
                </DialogDescription>
                <div className="mt-4 pt-4 border-t border-white/10 text-xs text-white/40">
                  โดย {selectedNews.author || "Admin"}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
