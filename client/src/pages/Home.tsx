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
import { SupportedGamesBanner } from "@/components/SupportedGamesBanner";
import { TournamentBracketBoard, type BracketMatchData, type BracketRoundData } from "@/components/TournamentBracketBoard";

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
  competitionStatus?: string;
  registeredTeams?: number;
  logoUrl?: string;
  championTeamId?: string | null;
}

interface TournamentMatch {
  id: string;
  eventId: string;
  round: string | number;
  group?: string;
  teamA: string;
  teamB: string;
  teamAName?: string;
  teamBName?: string;
  logoUrlA?: string;
  logoUrlB?: string;
  scoreA?: number;
  scoreB?: number;
  winsA?: number;
  winsB?: number;
  winner?: string | null;
  status?: string;
  createdAt?: { seconds?: number };
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

function getMatchWinner(match: TournamentMatch) {
  if (match.status !== "completed") return null;
  if (match.winner && [match.teamA, match.teamB].includes(match.winner)) return match.winner;

  if (match.winsA !== undefined && match.winsB !== undefined && match.winsA !== match.winsB) {
    return match.winsA > match.winsB ? match.teamA : match.teamB;
  }

  const scoreA = Number(match.scoreA ?? 0);
  const scoreB = Number(match.scoreB ?? 0);
  if (scoreA !== scoreB) return scoreA > scoreB ? match.teamA : match.teamB;
  return null;
}

function getRoundNumber(round: string | number) {
  const number = String(round).match(/\d+/)?.[0];
  return number ? Number(number) : 0;
}

function isThirdPlaceRound(round: string | number) {
  return /3rd|third|bronze|ชิง.*(?:อันดับ|ที่)\s*3|อันดับ\s*3/i.test(String(round));
}

function isSemifinalRound(round: string | number) {
  return /semi|รองชนะ|รอบรอง|4\s*ทีม/i.test(String(round));
}

function isFinalRound(round: string | number) {
  return !isThirdPlaceRound(round) && !isSemifinalRound(round) && /final|ชิงชนะเลิศ|ชิงแชมป์|รอบชิง/i.test(String(round));
}

function getTournamentPodium(event: Event, allMatches: TournamentMatch[]) {
  const championId = event.championTeamId || "";
  if (!championId) return { runnerUpIds: [] as string[], thirdPlaceIds: [] as string[] };

  const eventMatches = allMatches.filter((match) => match.eventId === event.id && match.teamA && match.teamB);
  const finalMatch = eventMatches.find((match) => isFinalRound(match.round) && [match.teamA, match.teamB].includes(championId))
    || eventMatches
      .filter((match) => [match.teamA, match.teamB].includes(championId))
      .sort((left, right) => getRoundNumber(right.round) - getRoundNumber(left.round))[0];
  const runnerUpId = finalMatch
    ? (finalMatch.teamA === championId ? finalMatch.teamB : finalMatch.teamA)
    : "";

  const thirdPlaceMatch = eventMatches.find((match) => isThirdPlaceRound(match.round) && match.status === "completed");
  const thirdPlaceWinner = thirdPlaceMatch ? getMatchWinner(thirdPlaceMatch) : null;
  if (thirdPlaceWinner && thirdPlaceWinner !== championId && thirdPlaceWinner !== runnerUpId) {
    return { runnerUpIds: runnerUpId ? [runnerUpId] : [], thirdPlaceIds: [thirdPlaceWinner] };
  }

  let semifinalMatches = eventMatches.filter((match) => isSemifinalRound(match.round));
  if (semifinalMatches.length === 0 && finalMatch) {
    const finalRoundNumber = getRoundNumber(finalMatch.round);
    if (finalRoundNumber > 1) {
      semifinalMatches = eventMatches.filter((match) =>
        getRoundNumber(match.round) === finalRoundNumber - 1,
      );
    }
  }

  const finalists = new Set([championId, runnerUpId].filter(Boolean));
  const relevantSemifinals = semifinalMatches.filter((match) => [match.teamA, match.teamB].some((teamId) => finalists.has(teamId)));
  const thirdPlaceIds = relevantSemifinals.length > 0 && relevantSemifinals.every((match) => match.status === "completed")
    ? Array.from(new Set(relevantSemifinals.flatMap((match) => {
      const winner = getMatchWinner(match);
      if (!winner || !finalists.has(winner)) return [];
      return [match.teamA === winner ? match.teamB : match.teamA];
    })))
    : [];

  return { runnerUpIds: runnerUpId ? [runnerUpId] : [], thirdPlaceIds };
}

function getEventBracketGroups(event: Event, allMatches: TournamentMatch[], teamMap: Record<string, { teamName: string; logoUrl?: string }>) {
  const eventMatches = allMatches.filter((match) => match.eventId === event.id && match.teamA && match.teamB);
  const byGroup = new Map<string, TournamentMatch[]>();
  eventMatches.forEach((match) => {
    const rawGroup = (match.group || "").trim();
    const group = !rawGroup || rawGroup.toLowerCase() === "all" || rawGroup.toLowerCase() === "general" ? "ทั่วไป" : rawGroup;
    byGroup.set(group, [...(byGroup.get(group) || []), match]);
  });

  return Array.from(byGroup.entries()).map(([group, groupMatches]) => {
    const byRound = new Map<string, TournamentMatch[]>();
    groupMatches.forEach((match) => {
      const key = String(match.round ?? "1").trim() || "1";
      byRound.set(key, [...(byRound.get(key) || []), match]);
    });

    const rounds: BracketRoundData[] = Array.from(byRound.entries())
      .sort(([left], [right]) => {
        const leftNumber = getRoundNumber(left);
        const rightNumber = getRoundNumber(right);
        if (leftNumber && rightNumber) return leftNumber - rightNumber;
        if (leftNumber) return -1;
        if (rightNumber) return 1;
        return left.localeCompare(right, "th", { numeric: true });
      })
      .map(([key, matches]) => ({
        key,
        title: /^\d+$/.test(key) ? `รอบ ${key}` : key,
        matches: matches.map((match): BracketMatchData => ({
          id: match.id,
          round: key,
          group,
          createdAt: match.createdAt,
          teamA: match.teamA,
          teamB: match.teamB,
          teamAName: teamMap[match.teamA]?.teamName || match.teamAName || match.teamA,
          teamBName: teamMap[match.teamB]?.teamName || match.teamBName || match.teamB,
          logoUrlA: teamMap[match.teamA]?.logoUrl || match.logoUrlA,
          logoUrlB: teamMap[match.teamB]?.logoUrl || match.logoUrlB,
          scoreA: Number(match.scoreA ?? 0),
          scoreB: Number(match.scoreB ?? 0),
          winsA: match.winsA,
          winsB: match.winsB,
          winner: match.winner,
          status: match.status === "completed" || match.status === "ongoing" ? match.status : "pending",
        })),
      }));

    return { key: group, title: group === "ทั่วไป" ? "สายการแข่งขัน" : `กลุ่ม ${group}`, rounds };
  });
}


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

