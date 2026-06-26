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
        className={`group relative h-96 rounded-3xl overflow-hidden border bg-background transition-all ${
          !isOpen || isFull ? "border-red-500/50 opacity-90 shadow-lg shadow-red-500/10" : "border-white/10 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/20"
        }`}
      >
        <Link href={`/event/${event.id}`}>
          <div className="absolute inset-0 cursor-pointer">
            <img 
              src={event.bannerUrl || HERO_BG}
              alt={event.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
          </div>
        </Link>
        
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          {!isOpen ? (
            <div className="px-3 py-1.5 rounded-full bg-red-500/80 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
              <AlertCircle className="w-3 h-3" />
              ปิดรับสมัคร
            </div>
          ) : isFull ? (
            <div className="px-3 py-1.5 rounded-full bg-red-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
              <AlertCircle className="w-3 h-3" />
              เต็มแล้ว
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-full bg-green-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              เปิดรับสมัคร
            </div>
          )}
        </div>
        
        <div className="absolute bottom-0 left-0 p-8 w-full pointer-events-none">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-wider">
              {event.game}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-white/80 font-bold uppercase tracking-wider">
              <Calendar className="w-3 h-3 text-primary" /> {event.date}
            </span>
          </div>
          
          <h3 className="text-2xl font-display font-bold text-white mb-3 group-hover:text-primary transition-colors pointer-events-auto">
            <Link href={`/event/${event.id}`}>{event.title}</Link>
          </h3>
          
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2 text-sm bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
              <Users className="w-4 h-4 text-primary" />
              <span className={isFull ? "text-red-400 font-bold" : "text-white font-bold"}>
                {registeredCount}/{event.maxTeams || 16} ทีม
              </span>
            </div>
            {isOpen && !isFull && (
              <Link href={user ? `/event/${event.id}` : "/login"}>
                <Button size="sm" className="rounded-xl bg-primary hover:bg-primary/80 text-white font-bold px-4 pointer-events-auto shadow-lg shadow-primary/20">
                  สมัครเลย
                </Button>
              </Link>
            )}
            {(!isOpen || isFull) && (
              <Link href={`/event/${event.id}`}>
                <Button size="sm" variant="outline" className="rounded-xl border-white/20 hover:bg-white/5 text-white/60 font-bold px-4 pointer-events-auto">
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
    <div className="min-h-screen bg-[#0a0e17]">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden min-h-[80vh] flex items-center bg-gradient-to-br from-[#0a0e17] via-[#1a1f2e] to-[#0a0e17]">
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/10 opacity-50"></div>
        <div className="absolute inset-0 z-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)`
        }}></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold mb-6"
            >
              <Gamepad2 className="w-4 h-4" />
              WANGNAMYEN ESPORTS LEAGUE
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-display font-bold text-white mb-6 tracking-tight"
            >
              ยกระดับการแข่งขัน <br />
              <span className="text-primary">ESPORTS</span> ในวิทยาลัยเทคนิควังน้ำเย็น
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-muted-foreground mb-8 leading-relaxed"
            >
              แพลตฟอร์มจัดการแข่งขันอีสปอร์ตสำหรับนักเรียน/นักศึกษา วิทยาลัยเทคนิควังน้ำเย็น
              ติดตามสายการแข่งขัน ผลการแข่ง และทำเนียบแชมป์เปี้ยนได้ที่นี่
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <Link href="/bracket">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-white px-8 h-14 rounded-2xl text-lg font-bold">
                  ดูสายการแข่งขัน
                </Button>
              </Link>
              <Link href="/rules">
                <Button size="lg" variant="outline" className="border-white/10 hover:bg-white/5 px-8 h-14 rounded-2xl text-lg font-bold">
                  กฎการแข่งขัน
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Champions Section */}
      {champions.length > 0 && (
        <section className="py-20 bg-white/5">
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
                    <Card className="bg-gradient-to-br from-yellow-500/20 via-yellow-500/5 to-transparent border-yellow-500/30 p-8 rounded-3xl text-center cursor-pointer hover:scale-[1.02] transition-all group">
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
      <section className="py-24 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10" />
        
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-[2px] bg-primary" />
                <span className="text-primary font-bold uppercase tracking-widest text-xs">Tournaments</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-display font-bold text-white">การแข่งขันอีสปอร์ต</h2>
              <p className="text-muted-foreground mt-3 text-lg">รายการแข่งขันทั้งหมดของวิทยาลัยเทคนิควังน้ำเย็น</p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-96">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground animate-pulse">กำลังโหลดข้อมูลการแข่งขัน...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-24 bg-card/20 rounded-[3rem] border border-dashed border-white/10">
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
        <section className="py-24 bg-white/5 backdrop-blur-sm border-y border-white/5">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-primary/20 text-primary">
                  <Megaphone className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-display font-bold text-white">ข่าวสารล่าสุด</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {news.map((item) => (
                <Card key={item.id} className="bg-card/40 border-white/10 p-6 rounded-3xl hover:border-primary/30 transition-all group">
                  <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-widest mb-4">
                    <Clock className="w-3 h-3" />
                    {item.createdAt?.toDate ? formatDate(item.createdAt.toDate().toISOString()) : "เมื่อเร็วๆ นี้"}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-primary transition-colors line-clamp-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm line-clamp-3 mb-6">{item.content}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <span className="text-xs text-white/40">โดย {item.author || "Admin"}</span>
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 hover:bg-primary/10 p-0 h-auto font-bold">
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
