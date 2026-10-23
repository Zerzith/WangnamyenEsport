import { ArrowDown, Crown, Trophy } from "lucide-react";
import { censorText } from "@/lib/filter";

export interface BracketMatchData {
  id: string;
  round: string | number;
  group?: string;
  createdAt?: { seconds?: number };
  teamA: string;
  teamB: string;
  teamAName?: string;
  teamBName?: string;
  logoUrlA?: string;
  logoUrlB?: string;
  scoreA: number;
  scoreB: number;
  status: "pending" | "ongoing" | "completed";
  winner?: string | null;
  winsA?: number;
  winsB?: number;
  lossesA?: number;
  lossesB?: number;
  drawsA?: number;
  drawsB?: number;
}

export interface BracketRoundData {
  key: string;
  title: string;
  matches: BracketMatchData[];
}

export interface BracketMemberData {
  name: string;
  gameName: string;
  grade?: string;
  department?: string;
  studentId?: string;
  isSubstitute?: boolean;
}

export interface BracketTeamData {
  id: string;
  teamName: string;
  logoUrl?: string;
  members?: BracketMemberData[];
  [key: string]: unknown;
}

interface TournamentBracketBoardProps {
  rounds: BracketRoundData[];
  registrations: BracketTeamData[];
  onTeamClick: (team: BracketTeamData) => void;
}

const BOARD_WIDTH = 1000;
const CARD_HEIGHT = 112;
const ROUND_SLOT_HEIGHT = 142;

function getWinnerTeamId(match: BracketMatchData): string | null {
  if (match.status !== "completed") return null;
  if (match.winner && [match.teamA, match.teamB].includes(match.winner)) return match.winner;

  if (match.winsA !== undefined && match.winsB !== undefined && match.winsA !== match.winsB) {
    return match.winsA > match.winsB ? match.teamA : match.teamB;
  }

  if (match.scoreA !== match.scoreB) {
    return match.scoreA > match.scoreB ? match.teamA : match.teamB;
  }

  return null;
}

function getResultLabel(match: BracketMatchData, side: "A" | "B") {
  const wins = side === "A" ? match.winsA : match.winsB;
  const draws = side === "A" ? match.drawsA : match.drawsB;
  const losses = side === "A" ? match.lossesA : match.lossesB;
  const score = side === "A" ? match.scoreA : match.scoreB;

  if (wins === 1) return "ชนะ";
  if (draws === 1) return "เสมอ";
  if (losses === 1) return "แพ้";
  if (match.status === "pending" && score === 0) return "—";
  return String(score ?? 0);
}

function getStatusLabel(status: BracketMatchData["status"]) {
  if (status === "ongoing") return "กำลังแข่ง";
  if (status === "completed") return "จบแล้ว";
  return "ยังไม่เริ่ม";
}

