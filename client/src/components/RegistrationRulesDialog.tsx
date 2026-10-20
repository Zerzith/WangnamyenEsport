import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { db } from "@/lib/firebase";

interface CompetitionRule {
  id: string;
  title: string;
  content: string;
  category?: string;
  order?: number;
}

const DEFAULT_RULES: CompetitionRule[] = [
  {
    id: "eligibility",
    category: "คุณสมบัติผู้เข้าแข่งขัน",
    title: "คุณสมบัติผู้สมัคร",
    content: "ผู้สมัครต้องมีคุณสมบัติตามเงื่อนไขของรายการแข่งขันที่เลือก",
  },
  {
    id: "registration-data",
    category: "คุณสมบัติผู้เข้าแข่งขัน",
    title: "ข้อมูลการลงทะเบียน",
    content: "กรอกข้อมูลจริงและครบถ้วน หากข้อมูลไม่ถูกต้องอาจถูกตัดสิทธิ์การแข่งขัน",
  },
  {
    id: "team-members",
    category: "คุณสมบัติผู้เข้าแข่งขัน",
    title: "จำนวนสมาชิกทีม",
    content: "จำนวนสมาชิกตัวจริงและตัวสำรองให้ยึดตามที่ระบุในหน้ารายการแข่งขัน",
  },
  {
    id: "attendance",
    category: "กติกาการแข่งขันทั่วไป",
    title: "การรายงานตัว",
    content: "ทีมต้องมารายงานตัวก่อนเวลาแข่งขันอย่างน้อย 15 นาที หากมาสายเกิน 10 นาทีอาจถูกปรับแพ้",
  },
  {
    id: "sportsmanship",
    category: "กติกาการแข่งขันทั่วไป",
    title: "มารยาทและน้ำใจนักกีฬา",
    content: "ห้ามใช้ถ้อยคำดูหมิ่นหรือแสดงพฤติกรรมไม่เหมาะสมต่อคู่แข่งและทีมงาน",
  },
  {
    id: "fair-play",
    category: "กติกาการแข่งขันทั่วไป",
    title: "ห้ามโกงการแข่งขัน",
    content: "ห้ามใช้โปรแกรมช่วยเล่นหรือกระทำการใด ๆ ที่เป็นการโกง หากตรวจพบอาจถูกตัดสิทธิ์",
  },
  {
    id: "game-rules",
    category: "กติกาเฉพาะเกม",
    title: "กติกาเฉพาะรายการ",
    content: "ปฏิบัติตามกติกาเฉพาะเกม ประกาศจากผู้จัด และคำตัดสินของกรรมการ",
  },
];

interface RegistrationRulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  eventName?: string;
}

export function RegistrationRulesDialog({
  open,
  onOpenChange,
  onContinue,
  eventName,
}: RegistrationRulesDialogProps) {
  const [rules, setRules] = useState<CompetitionRule[]>(DEFAULT_RULES);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setIsLoading(true);

    getDocs(query(collection(db, "rules"), orderBy("order", "asc")))
      .then((snapshot) => {
        const currentRules = snapshot.docs
          .map((ruleDoc) => ({ id: ruleDoc.id, ...ruleDoc.data() } as CompetitionRule))
          .filter((rule) => typeof rule.title === "string" && typeof rule.content === "string");
        if (!cancelled) setRules(currentRules.length > 0 ? currentRules : DEFAULT_RULES);
      })
      .catch((error) => {
        console.error("Error loading registration rules:", error);
        if (!cancelled) setRules(DEFAULT_RULES);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[88vh] max-h-[720px] min-h-0 w-[calc(100vw-2rem)] max-w-3xl flex-col gap-0 overflow-hidden border-white/10 bg-zinc-950 p-0 shadow-none">
        <DialogHeader className="shrink-0 border-b border-white/10 px-5 py-5 text-left sm:px-6">
          <DialogTitle className="text-xl sm:text-2xl">กฎกติกาก่อนสมัครแข่งขัน</DialogTitle>
          <DialogDescription>
            {eventName ? `รายการ ${eventName} — ` : ""}
            กรุณาอ่านกติกาก่อนดำเนินการสมัคร
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4 sm:px-6">
          {rules.map((rule) => (
            <article key={rule.id} className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
              {rule.category && (
                <p className="mb-2 text-xs font-semibold text-primary">{rule.category}</p>
              )}
              <h3 className="mb-1 font-bold text-white">{rule.title}</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{rule.content}</p>
            </article>
          ))}
        </div>

        <DialogFooter className="shrink-0 flex-col-reverse items-stretch border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link href="/rules" className="text-center text-sm text-primary underline-offset-4 hover:underline sm:text-left">
            อ่านกติกาฉบับเต็ม
          </Link>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-white/15 bg-transparent text-white hover:bg-white/5"
            >
              ย้อนกลับ
            </Button>
            <Button
              type="button"
              onClick={onContinue}
              disabled={isLoading}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "กำลังโหลดกติกา..." : "รับทราบและไปสมัคร"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
