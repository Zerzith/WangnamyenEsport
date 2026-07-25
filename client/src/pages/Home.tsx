import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Trophy, Users, Calendar, Loader2, Megaphone, Clock, AlertCircle, Gamepad2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, orderBy, limit } from "firebase/firestore";
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
  status?: string;
  registeredTeams?: number;
  logoUrl?: string;
  championTeamId?: string | null;
}

interface News {
  id: string;
  title: string;
  content: string;
  createdAt: any;
  author: string;
}

export default function Home() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [champions, setChampions] = useState<Event[]>([]);

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

    return () => {
      unsubEvents();
      unsubNews();
    };
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  // Component สำหรับการ์ดแสดงการแข่งขัน
  const EventCard = ({ event, index }: { event: Event, index: number }) => {
    const [registeredCount, setRegisteredCount] = useState(event.registeredTeams || 0);

    useEffect(() => {
      const qRegs = query(
        collection(db, "registrations"),
        where("eventId", "==", event.id),
        where("status", "==", "approved")
      );
      
      const unsubRegs = onSnapshot(qRegs, (snapshot) => {
        setRegisteredCount(snapshot.docs.length);
      });

      return () => unsubRegs();
    }, [event.id]);

    const isFull = event.maxTeams ? registeredCount >= event.maxTeams : false;
    
    // Check if registration deadline has passed
    // registrationDeadline can be in format: YYYY-MM-DD or YYYY-MM-DDTHH:mm
    const isExpired = event.registrationDeadline ? (() => {
      const deadline = new Date(event.registrationDeadline);
      // If time is not specified, set to end of day (23:59:59)
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
        transition={{ delay: index * 0.1 }}
        className={`group relative h-[25rem] overflow-hidden rounded-2xl border bg-zinc-950/60 shadow-panel transition-all duration-500 ${
          !isOpen || isFull ? "border-red-500/35 opacity-90 shadow-[0_20px_50px_-30px_rgb(239_68_68_/_0.45)]" : "border-white/[0.1] hover:-translate-y-1.5 hover:border-primary/50 hover:shadow-panel-hover"
        }`}
      >
        <Link href={`/event/${event.id}`}>
          <div className="absolute inset-0 cursor-pointer">
            <img 
              src={event.bannerUrl || HERO_BG}
              alt={event.title}
              className="absolute inset-0 h-full w-full object-cover opacity-70 saturate-[0.88] transition-transform duration-700 group-hover:scale-110 group-hover:saturate-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/65 to-zinc-950/5" />
          </div>
        </Link>
        
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          {!isOpen ? (
            <div className="flex items-center gap-1.5 rounded-full border border-red-400/25 bg-red-500/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-200 shadow-[0_0_18px_-9px_rgb(239_68_68_/_0.8)] backdrop-blur-md">
              <AlertCircle className="w-3 h-3" />
              ปิดรับสมัคร
            </div>
          ) : isFull ? (
            <div className="flex items-center gap-1.5 rounded-full border border-red-400/25 bg-red-500/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-200 shadow-[0_0_18px_-9px_rgb(239_68_68_/_0.8)] backdrop-blur-md">
              <AlertCircle className="w-3 h-3" />
              เต็มแล้ว
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-200 shadow-[0_0_18px_-9px_rgb(52_211_153_/_0.8)] backdrop-blur-md">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              เปิดรับสมัคร
            </div>
          )}
        </div>
        
        <div className="pointer-events-none absolute bottom-0 left-0 w-full p-6 sm:p-7">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="rounded-full border border-primary/25 bg-primary/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary backdrop-blur-md">
              {event.game}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-white/80 font-bold uppercase tracking-wider">
              <Calendar className="w-3 h-3 text-primary" /> {event.date}
            </span>
          </div>
          
          <h3 className="pointer-events-auto mb-3 font-display text-2xl font-bold text-white transition-colors group-hover:text-primary">
            <Link href={`/event/${event.id}`}>{event.title}</Link>
          </h3>
          
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/55 px-3 py-1.5 text-sm backdrop-blur-md">
              <Users className="w-4 h-4 text-primary" />
              <span className={isFull ? "text-red-400 font-bold" : "text-white font-bold"}>
                {registeredCount}/{event.maxTeams || 16} ทีม
              </span>
            </div>
            {isOpen && !isFull && (
              <Link href={user ? `/event/${event.id}` : "/login"}>
                <Button size="sm" className="pointer-events-auto rounded-xl border-primary/45 bg-primary px-4 font-bold text-primary-foreground shadow-[0_12px_24px_-12px_rgb(34_211_238_/_0.9)] hover:bg-primary">
                  สมัครเลย
                </Button>
              </Link>
            )}
            {(!isOpen || isFull) && (
              <Link href={`/event/${event.id}`}>
                <Button size="sm" variant="outline" className="pointer-events-auto rounded-xl border-white/15 bg-white/[0.035] px-4 font-bold text-white/80 hover:border-primary/35 hover:bg-primary/10 hover:text-primary">
                  ดูรายละเอียด
                </Button>
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-transparent">
      {/* Hero Section */}
      <section className="esports-grid relative isolate flex min-h-[calc(100vh-4.5rem)] items-center overflow-hidden border-b border-white/[0.06] py-20">
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/10 opacity-50"></div>
        <div className="absolute inset-0 z-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)`
        }}></div>
        <div className="container relative z-10 mx-auto px-4 sm:px-6">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.09] px-4 py-2 text-xs font-bold tracking-[0.13em] text-primary shadow-[0_0_28px_-12px_rgb(34_211_238_/_0.75)] backdrop-blur-md"
            >
              <Gamepad2 className="w-4 h-4" />
              WANGNAMYEN ESPORTS
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-7 max-w-4xl font-display text-5xl font-bold leading-[0.92] tracking-[-0.045em] text-white sm:text-6xl md:text-7xl lg:text-8xl"
            >
              ยกระดับการแข่งขัน <br />
              <span className="text-gradient text-glow">ESPORTS</span> ในวิทยาลัยเทคนิควังน้ำเย็น
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-9 max-w-2xl text-lg leading-relaxed text-slate-300 sm:text-xl"
            >
              แพลตฟอร์มจัดการแข่งขันอีสปอร์ตสำหรับนักเรียน/นักศึกษา วิทยาลัยเทคนิควังน้ำเย็น
              ติดตามสายการแข่งขัน ผลการแข่ง และทำเนียบแชมป์เปี้ยนได้ที่นี่
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-3 sm:gap-4"
            >
              <Link href="/bracket">
                <Button size="lg" className="h-14 rounded-xl border-primary/45 bg-primary px-8 text-lg font-bold text-primary-foreground shadow-[0_16px_34px_-14px_rgb(34_211_238_/_0.95)] hover:bg-primary">
                  ดูสายการแข่งขัน
                </Button>
              </Link>
              <Link href="/rules">
                <Button size="lg" variant="outline" className="h-14 rounded-xl border-white/15 bg-white/[0.035] px-8 text-lg font-bold text-white hover:border-primary/40 hover:bg-primary/10 hover:text-primary">
                  กฎการแข่งขัน
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Champions Section */}
      {champions.length > 0 && (
        <section className="border-y border-white/[0.06] bg-white/[0.018] py-20">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 mb-12">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <h2 className="text-3xl font-bold text-white">ทำเนียบแชมป์เปี้ยน</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {champions.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link href={`/event/${event.id}`}>
                    <Card className="group cursor-pointer rounded-2xl border-yellow-400/25 bg-gradient-to-br from-yellow-400/15 via-yellow-500/[0.045] to-transparent p-8 text-center shadow-[0_20px_50px_-30px_rgb(234_179_8_/_0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-yellow-300/45 hover:shadow-[0_26px_56px_-32px_rgb(234_179_8_/_0.7)]">
                      <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-4 group-hover:animate-bounce" />
                      <h3 className="text-xl font-bold text-white mb-2">{event.title}</h3>
                      <p className="text-yellow-500 font-black text-2xl uppercase tracking-tighter">CHAMPION</p>
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
      <section className="relative overflow-hidden py-24">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10" />
        
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px w-9 bg-primary shadow-[0_0_12px_rgb(34_211_238_/_0.8)]" />
                <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-primary">Tournaments</span>
              </div>
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
                <EventCard key={event.id} event={event} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* News Section */}
      {news.length > 0 && (
        <section className="border-y border-white/[0.06] bg-white/[0.018] py-24 backdrop-blur-sm">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-primary shadow-[0_0_20px_-12px_rgb(34_211_238_/_0.85)]">
                  <Megaphone className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-display font-bold text-white">ข่าวสารล่าสุด</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {news.map((item) => (
                <Card key={item.id} className="group esports-panel esports-panel-interactive rounded-2xl border-white/[0.09] bg-zinc-900/55 p-6">
                  <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                    <Clock className="w-3 h-3" />
                    {item.createdAt?.toDate ? formatDate(item.createdAt.toDate().toISOString()) : "เมื่อเร็วๆ นี้"}
                  </div>
                  <h3 className="mb-3 line-clamp-2 font-display text-xl font-bold text-white transition-colors group-hover:text-primary">{item.title}</h3>
                  <p className="text-muted-foreground text-sm line-clamp-3 mb-6">{item.content}</p>
                  <div className="flex items-center justify-between border-t border-white/[0.07] pt-4">
                    <span className="text-xs text-white/40">โดย {item.author || "Admin"}</span>
                    <Button variant="ghost" size="sm" className="h-auto p-0 font-bold text-primary hover:bg-transparent hover:text-cyan-200">
                      อ่านต่อ <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
