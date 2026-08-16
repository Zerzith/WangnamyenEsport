import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, CalendarDays, UserRound } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatThaiDateTime } from "@/lib/date";
import { Button } from "@/components/ui/button";

const DEFAULT_NEWS_IMG =
  "https://images.unsplash.com/photo-1552820728-8ac41f1ce891?q=80&w=2070&auto=format&fit=crop";

const formatDate = (value?: any) => {
  try {
    if (!value) return "";
    if (value?.toDate) return formatThaiDateTime(value.toDate().toISOString());
    return formatThaiDateTime(String(value));
  } catch {
    return "";
  }
};

export default function NewsDetail() {
  const params = useParams<{ id: string }>();
  const [news, setNews] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let mounted = true;
    getDoc(doc(db, "news", params.id))
      .then((snap) => {
        if (mounted) {
          if (snap.exists()) {
            setNews({ id: snap.id, ...snap.data() });
          } else {
            setNotFound(true);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setNotFound(true);
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [params.id]);

  return (
    <div className="min-h-screen bg-transparent">
      <section className="border-b border-white/[0.06] bg-black/15 py-10">
        <div className="w-full px-4 sm:px-6 lg:px-10">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
            <ArrowLeft className="h-4 w-4" />
            กลับหน้าแรก
          </Link>
        </div>
      </section>

      <section className="py-10 md:py-16">
        <div className="w-full px-4 sm:px-6 lg:px-10">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-96">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground animate-pulse">กำลังโหลดข่าวสาร...</p>
            </div>
          ) : notFound || !news ? (
            <div className="mx-auto max-w-3xl border border-dashed border-white/15 bg-zinc-900/35 py-24 text-center">
              <h3 className="text-2xl font-bold text-white/40">ไม่พบข่าวสาร</h3>
              <p className="text-muted-foreground mt-2">ข่าวนี้อาจถูกลบไปแล้วหรือไม่มีอยู่จริง</p>
              <div className="mt-6">
                <Link href="/">
                  <Button variant="outline" className="rounded-md border-white/15 bg-transparent px-4 font-bold text-white hover:border-primary/35 hover:text-primary">
                    กลับหน้าแรก
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {news.imageUrl ? (
                  <div className="mb-10 overflow-hidden rounded-2xl border border-white/[0.09]">
                    <img
                      src={news.imageUrl}
                      alt={news.title}
                      className="h-56 w-full object-cover md:h-80"
                    />
                  </div>
                ) : (
                  <div
                    className="mb-10 flex h-56 items-end overflow-hidden rounded-2xl border border-white/[0.09] md:h-80"
                    style={{
                      backgroundImage: `linear-gradient(to top, rgb(2 6 23 / 0.85), rgb(2 6 23 / 0.2)), url(${DEFAULT_NEWS_IMG})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <div className="p-6">
                      <span className="inline-flex items-center gap-2 rounded-md border border-primary/25 bg-slate-950/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                        ข่าวสาร
                      </span>
                    </div>
                  </div>
                )}

                <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDate(news.createdAt) || "เมื่อเร็วๆ นี้"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-slate-400">
                    <UserRound className="h-3.5 w-3.5" />
                    โดย {news.author || "Admin"}
                  </span>
                </div>

                <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl">
                  {news.title}
                </h1>

                <div className="mt-8 border-t border-white/[0.08] pt-8">
                  <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-200 md:text-lg">
                    {news.content}
                  </p>
                </div>

                <div className="mt-10 flex items-center justify-between border-t border-white/[0.08] pt-6">
                  <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                    <ArrowLeft className="h-4 w-4" />
                    ข่าวสารทั้งหมด
                  </Link>
                  <span className="text-xs text-white/40">WangNamYen Esports</span>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
