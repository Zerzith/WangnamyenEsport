import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { ArrowRight, Trophy, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, memo } from "react";
import { collection, onSnapshot, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatThaiDate, formatThaiDateTime } from "@/lib/date";
import { SupportedGamesBanner } from "@/components/SupportedGamesBanner";
import { TournamentBracketBoard, type BracketMatchData, type BracketRoundData } from "@/components/TournamentBracketBoard";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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


const EventCard = memo(({ event, registeredCount, user }: {
  event: Event;
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
  const statusLabel = isCompleted ? "ตัดสินแล้ว" : isFull ? "เต็มแล้ว" : isOpen ? "เปิดรับสมัคร" : "ปิดรับสมัคร";
  const statusColor = isCompleted ? "text-emerald-300" : isFull ? "text-amber-200" : isOpen ? "text-primary" : "text-slate-400";

  return (
    <article className="flex h-full flex-col overflow-hidden border border-white/10 bg-card transition-colors duration-150 hover:border-white/20">
      <Link href={`/event/${event.id}`} className="group block">
        <div className="relative aspect-[16/9] overflow-hidden bg-slate-950">
          <img
            src={event.bannerUrl || HERO_BG}
            alt={`${event.game} — ${event.title}`}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = HERO_BG;
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/70 to-transparent" />
          <span className="absolute bottom-3 left-3 border-l-2 border-primary bg-slate-950/85 px-2.5 py-1 text-xs font-semibold text-white">
            {event.game}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <span className={`inline-flex items-center gap-2 text-xs font-semibold ${statusColor}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {statusLabel}
          </span>
          {event.date && <span className="text-xs text-slate-400">เริ่ม {formatThaiDate(event.date)}</span>}
        </div>

        <h3 className="mt-3 line-clamp-2 min-h-[3.5rem] font-display text-xl font-bold leading-snug text-white">
          <Link href={`/event/${event.id}`} className="hover:text-primary">{event.title}</Link>
        </h3>

        <div className="mt-4 grid grid-cols-2 border-y border-white/10 py-3">
          <div>
            <p className="text-[11px] text-slate-400">ทีมที่สมัคร</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-white">{registeredCount} / {event.maxTeams || 16} ทีม</p>
          </div>
          <div className="border-l border-white/10 pl-4">
            <p className="text-[11px] text-slate-400">ผู้เล่นต่อทีม</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {event.membersPerTeam || 5} หลัก{event.maxSubstitutes ? ` + ${event.maxSubstitutes} สำรอง` : ""}
            </p>
          </div>
        </div>

        {event.registrationDeadline && (
          <p className="mt-3 text-xs text-slate-400">ปิดรับสมัคร {formatThaiDateTime(event.registrationDeadline)}</p>
        )}

        <div className="mt-auto flex gap-2 pt-4">
          {isOpen && (
            <Link
              href={user ? `/event/${event.id}` : "/login"}
              className="inline-flex min-h-10 flex-1 items-center justify-center rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground hover:bg-primary/90"
            >
              สมัครแข่งขัน
            </Link>
          )}
          <Link
            href={`/event/${event.id}`}
            className={`inline-flex min-h-10 flex-1 items-center justify-center rounded-md px-3 text-sm font-semibold ${
              isOpen ? "border border-white/15 text-white hover:border-white/30" : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            ดูรายละเอียด
          </Link>
        </div>
      </div>
    </article>
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

  const expandedChampion = champions.find((event) => event.id === expandedChampionId) || null;
  const expandedChampionBracketGroups = expandedChampion
    ? getEventBracketGroups(expandedChampion, championMatches, teamMap)
    : [];

  return (
    <div className="min-h-screen bg-transparent">

      <section className="relative isolate flex min-h-[calc(86vh-4.5rem)] items-center overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 z-0">
          <img
            src="/assets/Gemini_Generated_Image_pu625pu625pu625p.jpg"
            alt="ภาพบรรยากาศการแข่งขันอีสปอร์ต"
            className="h-full w-full object-cover object-[25%_center] sm:object-center"
          />
          <div className="absolute inset-0 bg-slate-950/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/65 via-slate-950/35 to-slate-950/10" />
        </div>

        <div className="relative z-10 w-full px-3 py-14 sm:px-4 lg:px-5 xl:px-6">
          <div className="max-w-3xl">
            <p className="mb-5 flex items-center gap-3 text-sm font-medium text-slate-300">
              <span className="h-px w-8 bg-primary" />
              ระบบบริหารการจัดการแข่งขันอีสปอร์ต
            </p>
            <h1 className="max-w-xl font-display text-4xl font-bold leading-[1.2] tracking-tight text-white sm:text-5xl lg:text-[3.5rem]">
              การแข่งขันอีสปอร์ต
              <span className="mt-1 block text-primary">จัดการได้ในที่เดียว</span>
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-slate-300 sm:text-base">
              สมัครทีม ดูสายการแข่งขัน ติดตามผล ข่าวสาร และการถ่ายทอดสด ผ่านระบบเดียวที่ออกแบบมาสำหรับผู้จัด ผู้เข้าแข่งขัน และผู้ชม
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/bracket"
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
              >
                ดูสายการแข่งขัน
              </Link>
              <Link
                href="/events"
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/20 px-5 text-sm font-semibold text-white hover:border-white/40"
              >
                รายการแข่งขัน
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SupportedGamesBanner />

      {champions.length > 0 && (
        <section className="border-b border-white/10 bg-secondary/70 py-14 sm:py-16">
          <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6">
            <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-2 text-sm font-medium text-amber-200">ผลการแข่งขัน</p>
                <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">ทำเนียบแชมเปี้ยน</h2>
                <p className="mt-2 text-sm text-muted-foreground">อันดับ 1–3 และสายการแข่งขันของแต่ละรายการ</p>
              </div>
              <Link href="/bracket?category=completed" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white">
                ผลการแข่งขันทั้งหมด <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {champions.map((event) => {
                const champion = event.championTeamId ? teamMap[event.championTeamId] : undefined;
                const podium = getTournamentPodium(event, championMatches);
                const expanded = expandedChampionId === event.id;
                const placements = [
                  { label: "อันดับ 1", teamIds: event.championTeamId ? [event.championTeamId] : [], color: "border-amber-300/25 bg-amber-300/[0.05] text-amber-100" },
                  { label: "อันดับ 2", teamIds: podium.runnerUpIds, color: "border-slate-300/20 bg-white/[0.03] text-slate-100" },
                  { label: "อันดับ 3", teamIds: podium.thirdPlaceIds, color: "border-orange-300/20 bg-orange-300/[0.04] text-orange-100" },
                ];

                return (
                  <article key={event.id} className="overflow-hidden rounded-lg border border-white/10 bg-card">
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
                          onClick={() => setExpandedChampionId(event.id)}
                          aria-expanded={expanded}
                          className="rounded-md border border-primary/35 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-none active:transform-none"
                        >
                          แสดงสายการแข่งขัน
                        </button>
                        <Link
                          href={`/bracket?category=completed&eventId=${encodeURIComponent(event.id)}`}
                          className="inline-flex items-center gap-1 rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200"
                        >
                          ดูสายเต็มหน้า <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                    </div>
                  </article>
                );
              })}
            </div>

            {expandedChampion && (
              <Sheet open={Boolean(expandedChampion)} onOpenChange={(open) => { if (!open) setExpandedChampionId(null); }}>
                <SheetContent
                  side="right"
                  className="flex h-full w-full flex-col gap-0 overflow-hidden border-l border-white/10 bg-background p-0 text-white sm:w-[88vw] sm:max-w-6xl"
                >
                  <SheetHeader className="shrink-0 border-b border-white/10 py-4 pl-5 pr-14 text-left sm:py-5 sm:pl-6">
                    <SheetTitle className="text-left text-white">สายการแข่งขัน</SheetTitle>
                    <SheetDescription className="text-left text-slate-300">
                      {expandedChampion.title} · {expandedChampion.game}
                    </SheetDescription>
                  </SheetHeader>

                  <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-6">
                    {expandedChampionBracketGroups.length > 0 ? (
                      <div className="space-y-6">
                        {expandedChampionBracketGroups.map((group) => (
                          <section key={group.key} aria-label={group.title} className="min-w-0">
                            <h3 className="mb-3 text-sm font-semibold text-white">{group.title}</h3>
                            <TournamentBracketBoard rounds={group.rounds} registrations={[]} onTeamClick={() => undefined} />
                          </section>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-lg border border-white/10 bg-zinc-900 px-4 py-8 text-center text-sm text-slate-400">
                        ยังไม่มีแมตช์ให้แสดงในสายการแข่งขัน
                      </p>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </section>
      )}


      <section className="border-b border-white/10 py-14 sm:py-16">
        <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-sm font-medium text-primary">รายการแข่งขัน</p>
              <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">เลือกการแข่งขันที่สนใจ</h2>
              <p className="mt-2 text-sm text-muted-foreground">ดูสถานะการรับสมัคร จำนวนทีม และกำหนดการแข่งขัน</p>
            </div>
            <Link href="/events" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white">
              ดูรายการทั้งหมด <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex min-h-64 flex-col items-center justify-center">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">กำลังโหลดข้อมูลการแข่งขัน...</p>
            </div>
          ) : events.length === 0 ? (
                    <div className="border border-dashed border-white/15 bg-card px-5 py-14 text-center">
              <Trophy className="mx-auto mb-4 h-10 w-10 text-slate-500" />
              <h3 className="text-xl font-bold text-white">ยังไม่มีรายการแข่งขัน</h3>
              <p className="mt-2 text-sm text-muted-foreground">โปรดติดตามข่าวสารสำหรับกำหนดการแข่งขันครั้งถัดไป</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 lg:gap-5">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  registeredCount={registrationCounts[event.id] ?? (event.registeredTeams || 0)}
                  user={user}
                />
              ))}
            </div>
          )}
        </div>
      </section>


      {news.length > 0 && (
        <section className="bg-secondary/60 py-14 sm:py-16">
          <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6">
            <div className="mb-8">
              <p className="mb-2 text-sm font-medium text-primary">อัปเดตจากผู้จัด</p>
              <h2 className="text-3xl font-display font-bold text-white sm:text-4xl">ข่าวสารล่าสุด</h2>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 2xl:grid-cols-4 lg:gap-5">
              {news.map((item) => (
                <Link key={item.id} href={`/news/${item.id}`} className="block h-full">
                  <Card className="group h-full overflow-hidden rounded-lg border border-white/10 bg-card transition-colors duration-150 hover:border-white/25">
                  {item.imageUrl && (
                    <div className="w-full aspect-[16/9] overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.parentElement?.remove();
                        }}
                      />
                    </div>
                  )}
                  <div className="p-4 sm:p-5">
                  <div className="mb-3 text-xs text-slate-400">
                    {item.createdAt?.toDate ? formatDate(item.createdAt.toDate().toISOString()) : "เมื่อเร็วๆ นี้"}
                  </div>
                  <h3 className="mb-4 line-clamp-2 font-display text-lg font-bold leading-snug text-white group-hover:text-primary">{item.title}</h3>
                  <div className="flex items-center justify-between border-t border-white/10 pt-3">
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
