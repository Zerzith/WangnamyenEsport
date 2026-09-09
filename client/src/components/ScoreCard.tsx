import { motion } from "framer-motion";
import { Trophy } from "lucide-react";

interface ScoreCardProps {
  match: {
    id: string;
    teamA: string;
    teamB: string;
    teamAName?: string;
    teamBName?: string;
    scoreA: number;
    scoreB: number;
    game?: string;
    status: string;
    winner?: string;
    bannerUrl?: string;
    logoUrlA?: string;
    logoUrlB?: string;
    winsA?: number;
    winsB?: number;
    lossesA?: number;
    lossesB?: number;
    drawsA?: number;
    drawsB?: number;
  };
}

export function ScoreCard({ match }: ScoreCardProps) {
  const isLive = match.status === 'live' || match.status === 'ongoing';
  const isCompleted = match.status === 'finished' || match.status === 'completed';
  const isPending = match.status === 'pending' || match.status === 'upcoming';


  const hasWLDData = match.winsA !== undefined && match.winsB !== undefined;

  const getStatusText = (status: string) => {
    switch(status) {
      case 'live':
      case 'ongoing':
        return 'กำลังดำเนินการ';
      case 'finished':
      case 'completed':
        return 'จบการแข่งขันแล้ว';
      case 'pending':
      case 'upcoming':
        return 'ยังไม่เริ่ม';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'live':
      case 'ongoing':
        return 'bg-red-600 text-white animate-pulse';
      case 'finished':
      case 'completed':
        return 'bg-green-600/20 text-green-400 border-x border-b border-green-500/30';
      case 'pending':
      case 'upcoming':
        return 'bg-gray-600/20 text-gray-400 border-x border-b border-gray-500/30';
      default:
        return 'bg-zinc-800 text-white/50 border-x border-b border-white/10';
    }
  };


  const wldWinnerA = isCompleted && hasWLDData && (match.winsA || 0) > (match.winsB || 0);
  const wldWinnerB = isCompleted && hasWLDData && (match.winsB || 0) > (match.winsA || 0);


  const regularWinnerA = isCompleted && !hasWLDData && match.scoreA > match.scoreB;
  const regularWinnerB = isCompleted && !hasWLDData && match.scoreB > match.scoreA;

  const winnerA = hasWLDData ? wldWinnerA : regularWinnerA;
  const winnerB = hasWLDData ? wldWinnerB : regularWinnerB;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl border border-white/10 bg-zinc-900 hover:border-primary/50 transition-all group "
      style={match.bannerUrl ? { backgroundImage: `url(${match.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : {}}
    >
      <div className="relative z-10 p-6">

        <div className="mb-4 flex justify-center">
          <span className={`
            px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border
            ${getStatusColor(match.status)}
          `}>
            {getStatusText(match.status)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 md:gap-8">

          <div className="flex-1 text-center flex flex-col items-center gap-3">
            <div className={`w-16 h-16 md:w-20 md:h-20 rounded-xl bg-zinc-800 flex items-center justify-center border border-white/10 group-hover:border-primary/30 transition-all overflow-hidden ${winnerA ? 'border-2 border-primary' : ''}`}>
              {match.logoUrlA ? (
                <img src={match.logoUrlA} alt={match.teamA} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-display font-bold text-white">{match.teamAName?.charAt(0) || match.teamA.charAt(0)}</span>
              )}
            </div>
            <div className="space-y-1">
              <h3 className={`font-display font-bold text-sm md:text-lg line-clamp-1 ${winnerA ? 'text-primary' : 'text-white'}`}>
                {match.teamAName || match.teamA}
              </h3>
              {winnerA && (
                <div className="flex items-center justify-center gap-1 text-primary">
                  <Trophy className="w-3 h-3" />
                  <span className="text-[10px] font-bold uppercase">ผู้ชนะ</span>
                </div>
              )}
            </div>
          </div>


          <div className="flex flex-col items-center gap-2">

            {hasWLDData ? (
              <div className="flex flex-col items-center gap-2">

                <div className="flex items-center gap-2 md:gap-4 font-display font-bold text-lg md:text-2xl bg-zinc-900 px-4 py-2 rounded-xl border border-white/5 shadow-xl">
                  <div className="flex flex-col items-center">
                    <span className="text-green-400 text-xl md:text-2xl">{match.winsA || 0}</span>
                    <span className="text-[8px] text-green-400/60 font-normal">ชนะ</span>
                  </div>
                  <span className="text-primary/40 text-lg md:text-xl">-</span>
                  <div className="flex flex-col items-center">
                    <span className="text-yellow-400 text-xl md:text-2xl">{match.drawsA || 0}</span>
                    <span className="text-[8px] text-yellow-400/60 font-normal">เสมอ</span>
                  </div>
                  <span className="text-primary/40 text-lg md:text-xl">-</span>
                  <div className="flex flex-col items-center">
                    <span className="text-red-400 text-xl md:text-2xl">{match.lossesA || 0}</span>
                    <span className="text-[8px] text-red-400/60 font-normal">แพ้</span>
                  </div>
                </div>


                <div className="flex items-center gap-3 md:gap-5 font-display font-bold text-2xl md:text-3xl bg-zinc-900/50 px-4 py-2 rounded-lg border border-white/5">
                  <span className={match.scoreA >= match.scoreB ? 'text-white' : 'text-white/40'}>{match.scoreA}</span>
                  <span className="text-primary/40 text-lg md:text-2xl">:</span>
                  <span className={match.scoreB >= match.scoreA ? 'text-white' : 'text-white/40'}>{match.scoreB}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 md:gap-5 font-display font-bold text-3xl md:text-5xl bg-zinc-900 px-6 py-3 rounded-xl border border-white/5 shadow-xl">
                <span className={match.scoreA >= match.scoreB ? 'text-white' : 'text-white/40'}>{match.scoreA}</span>
                <span className="text-primary/40 text-2xl md:text-4xl">:</span>
                <span className={match.scoreB >= match.scoreA ? 'text-white' : 'text-white/40'}>{match.scoreB}</span>
              </div>
            )}

            {match.game && (
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">
                {match.game}
              </span>
            )}
          </div>


          <div className="flex-1 text-center flex flex-col items-center gap-3">
            <div className={`w-16 h-16 md:w-20 md:h-20 rounded-xl bg-zinc-800 flex items-center justify-center border border-white/10 group-hover:border-primary/30 transition-all overflow-hidden ${winnerB ? 'border-2 border-primary' : ''}`}>
              {match.logoUrlB ? (
                <img src={match.logoUrlB} alt={match.teamB} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-display font-bold text-white">{match.teamBName?.charAt(0) || match.teamB.charAt(0)}</span>
              )}
            </div>
            <div className="space-y-1">
              <h3 className={`font-display font-bold text-sm md:text-lg line-clamp-1 ${winnerB ? 'text-primary' : 'text-white'}`}>
                {match.teamBName || match.teamB}
              </h3>
              {winnerB && (
                <div className="flex items-center justify-center gap-1 text-primary">
                  <Trophy className="w-3 h-3" />
                  <span className="text-[10px] font-bold uppercase">ผู้ชนะ</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      <div className={`absolute bottom-0 left-0 h-1 transition-all duration-200 ${isLive ? 'w-full bg-red-600' : 'w-0 group-hover:w-full bg-primary'}`} />
    </motion.div>
  );
}
