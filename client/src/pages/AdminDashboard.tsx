
import { Fragment, useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AvatarCustom } from "@/components/ui/avatar-custom";
import { censorText } from "@/lib/filter";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Plus, Trash2, Calendar, Users, Trophy,
  Check, X, Swords, Megaphone, ShieldAlert,
  UserCheck, UserX, Eye, EyeOff, LayoutGrid, MonitorPlay, ImagePlus, FileImage,
  ArrowLeft, Pencil
} from "lucide-react";
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, orderBy, where, serverTimestamp, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatThaiDate } from "@/lib/date";
import { uploadImageToCloudinary } from "@/lib/cloudinary";


const DEFAULT_EVENT_BANNER = "/assets/nebula-bg.png";

const isExternalHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};


import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { TeamMembersModal } from "@/components/TeamMembersModal";


export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [events, setEvents] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamEvent, setSelectedTeamEvent] = useState<string>("all");
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [selectedRegistrationEvent, setSelectedRegistrationEvent] = useState<string>("all");
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedMatchEventId, setSelectedMatchEventId] = useState<string | null>(null);
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [showTeamModal, setShowTeamModal] = useState(false);

  const [authUsers, setAuthUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);


  const [newsTitle, setNewNewsTitle] = useState("");
  const [newsContent, setNewNewsContent] = useState("");
  const [newsImageFile, setNewsImageFile] = useState<File | null>(null);
  const [newsImagePreview, setNewsImagePreview] = useState<string | null>(null);
  const [newsImageUrl, setNewsImageUrl] = useState("");
  const [isUploadingNewsImage, setIsUploadingNewsImage] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newGame, setNewGame] = useState("Valorant");
  const [newMaxTeams, setNewMaxTeams] = useState("16");
  const [newMembers, setNewMembers] = useState("5");
  const [newSubs, setNewSubs] = useState("1");
  const [newDate, setNewDate] = useState("");
  const [newRegDeadline, setNewRegDeadline] = useState("");
  const [newRegDeadlineTime, setNewRegDeadlineTime] = useState("23:59"); // Default to 23:59
  const [newBannerUrl, setNewBannerUrl] = useState("");
  const [newBannerFile, setNewBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  const [isEventEditDialogOpen, setIsEventEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editGame, setEditGame] = useState("Valorant");
  const [editMaxTeams, setEditMaxTeams] = useState("16");
  const [editMembers, setEditMembers] = useState("5");
  const [editSubs, setEditSubs] = useState("1");
  const [editDate, setEditDate] = useState("");
  const [editRegDeadline, setEditRegDeadline] = useState("");
  const [editRegDeadlineTime, setEditRegDeadlineTime] = useState("23:59");
  const [editBannerUrl, setEditBannerUrl] = useState("");
  const [editBannerFile, setEditBannerFile] = useState<File | null>(null);
  const [editBannerPreview, setEditBannerPreview] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState("upcoming");
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
      setNewBannerUrl(""); // Clear URL input if a file is chosen
    } else {
      setNewBannerFile(null);
      setBannerPreview(null);
    }
  };

  const gameBanners: { [key: string]: string } = {
    "RoV": "https://res.cloudinary.com/djubsqri6/image/upload/v1789063776/w51t9yvyizyjji2s1wpw.png",
    "Free Fire": "https://res.cloudinary.com/djubsqri6/image/upload/v1789063782/akb3y49izx7jptplnc2i.png",
    "Valorant": "https://res.cloudinary.com/djubsqri6/image/upload/v1789063772/mnr87aqivzjfri0hcuwu.png",
  };

  const closeEventEditor = () => {
    setIsEventEditDialogOpen(false);
    setEditingEvent(null);
    setEditBannerFile(null);
    setEditBannerPreview(null);
  };

  const openEventEditor = (event: any) => {
    const deadline = typeof event.registrationDeadline === "string" ? event.registrationDeadline : "";
    const deadlineDate = deadline.includes("T") ? deadline.slice(0, 10) : deadline;
    const deadlineTimeMatch = deadline.match(/T(\d{2}:\d{2})/);

    setEditingEvent(event);
    setEditTitle(event.title || "");
    setEditGame(event.game || "Valorant");
    setEditMaxTeams(String(event.maxTeams ?? 16));
    setEditMembers(String(event.membersPerTeam ?? 5));
    setEditSubs(String(event.maxSubstitutes ?? 0));
    setEditDate(event.date || "");
    setEditRegDeadline(deadlineDate);
    setEditRegDeadlineTime(deadlineTimeMatch?.[1] || "23:59");
    setEditBannerUrl(event.bannerUrl || "");
    setEditBannerFile(null);
    setEditBannerPreview(null);
    setEditStatus(event.status || "upcoming");
    setIsEventEditDialogOpen(true);
  };

  const handleEditBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEditBannerFile(file);
    setEditBannerPreview(URL.createObjectURL(file));
    setEditBannerUrl("");
  };

  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [newMatchRound, setNewMatchRound] = useState("1");
  const [newMatchGroup, setNewMatchGroup] = useState("A");
  const [newMatchTeamA, setNewMatchTeamA] = useState("");
  const [newMatchTeamB, setNewMatchTeamB] = useState("");
  const [approvedTeams, setApprovedTeams] = useState<any[]>([]);



  const filteredRegistrations = selectedRegistrationEvent === "all"
    ? registrations
    : registrations.filter(reg => reg.eventId === selectedRegistrationEvent);

  const filteredTeams = selectedTeamEvent === "all"
    ? teams
    : teams.filter(team => team.eventId === selectedTeamEvent);

  useEffect(() => {
    if (authLoading) return;

    if (!user || user.role !== "admin") {
      const timer = setTimeout(() => {
        if (!user || user.role !== "admin") {
          setLocation("/");
        }
      }, 2000);
      return () => clearTimeout(timer);
    }

    setLoading(true);

    const qEvents = query(collection(db, "events"), orderBy("createdAt", "desc"));
    const unsubEvents = onSnapshot(qEvents, (snap) => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qTeams = query(collection(db, "registrations"), where("status", "==", "approved"), orderBy("createdAt", "desc"));
    const unsubTeams = onSnapshot(qTeams, (snap) => {
      const teamsData = snap.docs.map(d => {
        const data = d.data() as any;
        return {
          id: d.id,
          name: data.teamName || data.name,
          teamName: data.teamName || data.name,
          logoUrl: data.logoUrl,
          game: data.game,
          gameMode: data.gameMode,
          members: data.members,
          eventId: data.eventId,
          userId: data.userId,
          status: data.status,
          ...d.data()
        };
      });
      setTeams(teamsData);
    });

    const userCache: Record<string, { displayName: string; email: string }> = {};

    const qRegs = query(collection(db, "registrations"), orderBy("createdAt", "desc"));
    const unsubRegs = onSnapshot(qRegs, async (snap) => {
      const regsWithUserDetails = await Promise.all(
        snap.docs.map(async (d) => {
          const regData = { id: d.id, ...d.data() } as any;
          if (regData.userId) {
            if (!userCache[regData.userId]) {
              try {
                const userDoc = await getDoc(doc(db, "users", regData.userId));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  userCache[regData.userId] = {
                    displayName: userData.displayName || "N/A",
                    email: userData.email || "N/A",
                  };
                }
              } catch (e) {
                console.error("Error fetching user:", e);
              }
            }
            const cached = userCache[regData.userId];
            if (cached) {
              regData.applicantDisplayName = cached.displayName;
              regData.applicantEmail = cached.email;
            }
          }
          return regData;
        })
      );
      setRegistrations(regsWithUserDetails);
    });

    const qMatches = query(collection(db, "matches"), orderBy("round", "asc"));
    const unsubMatches = onSnapshot(qMatches, (snap) => {
      setMatches(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qNews = query(collection(db, "news"), orderBy("createdAt", "desc"));
    const unsubNews = onSnapshot(qNews, (snap) => {
      setNews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("News fetch error:", err);
      setLoading(false);
    });

    return () => {
      unsubEvents();
      unsubTeams();
      unsubRegs();
      unsubMatches();
      unsubNews();
    };
  }, [user, authLoading, setLocation]);



  useEffect(() => {
    if (!selectedEventId) {
      setApprovedTeams([]);
      return;
    }

    const qApprovedTeams = query(
      collection(db, "registrations"),
      where("eventId", "==", selectedEventId),
      where("status", "==", "approved")
    );

    const unsubApprovedTeams = onSnapshot(qApprovedTeams, (snap) => {
      const teamsData = snap.docs.map(d => {
        const data = d.data() as any;
        return {
          id: d.id,
          name: data.teamName || data.name,
          teamName: data.teamName || data.name,
          logoUrl: data.logoUrl,
          game: data.game,
          gameMode: data.gameMode,
          members: data.members,
          eventId: data.eventId,
          userId: data.userId,
          status: data.status,
        };
      });
      setApprovedTeams(teamsData);
    });

    return () => unsubApprovedTeams();
  }, [selectedEventId]);

  if (authLoading || (user && user.role === "admin" && loading)) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-background gap-4">
        <Loader2 className="animate-spin w-12 h-12 text-primary" />
        <p className="text-muted-foreground animate-pulse">กำลังโหลดข้อมูลแผงควบคุม...</p>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-background gap-6 px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">ปฏิเสธการเข้าถึง</h1>
          <p className="text-muted-foreground max-w-md">คุณไม่มีสิทธิ์เข้าถึงหน้านี้ เฉพาะผู้ดูแลระบบเท่านั้น</p>
        </div>
        <Button onClick={() => setLocation("/")} variant="outline">กลับสู่หน้าหลัก</Button>
      </div>
    );
  }

  const sortedMatches = [...matches].sort((a, b) => {
    const eventA = events.find((event) => event.id === a.eventId)?.title || "";
    const eventB = events.find((event) => event.id === b.eventId)?.title || "";
    return `${eventA}|${a.round || ""}|${a.group || ""}`.localeCompare(`${eventB}|${b.round || ""}|${b.group || ""}`, "th");
  });
  const matchEventGroups = Array.from(new Set(matches.map((match) => match.eventId))).map((eventId) => ({
    id: eventId,
    title: events.find((event) => event.id === eventId)?.title || "ไม่ระบุรายการ",
    count: matches.filter((match) => match.eventId === eventId).length,
  }));

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDate || !newRegDeadline) {
      toast({ title: "ข้อมูลไม่ครบถ้วน", description: "กรุณากรอก ชื่องาน, วันที่เริ่ม, และวันปิดรับสมัคร", variant: "destructive" });
      return;
    }

    const registrationDeadlineWithTime = `${newRegDeadline}T${newRegDeadlineTime}:00+07:00`;
    setIsCreatingEvent(true);
    try {
      let bannerUrlToSave = newBannerUrl.trim();

      if (newBannerFile) {
        bannerUrlToSave = await uploadImageToCloudinary(newBannerFile);
      } else if (isExternalHttpUrl(bannerUrlToSave)) {
        bannerUrlToSave = await uploadImageToCloudinary(bannerUrlToSave);
      } else if (!bannerUrlToSave) {
        bannerUrlToSave = gameBanners[newGame] || DEFAULT_EVENT_BANNER;
      }

      await addDoc(collection(db, "events"), {
        title: newTitle,
        game: newGame,
        maxTeams: parseInt(newMaxTeams),
        membersPerTeam: parseInt(newMembers),
        maxSubstitutes: parseInt(newSubs),
        date: newDate,
        registrationDeadline: registrationDeadlineWithTime,
        bannerUrl: bannerUrlToSave,
        status: "upcoming",
        createdAt: serverTimestamp()
      });
      toast({ title: "สร้างการแข่งขันสำเร็จ" });
      setNewTitle("");
      setNewDate("");
      setNewRegDeadline("");
      setNewBannerUrl("");
      setNewBannerFile(null);
      setBannerPreview(null);
    } catch (error) {
      toast({ title: "เกิดข้อผิดพลาด", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !editTitle.trim() || !editDate || !editRegDeadline || !editRegDeadlineTime) {
      toast({ title: "ข้อมูลไม่ครบถ้วน", description: "กรุณากรอกชื่อรายการ วันเริ่มแข่งขัน และกำหนดปิดรับสมัคร", variant: "destructive" });
      return;
    }

    setIsSavingEvent(true);
    try {
      let bannerUrlToSave = editBannerUrl.trim();

      if (editBannerFile) {
        bannerUrlToSave = await uploadImageToCloudinary(editBannerFile);
      } else if (isExternalHttpUrl(bannerUrlToSave)) {
        bannerUrlToSave = await uploadImageToCloudinary(bannerUrlToSave);
      }

      if (!bannerUrlToSave) {
        bannerUrlToSave = gameBanners[editGame] || editingEvent.bannerUrl || DEFAULT_EVENT_BANNER;
      }

      await updateDoc(doc(db, "events", editingEvent.id), {
        title: editTitle.trim(),
        game: editGame,
        maxTeams: Number.parseInt(editMaxTeams, 10),
        membersPerTeam: Number.parseInt(editMembers, 10),
        maxSubstitutes: Number.parseInt(editSubs, 10),
        date: editDate,
        registrationDeadline: `${editRegDeadline}T${editRegDeadlineTime}:00+07:00`,
        bannerUrl: bannerUrlToSave,
        status: editStatus,
        updatedAt: serverTimestamp(),
      });

      toast({ title: "บันทึกการแก้ไขรายการแข่งขันสำเร็จ" });
      closeEventEditor();
    } catch (error) {
      toast({ title: "ไม่สามารถบันทึกการแก้ไขได้", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("ยืนยันการลบการแข่งขันนี้? ข้อมูลที่เกี่ยวข้องทั้งหมดจะหายไป")) return;
    try {
      await deleteDoc(doc(db, "events", id));
      toast({ title: "ลบการแข่งขันเรียบร้อย" });
    } catch (error) {
      toast({ title: "ผิดพลาดในการลบ", variant: "destructive" });
    }
  };

  const handleApproveRegistration = async (reg: any) => {
    try {
      await addDoc(collection(db, "teams"), {
        name: reg.teamName,
        game: reg.game,
        gameMode: reg.gameMode || "",
        logoUrl: reg.logoUrl || "",
        members: reg.members,
        eventId: reg.eventId,
        userId: reg.userId,
        status: "approved",
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, "registrations", reg.id), { status: "approved" });
      toast({ title: "อนุมัติทีมเรียบร้อย" });
    } catch (error) {
      toast({ title: "ผิดพลาดในการอนุมัติ", variant: "destructive" });
    }
  };

  const handleRejectRegistration = async (id: string) => {
    if (!confirm("ยืนยันการปฏิเสธการสมัคร?")) return;
    try {
      await updateDoc(doc(db, "registrations", id), { status: "rejected" });
      toast({ title: "ปฏิเสธการสมัครเรียบร้อย" });
    } catch (error) {
      toast({ title: "ผิดพลาด", variant: "destructive" });
    }
  };

  const handleDeleteRegistration = async (id: string) => {
    if (!confirm("ยืนยันการลบคำขอสมัคร?")) return;
    try {
      await deleteDoc(doc(db, "registrations", id));
      toast({ title: "ลบคำขอสมัครเรียบร้อย" });
    } catch (error) {
      toast({ title: "ผิดพลาด", variant: "destructive" });
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm("ยืนยันการลบทีมนี้? การกระทำนี้ไม่สามารถยกเลิกได้")) return;
    try {
      await deleteDoc(doc(db, "registrations", teamId));

      const matchesQuery = query(
        collection(db, "matches"),
        where("teamA", "==", teamId)
      );
      const matchesSnapshot = await getDocs(matchesQuery);
      for (const matchDoc of matchesSnapshot.docs) {
        await deleteDoc(doc(db, "matches", matchDoc.id));
      }

      const matchesQuery2 = query(
        collection(db, "matches"),
        where("teamB", "==", teamId)
      );
      const matchesSnapshot2 = await getDocs(matchesQuery2);
      for (const matchDoc of matchesSnapshot2.docs) {
        await deleteDoc(doc(db, "matches", matchDoc.id));
      }

      toast({ title: "ลบทีมเรียบร้อย" });
    } catch (error) {
      console.error("ผิดพลาดในการลบทีม:", error);
      toast({ title: "ผิดพลาด", variant: "destructive" });
    }
  };

  const handleNewsImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewsImageFile(file);
      setNewsImagePreview(URL.createObjectURL(file));
      setNewsImageUrl(""); // Clear URL input if a file is chosen
    } else {
      setNewsImageFile(null);
      setNewsImagePreview(null);
    }
  };

  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let imageUrlToSave = newsImageUrl.trim();
      if (newsImageFile) {
        setIsUploadingNewsImage(true);
        imageUrlToSave = await uploadImageToCloudinary(newsImageFile);
        setIsUploadingNewsImage(false);
      } else if (isExternalHttpUrl(imageUrlToSave)) {
        setIsUploadingNewsImage(true);
        imageUrlToSave = await uploadImageToCloudinary(imageUrlToSave);
        setIsUploadingNewsImage(false);
      }

      await addDoc(collection(db, "news"), {
        title: newsTitle,
        content: newsContent,
        imageUrl: imageUrlToSave || null,
        createdAt: serverTimestamp()
      });
      toast({ title: "ประกาศข่าวเรียบร้อย" });
      setNewNewsTitle("");
      setNewNewsContent("");
      setNewsImageFile(null);
      setNewsImagePreview(null);
      setNewsImageUrl("");
    } catch (error) {
      setIsUploadingNewsImage(false);
      toast({ title: "ผิดพลาดในการประกาศข่าว", variant: "destructive" });
    }
  };

  const handleDeleteNews = async (id: string) => {
    try {
      await deleteDoc(doc(db, "news", id));
      toast({ title: "ลบข่าวเรียบร้อย" });
    } catch (error) {
      toast({ title: "ผิดพลาดในการลบข่าว", variant: "destructive" });
    }
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatchTeamA || !newMatchTeamB || newMatchTeamA === newMatchTeamB) {
      toast({ title: "กรุณาเลือกทีมที่แตกต่างกัน", variant: "destructive" });
      return;
    }

    try {
      const matchData: any = {
        eventId: selectedEventId,
        round: newMatchRound,
        group: newMatchGroup,
        teamA: newMatchTeamA,
        teamB: newMatchTeamB,
        scoreA: 0,
        scoreB: 0,
        status: "pending",
        winsA: 0,
        lossesA: 0,
        drawsA: 0,
        winsB: 0,
        lossesB: 0,
        drawsB: 0,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, "matches"), matchData);
      toast({ title: "สร้างแมตช์เรียบร้อย" });
      setNewMatchTeamA("");
      setNewMatchTeamB("");
    } catch (error) {
      toast({ title: "ผิดพลาดในการสร้างแมตช์", variant: "destructive" });
    }
  };

  const handleUndoMatchResult = async (matchId: string) => {
    if (!confirm("ยืนยันการรีเซ็ตผลการแข่ง?")) return;
    try {
      const matchRef = doc(db, "matches", matchId);
      const matchSnap = await getDoc(matchRef);
      if (!matchSnap.exists()) return;

      const updateData: any = {
        status: "pending",
        scoreA: 0,
        scoreB: 0,
        winner: null
      };

      const matchData = matchSnap.data();
      if (matchData.winsA !== undefined) {
        updateData.winsA = 0;
        updateData.lossesA = 0;
        updateData.drawsA = 0;
        updateData.winsB = 0;
        updateData.lossesB = 0;
        updateData.drawsB = 0;
      }

      await updateDoc(matchRef, updateData);
      toast({ title: "รีเซ็ตผลการแข่งเรียบร้อย" });
    } catch (error) {
      toast({ title: "ผิดพลาดในการรีเซ็ตผลการแข่ง", variant: "destructive" });
    }
  };

  const handleUpdateScore = async (id: string, team: 'A' | 'B', score: number) => {
    try {
      await updateDoc(doc(db, "matches", id), {
        [`score${team}`]: score
      });
    } catch (error) {
      toast({ title: "ผิดพลาดในการอัปเดตคะแนน", variant: "destructive" });
    }
  };

  const handleUpdateRoVScore = async (matchId: string, team: 'A' | 'B', type: string, value: string) => {
    try {
      const matchRef = doc(db, "matches", matchId);
      const matchSnap = await getDoc(matchRef);
      if (!matchSnap.exists()) return;

      const otherTeam = team === 'A' ? 'B' : 'A';

      if (value === 'win') {
        await updateDoc(matchRef, {
          [`wins${team}`]: 1, [`draws${team}`]: 0, [`losses${team}`]: 0,
          [`wins${otherTeam}`]: 0, [`draws${otherTeam}`]: 0, [`losses${otherTeam}`]: 1
        });
      } else if (value === 'draw') {
        await updateDoc(matchRef, {
          [`wins${team}`]: 0, [`draws${team}`]: 1, [`losses${team}`]: 0,
          [`wins${otherTeam}`]: 0, [`draws${otherTeam}`]: 1, [`losses${otherTeam}`]: 0
        });
      } else if (value === 'loss') {
        await updateDoc(matchRef, {
          [`wins${team}`]: 0, [`draws${team}`]: 0, [`losses${team}`]: 1,
          [`wins${otherTeam}`]: 1, [`draws${otherTeam}`]: 0, [`losses${otherTeam}`]: 0
        });
      }
    } catch (error) {
      toast({ title: "ผิดพลาดในการอัปเดตสกอร์ RoV", variant: "destructive" });
    }
  };

  const handleUpdateMatchStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, "matches", id), { status });
      toast({ title: "อัปเดตสถานะแมตช์เรียบร้อย" });
    } catch (error) {
      toast({ title: "ผิดพลาดในการอัปเดตสถานะ", variant: "destructive" });
    }
  };

  const handleDeleteMatch = async (id: string) => {
    if (!confirm("ยืนยันการลบแมตช์?")) return;
    try {
      await deleteDoc(doc(db, "matches", id));
      toast({ title: "ลบแมตช์เรียบร้อย" });
    } catch (error) {
      toast({ title: "ผิดพลาดในการลบแมตช์", variant: "destructive" });
    }
  };

  const handleCrownChampion = async (eventId: string, teamId: string) => {
    if (!confirm("ยืนยันการมอบมงกุฎแชมป์เปี้ยนให้ทีมนี้?")) return;
    try {
      await updateDoc(doc(db, "events", eventId), {
        championTeamId: teamId
      });
      toast({ title: "ประกาศแชมป์เปี้ยนเรียบร้อย" });
    } catch (error) {
      toast({ title: "ผิดพลาดในการประกาศแชมป์เปี้ยน", variant: "destructive" });
    }
  };

  const fetchAuthUsers = async () => {
    if (!user) return;
    setLoadingUsers(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/auth-users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setAuthUsers(data);
      }
    } catch (error) {
      console.error("Error fetching auth users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`ยืนยันการลบผู้ใช้ "${userName}"? การดำเนินการนี้ไม่สามารถย้อนกลับได้`)) return;
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        toast({ title: "ลบผู้ใช้สำเร็จ" });
        fetchAuthUsers();
      } else {
        toast({ title: "ผิดพลาด", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "ผิดพลาด", variant: "destructive" });
    }
  };

  const handleToggleUserDisabled = async (userId: string, currentDisabled: boolean) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/users/${userId}/disable`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ disabled: !currentDisabled }),
      });
      const data = await response.json();
      if (response.ok) {
        toast({ title: currentDisabled ? "เปิดใช้งานผู้ใช้แล้ว" : "ปิดใช้งานผู้ใช้แล้ว" });
        fetchAuthUsers();
      } else {
        toast({ title: "ผิดพลาด", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "ผิดพลาด", variant: "destructive" });
    }
  };

  const handleRemoveChampion = async (eventId: string) => {
    if (!confirm("ยืนยันการยกเลิกตำแหน่งแชมป์เปี้ยน?")) return;
    try {
      await updateDoc(doc(db, "events", eventId), {
        championTeamId: null
      });
      toast({ title: "ยกเลิกตำแหน่งแชมป์เปี้ยนเรียบร้อย" });
    } catch (error) {
      toast({ title: "ผิดพลาดในการยกเลิกตำแหน่ง", variant: "destructive" });
    }
  };

  return (
    <div className="admin-shell px-2 sm:px-4">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-2 sm:px-4 lg:px-6">
        <header className="admin-surface overflow-hidden">
          <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">WNY E-LEAGUE</p>
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">ศูนย์จัดการการแข่งขัน</h1>
                <p className="mt-1 text-sm text-muted-foreground">ดูแลรายการแข่งขัน ผู้สมัคร ทีม แมตช์ และข่าวสารจากพื้นที่เดียว</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[27rem]">
              <div className="admin-stat"><p className="text-xs text-muted-foreground">รายการแข่ง</p><p className="mt-1 text-lg font-bold text-white">{events.length}</p></div>
              <div className="admin-stat"><p className="text-xs text-muted-foreground">คำขอสมัคร</p><p className="mt-1 text-lg font-bold text-white">{registrations.length}</p></div>
              <div className="admin-stat"><p className="text-xs text-muted-foreground">ทีมอนุมัติ</p><p className="mt-1 text-lg font-bold text-white">{teams.length}</p></div>
              <div className="admin-stat"><p className="text-xs text-muted-foreground">แมตช์ทั้งหมด</p><p className="mt-1 text-lg font-bold text-white">{matches.length}</p></div>
            </div>
          </div>
        </header>

        <Tabs defaultValue="events" className="grid items-start gap-5 xl:grid-cols-[13.5rem_minmax(0,1fr)]">
          <aside className="admin-surface overflow-hidden xl:sticky xl:top-24">
            <div className="admin-nav-label pt-4">เมนูจัดการ</div>
            <TabsList className="scrollbar-hide flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-0 bg-transparent p-2 shadow-none xl:flex-col xl:items-stretch xl:overflow-visible xl:p-3">
              <TabsTrigger value="events" className="shrink-0 px-3 py-2.5 xl:w-full xl:justify-start"><Trophy className="mr-2 h-4 w-4" />การแข่งขัน</TabsTrigger>
              <TabsTrigger value="registrations" className="shrink-0 px-3 py-2.5 xl:w-full xl:justify-start"><UserCheck className="mr-2 h-4 w-4" />คำขอสมัคร</TabsTrigger>
              <TabsTrigger value="teams" className="shrink-0 px-3 py-2.5 xl:w-full xl:justify-start"><Users className="mr-2 h-4 w-4" />ทีมที่อนุมัติ</TabsTrigger>
              <TabsTrigger value="matches" className="shrink-0 px-3 py-2.5 xl:w-full xl:justify-start"><Swords className="mr-2 h-4 w-4" />จัดการแมตช์</TabsTrigger>
              <TabsTrigger value="news" className="shrink-0 px-3 py-2.5 xl:w-full xl:justify-start"><Megaphone className="mr-2 h-4 w-4" />ข่าวสาร</TabsTrigger>
            </TabsList>
          </aside>

          <div className="min-w-0">
          <TabsContent value="events" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className="admin-surface overflow-hidden">
              <CardHeader className="border-b border-white/[0.07]">
                <CardTitle className="text-xl">สร้างการแข่งขันใหม่</CardTitle>
                <CardDescription>กำหนดรายละเอียด รายชื่อผู้เล่น วันเริ่มแข่งขัน และช่วงเวลาปิดรับสมัคร</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateEvent} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">หัวข้อการแข่งขัน</Label>
                      <Input id="title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="เช่น WNY VALORANT SEASON 1" required />
                    </div>
                    <div>
                      <Label htmlFor="game">เกม</Label>
                      <Select value={newGame} onValueChange={(val) => {
                        setNewGame(val);
                        setNewBannerUrl(gameBanners[val] || "");
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกเกม" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Valorant">Valorant</SelectItem>
                          <SelectItem value="RoV">RoV</SelectItem>
                          <SelectItem value="Free Fire">Free Fire</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="maxTeams">จำนวนทีมสูงสุด</Label>
                      <Input id="maxTeams" type="number" value={newMaxTeams} onChange={(e) => setNewMaxTeams(e.target.value)} required />
                    </div>
                    <div>
                      <Label htmlFor="members">สมาชิกหลักต่อทีม</Label>
                      <Input id="members" type="number" value={newMembers} onChange={(e) => setNewMembers(e.target.value)} required />
                    </div>
                    <div>
                      <Label htmlFor="subs">ตัวสำรองสูงสุด</Label>
                      <Input id="subs" type="number" value={newSubs} onChange={(e) => setNewSubs(e.target.value)} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date">วันที่แข่งขัน</Label>
                      <Input id="date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} required />
                    </div>
                    <div>
                      <Label htmlFor="deadline">ปิดรับสมัคร (วันที่)</Label>
                      <Input id="deadline" type="date" value={newRegDeadline} onChange={(e) => setNewRegDeadline(e.target.value)} required />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="deadlineTime">เวลาปิดรับสมัคร (HH:mm)</Label>
                    <Input id="deadlineTime" type="time" step="60" value={newRegDeadlineTime} onChange={(e) => setNewRegDeadlineTime(e.target.value)} required className="[color-scheme:dark]" />
                  </div>
                    <div>
                      <Label htmlFor="newBannerUrl">URL รูปภาพแบนเนอร์ (เลือกอย่างใดอย่างหนึ่ง)</Label>
                      <Input
                        id="newBannerUrl"
                        type="url"
                        placeholder="https://example.com/banner.jpg"
                        value={newBannerUrl}
                        onChange={(e) => {
                          setNewBannerUrl(e.target.value);
                          if (e.target.value) {
                            setNewBannerFile(null);
                            setBannerPreview(null);
                          }
                        }}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="newBannerFile">หรืออัปโหลดไฟล์แบนเนอร์</Label>
                      <Input
                        id="newBannerFile"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          handleBannerUpload(e);
                        }}
                      />
                      {bannerPreview && (
                        <div className="mt-2">
                          <img src={bannerPreview} alt="Banner Preview" className="w-full h-32 object-cover rounded-md" />
                        </div>
                      )}
                    </div>
                  <Button type="submit" className="w-full" disabled={isCreatingEvent}>{isCreatingEvent ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}สร้างการแข่งขัน</Button>
                </form>

                <div className="mt-8 mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">รายการในระบบ</p>
                    <h3 className="mt-1 text-xl font-semibold text-white">การแข่งขันที่มีอยู่</h3>
                    <p className="mt-1 text-sm text-muted-foreground">แก้ไขรายละเอียด ตั้งค่าถ่ายทอดสด หรือมอบตำแหน่งแชมป์ให้แต่ละรายการ</p>
                  </div>
                  <span className="self-start rounded-md border border-white/[0.08] bg-black/15 px-3 py-1.5 text-sm text-muted-foreground sm:self-auto">ทั้งหมด {events.length} รายการ</span>
                </div>
                <div className="space-y-3">
                  {events.map((event) => (
                    <Card key={event.id} className="overflow-hidden border-white/[0.08] bg-card">
                      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-white/[0.08] bg-black/20 sm:h-16 sm:w-24">
                            {event.bannerUrl ? <img src={event.bannerUrl} alt="" className="h-full w-full object-cover" /> : <Trophy className="m-auto h-full w-5 text-muted-foreground" />}
                          </div>
                          <div className="min-w-0">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <p className="truncate font-semibold text-white sm:text-lg">{event.title}</p>
                              <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-primary">{event.game}</span>
                            </div>
                            <p className="flex items-center gap-1 text-sm text-muted-foreground"><Calendar className="h-4 w-4" />วันเริ่มแข่งขัน: {formatThaiDate(event.date)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">สูงสุด {event.maxTeams || 16} ทีม · สมาชิก {event.membersPerTeam || 5} คน · สำรอง {event.maxSubstitutes || 0} คน</p>
                          </div>
                        </div>
                          <div className="flex flex-col items-start gap-2 sm:items-end">
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline" className="gap-1 bg-black/10" onClick={() => openEventEditor(event)} title="แก้ไขรายการแข่งขัน">
                                <Pencil className="h-4 w-4" />
                                <span className="hidden sm:inline">แก้ไข</span>
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteEvent(event.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                            {event.championTeamId ? (
                              <div className="flex items-center gap-2">
                                <Badge className="border border-accent/25 bg-accent/15 font-bold text-accent">
                                  แชมป์เปี้ยน: {teams.find(t => t.id === event.championTeamId)?.name || "แชมป์เปี้ยน"}
                                </Badge>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500" onClick={() => handleRemoveChampion(event.id)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Select onValueChange={(teamId) => handleCrownChampion(event.id, teamId)}>
                                <SelectTrigger className="h-8 w-[140px] border-accent/25 bg-accent/10 text-xs text-accent">
                                  <Trophy className="mr-1 h-3 w-3" />
                                  <SelectValue placeholder="มอบมงกุฎ" />
                                </SelectTrigger>
                                <SelectContent>
                                  {teams.filter(t => t.eventId === event.id).map(team => (
                                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="news" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className="admin-surface overflow-hidden">
              <CardHeader>
                <CardTitle className="text-xl">จัดการข่าวสาร</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateNews} className="space-y-4">
                  <div>
                    <Label htmlFor="newsTitle">หัวข้อข่าว</Label>
                    <Input id="newsTitle" value={newsTitle} onChange={(e) => setNewNewsTitle(e.target.value)} placeholder="หัวข้อข่าว" required />
                  </div>
                  <div>
                    <Label htmlFor="newsContent">เนื้อหา</Label>
                    <Textarea id="newsContent" value={newsContent} onChange={(e) => setNewNewsContent(e.target.value)} placeholder="เนื้อหาข่าว (สามารถใส่ข้อความยาวได้)" required rows={4} className="min-h-[100px]" />
                  </div>
                  <div>
                    <Label>รูปภาพประกอบ (ไม่บังคับ)</Label>
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      <div className="flex-1 space-y-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleNewsImageUpload}
                          className="cursor-pointer"
                        />
                        {newsImagePreview && (
                          <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-white/10">
                            <img src={newsImagePreview} alt="Preview" className="w-full h-full object-cover" />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2 h-7 w-7 p-0"
                              onClick={() => { setNewsImageFile(null); setNewsImagePreview(null); }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="text-xs text-muted-foreground">หรือใส่ URL รูปโดยตรง:</p>
                        <Input
                          value={newsImageUrl}
                          onChange={(e) => setNewsImageUrl(e.target.value)}
                          placeholder="https://example.com/image.jpg"
                          disabled={!!newsImageFile}
                        />
                      </div>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isCreatingEvent || isUploadingNewsImage}>
                    {isUploadingNewsImage ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />กำลังอัปโหลดรูป...</>
                    ) : (
                      <><Megaphone className="mr-2 h-4 w-4" />ประกาศข่าว</>
                    )}
                  </Button>
                </form>

                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileImage className="h-5 w-5 text-primary" />
                    ข่าวที่มีอยู่
                    <Badge variant="secondary">{news.length} รายการ</Badge>
                  </h3>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {news.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileImage className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p>ยังไม่มีประกาศ</p>
                      </div>
                    ) : (
                      news.map((item) => (
                        <Card key={item.id} className="bg-card/70 border-white/10 overflow-hidden">
                          <CardContent className="p-0">
                            {item.imageUrl && (
                              <div className="w-full aspect-[21/9] overflow-hidden">
                                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div className="p-4 flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-white truncate">{item.title}</p>
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{item.content}</p>
                                <p className="text-xs text-white/30 mt-2">
                                  {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" }) : ""}
                                </p>
                              </div>
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteNews(item.id)} className="shrink-0"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="registrations" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className="admin-surface overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl">คำขอสมัครเข้าร่วม</CardTitle>
                <Select value={selectedRegistrationEvent} onValueChange={setSelectedRegistrationEvent}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="เลือกการแข่งขัน" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    {events.map(event => (
                      <SelectItem key={event.id} value={event.id}>{event.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredRegistrations.length === 0 ? (
                    <p className="text-muted-foreground">ไม่มีคำขอสมัคร</p>
                  ) : (
                    filteredRegistrations.map((reg) => (
                      <Card key={reg.id} className="bg-card/70 border-white/10">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-3">
                            {reg.logoUrl && <AvatarCustom src={reg.logoUrl} name={reg.teamName} className="w-10 h-10" />}
                            {reg.teamName}
                          </CardTitle>
                          <CardDescription>สมัครสำหรับ: {events.find(e => e.id === reg.eventId)?.title || 'N/A'}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p><strong>ผู้สมัคร:</strong> {reg.applicantDisplayName} ({reg.applicantEmail})</p>
                          <p><strong>สมาชิก:</strong></p>
                          <div className="mt-4 space-y-2">
                            {reg.members && reg.members.map((member, index) => (
                              <div key={index} className="text-xs p-2 rounded-md bg-background">
                                <p><strong>ชื่อจริง:</strong> {member.name}</p>
                                <p><strong>ชื่อในเกม:</strong> {member.gameName}</p>
                                <p><strong>รหัสนักเรียน:</strong> {member.studentId}</p>
                                <p><strong>แผนก:</strong> {member.department}</p>
                                <p><strong>ชั้นปี:</strong> {member.grade}</p>

                                {member.isSubstitute && <p><strong>สถานะ:</strong> <span className="text-yellow-500">สตรีมเมอร์</span></p>}
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-end gap-2 mt-4">
                            {reg.status === 'pending' ? (
                              <>
                                <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => handleApproveRegistration(reg)}><UserCheck className="h-4 w-4 mr-2" />อนุมัติ</Button>
                                <Button size="sm" variant="destructive" onClick={() => handleRejectRegistration(reg.id)}><UserX className="h-4 w-4 mr-2" />ปฏิเสธ</Button>
                              </>
                            ) : (
                              <Badge variant={reg.status === 'approved' ? 'success' : 'destructive'}>{reg.status}</Badge>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteRegistration(reg.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teams" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className="admin-surface overflow-hidden">
              <CardHeader className="flex flex-col gap-3 border-b border-white/[0.06] pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-xl">ทีมที่ได้รับการอนุมัติ</CardTitle>
                  <CardDescription className="mt-1">เลือกการแข่งขันเพื่อดูและจัดการเฉพาะทีมในรายการนั้น</CardDescription>
                </div>
                <Select value={selectedTeamEvent} onValueChange={setSelectedTeamEvent}>
                  <SelectTrigger className="h-10 w-full border-white/10 bg-black/20 text-sm sm:w-[250px]">
                    <SelectValue placeholder="เลือกการแข่งขัน" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-card">
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>{event.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredTeams.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-white/10 bg-black/10 px-4 py-10 text-center text-sm text-muted-foreground">
                      ยังไม่มีทีมที่ได้รับการอนุมัติสำหรับรายการที่เลือก
                    </div>
                  ) : (
                    filteredTeams.map((team) => (
                      <Card key={team.id} className="bg-card/70 border-white/10">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-3">
                              <button
                                onClick={() => {
                                  setSelectedTeam(team);
                                  setShowTeamModal(true);
                                }}
                                className="cursor-pointer hover:opacity-80 transition-opacity"
                              >
                                {team.logoUrl && <AvatarCustom src={team.logoUrl} name={team.name} className="w-10 h-10" />}
                              </button>
                              {team.name}
                            </CardTitle>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteTeam(team.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              ลบทีม
                            </Button>
                          </div>
                          <CardDescription>เกม: {team.game} | สถานะ: {team.status}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p><strong>โหมดเกม:</strong> {team.gameMode || 'N/A'}</p>
                          <p><strong>สมาชิก:</strong></p>
                          <div className="mt-4 space-y-2">
                            {team.members && team.members.map((member, index) => (
                              <div key={index} className="text-xs p-2 rounded-md bg-background">
                                <p><strong>ชื่อจริง:</strong> {member.name}</p>
                                <p><strong>ชื่อในเกม:</strong> {member.gameName}</p>
                                <p><strong>รหัสนักเรียน:</strong> {member.studentId}</p>
                                <p><strong>แผนก:</strong> {member.department}</p>
                                <p><strong>ชั้นปี:</strong> {member.grade}</p>

                                {member.isSubstitute && <p><strong>สถานะ:</strong> <span className="text-yellow-500">สตรีมเมอร์</span></p>}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matches" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className="admin-surface overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl">จัดการแมตช์</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateMatch} className="space-y-4">
                  <div>
                    <Label htmlFor="selectedEventId">เลือกการแข่งขัน</Label>
                    <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="เลือกการแข่งขัน" />
                      </SelectTrigger>
                      <SelectContent>
                        {events.map(event => (
                          <SelectItem key={event.id} value={event.id}>{event.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="newMatchRound">ชื่อรอบ</Label>
                      <Input id="newMatchRound" value={newMatchRound} onChange={(e) => setNewMatchRound(e.target.value)} placeholder="เช่น รอบแก้ตัว, รอบชิงชนะเลิศ" required />
                    </div>
                    <div>
                      <Label htmlFor="newMatchGroup">กลุ่ม</Label>
                      <Input id="newMatchGroup" value={newMatchGroup} onChange={(e) => setNewMatchGroup(e.target.value)} placeholder="เช่น A" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="newMatchTeamA">ทีม A</Label>
                      <Select value={newMatchTeamA} onValueChange={setNewMatchTeamA} disabled={!selectedEventId || approvedTeams.length === 0}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="เลือกทีม A" />
                        </SelectTrigger>
                        <SelectContent>
                          {approvedTeams.length === 0 ? (
                            <SelectItem value="no-teams-found" disabled>
                              ไม่มีทีมที่ได้รับการอนุมัติ
                            </SelectItem>
                          ) : (
                            approvedTeams.map(team => (
                              <SelectItem key={team.id} value={team.id}>
                                <div className="flex items-center gap-2">
                                  {team.logoUrl && <AvatarCustom src={team.logoUrl} name={team.name} className="w-6 h-6" />}
                                  {team.name}
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="newMatchTeamB">ทีม B</Label>
                      <Select value={newMatchTeamB} onValueChange={setNewMatchTeamB} disabled={!selectedEventId || approvedTeams.length === 0}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="เลือกทีม B" />
                        </SelectTrigger>
                        <SelectContent>
                          {approvedTeams.length === 0 ? (
                            <SelectItem value="no-teams-found" disabled>
                              ไม่มีทีมที่ได้รับการอนุมัติ
                            </SelectItem>
                          ) : (
                            approvedTeams.map(team => (
                              <SelectItem key={team.id} value={team.id}>
                                <div className="flex items-center gap-2">
                                  {team.logoUrl && <AvatarCustom src={team.logoUrl} name={team.name} className="w-6 h-6" />}
                                  {team.name}
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isCreatingEvent}><Swords className="mr-2 h-4 w-4" />สร้างแมตช์</Button>
                </form>

                <h3 className="text-lg font-semibold mt-8 mb-4">แมตช์ที่มีอยู่</h3>
                {!selectedMatchEventId ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {matchEventGroups.length === 0 ? (
                      <div className="col-span-full rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-muted-foreground">
                        ยังไม่มีแมตช์ในระบบ
                      </div>
                    ) : matchEventGroups.map((eventGroup) => (
                      <button
                        key={eventGroup.id}
                        type="button"
                        onClick={() => setSelectedMatchEventId(eventGroup.id)}
                        className="rounded-xl border border-white/10 bg-card/70 p-5 text-left transition-all hover:border-primary/50 hover:bg-primary/10"
                      >
                        <p className="text-xs font-bold uppercase tracking-widest text-primary">รายการแข่งขัน</p>
                        <p className="mt-2 text-lg font-bold text-white">{eventGroup.title}</p>
                        <p className="mt-3 text-sm text-muted-foreground">มี {eventGroup.count} แมตช์ · กดเพื่อดูรอบและสาย</p>
                      </button>
                    ))}
                  </div>
                ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Button type="button" variant="outline" className="col-span-full justify-self-start" onClick={() => setSelectedMatchEventId(null)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> กลับไปเลือกรายการ
                  </Button>
                  {sortedMatches.filter((match) => match.eventId === selectedMatchEventId).map((match, index, list) => {
                    const teamA = teams.find(t => t.id === match.teamA);
                    const teamB = teams.find(t => t.id === match.teamB);
                    const eventTitle = events.find((event) => event.id === match.eventId)?.title || "ไม่ระบุรายการ";
                    const categoryKey = `${match.eventId}|${match.round || "ไม่ระบุรอบ"}|${match.group || "ไม่ระบุสาย"}`;
                    const previousMatch = list[index - 1];
                    const previousKey = previousMatch
                      ? `${previousMatch.eventId}|${previousMatch.round || "ไม่ระบุรอบ"}|${previousMatch.group || "ไม่ระบุสาย"}`
                      : "";
                    const showCategory = categoryKey !== previousKey;
                    return (
                      <Fragment key={match.id}>
                        {showCategory && (
                          <div className="col-span-full mt-6 first:mt-0 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3">
                            <p className="text-xs font-bold uppercase tracking-widest text-primary">{eventTitle}</p>
                            <p className="mt-1 font-semibold text-white">รอบ {match.round || "ไม่ระบุรอบ"} · สาย {match.group || "ไม่ระบุสาย"}</p>
                          </div>
                        )}
                      <Card className="bg-card/70 border-white/10">
                        <CardContent className="p-4">
                          <p className="font-semibold">{eventTitle} · รอบ {match.round || "ไม่ระบุรอบ"} | สาย {match.group || "ไม่ระบุสาย"}</p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              {teamA?.logoUrl && <AvatarCustom src={teamA.logoUrl} name={teamA.name} className="w-6 h-6" />}
                              <span>{teamA?.name || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={match.scoreA ?? 0}
                                onChange={(e) => handleUpdateScore(match.id, 'A', Number(e.target.value) || 0)}
                                className="w-16 text-center text-xs"
                                placeholder="0"
                              />
                              <span className="text-xs text-muted-foreground">pts</span>
                            </div>
                            <span className="mx-2">-</span>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">pts</span>
                              <Input
                                type="number"
                                value={match.scoreB ?? 0}
                                onChange={(e) => handleUpdateScore(match.id, 'B', Number(e.target.value) || 0)}
                                className="w-16 text-center text-xs"
                                placeholder="0"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span>{teamB?.name || "N/A"}</span>
                              {teamB?.logoUrl && <AvatarCustom src={teamB.logoUrl} name={teamB.name} className="w-6 h-6" />}
                            </div>
                          </div>
                            <div className="mt-4 space-y-3">
                              <div className="grid grid-cols-2 gap-4">

                                <div>
                                  <Label className="text-xs font-semibold mb-2 block">ผลลัพธ์ {teamA?.name || 'ทีม A'}</Label>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant={match.winsA === 1 && match.drawsA === 0 && match.lossesA === 0 ? "default" : "outline"}
                                      onClick={() => handleUpdateRoVScore(match.id, 'A', 'result', 'win')}
                                      className="flex-1"
                                    >
                                      ชนะ
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={match.drawsA === 1 && match.winsA === 0 && match.lossesA === 0 ? "default" : "outline"}
                                      onClick={() => handleUpdateRoVScore(match.id, 'A', 'result', 'draw')}
                                      className="flex-1"
                                    >
                                      เสมอ
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={match.lossesA === 1 && match.winsA === 0 && match.drawsA === 0 ? "default" : "outline"}
                                      onClick={() => handleUpdateRoVScore(match.id, 'A', 'result', 'loss')}
                                      className="flex-1"
                                    >
                                      แพ้
                                    </Button>
                                  </div>
                                </div>


                                <div>
                                  <Label className="text-xs font-semibold mb-2 block">ผลลัพธ์ {teamB?.name || 'ทีม B'}</Label>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant={match.winsB === 1 && match.drawsB === 0 && match.lossesB === 0 ? "default" : "outline"}
                                      onClick={() => handleUpdateRoVScore(match.id, 'B', 'result', 'win')}
                                      className="flex-1"
                                    >
                                      ชนะ
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={match.drawsB === 1 && match.winsB === 0 && match.lossesB === 0 ? "default" : "outline"}
                                      onClick={() => handleUpdateRoVScore(match.id, 'B', 'result', 'draw')}
                                      className="flex-1"
                                    >
                                      เสมอ
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={match.lossesB === 1 && match.winsB === 0 && match.drawsB === 0 ? "default" : "outline"}
                                      onClick={() => handleUpdateRoVScore(match.id, 'B', 'result', 'loss')}
                                      className="flex-1"
                                    >
                                      แพ้
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          <div className="flex justify-between items-center mt-4">
                            <Badge variant={match.status === "ongoing" ? "default" : match.status === "completed" ? "success" : "secondary"}>
                              {match.status === "pending" && "ยังไม่เริ่ม"}
                              {match.status === "ongoing" && "กำลังดำเนินการ"}
                              {match.status === "completed" && "จบการแข่งขันแล้ว"}
                            </Badge>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleUpdateMatchStatus(match.id, "pending")} disabled={match.status === "pending"}>
                                <Calendar className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleUpdateMatchStatus(match.id, "ongoing")} disabled={match.status === "ongoing"}>
                                <MonitorPlay className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleUpdateMatchStatus(match.id, "completed")} disabled={match.status === "completed"}>
                                <Trophy className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleUndoMatchResult(match.id)} title="รีเซ็ตผลการแข่ง">
                                <ArrowLeft className="h-4 w-4" />
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteMatch(match.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      </Fragment>
                    );
                  })}
                </div>
                )}
              </CardContent>            </Card>
          </TabsContent>

          </div>
        </Tabs>

        <Dialog open={isEventEditDialogOpen} onOpenChange={(open) => { if (!open) closeEventEditor(); }}>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto bg-card text-white">
            <DialogHeader>
              <DialogTitle>แก้ไขรายการแข่งขัน</DialogTitle>
              <DialogDescription>
                ปรับชื่อรายการ รูปแบนเนอร์ วันเริ่มแข่งขัน เวลาปิดรับสมัคร และรายละเอียดการแข่งขันได้จากหน้านี้
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateEvent} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="editTitle">ชื่อรายการแข่งขัน</Label>
                  <Input id="editTitle" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="editGame">เกม</Label>
                  <Select value={editGame} onValueChange={(value) => {
                    setEditGame(value);
                    setEditBannerUrl(gameBanners[value] || "");
                  }}>
                    <SelectTrigger id="editGame"><SelectValue placeholder="เลือกเกม" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Valorant">Valorant</SelectItem>
                      <SelectItem value="RoV">RoV</SelectItem>
                      <SelectItem value="Free Fire">Free Fire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="editMaxTeams">จำนวนทีมสูงสุด</Label>
                  <Input id="editMaxTeams" type="number" min="1" value={editMaxTeams} onChange={(e) => setEditMaxTeams(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="editMembers">สมาชิกหลักต่อทีม</Label>
                  <Input id="editMembers" type="number" min="1" value={editMembers} onChange={(e) => setEditMembers(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="editSubs">ตัวสำรองสูงสุด</Label>
                  <Input id="editSubs" type="number" min="0" value={editSubs} onChange={(e) => setEditSubs(e.target.value)} required />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="editDate">วันเริ่มแข่งขัน</Label>
                  <Input id="editDate" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="editStatus">สถานะการแข่งขัน</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger id="editStatus"><SelectValue placeholder="เลือกสถานะ" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">กำลังเปิดรับสมัคร</SelectItem>
                      <SelectItem value="open">เปิดรับสมัคร</SelectItem>
                      <SelectItem value="closed">ปิดรับสมัคร</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="editDeadline">วันปิดรับสมัคร</Label>
                  <Input id="editDeadline" type="date" value={editRegDeadline} onChange={(e) => setEditRegDeadline(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="editDeadlineTime">เวลาปิดรับสมัคร</Label>
                  <Input id="editDeadlineTime" type="time" step="60" className="[color-scheme:dark]" value={editRegDeadlineTime} onChange={(e) => setEditRegDeadlineTime(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-3 border-t border-white/10 pt-5">
                <div>
                  <Label htmlFor="editBannerUrl">URL รูปแบนเนอร์</Label>
                  <Input
                    id="editBannerUrl"
                    type="url"
                    placeholder="https://example.com/banner.jpg"
                    value={editBannerUrl}
                    onChange={(e) => {
                      setEditBannerUrl(e.target.value);
                      if (e.target.value) {
                        setEditBannerFile(null);
                        setEditBannerPreview(null);
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="editBannerFile">หรือเปลี่ยนรูปด้วยไฟล์ใหม่</Label>
                  <Input id="editBannerFile" type="file" accept="image/*" onChange={handleEditBannerUpload} />
                </div>
                {(editBannerPreview || editBannerUrl) && (
                  <img src={editBannerPreview || editBannerUrl} alt="ตัวอย่างแบนเนอร์การแข่งขัน" className="h-40 w-full rounded-lg border border-white/10 object-cover" />
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={closeEventEditor} disabled={isSavingEvent}>ยกเลิก</Button>
                <Button type="submit" disabled={isSavingEvent}>
                  {isSavingEvent && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  บันทึกการแก้ไข
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>


        {selectedTeam && (
          <TeamMembersModal
            isOpen={showTeamModal}
            onClose={() => setShowTeamModal(false)}
            teamName={selectedTeam.teamName || selectedTeam.name}
            teamLogo={selectedTeam.logoUrl}
            members={selectedTeam.members}
            showStudentId
          />
        )}
      </div>
    </div>
  );
}
