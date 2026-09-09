import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { AvatarCustom } from "@/components/ui/avatar-custom";

interface Rule {
  id: string;
  title: string;
  content: string;
  category: string;
  order: number;
  createdAt?: any;
}

interface Team {
  id: string;
  name: string;
  logoUrl?: string;
  eventId: string;
  status: string;
  members?: any[];
}

export default function Rules() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [approvedTeams, setApprovedTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const rulesQuery = query(collection(db, "rules"), orderBy("order", "asc"));
    const rulesUnsubscribe = onSnapshot(rulesQuery, (snapshot) => {
      const rulesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rule));
      setRules(rulesData);
    }, (error) => {
      console.error("Error fetching rules:", error);
    });


    const teamsQuery = query(
      collection(db, "registrations"),
      where("status", "==", "approved"),
      orderBy("createdAt", "desc")
    );
    const teamsUnsubscribe = onSnapshot(teamsQuery, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.teamName,
          logoUrl: data.logoUrl,
          eventId: data.eventId,
          status: data.status,
          members: data.members || []
        } as Team;
      });
      setApprovedTeams(teamsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching teams:", error);
      setLoading(false);
    });

    return () => {
      rulesUnsubscribe();
      teamsUnsubscribe();
    };
  }, []);


  const defaultRules = [
    {
      category: "คุณสมบัติผู้เข้าแข่งขัน",
      items: [
        { title: "สถานะนักเรียนนักศึกษา", content: "ต้องเป็นนักเรียนหรือนักศึกษาของวิทยาลัยเทคนิควังน้ำเย็นที่กำลังศึกษาอยู่เท่านั้น" },
        { title: "การลงทะเบียน", content: "ผู้สมัครต้องลงทะเบียนผ่านระบบ WNY-E-LEAGUE ด้วยข้อมูลจริงและครบถ้วน" },
        { title: "จำนวนสมาชิก", content: "แต่ละทีมต้องมีสมาชิกตัวจริง 5 คน และตัวสำรองได้ไม่เกิน 2 คน (ถ้ามี)" }
      ]
    },
    {
      category: "กฎกติกาการแข่งขัน (ทั่วไป)",
      items: [
        { title: "ความตรงต่อเวลา", content: "ทีมต้องมารายงานตัวก่อนเวลาแข่งขันอย่างน้อย 15 นาที หากมาช้าเกิน 10 นาทีจะถูกปรับแพ้บายทันที" },
        { title: "มารยาทการแข่งขัน", content: "ห้ามใช้ถ้อยคำหยาบคาย ดูหมิ่น หรือแสดงพฤติกรรมที่ไม่เหมาะสมต่อคู่แข่งและทีมงาน" },
        { title: "การโกงและโปรแกรมช่วยเล่น", content: "ห้ามใช้โปรแกรมช่วยเล่นหรือการกระทำใดๆ ที่เป็นการโกง หากตรวจพบจะถูกตัดสิทธิ์และลงโทษทางวินัย" }
      ]
    },
    {
      category: "กติกาเฉพาะเกม RoV",
      items: [
        { title: "โหมดการแข่ง", content: "ใช้โหมด 5v5 Tournament Mode (Calibrate) ในการแข่งขัน" },
        { title: "การแบน/เลือกฮีโร่", content: "ใช้ระบบ Ban/Pick ตามมาตรฐานการแข่งขัน Global" },
        { title: "การหลุดจากการเชื่อมต่อ", content: "หากมีผู้เล่นหลุดให้กดหยุดเกม (Pause) ทันที และแจ้งกรรมการ (อนุญาตให้หยุดได้ทีมละ 2 ครั้ง ครั้งละไม่เกิน 5 นาที)" }
      ]
    }
  ];

  if (loading) {
    return (
      <div className="h-[50vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full px-2 sm:px-4 lg:px-6 py-12">
      <div className="mb-12">
        <div className="mb-6">
          <h1 className="text-4xl font-display font-bold text-white uppercase tracking-tight">กฎกติกาการแข่งขัน</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl text-lg">
          กรุณาอ่านและทำความเข้าใจกฎการแข่งขันทั้งหมด เพื่อความเป็นธรรมและความเรียบร้อยในการแข่งขัน WNY Esports Tournament
        </p>
      </div>

      <Tabs defaultValue="rules" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-10 bg-zinc-900 p-1 rounded-xl border border-white/10">
          <TabsTrigger value="rules" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
            กฎการแข่งขัน
          </TabsTrigger>
          <TabsTrigger value="approved" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
            ทีมที่ผ่านการคัดเลือก
          </TabsTrigger>
        </TabsList>

        {}
        <TabsContent value="rules" className="space-y-12">
          {rules.length > 0 ? (

            <div className="grid grid-cols-1 gap-8">
              {rules.map((rule, index) => (
                <motion.div
                  key={rule.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-zinc-900 border-white/5 hover:border-primary/20 transition-all overflow-hidden group">
                    <div className="p-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{rule.title}</h3>
                        <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{rule.content}</p>
                        {rule.category && (
                          <span className="inline-block mt-4 px-3 py-1 rounded-md bg-zinc-900 text-[10px] font-bold text-primary uppercase tracking-wider border border-white/10">
                            {rule.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (

            <div className="space-y-12">
              {defaultRules.map((cat, catIndex) => (
                <div key={catIndex} className="space-y-6">
                  <h2 className="text-2xl font-display font-bold text-white flex items-center gap-3">
                    <div className="w-2 h-8 bg-primary rounded-full" />
                    {cat.category}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cat.items.map((item, itemIndex) => (
                      <motion.div
                        key={itemIndex}
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: itemIndex * 0.05 }}
                      >
                        <Card className="bg-zinc-900 border-white/5 hover:border-primary/30 transition-all h-full">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg text-primary">
                              {item.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {item.content}
                            </p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-8">
            <div>
              <h3 className="text-2xl font-bold text-yellow-300 mb-3">ประกาศสำคัญจากคณะกรรมการ</h3>
              <p className="text-yellow-100/70 leading-relaxed text-lg">
                ผู้จัดการแข่งขันขอสงวนสิทธิ์ในการเปลี่ยนแปลงกฎกติกาตามความเหมาะสม โดยไม่ต้องแจ้งให้ทราบล่วงหน้า
                การตัดสินของคณะกรรมการถือเป็นที่สิ้นสุดในทุกกรณี หากมีการประท้วงต้องทำภายใน 15 นาทีหลังจบแมตช์นั้นๆ พร้อมหลักฐานที่ชัดเจน
              </p>
            </div>
          </div>
        </TabsContent>

        {}
        <TabsContent value="approved" className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-display font-bold text-white">
                ทีมที่ผ่านการคัดเลือก
              </h2>
              <p className="text-muted-foreground mt-2">รายชื่อทีมที่ได้รับการตรวจสอบเอกสารและมีสิทธิ์เข้าร่วมการแข่งขัน</p>
            </div>
            <div className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl">
              <span className="text-primary font-bold">จำนวนทั้งหมด: {approvedTeams.length} ทีม</span>
            </div>
          </div>

          {approvedTeams.length === 0 ? (
            <div className="text-center py-24 bg-zinc-900 rounded-xl border border-dashed border-white/10">
              <Trophy className="w-20 h-20 mx-auto text-white/5 mb-6" />
              <h3 className="text-xl font-bold text-white/40">ยังไม่มีทีมที่ผ่านการคัดเลือกในขณะนี้</h3>
              <p className="text-muted-foreground mt-2">กรุณารอประกาศอย่างเป็นทางการจากผู้จัดการแข่งขัน</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {approvedTeams.map((team, index) => (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-zinc-900 border-white/10 hover:border-primary/30 transition-all overflow-hidden h-full group">
                    <CardHeader className="relative pb-0">
                      <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center font-black text-[10px] text-white/20 group-hover:text-primary transition-colors">
                        #{index + 1}
                      </div>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="relative">
                          <AvatarCustom
                            src={team.logoUrl}
                            alt={team.name}
                            className="w-20 h-20 border-2 border-primary/20"
                          />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-xl font-black text-white group-hover:text-primary transition-colors">{team.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-bold uppercase tracking-widest border border-primary/20">
                              Verified Team
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6 border-t border-white/5">
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">สมาชิกทีม</p>
                          <div className="grid grid-cols-1 gap-2">
                            {team.members && team.members.length > 0 ? (
                              team.members.map((member, memberIndex) => (
                                <div key={memberIndex} className="flex items-center justify-between p-2 rounded-lg bg-zinc-900 border border-white/5 hover:bg-zinc-800 transition-colors">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-white">{member.gameName || member.name}</span>
                                    <span className="text-[9px] text-muted-foreground">{member.department} · {member.grade}</span>
                                  </div>
                                  <span className="text-[9px] font-bold text-primary/60">PLAYER</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-muted-foreground text-xs italic">ไม่มีข้อมูลสมาชิก</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
