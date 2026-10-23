import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { CalendarDays, CheckCircle2, Clock3, Gamepad2, Loader2, Swords, Trophy } from "lucide-react";
import { TeamMembersModal } from "@/components/TeamMembersModal";
import { TournamentBracketBoard, type BracketMatchData, type BracketRoundData, type BracketTeamData } from "@/components/TournamentBracketBoard";
import { db } from "@/lib/firebase";
import { formatThaiDate } from "@/lib/date";

interface Tournament {
  id: string;
  title: string;
  game: string;
  status?: string;
  date?: string;
  bannerUrl?: string;
  championTeamId?: string | null;
}

type TeamRegistration = BracketTeamData;

type TournamentCategory = "ongoing" | "completed" | "upcoming" | "champions";

const CATEGORY_OPTIONS: Array<{ id: TournamentCategory; label: string; icon: typeof Swords }> = [
  { id: "ongoing", label: "กำลังแข่ง", icon: Swords },
  { id: "completed", label: "ตัดสินแล้ว", icon: CheckCircle2 },
  { id: "upcoming", label: "ยังไม่เริ่มแข่ง", icon: Clock3 },
  { id: "champions", label: "แชมเปี้ยน", icon: Trophy },
];
const DEFAULT_CATEGORY_PRIORITY: TournamentCategory[] = ["ongoing", "upcoming", "completed", "champions"];

const DEFAULT_BANNER = "/assets/valorant-banner.png";
const teamDataCache: Record<string, { teamName: string; logoUrl?: string }> = {};

