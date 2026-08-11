
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  UserCheck, UserX, Eye, EyeOff, LayoutGrid, MonitorPlay,
  ArrowLeft
} from "lucide-react";
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, orderBy, where, serverTimestamp, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Cloudinary as CloudinaryCore } from "@cloudinary/url-gen";

// Cloudinary Configuration (Replace with your actual Cloudinary credentials)
const CLOUDINARY_CLOUD_NAME = "djubsqri6"; // Replace with your Cloudinary Cloud Name
const CLOUDINARY_UPLOAD_PRESET = "wangnamyenesport"; // Replace with your Cloudinary Upload Preset
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
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [showTeamModal, setShowTeamModal] = useState(false);

  // User Management State
  const [authUsers, setAuthUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);


  // News state
  const [newsTitle, setNewNewsTitle] = useState("");
  const [newsContent, setNewNewsContent] = useState("");

  // Form states for new event
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
    "RoV": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663358539715/NASojnuaGInFLzYF.png",
    "Free Fire": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663358539715/rUDJhrjRVtqbAmGZ.png",
    "Valorant": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663358539715/PBMkCQUSRSaFncUQ.png",
  };

  // Match Management State
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [newMatchRound, setNewMatchRound] = useState("1");
  const [newMatchGroup, setNewMatchGroup] = useState("A");
  const [newMatchTeamA, setNewMatchTeamA] = useState("");
  const [newMatchTeamB, setNewMatchTeamB] = useState("");
  const [approvedTeams, setApprovedTeams] = useState<any[]>([]);



  // Live Stream Dialog State
  const [isLiveStreamDialogOpen, setIsLiveStreamDialogOpen] = useState(false);
  const [liveStreamEventId, setLiveStreamEventId] = useState<string>("");
  const [liveStreamUrl, setLiveStreamUrl] = useState<string>("");

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

    // ดึงทีมจาก registrations ที่มี status approved เพื่อให้ได้ข้อมูลที่ถูกต้อง
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

    // Cache ข้อมูล user เพื่อไม่ต้อง fetch ซ้ำทุกครั้งที่ snapshot เปลี่ยน
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

    // ดึงทีมจาก collection "registrations" ที่มี status "approved" สำหรับการแข่งขันนี้
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

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDate || !newRegDeadline) {
      toast({ title: "ข้อมูลไม่ครบถ้วน", description: "กรุณากรอก ชื่องาน, วันที่เริ่ม, และวันปิดรับสมัคร", variant: "destructive" });
      return;
    }
    
    // Combine deadline date and time
    const registrationDeadlineWithTime = `${newRegDeadline}T${newRegDeadlineTime}`;
    setIsCreatingEvent(true);
    try {
      let bannerUrlToSave = newBannerUrl;

      if (newBannerFile) {
        const formData = new FormData();
        formData.append("file", newBannerFile);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload banner to Cloudinary");
        }

        const data = await response.json();
        bannerUrlToSave = data.secure_url;
      } else if (!bannerUrlToSave) {
        bannerUrlToSave = gameBanners[newGame] || "";
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

  const handleUpdateLiveStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveStreamEventId) {
      toast({ title: "ไม่พบ Event ID", variant: "destructive" });
      return;
    }
    try {
      await updateDoc(doc(db, "events", liveStreamEventId), {
        liveStreamUrl: liveStreamUrl,
        updatedAt: serverTimestamp()
      });
      toast({ title: "อัปเดต Live Stream สำเร็จ" });
      setIsLiveStreamDialogOpen(false);
      setLiveStreamEventId("");
      setLiveStreamUrl("");
    } catch (error) {
      toast({ title: "เกิดข้อผิดพลาดในการอัปเดต Live Stream", variant: "destructive" });
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
      // ลบทีมจาก registrations
      await deleteDoc(doc(db, "registrations", teamId));
      
      // ลบแมตช์ที่เกี่ยวข้องของทีมนี้
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

  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "news"), {
        title: newsTitle,
        content: newsContent,
        createdAt: serverTimestamp()
      });
      toast({ title: "ประกาศข่าวเรียบร้อย" });
      setNewNewsTitle("");
      setNewNewsContent("");
    } catch (error) {
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

  // User Management Functions
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
    <div className="min-h-screen bg-[#0a0e17] pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <ShieldAlert className="text-primary w-8 h-8" />
              แผงควบคุมผู้ดูแลระบบ
            </h1>
            <p className="text-muted-foreground">จัดการการแข่งขัน ทีม และข่าวสาร</p>
          </div>
        </div>

        <Tabs defaultValue="events" className="w-full">
          <TabsList className="bg-zinc-900 border border-white/10 w-full justify-start overflow-x-auto h-auto p-1 mb-8">
            <TabsTrigger value="events" className="py-2.5 px-4"><Trophy className="mr-2 h-4 w-4" />การแข่งขัน</TabsTrigger>
            <TabsTrigger value="registrations" className="py-2.5 px-4"><UserCheck className="mr-2 h-4 w-4" />คำขอสมัคร</TabsTrigger>
            <TabsTrigger value="teams" className="py-2.5 px-4"><Users className="mr-2 h-4 w-4" />ทีมที่อนุมัติ</TabsTrigger>
            <TabsTrigger value="matches" className="py-2.5 px-4"><Swords className="mr-2 h-4 w-4" />จัดการแมตช์</TabsTrigger>
            <TabsTrigger value="news" className="py-2.5 px-4"><Megaphone className="mr-2 h-4 w-4" />ข่าวสาร</TabsTrigger>
            <TabsTrigger value="users" className="py-2.5 px-4"><Users className="mr-2 h-4 w-4" />ผู้ใช้</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className="bg-zinc-900 border-white/10 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-xl">สร้างการแข่งขันใหม่</CardTitle>
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
                    <Input id="deadlineTime" type="time" value={newRegDeadlineTime} onChange={(e) => setNewRegDeadlineTime(e.target.value)} required />
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

                <h3 className="text-lg font-semibold mt-8 mb-4">การแข่งขันที่มีอยู่</h3>
                <div className="space-y-4">
                  {events.map((event) => (
                    <Card key={event.id} className="bg-card/70 border-white/10">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-lg">{event.title}</p>
                          <p className="text-sm text-muted-foreground">{event.game} | <Calendar className="inline-block h-4 w-4 mr-1" /> {event.date}</p>
                        </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => {
                                setLiveStreamEventId(event.id);
                                setLiveStreamUrl(event.liveStreamUrl || "");
                                setIsLiveStreamDialogOpen(true);
                              }}><MonitorPlay className="h-4 w-4" /></Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteEvent(event.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                            {event.championTeamId ? (
                              <div className="flex items-center gap-2">
                                <Badge className="bg-yellow-500 text-black font-bold">
                                  แชมป์เปี้ยน: {teams.find(t => t.id === event.championTeamId)?.name || "แชมป์เปี้ยน"}
                                </Badge>
                                <Button size="xs" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500" onClick={() => handleRemoveChampion(event.id)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Select onValueChange={(teamId) => handleCrownChampion(event.id, teamId)}>
                                <SelectTrigger className="h-8 w-[140px] text-xs bg-yellow-500/10 border-yellow-500/30 text-yellow-500">
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

          <TabsContent value="news" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className="bg-zinc-900 border-white/10 overflow-hidden">
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
                    <Input id="newsContent" value={newsContent} onChange={(e) => setNewNewsContent(e.target.value)} placeholder="เนื้อหาข่าว" required />
                  </div>
                  <Button type="submit" className="w-full" disabled={isCreatingEvent}><Megaphone className="mr-2 h-4 w-4" />ประกาศข่าว</Button>
                </form>

                <h3 className="text-lg font-semibold mt-8 mb-4">ข่าวที่มีอยู่</h3>
                <div className="space-y-4">
                  {news.map((item) => (
                    <Card key={item.id} className="bg-card/70 border-white/10">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{item.title}</p>
                          <p className="text-sm text-muted-foreground">{item.content}</p>
                        </div>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteNews(item.id)}><Trash2 className="h-4 w-4" /></Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="registrations" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className="bg-zinc-900 border-white/10 overflow-hidden">
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
                            {reg.logoUrl && <AvatarCustom src={reg.logoUrl} alt={reg.teamName} className="w-10 h-10" />}
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

          <TabsContent value="teams" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className="bg-zinc-900 border-white/10 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-xl">ทีมที่ได้รับการอนุมัติ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredTeams.length === 0 ? (
                    <p className="text-muted-foreground">ไม่มีทีมที่ได้รับการอนุมัติ</p>
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
                                {team.logoUrl && <AvatarCustom src={team.logoUrl} alt={team.name} className="w-10 h-10" />}
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

          <TabsContent value="matches" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className="bg-zinc-900 border-white/10 overflow-hidden">
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
                                  {team.logoUrl && <AvatarCustom src={team.logoUrl} alt={team.name} className="w-6 h-6" />}
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
                                  {team.logoUrl && <AvatarCustom src={team.logoUrl} alt={team.name} className="w-6 h-6" />}
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
                <div className="space-y-4">
                  {matches.map((match) => {
                    const teamA = teams.find(t => t.id === match.teamA);
                    const teamB = teams.find(t => t.id === match.teamB);
                    return (
                      <Card key={match.id} className="bg-card/70 border-white/10">
                        <CardContent className="p-4">
                          <p className="font-semibold">รอบ {match.round} | กลุ่ม {match.group}</p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              {teamA?.logoUrl && <AvatarCustom src={teamA.logoUrl} alt={teamA.name} className="w-6 h-6" />}
                              <span>{teamA?.name || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={match.scoreA}
                                onChange={(e) => handleUpdateScore(match.id, 'A', parseInt(e.target.value))}
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
                                value={match.scoreB}
                                onChange={(e) => handleUpdateScore(match.id, 'B', parseInt(e.target.value))}
                                className="w-16 text-center text-xs"
                                placeholder="0"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span>{teamB?.name || "N/A"}</span>
                              {teamB?.logoUrl && <AvatarCustom src={teamB.logoUrl} alt={teamB.name} className="w-6 h-6" />}
                            </div>
                          </div>
                          {(match.winsA !== undefined || match.winsB !== undefined) && (
                            <div className="mt-4 space-y-3">
                              <div className="grid grid-cols-2 gap-4">
                                {/* Team A Result */}
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

                                {/* Team B Result */}
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
                          )}
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
                    );
                  })}
                </div>
              </CardContent>            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className="bg-zinc-900 border-white/10 overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">จัดการผู้ใช้ระบบ</CardTitle>
                  <Button onClick={fetchAuthUsers} variant="outline" size="sm">
                    <Loader2 className={`mr-2 h-4 w-4 ${loadingUsers ? 'animate-spin' : ''}`} />
                    โหลดข้อมูล
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {authUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    กดปุ่ม "โหลดข้อมูล" เพื่อดูรายชื่อผู้ใช้ทั้งหมด
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-muted-foreground">
                          <th className="text-left p-3">ชื่อ</th>
                          <th className="text-left p-3">อีเมล</th>
                          <th className="text-left p-3">สถานะ</th>
                          <th className="text-left p-3">เข้าใช้งานล่าสุด</th>
                          <th className="text-right p-3">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {authUsers.map((authUser) => (
                          <tr key={authUser.uid} className="border-b border-white/5 hover:bg-white/[0.02]">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {authUser.photoURL ? (
                                  <img src={authUser.photoURL} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                                    <span className="text-xs">?</span>
                                  </div>
                                )}
                                <span className="text-white truncate max-w-[150px]">{authUser.displayName || "ไม่มีชื่อ"}</span>
                              </div>
                            </td>
                            <td className="p-3 text-muted-foreground">{authUser.email || "-"}</td>
                            <td className="p-3">
                              <Badge variant={authUser.disabled ? "destructive" : "secondary"}>
                                {authUser.disabled ? "ถูกปิด" : "เปิดใช้งาน"}
                              </Badge>
                            </td>
                            <td className="p-3 text-muted-foreground text-xs">
                              {authUser.lastSignInTime
                                ? new Date(authUser.lastSignInTime).toLocaleDateString("th-TH")
                                : "ไม่เคยเข้าใช้งาน"}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleUserDisabled(authUser.uid, authUser.disabled)}
                                  className="h-8 px-2"
                                >
                                  {authUser.disabled ? (
                                    <Eye className="w-4 h-4 text-green-400" />
                                  ) : (
                                    <EyeOff className="w-4 h-4 text-yellow-400" />
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteUser(authUser.uid, authUser.displayName || authUser.email || "Unknown")}
                                  className="h-8 px-2 border-destructive/30 hover:border-destructive"
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isLiveStreamDialogOpen} onOpenChange={setIsLiveStreamDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>อัปเดต Live Stream URL</DialogTitle>
              <DialogDescription>
                กรุณาใส่ URL ของ Live Stream สำหรับการแข่งขันนี้
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateLiveStream} className="space-y-4">
              <div>
                <Label htmlFor="liveStreamUrl">Live Stream URL</Label>
                <Input id="liveStreamUrl" type="url" value={liveStreamUrl} onChange={(e) => setLiveStreamUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=example" required />
              </div>
              <DialogFooter>
                <Button type="submit">บันทึก</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Team Members Modal */}
        {selectedTeam && (
          <TeamMembersModal
            isOpen={showTeamModal}
            onClose={() => setShowTeamModal(false)}
            teamName={selectedTeam.teamName || selectedTeam.name}
            teamLogo={selectedTeam.logoUrl}
            members={selectedTeam.members}
          />
        )}
      </div>
    </div>
  );
}
