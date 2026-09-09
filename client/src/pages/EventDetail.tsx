
import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation, Link } from "wouter";

import { useAuth } from "@/hooks/use-auth";
import { doc, getDoc, collection, addDoc, query, where, onSnapshot, serverTimestamp, updateDoc, getDocs, limit, orderBy, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowLeft, X, Upload, User, BookOpen, Fingerprint, Gamepad2, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { TeamMembersModal } from "@/components/TeamMembersModal";
import { formatThaiDate, formatThaiDateTime } from "@/lib/date";

interface Event {
  id: string;
  title: string;
  game: string;
  date: string;
  description?: string;
  maxTeams?: number;
  membersPerTeam?: number;
  maxSubstitutes?: number;
  registeredTeams?: number;
  bannerUrl?: string;
  status?: string;
  registrationDeadline?: string;
  championTeamId?: string | null;
}

interface TeamMember {
  name: string;
  gameName: string;
  grade: string;
  department: string;
  studentId: string;
  phone: string;
  email: string;
}

interface Registration {
  id: string;
  userId: string;
  teamName: string;
  members: TeamMember[];
  logoUrl?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: any;
}


const EventListItem = ({ item, index }: { item: Event, index: number }) => {
  const [registeredCount, setRegisteredCount] = useState(item.registeredTeams || 0);

  useEffect(() => {

    const qRegs = query(
      collection(db, "registrations"),
      where("eventId", "==", item.id),
      where("status", "==", "approved")
    );

    const unsubRegs = onSnapshot(qRegs, (snapshot) => {
      setRegisteredCount(snapshot.docs.length);
    });

    return () => unsubRegs();
  }, [item.id]);

  const isFull = item.maxTeams ? registeredCount >= item.maxTeams : false;



  const isExpired = item.registrationDeadline ? (() => {
    const deadline = new Date(item.registrationDeadline);

    if (!item.registrationDeadline.includes('T')) {
      deadline.setHours(23, 59, 59, 999);
    }
    return deadline < new Date();
  })() : false;
  const isOpen = (item.status === 'open' || (item.status !== 'closed' && !isExpired)) && !isFull;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.08, 0.4) }}
    >
      <Link href={`/event/${item.id}`}>
        <Card className={`group bg-zinc-900 border-white/10 hover:border-primary/30 transition-all cursor-pointer overflow-hidden h-full ${!isOpen || isFull ? 'opacity-90' : ''}`}>
          <div className="relative h-48 overflow-hidden">
            <img
              src={item.bannerUrl || "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop"}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 rounded-md bg-primary text-[10px] font-bold text-white uppercase tracking-wider">
                {item.game}
              </span>
            </div>
            <div className="absolute top-4 right-4 flex gap-2">
          {isFull ? (
            <span className="px-3 py-1 rounded-md bg-red-500 text-[10px] font-bold text-white uppercase tracking-wider">เต็มแล้ว</span>
          ) : !isOpen ? (
            <span className="px-3 py-1 rounded-md bg-red-500/80 text-[10px] font-bold text-white uppercase tracking-wider">ปิดรับสมัคร</span>
              ) : (
                <span className="px-3 py-1 rounded-md bg-green-500 text-[10px] font-bold text-white uppercase tracking-wider">เปิดรับสมัคร</span>
              )}
            </div>
          </div>
          <div className="p-6">
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">{item.title}</h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
              <span>เริ่มแข่งขัน: {formatThaiDate(item.date)}</span>
              <span className={isFull ? "text-red-400 font-bold" : ""}>
                {registeredCount} / {item.maxTeams || 16} ทีม
              </span>
            </div>
            {item.registrationDeadline && (
              <div className="text-sm text-white/60 mb-4">
                ปิดรับสมัคร: {formatThaiDateTime(item.registrationDeadline)}
              </div>
            )}
            {item.maxSubstitutes !== undefined && item.maxSubstitutes > 0 && (
              <div className="text-sm text-primary/80 mb-4">
                ตัวสำรองสูงสุด: {item.maxSubstitutes} คน
              </div>
            )}
            <Button className="w-full bg-zinc-900 hover:bg-primary hover:text-white transition-colors border-white/10">
              ดูรายละเอีย ด
            </Button>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
};

