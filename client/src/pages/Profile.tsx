import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AvatarCustom } from "@/components/ui/avatar-custom";
import { Camera, Check, X, Loader2 } from "lucide-react";

// Cloudinary config
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/djubsqri6/image/upload`;
const UPLOAD_PRESET = "wangnamyenesport";

export default function Profile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [photoURL, setPhotoURL] = useState("");
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
            const userData = userDoc.data();
            setProfile(userData);
            setDisplayName(userData.displayName || "");
            setPhotoPreview(userData.photoURL || "");
            setPhotoURL(userData.photoURL || "");
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

      setPhotoURL(cloudinaryUrl);
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
    if (!user) return;

    setIsSaving(true);
    try {
      // Update Firebase Auth display name
      await updateProfile(user, {
        displayName: displayName.trim() || null,
        photoURL: photoURL || null,
      });

      // Update Firestore
      const firestoreData: any = {
        displayName: displayName.trim() || "",
        photoURL: photoURL || "",
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "users", user.uid), firestoreData);

      setProfile((prev: any) => ({
        ...prev,
        displayName: displayName.trim(),
        photoURL: photoURL,
      }));
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">โปรไฟล์</h1>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-500/10 border border-green-500/20 text-green-300"
                : "bg-red-500/10 border border-red-500/20 text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        <Card className="bg-zinc-900 border border-white/5 p-8">
          {/* Profile Photo Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
              <AvatarCustom 
                src={photoPreview || profile.photoURL} 
                name={profile.displayName || "Gamer"} 
                size="xl" 
              />
              {isEditing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="absolute bottom-0 right-0 bg-primary p-2.5 rounded-full hover:bg-primary/80 transition-colors disabled:opacity-50"
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Camera className="w-4 h-4 text-white" />
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
            {isEditing && (
              <p className="text-xs text-muted-foreground mt-2">กดอัปโหลดรูปใหม่</p>
            )}
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">ชื่อ</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={!isEditing}
              className="w-full bg-zinc-900 border border-white/5 rounded-md px-3 py-2 text-white placeholder-muted-foreground outline-none disabled:opacity-60"
              placeholder="ชื่อ-นามสกุล"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-8">
            {!isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                className="flex-1 bg-primary hover:bg-primary/80 text-white font-medium py-3"
              >
                แก้ไขโปรไฟล์
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving || isUploadingPhoto}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>บันทึก</>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setDisplayName(profile.displayName || "");
                    setPhotoPreview(profile.photoURL || "");
                    setPhotoURL(profile.photoURL || "");
                  }}
                  variant="outline"
                  className="flex-1 border-white/5 hover:bg-zinc-800 py-3"
                  disabled={isSaving || isUploadingPhoto}
                >
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
