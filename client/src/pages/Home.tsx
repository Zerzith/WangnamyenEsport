import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Trophy, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, memo } from "react";
import { collection, onSnapshot, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatThaiDate, formatThaiDateTime } from "@/lib/date";

const HERO_BG = "https://images.unsplash.com/photo-1552820728-8ac41f1ce891?q=80&w=2070&auto=format&fit=crop";

const DEFAULT_BANNER = "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop";

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
      className={`group relative h-[25rem] overflow-hidden rounded-2xl border bg-card shadow-[0_18px_38px_-30px_rgb(0_0_0_/_0.95)] transition-all duration-150 ${
        !isOpen || isFull ? "border-destructive/35 opacity-90" : "border-white/[0.09] hover:-translate-y-0.5 hover:border-primary/45"
      }`}
    >
      <Link href={`/event/${event.id}`}>
        <div className="absolute inset-0 cursor-pointer">
          <img
            src={event.bannerUrl || HERO_BG}
            alt={event.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-70 saturate-[0.88] transition-transform duration-300 group-hover:scale-105 group-hover:saturate-100"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = HERO_BG;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/10" />
        </div>
      </Link>

      <div className="absolute top-4 right-4 z-10 flex gap-2">
        {!isOpen ? (
          <div className="rounded-md border border-red-300/20 bg-slate-950/85 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-200">
            ปิดรับสมัคร
          </div>
        ) : isFull ? (
          <div className="rounded-md border border-red-300/20 bg-slate-950/85 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-200">
            เต็มแล้ว
          </div>
        ) : (
          <div className="rounded-md border border-primary/30 bg-slate-950/85 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-100">
            เปิดรับสมัคร
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 w-full p-6 sm:p-7">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="rounded-md border border-primary/25 bg-slate-950/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            {event.game}
          </span>
            <span className="text-[10px] text-slate-200 font-bold tracking-wider">
            เริ่มแข่งขัน: {formatThaiDate(event.date)}
          </span>
          {event.registrationDeadline && (
            <span className="text-[10px] text-amber-200/90 font-medium">
              ปิดรับสมัคร: {formatThaiDateTime(event.registrationDeadline)}
            </span>
          )}
        </div>

        <h3 className="pointer-events-auto mb-3 font-display text-2xl font-bold text-white transition-colors group-hover:text-primary">
          <Link href={`/event/${event.id}`}>{event.title}</Link>
        </h3>

        <div className="flex items-center justify-between mt-4 gap-2">
          <div className="flex items-center gap-2">
              <div className="rounded-md border border-white/[0.1] bg-slate-950/70 px-3 py-1.5 text-sm">
              <span className={isFull ? "text-red-400 font-bold" : "text-white font-bold"}>
                {registeredCount}/{event.maxTeams || 16} ทีม
              </span>
            </div>
            {event.maxSubstitutes !== undefined && event.maxSubstitutes > 0 && (
              <div className="rounded-md border border-primary/20 bg-slate-950/70 px-3 py-1.5 text-xs text-primary font-medium">
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
  const [loading, setLoading] = useState(true);
  const [champions, setChampions] = useState<Event[]>([]);
  const [teamMap, setTeamMap] = useState<Record<string, { teamName: string; logoUrl?: string }>>({});
  const [registrationCounts, setRegistrationCounts] = useState<Record<string, number>>({});

  useEffect(() => {
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

    const qNews = query(collection(db, "news"), orderBy("createdAt", "desc"), limit(5));
    const unsubNews = onSnapshot(qNews, (snapshot) => {
      setNews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    });

    const qRegs = query(
      collection(db, "registrations"),
      where("status", "==", "approved")
    );
    const unsubRegs = onSnapshot(qRegs, (snapshot) => {
      const counts: Record<string, number> = {};
      const teams: Record<string, { teamName: string; logoUrl?: string }> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data() as any;
        const eventId = data.eventId;
        if (eventId) {
          counts[eventId] = (counts[eventId] || 0) + 1;
        }
        teams[doc.id] = {
          teamName: data.teamName || data.name || "ทีมไม่ทราบชื่อ",
          logoUrl: data.logoUrl,
        };
      });
      setRegistrationCounts(counts);
      setTeamMap(teams);
    });

    return () => {
      unsubEvents();
      unsubNews();
      unsubRegs();
    };
  }, []);

  return (
    <div className="min-h-screen bg-transparent">

      <section className="relative flex min-h-[calc(86vh-4.5rem)] items-center border-b border-white/[0.06] overflow-hidden">

        <div className="absolute inset-0 z-0">
          <img
            src="/assets/nebula-bg.png"
            alt="Background"
            className="h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-slate-950/80" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 w-full px-4 sm:px-8 lg:px-12">
          <div className="max-w-3xl">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-5 sm:mb-6 max-w-3xl font-display text-3xl font-bold leading-[1.1] tracking-[-0.02em] text-white sm:text-4xl md:text-5xl"
            >
              ยกระดับการแข่งขัน <span className="hidden md:inline"> </span><br className="md:hidden" />
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


      {champions.length > 0 && (
          <section className="border-y border-white/[0.06] bg-black/15 py-24">
          <div className="w-full px-2 sm:px-4 lg:px-6">
            <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <div className="mb-3 inline-flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-300/90" />
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200/80">Hall of Fame</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-white">ทำเนียบแชมเปี้ยน</h2>
                <p className="text-muted-foreground mt-2">เกียรติของทีมชนะเลิศประจำรายการ แข่งขันทุกสนามของเรา</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {champions.map((event, index) => {
                const champion = event.championTeamId ? teamMap[event.championTeamId] : undefined;
                return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: Math.min(index * 0.08, 0.4), duration: 0.3 }}
                >
                  <Link href={`/event/${event.id}`}>
                    <div className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.09] bg-zinc-900/60 shadow-[0_18px_38px_-30px_rgb(0_0_0_/_0.95)] transition-all duration-150 hover:-translate-y-0.5 hover:border-amber-300/35">
                      <div className="relative h-36 overflow-hidden">
                        <img
                          src={event.bannerUrl || DEFAULT_BANNER}
                          alt={event.title}
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-cover opacity-75 transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = DEFAULT_BANNER;
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-md border border-amber-300/35 bg-zinc-950/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200">
                          <Trophy className="w-3 h-3" />
                          แชมป์
                        </div>
                        {champion?.logoUrl && (
                          <img
                            src={champion.logoUrl}
                            alt={champion.teamName}
                            className="absolute bottom-3 right-3 h-12 w-12 rounded-lg border-2 border-amber-300/60 bg-zinc-900 object-cover shadow-lg"
                          />
                        )}
                      </div>
                      <div className="p-5 pt-4">
                        <span className="rounded-md border border-primary/25 bg-slate-950/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                          {event.game}
                        </span>
                        <h3 className="mt-3 font-display text-xl font-bold text-white line-clamp-2 transition-colors group-hover:text-primary">
                          {event.title}
                        </h3>
                        {champion ? (
                          <p className="mt-1.5 text-sm text-slate-300">โดย <span className="font-bold text-amber-100">{champion.teamName}</span></p>
                        ) : (
                          <p className="mt-1.5 text-sm text-muted-foreground">ชิงแชมป์ประจำรายการนี้</p>
                        )}
                        {event.date && (
                          <p className="mt-1 text-xs text-white/50">ปิดสนามเมื่อ {formatThaiDate(event.date)}</p>
                        )}
                        <div className="mt-4 flex items-center text-sm font-medium text-muted-foreground transition-colors group-hover:text-primary">
                          ดูรายละเอียด <ArrowRight className="ml-1.5 h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}


      <section className="py-24">
        <div className="w-full px-2 sm:px-4 lg:px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
            <div>
              <span className="mb-2 block font-display text-xs font-bold uppercase tracking-[0.2em] text-primary">Tournaments</span>
              <h2 className="font-display text-4xl font-bold tracking-tight text-white md:text-5xl">การแข่งขันอีสปอร์ต</h2>
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


      {news.length > 0 && (
        <section className="border-y border-white/[0.06] bg-black/15 py-24">
          <div className="w-full px-2 sm:px-4 lg:px-6">
            <div className="mb-12">
              <h2 className="text-3xl font-display font-bold text-white">ข่าวสารล่าสุด</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {news.map((item) => (
                <Link href={`/news/${item.id}`}>
                  <Card key={item.id} className="group esports-panel esports-panel-interactive h-full rounded-2xl border-white/[0.09] bg-card overflow-hidden cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/45">
                  {item.imageUrl && (
                    <div className="w-full aspect-[16/9] overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.parentElement?.remove();
                        }}
                      />
                    </div>
                  )}
                  <div className="p-6">
                  <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                    {item.createdAt?.toDate ? formatDate(item.createdAt.toDate().toISOString()) : "เมื่อเร็วๆ นี้"}
                  </div>
                  <h3 className="mb-3 line-clamp-2 font-display text-xl font-bold text-white transition-colors group-hover:text-primary">{item.title}</h3>
                  <div className="flex items-center justify-between border-t border-white/[0.07] pt-4">
                    <span className="text-xs text-white/40">โดย {item.author || "Admin"}</span>
                    <span className="flex items-center text-sm font-medium text-muted-foreground transition-colors group-hover:text-primary">
                      อ่านต่อ <ArrowRight className="ml-1.5 h-4 w-4" />
                    </span>
                  </div>
                  </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
