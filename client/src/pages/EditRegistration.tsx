import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, useParams } from "wouter";
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Upload, Menu, X, Trophy, ImageIcon, User, Gamepad2, GraduationCap, BookOpen, Fingerprint, Trash2, ArrowLeft, Edit2, Check } from "lucide-react";
import { motion } from "framer-motion";

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
  eventId: string;
  teamName: string;
  members: TeamMember[];
  logoUrl?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: any;
  userId: string;
}

export default function EditRegistration() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { registrationId } = useParams();
  const { toast } = useToast();

  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  const userMenuItems = [
    { href: "/my-teams", label: "ทีมของฉัน", icon: "Users" },
    { href: "/match-management", label: "จัดการแมตช์", icon: "Swords" },
    { href: "/register-team", label: "ลงทะเบียนทีม", icon: "Edit2" },
  ];

  useEffect(() => {
    if (!user || !registrationId) {
      setLocation("/my-teams");
      return;
    }

    const fetchRegistration = async () => {
      try {
        const docRef = doc(db, "registrations", registrationId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          toast({ title: "ไม่พบข้อมูลการสมัคร", variant: "destructive" });
          setLocation("/my-teams");
          return;
        }

        const data = docSnap.data() as Registration;


        if (data.userId !== user.uid) {
          toast({ title: "คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้", variant: "destructive" });
          setLocation("/my-teams");
          return;
        }

        setRegistration({ ...data, id: registrationId });


        const currentMembers = data.members.map(m => {
          if (typeof m === 'string') {
            return { ...initialMember, name: m };
          }
          return { ...initialMember, ...m };
        });


        while (currentMembers.length < 3) {
          currentMembers.push({ ...initialMember });
        }

        setFormData({
          teamName: data.teamName,
          members: currentMembers,
          logoUrl: data.logoUrl || "",
        });
        setLoading(false);
      } catch (error: any) {
        console.error("Error fetching registration:", error);
        toast({ title: "เกิดข้อผิดพลาดในการโหลดข้อมูล", variant: "destructive" });
        setLocation("/my-teams");
      }
    };

    fetchRegistration();
  }, [user, registrationId, setLocation, toast]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registration || !formData.teamName.trim()) return;

    setIsUpdating(true);
    try {
      const filteredMembers = formData.members.filter((m) => m.name.trim());

      await updateDoc(doc(db, "registrations", registration.id), {
        teamName: formData.teamName,
        members: filteredMembers,
        logoUrl: formData.logoUrl,
        updatedAt: serverTimestamp(),
      });

      setMessage({ type: "success", text: "แก้ไขข้อมูลทีมเรียบร้อยแล้ว!" });
      setTimeout(() => {
        setLocation("/my-teams");
      }, 2000);
    } catch (error) {
      console.error("Error updating registration:", error);
      setMessage({ type: "error", text: "ไม่สามารถดำเนินการได้" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!registration || !window.confirm("คุณแน่ใจหรือว่าต้องการยกเลิกการสมัครนี้?")) return;

    try {
      await deleteDoc(doc(db, "registrations", registration.id));
      setMessage({ type: "success", text: "ยกเลิกการสมัครเรียบร้อยแล้ว" });
      setTimeout(() => {
        setLocation("/my-teams");
      }, 2000);
    } catch (error) {
      console.error("Error deleting registration:", error);
      setMessage({ type: "error", text: "ไม่สามารถยกเลิกการสมัครได้" });
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

  if (!registration) {
    return null;
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
          <Button
            variant="ghost"
            onClick={() => setLocation("/my-teams")}
            className="text-muted-foreground hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับไปหน้าทีมของฉัน
          </Button>
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

        <form onSubmit={handleUpdate} className="space-y-8">

          <Card className="bg-zinc-900 border-white/10 p-8 rounded-xl  shadow-xl ">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Edit2 className="w-6 h-6 text-primary" /> แก้ไขรายละเอียดทีม
            </h2>

            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/10 rounded-xl bg-zinc-900 hover:bg-zinc-800 transition-all group relative overflow-hidden mb-8">
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
                  <Trophy className="w-4 h-4 text-primary" /> รายชื่อสมาชิกทีม
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

            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t border-white/5">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                className="h-14 px-8 rounded-xl"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                ยกเลิกการสมัคร
              </Button>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLocation("/my-teams")}
                  className="h-14 px-8 rounded-xl text-muted-foreground hover:text-white"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdating || uploading}
                  className="bg-primary hover:bg-primary/80 h-14 px-10 rounded-xl font-bold shadow-lg shadow-primary/20 text-lg"
                >
                  {isUpdating && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                  บันทึกการแก้ไขข้อมูล
                </Button>
              </div>
            </div>
          </Card>
        </form>
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
