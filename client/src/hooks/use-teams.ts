import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type InsertTeam } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export function useCreateTeam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (data: InsertTeam) => {


      const res = await fetch(api.teams.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create team");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "ลงทะเบียนสำเร็จ",
        description: "ทีมของคุณได้รับการลงทะเบียนเรียบร้อยแล้ว",
        variant: "default",
      });


      setLocation("/hall-of-fame");
    },
    onError: (error: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
