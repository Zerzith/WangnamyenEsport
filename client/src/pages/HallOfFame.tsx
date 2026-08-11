import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, orderBy, getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trophy, Users, Gamepad2, Award } from "lucide-react";
import { motion } from "framer-motion";
import { AvatarCustom } from "@/components/ui/avatar-custom";
import { TeamMembersModal } from "@/components/TeamMembersModal";

interface TeamMember {
  name: string;
  gameName: string;
  studentId: string;
  phone: string;
  email: string;
  department: string;
  grade: string;
  isSubstitute?: boolean;
}

interface ApprovedTeam {
  id: string;
  teamName: string;
  game: string;
  logoUrl?: string;
  members: TeamMember[];
  approvedAt?: any;
  eventId?: string;
  eventTitle?: string;
}

export default function HallOfFame() {
  const [teams, setTeams] = useState<ApprovedTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<string>("All");
  const [selectedTeam, setSelectedTeam] = useState<ApprovedTeam | null>(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
  // Cache event titles เพื่อไม่ต้อง fetch ซ้ำ
  const [eventTitleCache, setEventTitleCache] = useState<Record<string, string>>({});
  const games = ["All", "Valorant", "RoV", "Free Fire"];

  useEffect(() => {
    const q = query(
      collection(db, "registrations"),
      where("status", "==", "approved"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      // รวบรวม eventId ที่ยังไม่มีใน cache
      const missingEventIds = new Set<string>();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.eventId && !eventTitleCache[data.eventId]) {
          missingEventIds.add(data.eventId);
        }
      });

      // Fetch event titles ที่ยังขาดอยู่ (batch)
      const newTitles: Record<string, string> = { ...eventTitleCache };
      await Promise.all(
        Array.from(missingEventIds).map(async (eventId) => {
          try {
            const eventDoc = await getDoc(doc(db, "events", eventId));
            if (eventDoc.exists()) {
              newTitles[eventId] = (eventDoc.data() as any).title || "";
            }
          } catch (error) {
            console.error("Error fetching event:", error);
          }
        })
      );

      if (missingEventIds.size > 0) {
        setEventTitleCache(newTitles);
      }

      const teamsData: ApprovedTeam[] = snapshot.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          teamName: data.teamName,
          game: data.game,
          logoUrl: data.logoUrl,
          members: data.members || [],
          approvedAt: data.approvedAt,
          eventId: data.eventId,
          eventTitle: newTitles[data.eventId] || "",
        };
      });

      setTeams(teamsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching teams:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredTeams = selectedGame === "All"
    ? teams
    : teams.filter(team => team.game === selectedGame);

  if (loading) {
    return (
      <div className="h-[50vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-display font-bold text-white">ห้องเกียรติยศ</h1>
        </div>
        <p className="text-muted-foreground">
          รายชื่อทีมที่ผ่านการคัดเลือกและเข้าร่วมการแข่งขัน WNY Esports Tournament
        </p>
      </div>

      {/* Game Filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {games.map((game) => (
          <button
            key={game}
            onClick={() => setSelectedGame(game)}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              selectedGame === game
                ? "bg-primary text-black"
                : "bg-card/50 text-white hover:bg-card border border-white/10"
            }`}
          >
            {game === "All" ? "ทั้งหมด" : game}
          </button>
        ))}
      </div>

      {filteredTeams.length === 0 ? (
        <div className="text-center py-12 bg-card/20 rounded-xl border border-dashed border-white/10">
          <Award className="w-16 h-16 mx-auto text-white/10 mb-4" />
          <p className="text-muted-foreground">ยังไม่มีทีมที่ผ่านการคัดเลือก</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTeams.map((team, index) => (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: Math.min(index * 0.08, 0.4) }}
            >
              <Card className="bg-card/50 border-white/10 hover:border-primary/30 transition-all overflow-hidden group">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <button
                        onClick={() => {
                          setSelectedTeam(team);
                          setShowTeamModal(true);
                        }}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <AvatarCustom
                          src={team.logoUrl}
                          name={team.teamName}
                          size="lg"
                          className="ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all"
                        />
                      </button>
                      <div>
                        <CardTitle className="text-xl text-white">{team.teamName}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Gamepad2 className="w-4 h-4 text-primary" />
                          <span className="text-sm text-primary font-semibold">{team.game}</span>
                        </div>
                        {team.eventTitle && (
                          <p className="text-xs text-muted-foreground mt-1">{team.eventTitle}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-white/80 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      รายชื่อสมาชิก ({team.members.length})
                    </h4>
                    <div className="space-y-3">
                      {team.members.map((member, memberIndex) => (
                        <div
                          key={memberIndex}
                          className="p-3 rounded-lg bg-white/5 border border-white/5 text-sm"
                        >
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-xs text-muted-foreground">ชื่อจริง</p>
                              <p className="text-white font-semibold">{member.name}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">ชื่อเกม (IGN)</p>
                              <p className="text-primary font-semibold">{member.gameName}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">รหัสนักเรียน</p>
                              <p className="text-white">{member.studentId}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">ชั้นปี</p>
                              <p className="text-white">{member.grade || "-"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">แผนกวิชา</p>
                              <p className="text-white">{member.department || "-"}</p>
                            </div>
                            {member.isSubstitute && (
                              <div>
                                <p className="text-xs text-muted-foreground">สถานะ</p>
                                <p className="text-yellow-500 font-semibold">แฟน</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Team Members Modal */}
      {selectedTeam && (
        <TeamMembersModal
          isOpen={showTeamModal}
          onClose={() => setShowTeamModal(false)}
          teamName={selectedTeam.teamName}
          teamLogo={selectedTeam.logoUrl}
          members={selectedTeam.members}
        />
      )}
    </div>
  );
}