  const isCompleted = event.competitionStatus === "completed" || Boolean(event.championTeamId);
  const isOpen = !isCompleted && (event.status === 'open' || (event.status !== 'closed' && !isExpired)) && !isFull;

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
        {isCompleted ? (
          <div className="rounded-md border border-emerald-300/20 bg-slate-950/85 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
            ตัดสินแล้ว
          </div>
        ) : !isOpen ? (
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
  const [championMatches, setChampionMatches] = useState<TournamentMatch[]>([]);
  const [expandedChampionId, setExpandedChampionId] = useState<string | null>(null);

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

  useEffect(() => {
    const eventIds = new Set(champions.map((event) => event.id));
    setChampionMatches((current) => current.filter((match) => eventIds.has(match.eventId)));
    if (champions.length === 0) return;

    let isCurrent = true;
    const unsubscribeMatches = champions.map((event) => {
      const matchesQuery = query(collection(db, "matches"), where("eventId", "==", event.id));
      return onSnapshot(matchesQuery, (snapshot) => {
        if (!isCurrent) return;
        const eventMatches = snapshot.docs.map((matchDoc) => ({
          id: matchDoc.id,
          ...matchDoc.data(),
        } as TournamentMatch));
        setChampionMatches((current) => [
          ...current.filter((match) => match.eventId !== event.id),
          ...eventMatches,
        ]);
      }, (error) => {
        console.error("Error loading champion bracket:", event.id, error);
        void fetch("/api/matches")
          .then((response) => response.ok ? response.json() as Promise<TournamentMatch[]> : [])
          .then((allMatches) => {
            if (!isCurrent) return;
            const eventMatches = allMatches.filter((match) => match.eventId === event.id);
            setChampionMatches((current) => [
              ...current.filter((match) => match.eventId !== event.id),
              ...eventMatches,
            ]);
          })
          .catch((fallbackError) => console.error("Unable to load champion bracket fallback:", fallbackError));
      });
    });

    return () => {
      isCurrent = false;
      unsubscribeMatches.forEach((unsubscribe) => unsubscribe());
    };
  }, [champions]);

  return (
    <div className="min-h-screen bg-transparent">

      <section className="relative flex min-h-[calc(86vh-4.5rem)] items-center border-b border-white/[0.06] overflow-hidden">

        <div className="absolute inset-0 z-0">
          <img
            src="/assets/Gemini_Generated_Image_pu625pu625pu625p.jpg"
            alt="ภาพประกอบเกมอีสปอร์ตสำหรับหน้าแรก"
            className="h-full w-full object-cover object-[25%_center] sm:object-center"
          />

          <div className="absolute inset-0 bg-slate-950/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/55 via-slate-950/25 to-transparent" />
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
              <span className="text-primary">ESPORTS</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6 sm:mb-8 max-w-xl text-sm sm:text-base leading-relaxed text-slate-300"
            >
              ระบบบริหารการจัดการแข่งขันอีสปอร์ต
              ติดตามสายการแข่งขัน ผลการแข่ง
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

      <SupportedGamesBanner />

      {champions.length > 0 && (
        <section className="border-y border-white/[0.06] bg-black/15 py-16 sm:py-20">
          <div className="w-full px-3 sm:px-5 lg:px-8">
            <div className="mb-8">
              <div className="mb-3 inline-flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-300" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200">Hall of Fame</span>
              </div>
              <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">ทำเนียบแชมเปี้ยน</h2>
              <p className="mt-2 text-sm text-muted-foreground">สรุปอันดับ 1–3 พร้อมเปิดดูสายการแข่งขันของแต่ละรายการ</p>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
              {champions.map((event) => {
                const champion = event.championTeamId ? teamMap[event.championTeamId] : undefined;
                const podium = getTournamentPodium(event, championMatches);
                const bracketGroups = getEventBracketGroups(event, championMatches, teamMap);
                const expanded = expandedChampionId === event.id;
                const placements = [
                  { label: "อันดับ 1", teamIds: event.championTeamId ? [event.championTeamId] : [], color: "border-amber-300/25 bg-amber-300/[0.05] text-amber-100" },
                  { label: "อันดับ 2", teamIds: podium.runnerUpIds, color: "border-slate-300/20 bg-white/[0.03] text-slate-100" },
                  { label: "อันดับ 3", teamIds: podium.thirdPlaceIds, color: "border-orange-300/20 bg-orange-300/[0.04] text-orange-100" },
                ];

                return (
                  <article key={event.id} className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950/80">
                    <Link href={`/event/${event.id}`}>
                      <div className="relative h-36 overflow-hidden">
                        <img
                          src={event.bannerUrl || DEFAULT_BANNER}
                          alt=""
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={(imageEvent) => {
                            imageEvent.currentTarget.onerror = null;
                            imageEvent.currentTarget.src = DEFAULT_BANNER;
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/40 to-zinc-950/10" />
                        <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md border border-amber-300/25 bg-zinc-950/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-100">
                          <Trophy className="h-3.5 w-3.5" /> แชมป์รายการ
                        </div>
                        {champion?.logoUrl && (
                          <img
                            src={champion.logoUrl}
                            alt={champion.teamName}
                            className="absolute bottom-3 right-3 h-12 w-12 rounded-lg border border-white/20 bg-zinc-900 object-cover"
                          />
                        )}
                      </div>
                    </Link>

                    <div className="p-4 sm:p-5">
                      <span className="rounded-md border border-primary/25 bg-slate-950/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                        {event.game}
                      </span>
                      <Link href={`/event/${event.id}`}>
                        <h3 className="mt-3 line-clamp-2 font-display text-xl font-bold text-white">{event.title}</h3>
                      </Link>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {placements.map((placement, placementIndex) => {
                          const placeTeams = placement.teamIds.map((id) => teamMap[id]).filter(Boolean);
                          const names = placeTeams.map((team) => team.teamName);
                          const leadTeam = placeTeams[0];

                          return (
                            <div key={placement.label} className={`flex min-h-[128px] min-w-0 flex-col items-center rounded-lg border px-2 py-2.5 text-center ${placement.color}`}>
                              <span className="text-[10px] font-bold tracking-wide">{placement.label}</span>
                              {leadTeam?.logoUrl ? (
                                <img src={leadTeam.logoUrl} alt="" className="mt-2 h-9 w-9 rounded-md border border-white/15 object-cover" />
                              ) : (
                                <span className="mt-2 flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/20 text-sm font-bold">
                                  {placementIndex + 1}
                                </span>
                              )}
                              <p className="mt-2 line-clamp-2 w-full text-[11px] font-semibold leading-snug" title={names.join(" / ") || undefined}>
                                {names.length ? names.join(" / ") : placementIndex === 0 ? "แชมป์รายการ" : "รอผลจากสายการแข่งขัน"}
                              </p>
                              {names.length > 1 && <span className="mt-1 text-[9px] text-slate-400">อันดับร่วม</span>}
                            </div>
                          );
                        })}
                      </div>

                      {event.date && <p className="mt-3 text-xs text-slate-500">แข่งขันเมื่อ {formatThaiDate(event.date)}</p>}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedChampionId(expanded ? null : event.id)}
                          aria-expanded={expanded}
                          className="rounded-md border border-primary/35 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-none active:transform-none"
                        >
                          {expanded ? "ซ่อนสายการแข่งขัน" : "แสดงสายการแข่งขัน"}
                        </button>
                        <Link
                          href={`/bracket?category=completed&eventId=${encodeURIComponent(event.id)}`}
                          className="inline-flex items-center gap-1 rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200"
                        >
                          ดูสายเต็มหน้า <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      {expanded && (
                        <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
                          {bracketGroups.length > 0 ? bracketGroups.map((group) => (
                            <section key={group.key} aria-label={group.title}>
                              <h4 className="mb-2 text-sm font-semibold text-white">{group.title}</h4>
                              <TournamentBracketBoard rounds={group.rounds} registrations={[]} onTeamClick={() => undefined} />
                            </section>
                          )) : (
                            <p className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-4 text-center text-sm text-slate-400">
                              ยังไม่มีแมตช์ให้แสดงในสายการแข่งขัน
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
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
              <p className="text-muted-foreground mt-3 text-lg">รายการแข่งขันทั้งหมด</p>
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