export default function EventDetail() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/event/:id");
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [userRegistration, setUserRegistration] = useState<Registration | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const initialMember = { name: "", gameName: "", grade: "", department: "", studentId: "", phone: "", email: "" };

  const membersPerTeam = event?.membersPerTeam ?? 3;
  const maxReserves = event?.maxSubstitutes ?? 2;

  const [formData, setFormData] = useState({
    teamName: "",
    members: [
      { ...initialMember },
      { ...initialMember },
      { ...initialMember },
      { ...initialMember },
      { ...initialMember }
    ],
    logoUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Registration | null>(null);
  const [showTeamModal, setShowTeamModal] = useState(false);

  const eventId = params?.id;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (eventId) {
        try {
          const eventDoc = await getDoc(doc(db, "events", eventId));
          if (eventDoc.exists()) {
            setEvent({ id: eventDoc.id, ...eventDoc.data() } as Event);
          }
        } catch (error) {
          console.error("Error loading event:", error);
        } finally {
          setLoading(false);
        }
      } else {
        try {
          const eventsQuery = query(collection(db, "events"), orderBy("createdAt", "desc"));
          const eventsSnapshot = await getDocs(eventsQuery);
          const events = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
          setAllEvents(events);
        } catch (error) {
          console.error("Error loading events:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadData();
  }, [eventId]);

  useEffect(() => {
    if (user) {
      const checkAdmin = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          setIsAdmin(userDoc.data()?.role === "admin");
        } catch (error) {
          console.error("Error checking admin:", error);
        }
      };
      checkAdmin();
    }
  }, [user]);

  useEffect(() => {
    if (!eventId) return;

    const q = query(
      collection(db, "registrations"),
      where("eventId", "==", eventId)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const regs = await Promise.all(snapshot.docs.map(async (doc) => {
        const registrationData = { id: doc.id, ...doc.data() } as Registration;
        if (registrationData.logoUrl) return registrationData;

        try {
            const teamQuery = query(collection(db, "teams"), where("name", "==", registrationData.teamName), where("eventId", "==", eventId), limit(1));
            const teamSnapshot = await getDocs(teamQuery);
            if (!teamSnapshot.empty) {
                const teamData = teamSnapshot.docs[0].data();
                if (teamData.logoUrl) {
                    registrationData.logoUrl = teamData.logoUrl;
                }
            }
        } catch (e) {
            console.error("Error fetching team logo:", e);
        }
        return registrationData;
      }));
      setRegistrations(regs);

      const userReg = regs.find((reg) => reg.userId === user?.uid);
      setUserRegistration(userReg || null);
    });

    return () => unsubscribe();
  }, [eventId, user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: "error", text: "กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น" });
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading file:", error);
      setMessage({ type: "error", text: "เกิดข้อผิดพลาดในการอัปโหลด" });
      setUploading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !eventId || !formData.teamName.trim()) return;

    setIsRegistering(true);
    try {
      const filteredMembers = formData.members
        .filter((member) => member.name.trim())
        .map((member) => ({
          name: member.name.trim(),
          gameName: member.gameName.trim(),
          grade: member.grade.trim(),
          department: member.department.trim(),
          studentId: member.studentId.trim(),
          phone: member.phone.trim(),
          email: member.email.trim(),
        }));
      const registrationData = {
        eventId,
        userId: user.uid,
        teamName: formData.teamName.trim(),
        members: filteredMembers,
        logoUrl: formData.logoUrl || "",
        status: "pending",
        createdAt: serverTimestamp(),
      };

      if (isEditing && userRegistration) {
        await updateDoc(doc(db, "registrations", userRegistration.id), {
          teamName: registrationData.teamName,
          members: filteredMembers,
          logoUrl: registrationData.logoUrl,
          updatedAt: serverTimestamp(),
        });
        setMessage({ type: "success", text: "แก้ไขข้อมูลทีมเรียบร้อยแล้ว!" });
      } else {
        await addDoc(collection(db, "registrations"), registrationData);
        setMessage({ type: "success", text: "ลงสมัครเข้าแข่งขันเรียบร้อยแล้ว!" });
      }
      setShowRegistrationForm(false);
      setIsEditing(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error registering/updating:", error);
      const firebaseError = error as { code?: string; message?: string };
      const reason = firebaseError.code === "permission-denied"
        ? "ไม่มีสิทธิ์บันทึกข้อมูล กรุณาเข้าสู่ระบบใหม่หรือติดต่อผู้ดูแล"
        : firebaseError.message || "กรุณาตรวจสอบข้อมูลแล้วลองใหม่อีกครั้ง";
      setMessage({ type: "error", text: `ไม่สามารถดำเนินการได้: ${reason}` });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!userRegistration || !window.confirm("คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการสมัครแข่งขัน?")) return;

    try {
      await deleteDoc(doc(db, "registrations", userRegistration.id));
      setMessage({ type: "success", text: "ยกเลิกการสมัครเรียบร้อยแล้ว" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error canceling registration:", error);
      setMessage({ type: "error", text: "ไม่สามารถยกเลิกการสมัครได้" });
    }
  };

  const handleEditRegistration = () => {
    if (!userRegistration) return;

    const currentMembers = userRegistration.members.map(m => {
      if (typeof m === 'string') {
        return { ...initialMember, name: m };
      }
      return { ...initialMember, ...m };
    });

    const minMembers = event?.membersPerTeam ?? 3;
    while (currentMembers.length < minMembers) {
      currentMembers.push({ ...initialMember });
    }

    setFormData({
      teamName: userRegistration.teamName,
      members: currentMembers,
      logoUrl: userRegistration.logoUrl || "",
    });
    setIsEditing(true);
    setShowRegistrationForm(true);
  };

  const handleApproveRegistration = async (registrationId: string) => {
    try {
      await updateDoc(doc(db, "registrations", registrationId), {
        status: "approved",
        approvedAt: serverTimestamp(),
      });
      setMessage({ type: "success", text: "อนุมัติการลงสมัครแล้ว" });
    } catch (error) {
      console.error("Error approving:", error);
      setMessage({ type: "error", text: "ไม่สามารถอนุมัติได้" });
    }
  };

  const handleRejectRegistration = async (registrationId: string) => {
    try {
      await updateDoc(doc(db, "registrations", registrationId), {
        status: "rejected",
        rejectedAt: serverTimestamp(),
      });
      setMessage({ type: "success", text: "ปฏิเสธการลงสมัครแล้ว" });
    } catch (error) {
      console.error("Error rejecting:", error);
      setMessage({ type: "error", text: "ไม่สามารถปฏิเสธได้" });
    }
  };

  if (loading) {
    return (
      <div className="w-full px-2 sm:px-4 lg:px-6 py-24">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground text-lg">กำลังโหลดข้อมูลการแข่งขัน...</p>
        </div>
      </div>
    );
  }

  if (!eventId) {
    return (
      <div className="w-full px-2 sm:px-4 lg:px-6 py-12">
        <div className="mb-12">
          <Button
            onClick={() => setLocation("/")}
            variant="ghost"
            className="mb-6 text-muted-foreground hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับไปหน้าแรก
          </Button>
          <h1 className="text-4xl font-display font-bold text-white mb-4">รายการแข่งขันทั้งหมด</h1>
          <p className="text-muted-foreground">รวมรายการแข่งขันอีสปอร์ตทั้งหมดของวิทยาลัยเทคนิควังน้ำเย็น</p>
        </div>

        {allEvents.length === 0 ? (
          <div className="text-center py-24 bg-zinc-900 rounded-xl border border-dashed border-white/10">
            <Gamepad2 className="w-20 h-20 mx-auto text-white/5 mb-6" />
            <h3 className="text-xl font-bold text-white/40">ไม่พบรายการแข่งขันในขณะนี้</h3>
            <Button onClick={() => setLocation("/")} variant="outline" className="mt-6">
              กลับไปหน้าแรก
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {allEvents.map((item, index) => (
              <EventListItem key={item.id} item={item} index={index} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!event) {
    return (
      <div className="w-full px-2 sm:px-4 lg:px-6 py-12">
        <div className="text-center">
          <p className="text-muted-foreground text-lg mb-4">ไม่พบข้อมูลการแข่งขันที่คุณต้องการ</p>
          <Button onClick={() => setLocation("/events")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            ดูรายการแข่งทั้งหมด
          </Button>
        </div>
      </div>
    );
  }

  const approvedCount = registrations.filter((r) => r.status === "approved").length;
  const pendingCount = registrations.filter((r) => r.status === "pending").length;
  const isFull = event.maxTeams ? approvedCount >= event.maxTeams : false;

  const isExpired = event.registrationDeadline ? (() => {
    const deadline = new Date(event.registrationDeadline);
    if (!event.registrationDeadline.includes('T')) {
      deadline.setHours(23, 59, 59, 999);
    }
    return deadline < new Date();
  })() : false;
  const isOpen = (event.status === 'open' || (event.status !== 'closed' && !isExpired)) && !isFull;

  return (
    <div className="w-full px-2 sm:px-4 lg:px-6 py-12">

      <Button
        onClick={() => setLocation("/events")}
        variant="ghost"
        className="mb-6 text-muted-foreground hover:text-white"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        กลับไปหน้ารายการ
      </Button>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center justify-between z-50 relative ${
            message.type === "success"
              ? "bg-green-500/20 border border-green-500/50 text-green-300"
              : "bg-red-500/20 border border-red-500/50 text-red-300"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}><X className="w-4 h-4" /></button>
        </div>
      )}


      <div className="relative h-80 rounded-xl overflow-hidden mb-8 border border-white/10 shadow-xl">
        <img
          src={event.bannerUrl || "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop"}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-4 py-1 rounded-lg bg-primary text-xs font-bold text-white uppercase tracking-wider">
              {event.game}
            </span>
            <span className={`px-4 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
              isOpen ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}>
              {isOpen ? 'เปิดรับสมัคร' : 'ปิดรับสมัคร'}
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-4">{event.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <div className="lg:col-span-2 space-y-8">
              {event.championTeamId && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8"
            >
              <Card className="bg-zinc-900 border-yellow-500/30 p-8 rounded-xl text-center">
                <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-tight">
                  แชมป์เปี้ยน
                </h2>
                <div className="flex flex-col items-center gap-4 mt-6">
                  {registrations.find(r => r.id === event.championTeamId)?.logoUrl && (
                    <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-yellow-500/30">
                      <img
                        src={registrations.find(r => r.id === event.championTeamId)?.logoUrl}
                        alt="Champion Logo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <p className="text-3xl font-bold text-yellow-400">
                    {registrations.find(r => r.id === event.championTeamId)?.teamName || "ไม่พบข้อมูลทีม"}
                  </p>
                </div>
              </Card>
            </motion.div>
          )}

          <Card className="bg-zinc-900 border-white/10 p-8 rounded-xl">
            <h2 className="text-2xl font-bold text-white mb-6">รายละเอียดการแข่งขัน</h2>       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="p-4 rounded-xl bg-zinc-900 border border-white/5">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">วันเริ่มแข่งขัน</p>
                  <p className="text-white font-medium">{formatThaiDate(event.date)}</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-zinc-900 border border-white/5">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">ทีมที่ลงสมัคร</p>
                  <p className="text-white font-medium">
                    {approvedCount} / {event.maxTeams || 16} ทีม
                  </p>
                </div>
              </div>
            </div>
            {event.description && (
              <div className="pt-6 border-t border-white/10">
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{event.description}</p>
              </div>
            )}
          </Card>


          {!userRegistration ? (
            isOpen && !isFull && !showRegistrationForm ? (
              <Button
                onClick={() => setShowRegistrationForm(true)}
                className="w-full bg-primary hover:bg-primary/80 py-8 text-xl font-bold rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
              >
                ลงสมัครเข้าแข่งขันตอนนี้
              </Button>
            ) : !isOpen ? (
              <Card className="bg-zinc-900 border-red-500/20 p-8 rounded-xl text-center">
                <h2 className="text-2xl font-bold text-white mb-2">ปิดรับสมัครแล้ว</h2>
                <p className="text-muted-foreground">รายการแข่งขันนี้ไม่ได้เปิดรับสมัครในขณะนี้</p>
              </Card>
            ) : isFull ? (
              <Card className="bg-zinc-900 border-yellow-500/20 p-8 rounded-xl text-center">
                <h2 className="text-2xl font-bold text-white mb-2">ทีมสมัครเต็มแล้ว</h2>
                <p className="text-muted-foreground">ขออภัย รายการแข่งขันนี้มีผู้สมัครครบจำนวนแล้ว</p>
              </Card>
            ) : null
          ) : !showRegistrationForm && (
            <Card className="bg-zinc-900 border-white/10 p-8 rounded-xl border-primary/20 bg-primary/5 ">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-20 h-20 bg-primary/20 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-primary/30">
                  {userRegistration.logoUrl ? (
                    <img src={userRegistration.logoUrl} alt={userRegistration.teamName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm text-muted-foreground">ทีม</span>
                  )}
                </div>
                <div className="flex-grow text-center md:text-left">
                  <h2 className="text-2xl font-bold text-white mb-1">คุณได้ลงสมัครแล้ว</h2>
                  <p className="text-muted-foreground mb-3">ทีมของคุณ: <span className="text-white font-bold">{userRegistration.teamName}</span></p>
                  <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-zinc-900 border border-white/10">
                    <span className="text-xs text-muted-foreground mr-2">สถานะ:</span>
                    <span className={`text-xs font-black uppercase tracking-widest ${
                      userRegistration.status === 'approved' ? 'text-green-400' :
                      userRegistration.status === 'pending' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>{userRegistration.status === 'approved' ? 'อนุมัติแล้ว' : userRegistration.status === 'pending' ? 'รอการตรวจสอบ' : 'ไม่ผ่านการคัดเลือก'}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
                  <Button
                    variant="outline"
                    className="border-white/10 hover:bg-zinc-900 text-white gap-2 rounded-xl h-11"
                    onClick={handleEditRegistration}
                  >
แก้ไขข้อมูล
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-2 rounded-xl h-11"
                    onClick={handleCancelRegistration}
                  >
                    ยกเลิกการสมัคร
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {showRegistrationForm && (
            <Card className="bg-zinc-900 border-white/10 p-8 rounded-xl">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                {isEditing ? (
                  <>แก้ไขรายละเอียดทีม</>
                ) : (
                  <>ฟอร์มลงสมัครเข้าแข่งขัน</>
                )}
              </h2>
              <form onSubmit={handleRegister} className="space-y-8">

                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/10 rounded-xl bg-zinc-900 hover:bg-zinc-800 transition-all group relative overflow-hidden">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  {formData.logoUrl ? (
                    <div className="relative w-32 h-32 mb-4 group/logo">
                      <img src={formData.logoUrl} alt="Team Logo Preview" className="w-full h-full object-cover rounded-xl ring-4 ring-primary/20" />
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-zinc-900 rounded-xl flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Upload className="w-8 h-8 text-white" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, logoUrl: "" }))}
                        className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center cursor-pointer"
                    >
                      <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                        {uploading ? <Loader2 className="w-10 h-10 text-primary animate-spin" /> : null}
                      </div>
                      <p className="text-white font-bold">อัปโหลดโลโก้ทีม</p>
                      <p className="text-xs text-muted-foreground mt-1">แนะนำขนาด 512x512px (PNG/JPG)</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-white/60 uppercase tracking-wider mb-2">ชื่อทีม (Team Name)</label>
                    <Input
                      value={formData.teamName}
                      onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                      placeholder="ระบุชื่อทีมของคุณ"
                      className="bg-zinc-900 border-white/10 h-14 rounded-xl focus:ring-primary text-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                      รายชื่อสมาชิกทีม
                      <span className="text-xs text-muted-foreground normal-case font-normal">
                        (หลัก {membersPerTeam} คน / สำรองได้ max {maxReserves} คน)
                      </span>
                    </label>
                    <div className="space-y-6">
                      {formData.members.map((member, index) => (
                        <div key={index} className={`p-6 rounded-xl bg-zinc-900 border relative group space-y-4 ${index < membersPerTeam ? 'border-white/5' : 'border-primary/30 bg-primary/5'}`}>
                          {index >= membersPerTeam && (
                            <span className="absolute -top-3 left-4 px-2 py-0.5 bg-primary/20 border border-primary/40 rounded text-[10px] font-bold text-primary uppercase tracking-wider">
                              สำรอง
                            </span>
                          )}
                          <div className="absolute -left-3 top-6 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white shadow-lg ring-4 ring-background">
                            {index + 1}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1 ml-1 flex items-center gap-1">
                                <User className="w-3 h-3" /> ชื่อจริง-นามสกุล
                              </label>
                              <Input
                                value={member.name}
                                onChange={(e) => {
                                  const newMembers = [...formData.members];
                                  newMembers[index] = { ...newMembers[index], name: e.target.value };
                                  setFormData({ ...formData, members: newMembers });
                                }}
                                placeholder="ระบุชื่อ-นามสกุลจริง"
                                className="bg-zinc-900 border-white/10 h-11 rounded-xl focus:ring-primary"
                                required={index < membersPerTeam}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1 ml-1 flex items-center gap-1">
                                <Gamepad2 className="w-3 h-3" /> ชื่อในเกม (IGN)
                              </label>
                              <Input
                                value={member.gameName}
                                onChange={e => {
                                  const newMembers = [...formData.members];
                                  newMembers[index] = { ...newMembers[index], gameName: e.target.value };
                                  setFormData({ ...formData, members: newMembers });
                                }}
                                placeholder="ระบุชื่อที่ใช้ในเกม"
                                className="bg-zinc-900 border-white/10 h-11 rounded-xl focus:ring-primary"
                                required={index < membersPerTeam}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1 ml-1 flex items-center gap-1">
                                <Fingerprint className="w-3 h-3" /> รหัสนักเรียน
                              </label>
                              <Input
                                value={member.studentId}
                                onChange={(e) => {
                                  const newMembers = [...formData.members];
                                  newMembers[index] = { ...newMembers[index], studentId: e.target.value };
                                  setFormData({ ...formData, members: newMembers });
                                }}
                                placeholder="รหัสบัตรนักเรียน/นักศึกษา"
                                className="bg-zinc-900 border-white/10 h-11 rounded-xl focus:ring-primary"
                                required={index < membersPerTeam}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1 ml-1 flex items-center gap-1">
                                <BookOpen className="w-3 h-3" /> แผนกวิชา
                              </label>
                              <Input
                                value={member.department}
                                onChange={e => {
                                  const newMembers = [...formData.members];
                                  newMembers[index] = { ...newMembers[index], department: e.target.value };
                                  setFormData({ ...formData, members: newMembers });
                                }}
                                placeholder="เช่น เทคโนโลยีสารสนเทศ"
                                className="bg-zinc-900 border-white/10 h-11 rounded-xl focus:ring-primary"
                                required={index < membersPerTeam}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1 ml-1 flex items-center gap-1">
                                <GraduationCap className="w-3 h-3" /> ชั้นปี
                              </label>
                              <Input
                                value={member.grade}
                                onChange={e => {
                                  const newMembers = [...formData.members];
                                  newMembers[index] = { ...newMembers[index], grade: e.target.value };
                                  setFormData({ ...formData, members: newMembers });
                                }}
                                placeholder="เช่น ปวช. 1 / ปวส. 1 / ปวส. 1 ทวิ"
                                className="bg-zinc-900 border-white/10 h-11 rounded-xl focus:ring-primary"
                                required={index < membersPerTeam}
                              />
                            </div>
                          </div>



                          {index >= membersPerTeam && (
                            <button
                              type="button"
                              onClick={() => {
                                const newMembers = formData.members.filter((_, i) => i !== index);
                                setFormData({ ...formData, members: newMembers });
                              }}
                              className="absolute -right-2 -top-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {formData.members.length < membersPerTeam + maxReserves && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-6 text-xs text-primary hover:text-primary/80 hover:bg-primary/5 rounded-xl border border-dashed border-primary/30 w-full py-6"
                        onClick={() => setFormData({ ...formData, members: [...formData.members, { ...initialMember }] })}
                      >
                        + เพิ่มสมาชิกสำรอง (เหลืออีก {membersPerTeam + maxReserves - formData.members.length} ตำแหน่ง)
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-white/5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowRegistrationForm(false);
                      setIsEditing(false);
                      setFormData({
                        teamName: "",
                        members: Array.from({ length: membersPerTeam }, () => ({ ...initialMember })),
                        logoUrl: ""
                      });
                    }}
                    className="h-14 px-8 rounded-xl text-muted-foreground hover:text-white"
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="submit"
                    disabled={isRegistering || uploading}
                    className="bg-primary hover:bg-primary/80 h-14 px-10 rounded-xl font-bold shadow-lg shadow-primary/20 text-lg"
                  >
                    {isRegistering && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                    {isEditing ? 'บันทึกการแก้ไขข้อมูล' : 'ยืนยันการลงสมัครแข่งขัน'}
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>


        <div className="space-y-8">

          <Card className="bg-zinc-900 border-white/10 p-6 rounded-xl">
            <h3 className="text-xl font-bold text-white mb-4">ข้อมูลการแข่งขัน</h3>
            <div className="space-y-3">
              {event.registrationDeadline && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                    <span className="text-red-400 text-xs font-bold">⏰</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">ปิดสมัคร</p>
                    <p className="text-sm text-white font-medium">{formatThaiDateTime(event.registrationDeadline)}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-primary text-xs font-bold">👥</span>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">สมาชิกหลักต่อทีม</p>
                  <p className="text-sm text-white font-medium">{membersPerTeam} คน</p>
                </div>
              </div>
              {maxReserves > 0 && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-primary text-xs font-bold">🔄</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">ตัวสำรองสูงสุด</p>
                    <p className="text-sm text-white font-medium">{maxReserves} คน</p>
                  </div>
                </div>
              )}
            </div>
          </Card>


          <Card className="bg-zinc-900 border-white/10 p-6 rounded-xl">
            <h3 className="text-xl font-bold text-white mb-6">
              ทีมที่เข้าร่วม ({approvedCount})
            </h3>
            <div className="space-y-3">
              {registrations.filter(r => r.status === 'approved').map((reg, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedTeam(reg);
                    setShowTeamModal(true);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-white/5 hover:bg-zinc-800 transition-colors group cursor-pointer text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-white font-bold overflow-hidden ring-2 ring-transparent group-hover:ring-primary/50 transition-all flex-shrink-0">
                    {reg.logoUrl ? (
                      <img src={reg.logoUrl} alt={reg.teamName} className="w-full h-full object-cover" />
                    ) : (
                      reg.teamName.charAt(0)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold truncate">{reg.teamName}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Verified Team</p>
                  </div>
                </button>
              ))}
              {approvedCount === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm italic">ยังไม่มีทีมที่ได้รับการอนุมัติ</p>
                </div>
              )}
            </div>
          </Card>


          {isAdmin && pendingCount > 0 && (
            <Card className="bg-zinc-900 border-white/10 p-6 rounded-xl border-yellow-500/20 ">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                รออนุมัติ ({pendingCount})
              </h3>
              <div className="space-y-4">
                {registrations.filter(r => r.status === 'pending').map((reg, index) => (
                  <div key={index} className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center text-white font-bold overflow-hidden">
                          {reg.logoUrl ? (
                            <img src={reg.logoUrl} alt={reg.teamName} className="w-full h-full object-cover" />
                          ) : (
                            reg.teamName.charAt(0)
                          )}
                        </div>
                        <p className="text-white font-bold">{reg.teamName}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs h-9" onClick={() => handleApproveRegistration(reg.id)}>
                        อนุมัติ
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10 text-xs h-9" onClick={() => handleRejectRegistration(reg.id)}>
                        ปฏิเสธ
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>


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
