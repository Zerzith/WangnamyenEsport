
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AvatarCustom } from "@/components/ui/avatar-custom";
import { Send, Smile, Edit2, X, Check, Users, Eye, Plus, Trash2, MessageCircle } from "lucide-react";
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { useLocation } from "wouter";
import { censorText } from "@/lib/filter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ChatMessage {
  id: string;
  text: string;
  displayName: string;
  userId: string;
  userPhotoURL?: string;
  timestamp: any;
}

interface LiveStreamConfig {
  liveUrl: string;
  title: string;
  isActive: boolean;
}

export default function Chat() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [liveStream, setLiveStream] = useState<LiveStreamConfig | null>(null);
  const [isEditingStream, setIsEditingStream] = useState(false);
  const [editStreamUrl, setEditStreamUrl] = useState("");
  const [editStreamTitle, setEditStreamTitle] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "config", "live_stream"), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setLiveStream(data as LiveStreamConfig);
        setEditStreamUrl(data.liveUrl || "");
        setEditStreamTitle(data.title || "");
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "live_chat"),
      orderBy("timestamp", "desc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as ChatMessage));
      setMessages(msgs.reverse());
      setViewerCount(new Set(msgs.map((m) => m.userId)).size);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    try {
      await addDoc(collection(db, "live_chat"), {
        text: newMessage,
        displayName: user.displayName || "Anonymous",
        userId: user.uid,
        userPhotoURL: user.photoURL || "",
        timestamp: serverTimestamp(),
      });
      setNewMessage("");
      setShowEmoji(false);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleUpdateStream = async () => {
    if (!isAdmin) {
      alert("คุณไม่มีสิทธิ์ในการอัปเดตไลฟ์สด");
      return;
    }
    if (!editStreamUrl.trim()) return;
    try {
      await setDoc(doc(db, "config", "live_stream"), {
        liveUrl: editStreamUrl,
        title: editStreamTitle || "Live Stream",
        isActive: true,
        updatedAt: serverTimestamp(),
      });
      setIsEditingStream(false);
    } catch (error) {
      console.error("Error updating stream:", error);
      alert("เกิดข้อผิดพลาดในการอัปเดตไลฟ์สด: " + error.message);
    }
  };

  const handleRemoveStream = async () => {
    if (!isAdmin) {
      alert("คุณไม่มีสิทธิ์ในการลบไลฟ์สด");
      return;
    }
    try {
      await setDoc(doc(db, "config", "live_stream"), {
        liveUrl: "",
        title: "",
        isActive: false,
        updatedAt: serverTimestamp(),
      });
      setIsEditingStream(false);
    } catch (error) {
      console.error("Error removing stream:", error);
      alert("เกิดข้อผิดพลาดในการลบไลฟ์สด: " + error.message);
    }
  };

  const isYoutubeUrl = (url: string) => url.includes("youtube.com") || url.includes("youtu.be");

  if (!user) {
    setLocation("/login");
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6 h-[calc(100vh-4rem)] flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 overflow-hidden">
        <div className="lg:col-span-2 flex flex-col gap-4">
          {liveStream?.isActive && liveStream?.liveUrl ? (
            <Card className="bg-black border-white/10 overflow-hidden flex-1 flex flex-col">
              <div className="aspect-video bg-black flex items-center justify-center relative">
                {isYoutubeUrl(liveStream.liveUrl) ? (
                  <iframe
                    width="100%"
                    height="100%"
                    src={liveStream.liveUrl.replace("watch?v=", "embed/").split("&")[0]}
                    title="Live Stream"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="text-white text-center p-4">
                    <p className="mb-4">กำลังเล่นวิดีโอจากแหล่งภายนอก</p>
                    <a href={liveStream.liveUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">คลิกเพื่อดูไลฟ์สด</a>
                  </div>
                )}
                <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span> LIVE
                </div>
                <div className="absolute top-4 right-4 bg-black/70  text-white px-3 py-1 rounded-full text-xs flex items-center gap-2">
                  <Eye className="w-4 h-4" /> {viewerCount} ผู้ชม
                </div>
              </div>
              <div className="p-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">{liveStream.title || "Live Stream"}</h2>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{viewerCount} ผู้ชมออนไลน์</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <Dialog open={isEditingStream} onOpenChange={setIsEditingStream}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-accent">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>แก้ไข Live Stream</DialogTitle>
                          <DialogDescription>
                            อัปเดตลิงก์และชื่อเรื่องของการถ่ายทอดสด
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <label htmlFor="title" className="text-right">
                              ชื่อเรื่อง
                            </label>
                            <Input id="title" value={editStreamTitle} onChange={(e) => setEditStreamTitle(e.target.value)} className="col-span-3" />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <label htmlFor="url" className="text-right">
                              URL
                            </label>
                            <Input id="url" value={editStreamUrl} onChange={(e) => setEditStreamUrl(e.target.value)} className="col-span-3" />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="destructive" onClick={handleRemoveStream}>ลบ</Button>
                          <Button onClick={handleUpdateStream}>บันทึก</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="bg-zinc-900 border-dashed border-white/10 flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mb-6">
                <Eye className="w-10 h-10 text-muted-foreground opacity-20" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">ไม่มีการถ่ายทอดสดในขณะนี้</h2>
              <p className="text-muted-foreground max-w-md mb-8">ติดตามข่าวสารการแข่งขันได้ที่หน้าแรก เพื่อไม่ให้พลาดทุกแมตช์สำคัญ</p>
              {isAdmin && (
                <Dialog open={isEditingStream} onOpenChange={setIsEditingStream}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary">
                      <Plus className="w-4 h-4 mr-2" /> เพิ่มลิงก์ไลฟ์สด
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>เพิ่ม Live Stream</DialogTitle>
                      <DialogDescription>
                        เพิ่มลิงก์และชื่อเรื่องของการถ่ายทอดสด
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <label htmlFor="title" className="text-right">
                          ชื่อเรื่อง
                        </label>
                        <Input id="title" value={editStreamTitle} onChange={(e) => setEditStreamTitle(e.target.value)} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <label htmlFor="url" className="text-right">
                          URL
                        </label>
                        <Input id="url" value={editStreamUrl} onChange={(e) => setEditStreamUrl(e.target.value)} className="col-span-3" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleUpdateStream}>บันทึก</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </Card>
          )}
        </div>

        <div className="lg:col-span-1 flex flex-col h-full overflow-hidden">
          <Card className="bg-zinc-900 border-white/10  flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-900">
              <h3 className="font-bold text-white flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" /> แชทสด
              </h3>
              <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> {viewerCount} ออนไลน์
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.userId === user.uid ? 'flex-row-reverse' : ''}`}>
                  <AvatarCustom src={msg.userPhotoURL} name={msg.displayName} size="sm" />
                  <div className={`flex flex-col ${msg.userId === user.uid ? 'items-end' : 'items-start'} max-w-[80%]`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-muted-foreground">{censorText(msg.displayName)}</span>
                    </div>
                    <div className={`px-3 py-2 rounded-xl text-sm ${msg.userId === user.uid ? 'bg-primary text-white rounded-tr-none' : 'bg-zinc-800 text-white rounded-tl-none'}`}>
                      {censorText(msg.text)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-white/10 bg-zinc-900 relative">
              {showEmoji && (
                <div className="absolute bottom-full right-0 mb-2 z-50">
                  <EmojiPicker onEmojiClick={(emoji) => setNewMessage(prev => prev + emoji.emoji)} theme={Theme.DARK} />
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => setShowEmoji(!showEmoji)} className="text-muted-foreground hover:text-primary">
                  <Smile className="w-5 h-5" />
                </Button>
                <Input 
                  value={newMessage} 
                  onChange={(e) => setNewMessage(e.target.value)} 
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="พิมพ์ข้อความ..." 
                  className="bg-background/50 border-white/10 focus:border-primary/50" 
                />
                <Button onClick={handleSendMessage} size="icon" className="bg-primary hover:bg-primary/80">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