export function TournamentBracketBoard({ rounds, registrations, onTeamClick }: TournamentBracketBoardProps) {
  if (rounds.length === 0) return null;

  const boardHeight = Math.max(260, rounds[0].matches.length * ROUND_SLOT_HEIGHT);
  const columnWidth = BOARD_WIDTH / rounds.length;
  const connectors: Array<{ key: string; path: string; highlighted: boolean }> = [];

  rounds.slice(1).forEach((round, roundIndex) => {
    const previousRound = rounds[roundIndex];
    if (!previousRound.matches.length || !round.matches.length) return;

    round.matches.forEach((targetMatch, targetIndex) => {
      const startIndex = Math.floor((targetIndex * previousRound.matches.length) / round.matches.length);
      const endIndex = Math.max(
        startIndex + 1,
        Math.floor(((targetIndex + 1) * previousRound.matches.length) / round.matches.length),
      );
      const targetY = ((targetIndex + 0.5) * boardHeight) / round.matches.length;
      const xStart = roundIndex * columnWidth + columnWidth - 12;
      const xEnd = (roundIndex + 1) * columnWidth + 12;
      const xMiddle = (xStart + xEnd) / 2;

      for (let sourceIndex = startIndex; sourceIndex < endIndex && sourceIndex < previousRound.matches.length; sourceIndex += 1) {
        const sourceMatch = previousRound.matches[sourceIndex];
        const sourceY = ((sourceIndex + 0.5) * boardHeight) / previousRound.matches.length;
        connectors.push({
          key: `${round.key}-${targetMatch.id}-${sourceMatch.id}`,
          path: `M ${xStart} ${sourceY} H ${xMiddle} V ${targetY} H ${xEnd}`,
          highlighted: Boolean(getWinnerTeamId(sourceMatch)),
        });
      }
    });
  });

  return (
    <div>
      <div className="hidden overflow-hidden rounded-xl border border-white/10 bg-zinc-950/80 p-4 xl:block">
        <div
          className="mb-3 grid gap-2"
          style={{ gridTemplateColumns: `repeat(${rounds.length}, minmax(0, 1fr))` }}
        >
          {rounds.map((round) => (
            <div key={round.key} className="min-w-0 border-b border-white/10 px-1 pb-2">
              <h3 className="truncate text-sm font-bold text-white">{round.title}</h3>
              <p className="mt-0.5 text-xs text-slate-400">{round.matches.length} แมตช์</p>
            </div>
          ))}
        </div>

        <div className="relative w-full" style={{ height: `${boardHeight}px` }} aria-label="แผนผังสายการแข่งขัน">
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox={`0 0 ${BOARD_WIDTH} ${boardHeight}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {connectors.map((connector) => (
              <path
                key={connector.key}
                d={connector.path}
                fill="none"
                stroke={connector.highlighted ? "#5aa9d6" : "#475569"}
                strokeWidth="2"
                strokeLinecap="square"
                strokeLinejoin="round"
              />
            ))}
          </svg>

          {rounds.map((round, roundIndex) =>
            round.matches.map((match, matchIndex) => {
              const centerY = ((matchIndex + 0.5) * boardHeight) / round.matches.length;
              const left = roundIndex * columnWidth + 12;
              const cardWidth = Math.max(0, columnWidth - 24);

              return (
                <div
                  key={match.id}
                  className="absolute"
                  style={{
                    left: `${(left / BOARD_WIDTH) * 100}%`,
                    top: `${centerY - CARD_HEIGHT / 2}px`,
                    width: `${(cardWidth / BOARD_WIDTH) * 100}%`,
                    height: `${CARD_HEIGHT}px`,
                  }}
                >
                  <BracketMatchCard match={match} registrations={registrations} onTeamClick={onTeamClick} compact />
                </div>
              );
            }),
          )}
        </div>
      </div>

      <div className="space-y-3 xl:hidden">
        {rounds.map((round, roundIndex) => (
          <div key={round.key}>
            <section className="rounded-xl border border-white/10 bg-zinc-950/80 p-3 sm:p-4">
              <header className="mb-3 flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-xs font-bold text-primary">
                    {roundIndex + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-white">{round.title}</h3>
                    <p className="text-xs text-slate-400">{round.matches.length} แมตช์</p>
                  </div>
                </div>
                {roundIndex === rounds.length - 1 && <Trophy className="h-5 w-5 shrink-0 text-primary" aria-label="รอบสุดท้าย" />}
              </header>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {round.matches.map((match) => (
                  <BracketMatchCard
                    key={match.id}
                    match={match}
                    registrations={registrations}
                    onTeamClick={onTeamClick}
                  />
                ))}
              </div>
            </section>
            {roundIndex < rounds.length - 1 && (
              <div className="flex items-center justify-center gap-2 py-1 text-xs text-slate-400">
                <span className="h-px w-6 bg-slate-700" />
                ผู้ชนะเข้าสู่รอบถัดไป
                <ArrowDown className="h-4 w-4 text-primary" />
                <span className="h-px w-6 bg-slate-700" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface BracketMatchCardProps {
  match: BracketMatchData;
  registrations: BracketTeamData[];
  onTeamClick: (team: BracketTeamData) => void;
  compact?: boolean;
}

function BracketMatchCard({ match, registrations, onTeamClick, compact = false }: BracketMatchCardProps) {
  const winnerId = getWinnerTeamId(match);
  const statusClasses = match.status === "ongoing"
    ? "border-primary/30 bg-primary/10 text-primary"
    : match.status === "completed"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
      : "border-white/10 bg-white/[0.04] text-slate-400";

  const renderTeam = (side: "A" | "B") => {
    const teamId = side === "A" ? match.teamA : match.teamB;
    const team = registrations.find((registration) => registration.id === teamId);
    const name = (side === "A" ? match.teamAName : match.teamBName) || team?.teamName || teamId || "รอทีม";
    const logo = (side === "A" ? match.logoUrlA : match.logoUrlB) || team?.logoUrl;
    const isWinner = Boolean(winnerId && winnerId === teamId);
    const isEliminated = Boolean(winnerId && teamId && !isWinner);
    const result = getResultLabel(match, side);

    return (
      <div
        key={side}
        className={`flex min-w-0 items-center justify-between gap-2 rounded-md border-l-2 px-2 py-1.5 ${
          isWinner
            ? "border-primary bg-primary/10"
            : isEliminated
              ? "border-slate-800 bg-zinc-950/50 opacity-65"
              : "border-transparent bg-zinc-950/55"
        }`}
      >
        <button
          type="button"
          onClick={() => team && onTeamClick(team)}
          disabled={!team}
          className="flex min-w-0 items-center gap-2 text-left transition-none active:transform-none disabled:cursor-default"
          aria-label={team ? `ดูสมาชิกทีม ${name}` : name}
        >
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border text-[10px] font-bold ${isWinner ? "border-primary/40 bg-primary/15 text-primary" : "border-white/10 bg-white/[0.04] text-slate-400"}`}>
            {logo ? (
              <img src={logo} alt="" className="h-full w-full object-cover" />
            ) : (
              censorText(name).trim().charAt(0) || "?"
            )}
          </span>
          <span className={`truncate text-xs ${isWinner ? "font-bold text-white" : "text-slate-300"}`} title={name}>
            {name}
          </span>
        </button>
        <span className={`flex shrink-0 items-center gap-1 text-[10px] font-bold tabular-nums ${isWinner ? "text-primary" : "text-slate-400"}`}>
          {isWinner && <Crown className="h-3 w-3" aria-label="ผู้ชนะ" />}
          {result}
        </span>
      </div>
    );
  };

  return (
    <article className={`flex h-full min-w-0 flex-col justify-between rounded-lg border border-white/10 bg-zinc-900 p-2 ${compact ? "gap-1" : "gap-1.5"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-semibold text-slate-400">แมตช์ {match.id.slice(0, 6)}</span>
        <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-semibold ${statusClasses}`}>
          {getStatusLabel(match.status)}
        </span>
      </div>
      <div className="space-y-1">
        {renderTeam("A")}
        {renderTeam("B")}
      </div>
    </article>
  );
}
