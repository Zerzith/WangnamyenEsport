import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { collection, query, where, onSnapshot, updateDoc, doc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AvatarCustom } from "@/components/ui/avatar-custom";
import { Loader2, Upload, Edit2, Check, X, Trash2, Menu, ArrowLeft } from "lucide-react";
import axios from "axios";
import { deleteDoc } from "firebase/firestore";
import { motion } from "framer-motion";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "djubsqri6";
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "wangnamyenesport";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

interface TeamRegistration {
  id: string;
  teamName: string;
  game: string;
  logoUrl: string;
  status: "pending" | "approved" | "rejected";
  eventId: string;
  eventTitle?: string;
  members: any[];
}

export default function MyTeams() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const [teams, setTeams] = useState<TeamRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [uploadingTeamId, setUploadingTeamId] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement>>({});
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
      collection(db, "registrations"),
      where("userId", "==", user.uid)
    );

    // ดึง event titles ครั้งเดียวด้วย getDocs แทนการสร้าง onSnapshot ซ้อน
    const fetchEventTitles = async (): Promise<Record<string, string>> => {
      try {
        const eventsSnapshot = await getDocs(collection(db, "events"));
        const map: Record<string, string> = {};
        eventsSnapshot.docs.forEach((d) => {
          map[d.id] = (d.data() as any).title || "";
        });
        return map;
      } catch {
        return {};
      }
    };

    let eventMap: Record<string, string> = {};
    fetchEventTitles().then(m => { eventMap = m; });

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      // Refresh event map if needed
      if (Object.keys(eventMap).length === 0) {
        eventMap = await fetchEventTitles();
      }

      const teamsData = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      } as TeamRegistration));

      const enrichedTeams = teamsData.map(team => ({
        ...team,
        eventTitle: eventMap[team.eventId] || "Unknown Event",
      }));

      setTeams(enrichedTeams);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, setLocation]);

  const handleLogoChange = (teamId: string, file: File | null) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "ขนาดไฟล์ต้องไม่เกิน 5MB", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(prev => ({
        ...prev,
        [teamId]: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleUploadLogo = async (teamId: string, file: File | null) => {
    if (!file) return;

    try {
      setUploadingTeamId(teamId);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);

      const res = await axios.post(CLOUDINARY_URL, formData);
      const logoUrl = res.data.secure_url;

      await updateDoc(doc(db, "registrations", teamId), {
        logoUrl,
      });

      setEditingTeamId(null);
      setLogoPreview(prev => {
        const newPreview = { ...prev };
        delete newPreview[teamId];
        return newPreview;
      });

      toast({ title: "อัปเดตโลโก้สำเร็จ" });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({ 
        title: "เกิดข้อผิดพลาดในการอัปเดตโลโก้", 
        variant: "destructive" 
      });
    } finally {
      setUploadingTeamId(null);
    }
  };

  const handleDeleteRegistration = async (teamId: string) => {
    if (!window.confirm("คุณแน่ใจหรือว่าต้องการยกเลิกการสมัครนี้?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "registrations", teamId));
      toast({ title: "ยกเลิกการสมัครสำเร็จ" });
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({ 
        title: "เกิดข้อผิดพลาดในการยกเลิกการสมัคร", 
        variant: "destructive" 
      });
    }
  };

  const handleEditRegistration = (teamId: string) => {
    setLocation(`/edit-registration/${teamId}`);
  };

  if (loading) {
    return (
      <div className="w-full px-2 sm:px-4 lg:px-6 py-24 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">กำลังโหลดทีมของคุณ...</p>
      </div>
    );
  }

  if (!user) {
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
          <div>
            <h1 className="text-4xl font-bold text-white">ทีมของฉัน</h1>
            <p className="text-muted-foreground">จัดการและแก้ไขข้อมูลทีมของคุณ</p>
          </div>
        </div>

        {teams.length === 0 ? (
          <Card className="bg-zinc-900 border-dashed border-white/10 py-12 text-center">
            <p className="text-muted-foreground mb-4">คุณยังไม่ได้ลงทะเบียนทีมใด</p>
            <Button onClick={() => setLocation("/register-team")} className="bg-primary">
              ลงทะเบียนทีม
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map(team => (
              <Card key={team.id} className="bg-zinc-900 border-white/10 overflow-hidden">
                <CardContent className="p-6">
                  {/* Logo Section */}
                  <div className="mb-4 relative">
                    <div className="w-full aspect-square rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden">
                      {editingTeamId === team.id && logoPreview[team.id] ? (
                        <img 
                          src={logoPreview[team.id]} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <AvatarCustom 
                          src={team.logoUrl} 
                          name={team.teamName} 
                          size="lg"
                        />
                      )}
                    </div>

                    {/* Edit Logo Button */}
                    {editingTeamId === team.id ? (
                      <div className="mt-3 flex gap-2">
                        <input
                          ref={(el) => {
                            if (el) fileInputRefs.current[team.id] = el;
                          }}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleLogoChange(team.id, file);
                          }}
                          className="hidden"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fileInputRefs.current[team.id]?.click()}
                          className="flex-1"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          เลือกรูป
                        </Button>
                        <Button
                          size="sm"
                          className="bg-primary"
                          onClick={() => {
                            const file = fileInputRefs.current[team.id]?.files?.[0];
                            if (file) {
                              handleUploadLogo(team.id, file);
                            }
                          }}
                          disabled={uploadingTeamId === team.id}
                        >
                          {uploadingTeamId === team.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingTeamId(null);
                            setLogoPreview(prev => {
                              const newPreview = { ...prev };
                              delete newPreview[team.id];
                              return newPreview;
                            });
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingTeamId(team.id)}
                        className="w-full mt-3"
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        แก้ไขโลโก้
                      </Button>
                    )}
                  </div>

                  {/* Team Info */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">ชื่อทีม</p>
                      <p className="font-bold text-white">{team.teamName}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">เกม</p>
                      <p className="font-semibold text-white">{team.game}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">การแข่งขัน</p>
                      <p className="font-semibold text-white">{team.eventTitle}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">จำนวนสมาชิก</p>
                      <p className="font-semibold text-white">{team.members?.length || 0} คน</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">สถานะ</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${
                          team.status === "approved" ? "bg-green-500" :
                          team.status === "rejected" ? "bg-red-500" :
                          "bg-yellow-500"
                        }`} />
                        <span className="text-sm font-semibold text-white">
                          {team.status === "approved" ? "อนุมัติแล้ว" :
                           team.status === "rejected" ? "ปฏิเสธ" :
                           "รอการตรวจสอบ"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-6 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditRegistration(team.id)}
                      className="flex-1"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      แก้ไขข้อมูล
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteRegistration(team.id)}
                      className="flex-1"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      ยกเลิก
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Sidebar for User Menu */}
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

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-zinc-900/50  top-16"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
