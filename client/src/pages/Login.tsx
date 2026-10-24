import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Circle, Loader2, LogIn, UserPlus } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { auth, db } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";


export default function Login() {
  const { user, signInWithGoogle } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const passwordRequirements = [
    { id: "length", label: "อย่างน้อย 8 ตัวอักษร", met: Array.from(password).length >= 8 },
    { id: "number", label: "มีตัวเลขอย่างน้อย 1 ตัว", met: /[0-9]/.test(password) },
    { id: "lowercase", label: "มีภาษาอังกฤษตัวพิมพ์เล็ก (a–z)", met: /[a-z]/.test(password) },
    { id: "uppercase", label: "มีภาษาอังกฤษตัวพิมพ์ใหญ่ (A–Z)", met: /[A-Z]/.test(password) },
  ];
  const allPasswordRequirementsMet = passwordRequirements.every((requirement) => requirement.met);
  const passwordsMatch = password === confirmPassword;

  if (user) {
    setLocation("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isRegister && !allPasswordRequirementsMet) {
      const missingRequirements = passwordRequirements
        .filter((requirement) => !requirement.met)
        .map((requirement) => requirement.label)
        .join("、");
      toast({
        title: "รหัสผ่านยังไม่ครบตามเงื่อนไข",
        description: `กรุณาตรวจสอบ: ${missingRequirements}`,
        variant: "destructive",
      });
      return;
    }

    if (isRegister && !passwordsMatch) {
      toast({
        title: "รหัสผ่านไม่ตรงกัน",
        description: "กรุณากรอกรหัสผ่านทั้งสองช่องให้ตรงกัน",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });


        await setDoc(doc(db, "users", userCredential.user.uid), {
          displayName,
          role: "user",
          email: userCredential.user.email,
          createdAt: new Date().toISOString()
        });

        toast({ title: "สมัครสมาชิกสำเร็จ" });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "เข้าสู่ระบบสำเร็จ" });
      }
      setLocation("/");
    } catch (error: any) {
      toast({
        title: isRegister ? "สมัครสมาชิกไม่สำเร็จ" : "เข้าสู่ระบบไม่สำเร็จ",
        description: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      toast({ title: "เข้าสู่ระบบด้วย Google สำเร็จ" });
    } catch (error: any) {
      toast({
        title: "เข้าสู่ระบบด้วย Google ไม่สำเร็จ",
        description: error.message || "เกิดข้อผิดพลาด",
        variant: "destructive"
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-11rem)] items-center justify-center px-2 py-16 sm:px-4">
      <Card className="esports-panel w-full max-w-md border-white/[0.12] bg-zinc-900/75 shadow-[0_20px_60px_-30px_rgb(0_0_0_/_0.95),0_0_44px_-26px_rgb(34_211_238_/_0.32)]">
        <CardHeader className="space-y-2 pb-4 text-center">
          <CardTitle className="font-display text-3xl font-bold uppercase tracking-tight text-white">
            {isRegister ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
          </CardTitle>
          <CardDescription>
            {isRegister ? "สร้างบัญชีใหม่เพื่อเข้าใช้งานระบบ" : "กรอกข้อมูลเพื่อเข้าสู่บัญชีของคุณ"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div className="space-y-2">
                <Label>ชื่อ-นามสกุล</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="นาย/นางสาวเกมเมอร์ วังน้ำเย็น"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>อีเมล</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="noname@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>รหัสผ่าน</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={isRegister ? "new-password" : "current-password"}
                aria-describedby={isRegister ? "password-requirements" : undefined}
                required
              />
              {isRegister && (
                <div id="password-requirements" aria-live="polite" className="rounded-md border border-white/10 bg-black/10 p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">ข้อกำหนดรหัสผ่าน</p>
                  <ul className="space-y-1.5">
                    {passwordRequirements.map((requirement) => {
                      const StatusIcon = requirement.met ? CheckCircle2 : Circle;
                      return (
                        <li
                          key={requirement.id}
                          className={`flex items-center gap-2 text-xs ${requirement.met ? "text-emerald-300" : "text-muted-foreground"}`}
                        >
                          <StatusIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span className="min-w-0 flex-1">{requirement.label}</span>
                          <span className="shrink-0 font-medium">{requirement.met ? "ครบแล้ว" : "ยังไม่ครบ"}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="confirm-password">ยืนยันรหัสผ่าน</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
                  autoComplete="new-password"
                  aria-describedby="confirm-password-status"
                  required
                />
                <p
                  id="confirm-password-status"
                  aria-live="polite"
                  className={`text-xs ${confirmPassword.length === 0 ? "text-muted-foreground" : passwordsMatch ? "text-emerald-300" : "text-red-300"}`}
                >
                  {confirmPassword.length === 0
                    ? "กรอกรหัสผ่านอีกครั้งเพื่อยืนยัน"
                    : passwordsMatch
                      ? "รหัสผ่านตรงกัน"
                      : "รหัสผ่านไม่ตรงกัน"}
                </p>
              </div>
            )}
            <Button type="submit" className="h-11 w-full border-primary/45 bg-primary text-primary-foreground shadow-[0_14px_30px_-14px_rgb(34_211_238_/_0.9)] hover:bg-primary" disabled={isLoading || isGoogleLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isRegister ? (
                <><UserPlus className="w-4 h-4 mr-2" /> สมัครสมาชิก</>
              ) : (
                <><LogIn className="w-4 h-4 mr-2" /> เข้าสู่ระบบ</>
              )}
            </Button>
          </form>

          {!isRegister && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/[0.09]"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="rounded-full border border-white/[0.08] bg-zinc-900 px-3 py-0.5 text-xs text-muted-foreground">หรือ</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-11 w-full border-white/15 bg-white/[0.025] hover:border-primary/35 hover:bg-primary/10"
                onClick={handleGoogleSignIn}
                disabled={isLoading || isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FcGoogle className="w-4 h-4 mr-2" />
                )}
                เข้าสู่ระบบด้วย Google
              </Button>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t border-white/[0.07] pt-6">
          <Button
            variant="ghost"
            className="text-muted-foreground hover:bg-primary/10 hover:text-primary"
            onClick={() => {
              setIsRegister((current) => !current);
              setPassword("");
              setConfirmPassword("");
            }}
            disabled={isLoading || isGoogleLoading}
          >
            {isRegister ? "มีบัญชีอยู่แล้ว? เข้าสู่ระบบ" : "ยังไม่มีบัญชี? สมัครสมาชิก"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
