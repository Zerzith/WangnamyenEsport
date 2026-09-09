import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatThaiDate } from "@/lib/date";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Menu, X, Trophy, Upload, ImageIcon, User, Gamepad2, GraduationCap, BookOpen, Fingerprint, Users, Check } from "lucide-react";
import { motion } from "framer-motion";


const selectStyles = `
  select {
    background-color: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    color: white !important;
  }
  select option {
    background-color: #0f172a;
    color: white;
    padding: 8px;
  }
  select option:checked {
    background: #06b6d4;
    background-color: #06b6d4 !important;
    color: white;
  }
  select option:hover {
    background-color: #1e293b;
  }
`;

interface Event {
  id: string;
  title: string;
  game: string;
  date: string;
  description?: string;
  maxTeams?: number;
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


if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = selectStyles;
  document.head.appendChild(style);
}

export default function RegisterTeam() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const authUser = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [userRegistration, setUserRegistration] = useState<Registration | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const initialMember = { name: "", gameName: "", grade: "", department: "", studentId: "", phone: "", email: "" };

  const [formData, setFormData] = useState({
    teamName: "",
    members: [
      { ...initialMember },
      { ...initialMember },
      { ...initialMember }
    ],
    logoUrl: "",
  });

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const userMenuItems = [
    { href: "/my-teams", label: "ทีมของฉัน", icon: "Users" },
    { href: "/match-management", label: "จัดการแมตช์", icon: "Swords" },
    { href: "/register-team", label: "ลงทะเบียนทีม", icon: "Edit2" },
  ];


  useEffect(() => {
    const loadEvents = async () => {
      try {
        const eventsQuery = query(collection(db, "events"), orderBy("createdAt", "desc"));
        const eventsSnapshot = await getDocs(eventsQuery);
        const events = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
        setAllEvents(events);
        setLoading(false);
      } catch (error) {
        console.error("Error loading events:", error);
        setLoading(false);
      }
    };
    loadEvents();
  }, []);


  useEffect(() => {
    if (!selectedEventId) return;

    const eventDoc = allEvents.find(e => e.id === selectedEventId);
    if (eventDoc) {
      setEvent(eventDoc);
    }
  }, [selectedEventId, allEvents]);


  useEffect(() => {
    if (!selectedEventId || !authUser.user) return;

    const q = query(
      collection(db, "registrations"),
      where("eventId", "==", selectedEventId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const regs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Registration[];
      setRegistrations(regs);


      const userReg = regs.find((reg) => reg.userId === authUser.user?.uid);
      setUserRegistration(userReg || null);
    });

    return () => unsubscribe();
  }, [selectedEventId, authUser.user]);

  if (!authUser.user) {
    setLocation("/login");
    return null;
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;


    if (!file.type.startsWith('image/')) {
      setMessage({ type: "error", text: "กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น" });
      return;
    }

    setUploading(true);
    try {
      const logoUrl = await uploadImageToCloudinary(file);
      setFormData(prev => ({ ...prev, logoUrl }));
    } catch (error) {
      console.error("Error uploading file:", error);
      const uploadError = error as { message?: string };
      setMessage({ type: "error", text: uploadError.message || "เกิดข้อผิดพลาดในการอัปโหลด" });
    } finally {
      setUploading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser.user || !selectedEventId || !formData.teamName.trim()) return;

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
        eventId: selectedEventId,
        userId: authUser.user.uid,
        teamName: formData.teamName.trim(),
        members: filteredMembers,
        logoUrl: formData.logoUrl || "",
        status: "pending",
        createdAt: serverTimestamp(),
      };

      if (isEditing && userRegistration) {

        const { updateDoc, doc } = await import("firebase/firestore");
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

  const handleEditRegistration = () => {
    if (!userRegistration) return;


    const currentMembers = userRegistration.members.map(m => {
      if (typeof m === 'string') {
        return { ...initialMember, name: m };
      }
      return { ...initialMember, ...m };
    });


    while (currentMembers.length < 3) {
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
            <h1 className="text-4xl font-display font-bold text-white mb-2">ลงทะเบียนทีมแข่ง</h1>
            <p className="text-muted-foreground">เข้าร่วมการแข่งขัน WNY Esports Tournament</p>
          </div>
        </div>

        {}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-6 p-4 rounded-xl ${
              message.type === "success"
                ? "bg-green-500/10 border border-green-500/20 text-green-400"
                : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}
          >
            {message.text}
          </motion.div>
        )}


        <Card className="bg-zinc-900 border-white/10 p-8 rounded-xl mb-8 ">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <div className="w-1 h-6 bg-primary rounded-full" />
            เลือกรายการแข่งขัน
          </h2>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-primary focus:border-primary [color-scheme:dark]"
          >
            <option value="" style={{ backgroundColor: '#0f172a', color: 'white' }}>-- เลือกรายการแข่งขัน --</option>
            {allEvents.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} ({e.game}) - เริ่มแข่งขัน {formatThaiDate(e.date)}
              </option>
            ))}
          </select>
        </Card>

        {selectedEventId && event && (
          <div className="space-y-8">

            <Card className="bg-zinc-900 border-white/10 p-8 rounded-xl  shadow-xl ">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <div className="w-1 h-6 bg-primary rounded-full" />
                รายละเอียดการแข่งขัน
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900 border border-white/5">
                  <Trophy className="w-6 h-6 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">ชื่อการแข่งขัน</p>
                    <p className="text-white font-medium">{event.title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900 border border-white/5">
                  <Gamepad2 className="w-6 h-6 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">เกม</p>
                    <p className="text-white font-medium">{event.game}</p>
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
              showRegistrationForm ? (
                <Card className="bg-zinc-900 border-white/10 p-8 rounded-xl  shadow-xl ">
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <Trophy className="w-6 h-6 text-primary" /> ฟอร์มลงสมัครเข้าแข่งขัน
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
                            {uploading ? <Loader2 className="w-10 h-10 text-primary animate-spin" /> : <ImageIcon className="w-10 h-10 text-primary" />}
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
                          <Users className="w-4 h-4 text-primary" /> รายชื่อสมาชิกทีม
                        </label>
                        <div className="space-y-6">
                          {formData.members.map((member, index) => (
                            <div key={index} className="p-6 rounded-xl bg-zinc-900 border border-white/5 relative group space-y-4">
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
                                    required={index < 3}
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
                                    required={index < 3}
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
                                    placeholder="รหัส 10 หลัก"
                                    className="bg-zinc-900 border-white/10 h-11 rounded-xl focus:ring-primary"
                                    required={index < 3}
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
                                    placeholder="เช่น คอมพิวเตอร์"
                                    className="bg-zinc-900 border-white/10 h-11 rounded-xl focus:ring-primary"
                                    required={index < 3}
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
                                    placeholder="เช่น ปวช. 1"
                                    className="bg-zinc-900 border-white/10 h-11 rounded-xl focus:ring-primary"
                                    required={index < 3}
                                  />
                                </div>
                              </div>

                              {index >= 3 && (
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-6 text-xs text-primary hover:text-primary/80 hover:bg-primary/5 rounded-xl border border-dashed border-primary/30 w-full py-6"
                          onClick={() => setFormData({ ...formData, members: [...formData.members, { ...initialMember }] })}
                        >
                          + เพิ่มสมาชิกสำรอง (Substitute)
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-white/5">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setShowRegistrationForm(false);
                          setFormData({
                            teamName: "",
                            members: [
                              { ...initialMember },
                              { ...initialMember },
                              { ...initialMember }
                            ],
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
                        ยืนยันการลงสมัครแข่งขัน
                      </Button>
                    </div>
                  </form>
                </Card>
              ) : (
                <Button
                  onClick={() => setShowRegistrationForm(true)}
                  className="w-full bg-primary hover:bg-primary/80 py-8 text-xl font-bold rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
                >
                  ลงสมัครเข้าแข่งขันตอนนี้
                </Button>
              )
            ) : !showRegistrationForm && (
              <Card className="bg-zinc-900 border-white/10 p-8 rounded-xl border-primary/20 bg-primary/5 ">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="w-20 h-20 bg-primary/20 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-primary/30">
                    {userRegistration.logoUrl ? (
                      <img src={userRegistration.logoUrl} alt={userRegistration.teamName} className="w-full h-full object-cover" />
                    ) : (
                      <Check className="w-10 h-10 text-primary" />
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
                      <Trophy className="w-4 h-4" /> แก้ไขข้อมูล
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
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