function getGameBanner(game?: string) {
  const normalized = (game || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (normalized.includes("freefire")) return "/assets/freefire-banner.png";
  if (normalized.includes("valorant")) return "/assets/valorant-banner.png";
  if (normalized.includes("rov") || normalized.includes("arenaofvalor")) return "/assets/rov-banner.png";
  return null;
}

function getTournamentProgress(tournament: Tournament, statusesByEvent: Record<string, string[]>): Exclude<TournamentCategory, "champions"> {
  const statuses = statusesByEvent[tournament.id] || [];
  if (statuses.length > 0 && statuses.every((status) => status === "completed")) return "completed";
  if (statuses.some((status) => status === "ongoing" || status === "completed")) return "ongoing";
  return "upcoming";
}

function getCategoryLabel(category: Exclude<TournamentCategory, "champions">) {
  if (category === "ongoing") return "กำลังแข่ง";
  if (category === "completed") return "ตัดสินแล้ว";
  return "ยังไม่เริ่มแข่ง";
}

function normalizeGroup(group?: string) {
  const value = (group || "").trim();
  if (!value || value.toLowerCase() === "all" || value.toLowerCase() === "general") return "ทั่วไป";
  return value;
}

function getGroupLabel(group: string) {
  return group === "ทั่วไป" ? group : `กลุ่ม ${group}`;
}

function getRoundTitle(round: string) {
  return /^\d+$/.test(round) ? `รอบ ${round}` : round;
}

async function fetchTeamData(teamId: string) {
  if (!teamId || teamId === "TBD") return null;
  if (teamDataCache[teamId]) return teamDataCache[teamId];

  try {
    const teamDoc = await getDoc(doc(db, "registrations", teamId));
    if (!teamDoc.exists()) return null;
    const data = teamDoc.data() as { teamName?: string; name?: string; logoUrl?: string };
    const result = { teamName: data.teamName || data.name || teamId, logoUrl: data.logoUrl };
    teamDataCache[teamId] = result;
    return result;
  } catch (error) {
    console.error("Error fetching bracket team:", teamId, error);
    return null;
  }
}

async function fetchMatchStatusesFromApi() {
  const response = await fetch("/api/matches");
  if (!response.ok) throw new Error(`Unable to load matches: ${response.status}`);

  const matchRows = await response.json() as Array<{ eventId?: string; status?: string }>;
  const nextStatuses: Record<string, string[]> = {};
  matchRows.forEach((match) => {
    if (!match.eventId) return;
    nextStatuses[match.eventId] ||= [];
    nextStatuses[match.eventId].push(String(match.status || "pending"));
  });
  return nextStatuses;
}

export default function Bracket() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<TournamentCategory | null>(null);
  const [matches, setMatches] = useState<BracketMatchData[]>([]);
  const [statusesByEvent, setStatusesByEvent] = useState<Record<string, string[]>>({});
  const [championTeams, setChampionTeams] = useState<Record<string, { teamName: string; logoUrl?: string }>>({});
  const [registrations, setRegistrations] = useState<TeamRegistration[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<TeamRegistration | null>(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [matchesLoading, setMatchesLoading] = useState(false);

  const categoryCounts = useMemo(() => ({
    ongoing: tournaments.filter((tournament) => getTournamentProgress(tournament, statusesByEvent) === "ongoing").length,
    completed: tournaments.filter((tournament) => getTournamentProgress(tournament, statusesByEvent) === "completed").length,
    upcoming: tournaments.filter((tournament) => getTournamentProgress(tournament, statusesByEvent) === "upcoming").length,
    champions: tournaments.filter((tournament) => Boolean(tournament.championTeamId)).length,
  }), [tournaments, statusesByEvent]);

  const activeCategory = selectedCategory ?? DEFAULT_CATEGORY_PRIORITY.find((category) => categoryCounts[category] > 0) ?? "upcoming";

  const filteredTournaments = useMemo(() => {
    if (activeCategory === "champions") return tournaments.filter((tournament) => Boolean(tournament.championTeamId));
    return tournaments.filter((tournament) => getTournamentProgress(tournament, statusesByEvent) === activeCategory);
  }, [activeCategory, tournaments, statusesByEvent]);

  const championIds = useMemo(
    () => Array.from(new Set(tournaments.map((tournament) => tournament.championTeamId).filter((id): id is string => Boolean(id)))),
    [tournaments],
  );

  const selectedTournament = filteredTournaments.find((tournament) => tournament.id === selectedTournamentId)
    || filteredTournaments[0]
    || null;

  const matchGroups = useMemo(() => Array.from(new Set(matches.map((match) => normalizeGroup(match.group)))), [matches]);

  const visibleMatches = useMemo(
    () => matches.filter((match) => normalizeGroup(match.group) === selectedGroup),
    [matches, selectedGroup],
  );

  const rounds = useMemo<BracketRoundData[]>(() => {
    const grouped = new Map<string, BracketMatchData[]>();
    visibleMatches.forEach((match) => {
      const key = String(match.round ?? "1").trim() || "1";
      const roundMatches = grouped.get(key) || [];
      roundMatches.push(match);
      grouped.set(key, roundMatches);
    });

    return Array.from(grouped.entries())
      .sort(([left], [right]) => {
        const leftNumber = Number.parseInt(left, 10);
        const rightNumber = Number.parseInt(right, 10);
        if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) return leftNumber - rightNumber;
        if (Number.isFinite(leftNumber)) return -1;
        if (Number.isFinite(rightNumber)) return 1;
        return left.localeCompare(right, "th", { numeric: true });
      })
      .map(([key, roundMatches]) => ({ key, title: getRoundTitle(key), matches: roundMatches }));
  }, [visibleMatches]);

  useEffect(() => {
    const eventsQuery = query(collection(db, "events"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      setTournaments(snapshot.docs.map((eventDoc) => ({ id: eventDoc.id, ...eventDoc.data() } as Tournament)));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching tournaments:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "matches"), (snapshot) => {
      const nextStatuses: Record<string, string[]> = {};
      snapshot.docs.forEach((matchDoc) => {
        const data = matchDoc.data();
        if (!data.eventId) return;
        const eventId = String(data.eventId);
        nextStatuses[eventId] ||= [];
        nextStatuses[eventId].push(String(data.status || "pending"));
      });
      setStatusesByEvent(nextStatuses);
    }, (error) => {
      console.error("Error fetching tournament status categories:", error);
      void fetchMatchStatusesFromApi()
        .then(setStatusesByEvent)
        .catch((fallbackError) => console.error("Unable to load match status fallback:", fallbackError));
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!filteredTournaments.length) {
      setSelectedTournamentId("");
      return;
    }
    setSelectedTournamentId((current) => filteredTournaments.some((tournament) => tournament.id === current)
      ? current
      : filteredTournaments[0].id);
  }, [filteredTournaments]);

  useEffect(() => {
    if (!selectedTournament?.id) {
      setMatches([]);
      setRegistrations([]);
      setMatchesLoading(false);
      return;
    }

    let isCurrent = true;
    setMatches([]);
    setRegistrations([]);
    setMatchesLoading(true);

    const registrationsQuery = query(
      collection(db, "registrations"),
      where("eventId", "==", selectedTournament.id),
      where("status", "==", "approved"),
    );
    const unsubscribeRegistrations = onSnapshot(registrationsQuery, (snapshot) => {
      if (!isCurrent) return;
      setRegistrations(snapshot.docs.map((registrationDoc) => ({
        id: registrationDoc.id,
        ...registrationDoc.data(),
      } as TeamRegistration)));
    }, (error) => {
      console.error("Error fetching registered teams:", error);
    });

    const matchesQuery = query(collection(db, "matches"), where("eventId", "==", selectedTournament.id));
    const unsubscribeMatches = onSnapshot(matchesQuery, async (snapshot) => {
      const matchesData = snapshot.docs
        .map((matchDoc) => ({ id: matchDoc.id, ...matchDoc.data() } as BracketMatchData))
        .sort((left, right) => {
          const leftTime = left.createdAt?.seconds || 0;
          const rightTime = right.createdAt?.seconds || 0;
          return leftTime - rightTime;
        });

      try {
        const matchesWithTeams = await Promise.all(matchesData.map(async (match) => {
          const [teamA, teamB] = await Promise.all([fetchTeamData(match.teamA), fetchTeamData(match.teamB)]);
          return {
            ...match,
            teamAName: teamA?.teamName || match.teamAName || match.teamA || "รอทีม",
            teamBName: teamB?.teamName || match.teamBName || match.teamB || "รอทีม",
            logoUrlA: teamA?.logoUrl || match.logoUrlA,
            logoUrlB: teamB?.logoUrl || match.logoUrlB,
          };
        }));
        if (isCurrent) setMatches(matchesWithTeams);
      } catch (error) {
        console.error("Error loading bracket matches:", error);
        if (isCurrent) setMatches(matchesData);
      } finally {
        if (isCurrent) setMatchesLoading(false);
      }
    }, (error) => {
      console.error("Error fetching bracket matches:", error);
      if (isCurrent) setMatchesLoading(false);
    });

    return () => {
      isCurrent = false;
      unsubscribeRegistrations();
      unsubscribeMatches();
    };
  }, [selectedTournament?.id]);

  useEffect(() => {
    setSelectedGroup((current) => matchGroups.includes(current) ? current : (matchGroups[0] || ""));
  }, [matchGroups]);

  useEffect(() => {
    if (championIds.length === 0) {
      setChampionTeams({});
      return;
    }

    let isCurrent = true;
    void Promise.all(championIds.map(async (id) => [id, await fetchTeamData(id)] as const))
      .then((entries) => {
        if (!isCurrent) return;
        const nextTeams: Record<string, { teamName: string; logoUrl?: string }> = {};
        entries.forEach(([id, team]) => {
          if (team) nextTeams[id] = team;
        });
        setChampionTeams(nextTeams);
      })
      .catch((error) => console.error("Error loading champion teams:", error));

    return () => {
      isCurrent = false;
    };
  }, [championIds]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <Loader2 className="h-8 w-8 text-primary" />
        <p className="text-sm text-slate-400">กำลังโหลดรายการแข่งขัน...</p>
      </div>
    );
  }

  const activeCategoryLabel = CATEGORY_OPTIONS.find((category) => category.id === activeCategory)?.label || "รายการแข่งขัน";
  const categoryIcon = CATEGORY_OPTIONS.find((category) => category.id === activeCategory)?.icon || Trophy;
  const CategoryIcon = categoryIcon;
  const selectedTournamentProgress = selectedTournament
    ? getTournamentProgress(selectedTournament, statusesByEvent)
    : "upcoming";
  const champion = selectedTournament?.championTeamId
    ? registrations.find((registration) => registration.id === selectedTournament.championTeamId)
      || championTeams[selectedTournament.championTeamId]
    : undefined;
  const bannerUrl = selectedTournament
    ? getGameBanner(selectedTournament.game) || selectedTournament.bannerUrl || DEFAULT_BANNER
    : DEFAULT_BANNER;

  return (
    <main className="min-h-screen bg-transparent">
      <div className="mx-auto w-full max-w-[1440px] px-3 py-7 sm:px-5 sm:py-9 lg:px-8">
        <header className="mb-6">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-primary">Wangnamyen Esports</p>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">สายการแข่งขัน</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            เลือกรายการเพื่อดูผังการแข่งขัน ผลแต่ละรอบ และทีมที่ผ่านเข้าสู่รอบถัดไป
          </p>
        </header>

        <section aria-label="หมวดหมู่รายการแข่งขัน" className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CATEGORY_OPTIONS.map(({ id, label, icon: Icon }) => {
            const isSelected = activeCategory === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedCategory(id)}
                aria-pressed={isSelected}
                className={`flex min-h-[68px] items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left ${
                  isSelected
                    ? "border-primary/50 bg-primary/10 text-white"
                    : "border-white/10 bg-zinc-900 text-slate-300"
                } transition-none active:transform-none`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon className={`h-4 w-4 shrink-0 ${isSelected ? "text-primary" : "text-slate-400"}`} />
                  <span className="text-xs font-semibold leading-snug sm:text-sm">{label}</span>
                </span>
                <span className="shrink-0 rounded-md bg-black/20 px-2 py-1 text-xs tabular-nums text-slate-300">
                  {categoryCounts[id]}
                </span>
              </button>
            );
          })}
        </section>

        {activeCategory === "champions" && filteredTournaments.length > 0 && (
          <section className="mb-6" aria-label="ทำเนียบแชมเปี้ยน">
            <header className="mb-3">
              <div className="mb-1 flex items-center gap-2 text-amber-200">
                <Trophy className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.12em]">Hall of Champions</span>
              </div>
              <h2 className="text-xl font-bold text-white sm:text-2xl">ทำเนียบแชมเปี้ยน</h2>
              <p className="mt-1 text-sm text-slate-400">รวมทีมผู้ชนะของแต่ละรายการ เลือกการ์ดเพื่อดูสายการแข่งขัน</p>
            </header>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredTournaments.map((tournament) => {
                const championId = tournament.championTeamId || "";
                const championTeam = championTeams[championId];
                const selected = selectedTournament?.id === tournament.id;
                const image = getGameBanner(tournament.game) || tournament.bannerUrl || DEFAULT_BANNER;

                return (
                  <button
                    key={tournament.id}
                    type="button"
                    onClick={() => setSelectedTournamentId(tournament.id)}
                    aria-pressed={selected}
                    className={`overflow-hidden rounded-xl border bg-zinc-950 text-left transition-none active:transform-none ${
                      selected ? "border-primary/60" : "border-white/10"
                    }`}
                  >
                    <div className="relative h-32 overflow-hidden sm:h-36">
                      <img
                        src={image}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = tournament.bannerUrl || DEFAULT_BANNER;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/35 to-zinc-950/20" />
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md border border-amber-200/25 bg-zinc-950/80 px-2.5 py-1 text-[11px] font-semibold text-amber-100">
                        <Trophy className="h-3.5 w-3.5" /> แชมป์รายการ
                      </span>
                      {championTeam?.logoUrl ? (
                        <img
                          src={championTeam.logoUrl}
                          alt=""
                          className="absolute bottom-3 right-3 h-12 w-12 rounded-lg border border-white/20 bg-zinc-900 object-cover"
                        />
                      ) : (
                        <span className="absolute bottom-3 right-3 flex h-12 w-12 items-center justify-center rounded-lg border border-white/20 bg-zinc-900/90">
                          <Trophy className="h-5 w-5 text-amber-200" />
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="mb-1 text-xs font-semibold text-primary">{tournament.game || "เกมแข่งขัน"}</p>
                      <h3 className="line-clamp-2 font-bold leading-snug text-white">{tournament.title}</h3>
                      <p className="mt-2 truncate text-sm text-slate-300">
                        ทีมแชมป์: <span className="font-bold text-amber-100">{championTeam?.teamName || "กำลังโหลดข้อมูลทีม"}</span>
                      </p>
                      {tournament.date && <p className="mt-1 text-xs text-slate-500">{formatThaiDate(tournament.date)}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {filteredTournaments.length === 0 ? (
          <section className="rounded-xl border border-white/10 bg-zinc-950/70 px-5 py-12 text-center">
            <CategoryIcon className="mx-auto mb-3 h-9 w-9 text-slate-500" />
            <h2 className="text-lg font-semibold text-white">ไม่มีรายการในหมวด{activeCategoryLabel}ในขณะนี้</h2>
            <p className="mt-2 text-sm text-slate-400">เลือกหมวดหมู่อื่นเพื่อดูรายการและสายการแข่งขัน</p>
          </section>
        ) : selectedTournament ? (
          <>
            {activeCategory !== "champions" && (
              <section className="mb-5 rounded-xl border border-white/10 bg-zinc-950/80 p-3 sm:p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="bracket-tournament" className="text-sm font-semibold text-white">เลือกรายการแข่งขัน</label>
                  <span className="text-xs text-slate-400">{filteredTournaments.length} รายการในหมวดนี้</span>
                </div>
                <select
                  id="bracket-tournament"
                  value={selectedTournament.id}
                  onChange={(event) => setSelectedTournamentId(event.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-zinc-900 px-3 py-3 text-sm text-white outline-none focus:border-primary [color-scheme:dark]"
                >
                  {filteredTournaments.map((tournament) => (
                    <option key={tournament.id} value={tournament.id}>
                      {tournament.title} · {tournament.game}
                    </option>
                  ))}
                </select>
              </section>
            )}

            <section className="relative mb-5 min-h-[190px] overflow-hidden rounded-xl border border-white/10 bg-zinc-900 sm:min-h-[220px]">
              <img
                src={bannerUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = selectedTournament.bannerUrl || DEFAULT_BANNER;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/75 to-zinc-950/25" />
              <div className="relative flex min-h-[190px] flex-col justify-between gap-5 p-4 sm:min-h-[220px] sm:p-6 lg:flex-row lg:items-end">
                <div className="max-w-3xl">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-zinc-950/75 px-2.5 py-1 text-xs font-semibold text-white">
                      <Gamepad2 className="h-3.5 w-3.5 text-primary" />
                      {selectedTournament.game || "เกมแข่งขัน"}
                    </span>
                    <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                      selectedTournamentProgress === "ongoing"
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : selectedTournamentProgress === "completed"
                          ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                          : "border-white/15 bg-zinc-950/70 text-slate-200"
                    }`}>
                      {getCategoryLabel(selectedTournamentProgress)}
                    </span>
                    {selectedTournament.championTeamId && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-amber-300/25 bg-zinc-950/75 px-2.5 py-1 text-xs font-semibold text-amber-200">
                        <Trophy className="h-3.5 w-3.5" /> แชมเปี้ยน
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold leading-tight text-white sm:text-3xl">{selectedTournament.title}</h2>
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-200">
                    <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
                    {selectedTournament.date ? formatThaiDate(selectedTournament.date) : "กำหนดการแข่งขัน"}
                  </p>
                </div>
                <div className="shrink-0 rounded-lg border border-white/15 bg-zinc-950/75 px-3 py-2 text-sm text-white">
                  <span className="text-slate-400">แมตช์ในรายการ </span>
                  <span className="font-bold tabular-nums">{matches.length}</span>
                </div>
              </div>
            </section>

            {selectedTournament.championTeamId && (
              <section className="mb-5 flex items-center gap-3 rounded-xl border border-amber-300/20 bg-zinc-950/80 p-4" aria-label="แชมป์เปี้ยนรายการ">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-amber-300/25 bg-amber-300/10">
                  {champion?.logoUrl ? (
                    <img src={champion.logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Trophy className="h-5 w-5 text-amber-200" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-amber-200">แชมเปี้ยนประจำรายการ</p>
                  <p className="truncate font-bold text-white">{champion?.teamName || "ประกาศผู้ชนะแล้ว"}</p>
                </div>
              </section>
            )}

            {matchGroups.length > 1 && (
              <section className="mb-4 rounded-xl border border-white/10 bg-zinc-950/65 p-3" aria-label="เลือกกลุ่มการแข่งขัน">
                <p className="mb-2 text-xs font-semibold text-slate-400">กลุ่มการแข่งขัน</p>
                <div className="flex flex-wrap gap-2">
                  {matchGroups.map((group) => (
                    <button
                      key={group}
                      type="button"
                      onClick={() => setSelectedGroup(group)}
                      aria-pressed={selectedGroup === group}
                      className={`rounded-md border px-3 py-2 text-xs font-semibold ${
                        selectedGroup === group
                          ? "border-primary/45 bg-primary/10 text-primary"
                          : "border-white/10 bg-zinc-900 text-slate-300"
                      } transition-none active:transform-none`}
                    >
                      {getGroupLabel(group)}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section aria-label="ผังสายการแข่งขัน">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-white sm:text-2xl">ผังสายการแข่งขัน</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    {matchGroups.length > 1 ? `${getGroupLabel(selectedGroup)} · ` : ""}
                    เส้นแสดงการผ่านรอบ และเน้นทีมที่ชนะในแต่ละแมตช์
                  </p>
                </div>
                <span className="rounded-md border border-white/10 bg-zinc-950/70 px-2.5 py-1.5 text-xs text-slate-300">
                  {rounds.length} รอบ · {visibleMatches.length} แมตช์
                </span>
              </div>

              {matchesLoading ? (
                <div className="flex min-h-40 items-center justify-center gap-3 rounded-xl border border-white/10 bg-zinc-950/70 text-sm text-slate-400">
                  <Loader2 className="h-5 w-5 text-primary" /> กำลังโหลดสายการแข่งขัน...
                </div>
              ) : rounds.length > 0 ? (
                <TournamentBracketBoard
                  rounds={rounds}
                  registrations={registrations}
                  onTeamClick={(team) => {
                    setSelectedTeam(team);
                    setShowTeamModal(true);
                  }}
                />
              ) : (
                <div className="rounded-xl border border-white/10 bg-zinc-950/70 px-5 py-10 text-center">
                  <Swords className="mx-auto mb-3 h-8 w-8 text-slate-500" />
                  <h3 className="font-semibold text-white">ยังไม่มีแมตช์ในรายการนี้</h3>
                  <p className="mt-1 text-sm text-slate-400">สายการแข่งขันจะแสดงที่นี่เมื่อผู้จัดเพิ่มแมตช์แล้ว</p>
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>

      {selectedTeam && (
        <TeamMembersModal
          isOpen={showTeamModal}
          onClose={() => setShowTeamModal(false)}
          teamName={selectedTeam.teamName}
          teamLogo={selectedTeam.logoUrl}
          members={selectedTeam.members || []}
        />
      )}
    </main>
  );
}
