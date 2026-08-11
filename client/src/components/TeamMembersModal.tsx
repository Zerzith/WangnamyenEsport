import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AvatarCustom } from "@/components/ui/avatar-custom";
import { Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TeamMember {
  name: string;
  gameName: string;
  grade?: string;
  department?: string;
  studentId?: string;
  isSubstitute?: boolean;
}

interface TeamMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  teamLogo?: string;
  members: TeamMember[];
}

export function TeamMembersModal({
  isOpen,
  onClose,
  teamName,
  teamLogo,
  members,
}: TeamMembersModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card/95 border-white/10 rounded-xl">
        <DialogHeader className="sticky top-0 bg-card/95 pb-4 border-b border-white/10">
          <div className="flex items-center gap-4">
            {teamLogo && (
              <AvatarCustom
                src={teamLogo}
                name={teamName}
                size="lg"
                className="ring-2 ring-primary/20"
              />
            )}
            <div className="flex-1">
              <DialogTitle className="text-2xl text-white">{teamName}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                สมาชิก ({members.length})
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-muted-foreground hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {members.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-muted-foreground">ไม่มีข้อมูลสมาชิก</p>
            </div>
          ) : (
            members.map((member, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-zinc-900 border border-white/5 hover:bg-zinc-800 transition-colors"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">ชื่อจริง</p>
                    <p className="text-white font-semibold">{member.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">ชื่อเกม (IGN)</p>
                    <p className="text-primary font-semibold">{member.gameName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">รหัสนักเรียน</p>
                    <p className="text-white">{member.studentId || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">ชั้นปี</p>
                    <p className="text-white">{member.grade || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">แผนกวิชา</p>
                    <p className="text-white">{member.department || "-"}</p>
                  </div>
                  {member.isSubstitute && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">สถานะ</p>
                      <p className="text-yellow-500 font-semibold">แฟน</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
