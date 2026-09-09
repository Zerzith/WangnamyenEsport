import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { collection, query, where, onSnapshot, updateDoc, doc, getDocs, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Swords, Calendar, Trophy, Users, Check, X, Menu } from "lucide-react";
import { motion } from "framer-motion";
import { TeamMembersModal } from "@/components/TeamMembersModal";

interface Match {
  id: string;
  eventId: string;
  eventTitle?: string;
  round: number;
  group: string;
  teamA: string;
  teamB: string;
  teamAName?: string;
  teamBName?: string;
  scoreA: number;
  scoreB: number;
  status: "pending" | "ongoing" | "completed";
  createdAt: any;
  winsA?: number;
  lossesA?: number;
  drawsA?: number;
  winsB?: number;
  lossesB?: number;
  drawsB?: number;
}

interface ApprovedTeam {
  id: string;
  teamName: string;
  game: string;
}

export default function MatchManagement() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const [approvedTeams, setApprovedTeams] = useState<ApprovedTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [events, setEvents] = useState<{id: string; title: string}[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const userMenuItems = [
    { href: "/my-teams", label: "ทีมของฉัน", icon: "Users" },
    { href: "/match-management", label: "จัดการแมตช์", icon: "Swords" },
    { href: "/register-team", label: "ลงทะเบียนทีม", icon: "Edit2" },
  ];


  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }

    const q = query(
      collection(db, "teams"),
      where("userId", "==", user.uid),
      where("status", "==", "approved")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const teams = snapshot.docs.map(doc => ({
        id: doc.id,
        teamName: doc.data().teamName || doc.data().name,
        game: doc.data().game,
      }));
      setApprovedTeams(teams);
      setLoading(false);


      if (teams.length > 0 && !selectedTeamId) {
        setSelectedTeamId(teams[0].id);
      }
    });

    return () => unsubscribe();
  }, [user, setLocation, selectedTeamId]);


  useEffect(() => {
    if (!selectedTeamId) return;

    setLoadingMatches(true);

    const q = query(
      collection(db, "matches"),
      where("teamA", "in", [selectedTeamId]),
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      let matchesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Match[];


      const q2 = query(
        collection(db, "matches"),
        where("teamB", "in", [selectedTeamId]),
      );

      const snapshot2 = await getDocs(q2);
      const matchesData2 = snapshot2.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Match[];

      matchesData = [...matchesData, ...matchesData2];


      const enrichedMatches = await Promise.all(
        matchesData.map(async (match) => {
          let teamAName = match.teamA;
          let teamBName = match.teamB;
          let eventTitle = "";


          try {
            const teamADoc = await getDoc(doc(db, "registrations", match.teamA));
            if (teamADoc.exists()) {
              const d = teamADoc.data() as any;
              teamAName = d.teamName || d.name || match.teamA;
            }
          } catch (error) {
            console.error("Error fetching team A:", error);
          }


          try {
            const teamBDoc = await getDoc(doc(db, "registrations", match.teamB));
            if (teamBDoc.exists()) {
              const d = teamBDoc.data() as any;
              teamBName = d.teamName || d.name || match.teamB;
            }
          } catch (error) {
            console.error("Error fetching team B:", error);
          }


          try {
            if (match.eventId) {
              const eventDoc = await getDoc(doc(db, "events", match.eventId));
              if (eventDoc.exists()) {
                eventTitle = (eventDoc.data() as any).title || "";
              }
            }
          } catch (error) {
            console.error("Error fetching event:", error);
          }

          return {
            ...match,
            teamAName,
            teamBName,
            eventTitle,
          };
        })
      );

      setMatches(enrichedMatches);
      setLoadingMatches(false);
    });

    return () => unsubscribe();
  }, [selectedTeamId]);


  useEffect(() => {
    if (!selectedTeamId) return;
    const fetchEvents = async () => {
      try {
        const eventIds = Array.from(new Set(matches.map(m => m.eventId).filter(Boolean)));
        const eventsData = await Promise.all(
          eventIds.map(async (eventId) => {
            try {
              const eventDoc = await getDoc(doc(db, "events", eventId));
              if (eventDoc.exists()) {
                return { id: eventId, title: (eventDoc.data() as any).title || eventId };
              }
            } catch (e) {}
            return { id: eventId, title: eventId };
          })
        );
        setEvents(eventsData.filter(e => e.title));
      } catch (e) {}
    };
    fetchEvents();
  }, [matches, selectedTeamId]);

  const handleConfirmMatch = async (matchId: string) => {
    try {
      await updateDoc(doc(db, "matches", matchId), {
        status: "ongoing",
      });
      toast({ title: "ยืนยันแมตช์เรียบร้อย" });
    } catch (error) {
      toast({ title: "ผิดพลาดในการยืนยันแมตช์", variant: "destructive" });
    }
  };

  const handleCompleteMatch = async (matchId: string) => {
    try {
      await updateDoc(doc(db, "matches", matchId), {
        status: "completed",
      });
      toast({ title: "จบแมตช์เรียบร้อย" });
    } catch (error) {
      toast({ title: "ผิดพลาดในการจบแมตช์", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="w-full px-2 sm:px-4 lg:px-6 py-24">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground text-lg">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (approvedTeams.length === 0) {
    return (
      <div className="w-full px-2 sm:px-4 lg:px-6 py-24">
        <Button
          onClick={() => setLocation("/")}
          variant="ghost"
          className="mb-6 text-muted-foreground hover:text-white"
        >
          <Menu className="w-4 h-4 mr-2" />
          กลับไปหน้าแรก
        </Button>
        <Card className="bg-zinc-900 border-white/10 text-center py-12">
          <Swords className="w-20 h-20 mx-auto text-white/20 mb-4" />
          <h3 className="text-xl font-bold text-white/40 mb-2">ยังไม่มีทีมที่ได้รับการอนุมัติ</h3>
          <p className="text-muted-foreground">กรุณารอให้ Admin อนุมัติทีมของคุณก่อน</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="w-full px-2 sm:px-4 lg:px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-10 h-10 text-muted-foreground hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-display font-bold text-white mb-2 flex items-center gap-3">
              <Swords className="w-8 h-8 text-primary" />
              จัดการแมตช์
            </h1>
            <p className="text-muted-foreground">ดูและจัดการแมตช์ของทีมของคุณ</p>
          </div>
        </div>

        <Card className="bg-zinc-900 border-white/10 p-6 rounded-xl mb-8">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            เลือกทีม
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {approvedTeams.map((team) => (
              <motion.button
                key={team.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedTeamId(team.id)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedTeamId === team.id
                    ? "border-primary bg-primary/10"
                    : "border-white/10 bg-zinc-900 hover:border-white/20"
                }`}
              >
                <p className="font-bold text-white">{team.teamName}</p>
                <p className="text-sm text-muted-foreground">{team.game}</p>
              </motion.button>
            ))}
          </div>
        </Card>


        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            แมตช์ของทีม
          </h3>

          {events.length > 1 && (
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-[220px] bg-zinc-900 border-white/20 text-white">
                <SelectValue placeholder="เลือกรายการแข่ง" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/20">
                <SelectItem value="all">ทุกรายการ</SelectItem>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          </div>
          {loadingMatches ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
              <p className="text-muted-foreground">กำลังโหลดแมตช์...</p>
            </div>
          ) : matches.filter(m => selectedEventId === "all" || m.eventId === selectedEventId).length === 0 ? (
            <Card className="bg-zinc-900 border-white/10 text-center py-12">
              <Swords className="w-20 h-20 mx-auto text-white/20 mb-4" />
              <h3 className="text-xl font-bold text-white/40 mb-2">ยังไม่มีแมตช์</h3>
              <p className="text-muted-foreground">Admin จะสร้างแมตช์สำหรับทีมของคุณ</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {matches.filter(m => selectedEventId === "all" || m.eventId === selectedEventId).map((match, index) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-zinc-900 border-white/10 overflow-hidden hover:border-primary/30 transition-colors">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{match.eventTitle}</CardTitle>
                          <CardDescription>
                            รอบ {match.round} {match.group && `- กลุ่ม ${match.group}`}
                          </CardDescription>
                        </div>
                        <Badge
                          variant={
                            match.status === "pending"
                              ? "outline"
                              : match.status === "ongoing"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {match.status === "pending"
                            ? "รอดำเนินการ"
                            : match.status === "ongoing"
                            ? "กำลังดำเนินการ"
                            : "เสร็จสิ้น"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-white/10">
                        <div className="flex-1 text-center">
                          <p className="text-sm text-muted-foreground mb-2">ทีม A</p>
                          <p className="font-bold text-white">{match.teamAName}</p>
                        </div>
                        <div className="flex items-center gap-4 px-6">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-primary">{match.scoreA}</p>
                            <p className="text-xs text-muted-foreground">-</p>
                            <p className="text-2xl font-bold text-primary">{match.scoreB}</p>
                          </div>
                        </div>
                        <div className="flex-1 text-center">
                          <p className="text-sm text-muted-foreground mb-2">ทีม B</p>
                          <p className="font-bold text-white">{match.teamBName}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {match.status === "pending" && (
                          <Button
                            onClick={() => handleConfirmMatch(match.id)}
                            className="flex-1 bg-primary hover:bg-primary/80"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            ยืนยันแมตช์
                          </Button>
                        )}
                        {match.status === "ongoing" && (
                          <Button
                            onClick={() => handleCompleteMatch(match.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            จบแมตช์
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>


      {sidebarOpen && (
        <motion.div
          initial={{ opacity: 0, x: -300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -300 }}
          className="fixed left-0 top-16 z-40 w-64 h-[calc(100vh-4rem)] bg-card/95  border-r border-white/10 shadow-xl"
        >
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">เมนู</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="w-8 h-8 text-muted-foreground hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {userMenuItems.map((item) => (
                <a key={item.href} href={item.href}>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                      ${location === item.href
                        ? 'bg-primary/20 text-primary border border-primary/50'
                        : 'text-muted-foreground hover:text-white hover:bg-zinc-900'}
                    `}
                  >
                    <span className="font-medium">{item.label}</span>
                  </button>
                </a>
              ))}
            </div>
          </div>
        </motion.div>
      )}


      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-zinc-900/50  top-16"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
