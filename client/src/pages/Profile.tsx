import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AvatarCustom } from "@/components/ui/avatar-custom";
import { Camera, Check, X, Loader2, User, Mail, GraduationCap, Shield } from "lucide-react";

// Cloudinary config
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/djubsqri6/image/upload`;
const UPLOAD_PRESET = "wangnamyenesport";

interface UserProfile {
  displayName: string;
  email: string;
  studentId: string;
  photoURL?: string;
  bio?: string;
  team?: string;
}

export default function Profile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState<UserProfile>({
    displayName: "",
    email: "",
    studentId: "",
    photoURL: "",
    bio: "",
    team: "",
  });
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      setLocation("/login");
    }
  }, [user, setLocation]);

  // Load user profile
  useEffect(() => {
    if (user) {
      const loadProfile = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            setProfile(userData);
            setFormData(userData);
            setPhotoPreview(userData.photoURL || "");
          }
        } catch (error) {
          console.error("Error loading profile:", error);
          setMessage({ type: "error", text: "ไม่สามารถโหลดข้อมูลโปรไฟล์ได้" });
        }
      };
      loadProfile();
    }
  }, [user]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "ขนาดไฟล์ต้องไม่เกิน 5MB" });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploadingPhoto(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("upload_preset", UPLOAD_PRESET);

      const response = await fetch(CLOUDINARY_URL, {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      const cloudinaryUrl = data.secure_url;

      setFormData((prev) => ({
        ...prev,
        photoURL: cloudinaryUrl,
      }));

      setMessage({ type: "success", text: "อัปโหลดรูปภาพสำเร็จ" });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error("Error uploading photo:", error);
      setMessage({
        type: "error",
        text: `ไม่สามารถอัปโหลดรูปภาพได้: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
      setPhotoPreview(profile?.photoURL || "");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !auth.currentUser) return;

    setIsSaving(true);
    try {
      const authUpdate: any = {};
      if (formData.displayName) authUpdate.displayName = formData.displayName;
      if (formData.photoURL) authUpdate.photoURL = formData.photoURL;

      if (Object.keys(authUpdate).length > 0) {
        await updateProfile(auth.currentUser, authUpdate);
      }

      const firestoreData: any = {
        displayName: formData.displayName || "",
        email: formData.email || "",
        studentId: formData.studentId || "",
        photoURL: formData.photoURL || "",
        bio: formData.bio || "",
        team: formData.team || "",
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "users", user.uid), firestoreData);

      setProfile(formData);
      setIsEditing(false);
      setMessage({ type: "success", text: "บันทึกข้อมูลเรียบร้อยแล้ว" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error saving profile:", error);
      const errorMessage = error instanceof Error ? error.message : "ไม่สามารถบันทึกข้อมูลได้";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-4">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-display font-bold text-white mb-8 uppercase tracking-wider">โปรไฟล์ของฉัน</h1>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === "success"
                ? "bg-green-500/20 border border-green-500/50 text-green-300"
                : "bg-red-500/20 border border-red-500/50 text-red-300"
            }`}
          >
            {message.type === "success" ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        <Card className="bg-zinc-900 border-white/10 p-8 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
          
          {/* Profile Photo Section */}
          <div className="flex flex-col items-center mb-10">
            <div className="relative group">
              <AvatarCustom 
                src={photoPreview || profile.photoURL} 
                name={profile.displayName || "Gamer"} 
                size="xl" 
                className="ring-4 ring-primary/20"
              />
              {isEditing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="absolute bottom-0 right-0 bg-primary p-3 rounded-full hover:bg-primary/80 transition-all shadow-lg disabled:opacity-50"
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                disabled={isUploadingPhoto}
                className="hidden"
              />
            </div>
            <div className="mt-4 text-center">
              <h2 className="text-2xl font-bold text-white">{profile.displayName}</h2>
              <p className="text-accent text-xs font-bold uppercase tracking-widest mt-1">
                {profile.team || "No Team"}
              </p>
            </div>
          </div>

          {/* Form Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <User className="w-3 h-3" /> ชื่อ-นามสกุล
              </label>
              <Input
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                disabled={!isEditing}
                className="bg-zinc-900 border-white/10 focus:border-primary/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Mail className="w-3 h-3" /> อีเมล
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!isEditing}
                className="bg-zinc-900 border-white/10 focus:border-primary/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <GraduationCap className="w-3 h-3" /> รหัสนักศึกษา
              </label>
              <Input
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                disabled={!isEditing}
                className="bg-zinc-900 border-white/10 focus:border-primary/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Shield className="w-3 h-3" /> ทีม
              </label>
              <Input
                value={formData.team || ""}
                onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                disabled={!isEditing}
                className="bg-zinc-900 border-white/10 focus:border-primary/50"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">ประวัติส่วนตัว</label>
              <textarea
                value={formData.bio || ""}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                disabled={!isEditing}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-muted-foreground focus:border-primary/50 outline-none transition-all resize-none"
                rows={3}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-10">
            {!isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                className="flex-1 bg-primary hover:bg-primary/80 text-white font-bold py-6"
              >
                แก้ไขข้อมูลโปรไฟล์
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving || isUploadingPhoto}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6"
                >
                  {isSaving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      บันทึกการเปลี่ยนแปลง
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setFormData(profile);
                    setPhotoPreview(profile.photoURL || "");
                  }}
                  variant="outline"
                  className="flex-1 border-white/10 hover:bg-zinc-900 py-6"
                  disabled={isSaving || isUploadingPhoto}
                >
                  <X className="w-5 h-5 mr-2" />
                  ยกเลิก
                </Button>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
