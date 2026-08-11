import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  collection, addDoc, query, orderBy, limit, onSnapshot,
  serverTimestamp, doc, setDoc, getDoc, deleteDoc, where, writeBatch
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AvatarCustom } from "@/components/ui/avatar-custom";
import { Send, Smile, Edit2, Users, Eye, Plus, MessageCircle, MonitorPlay, Radio } from "lucide-react";
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
  const presenceDocRef = useRef<string | null>(null);

  const isAdmin = user?.role === 'admin';

  // Load live stream config
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

  // Load chat messages
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
    });

    return () => unsubscribe();
  }, []);

  // Real-time viewer presence tracking using Firestore
  useEffect(() => {
    if (!user) return;

    const presenceDocId = `viewer_${user.uid}`;
    presenceDocRef.current = presenceDocId;

    // Create presence document (set, not add — so it overwrites on reconnect)
    const markPresence = async () => {
      try {
        await setDoc(doc(db, "live_viewers", presenceDocId), {
          userId: user.uid,
          displayName: user.displayName || "Anonymous",
          photoURL: user.photoURL || "",
          joinedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          page: "chat"
        });
      } catch (error) {
        console.error("Error marking presence:", error);
      }
    };

    // Remove presence when leaving
    const removePresence = async () => {
      try {
        if (presenceDocRef.current) {
          await deleteDoc(doc(db, "live_viewers", presenceDocRef.current));
        }
      } catch (error) {
        console.error("Error removing presence:", error);
      }
    };

    // Listen to all viewers
    const viewersRef = collection(db, "live_viewers");
    const unsubViewers = onSnapshot(viewersRef, (snapshot) => {
      // Filter to only viewers on this page
      const activeViewers = snapshot.docs.filter(doc => doc.data().page === "chat");
      setViewerCount(activeViewers.length);
    });

    // Mark presence immediately
    markPresence();

    // Heartbeat: update every 10 seconds to show user is still active
    const heartbeatInterval = setInterval(markPresence, 10000);

    // Cleanup on unmount or page leave
    const handleBeforeUnload = () => {
      // Use navigator.sendBeacon for reliable cleanup on page close
      // But since we can't do async operations in beforeunload,
      // we'll rely on the timestamp check below
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup on visibility change (user switches tabs)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User left the tab - remove presence
        removePresence();
      } else {
        // User came back - mark presence
        markPresence();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(heartbeatInterval);
      unsubViewers();
      removePresence();
    };
  }, [user]);

  // Auto-cleanup stale viewers (older than 30 seconds without heartbeat)
  useEffect(() => {
    if (!isAdmin) return;

    const cleanupStaleViewers = async () => {
      try {
        const viewersRef = collection(db, "live_viewers");
        const q = query(viewersRef);
        const snapshot = await getDoc(doc(db, "config", "last_cleanup"));

        // Get all viewers
        const allViewers = (await new Promise((resolve, reject) => {
          onSnapshot(q, (snap) => resolve(snap.docs), reject);
        })) as any[];

        const thirtySecondsAgo = Date.now() - 30000;
        const staleDocs: string[] = [];

        allViewers.forEach(viewerDoc => {
          const data = viewerDoc.data();
          // If updatedAt is missing or very old, consider stale
          if (!data.updatedAt || data.updatedAt.toMillis() < thirtySecondsAgo) {
            staleDocs.push(viewerDoc.id);
          }
        });

        // Delete stale viewers
        if (staleDocs.length > 0) {
          const batch = writeBatch(db);
          staleDocs.forEach(id => {
            batch.delete(doc(db, "live_viewers", id));
          });
          await batch.commit();
        }
      } catch (error) {
        console.error("Error cleaning stale viewers:", error);
      }
    };

    // Run cleanup every 15 seconds (admin only)
    const cleanupInterval = setInterval(cleanupStaleViewers, 15000);
    return () => clearInterval(cleanupInterval);
  }, [isAdmin]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    try {
      await addDoc(collection(db, "live_chat"), {
        text: censorText(newMessage),
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
  const getYoutubeEmbedUrl = (url: string) => {
    if (url.includes("youtube.com/watch?v=")) {
      return url.replace("youtube.com/watch?v=", "youtube.com/embed/");
    } else if (url.includes("youtu.be/")) {
      return url.replace("youtu.be/", "youtube.com/embed/");
    }
    return url;
  };

  if (!user) {
    setLocation("/login");
    return null;
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
        {/* Video Section */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {liveStream?.isActive && liveStream?.liveUrl ? (
            <div className="flex-1 flex flex-col bg-black relative">
              {/* Video Container */}
              <div className="relative flex-1 min-h-0">
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`${getYoutubeEmbedUrl(liveStream.liveUrl)}?autoplay=1&mute=0`}
                  title="Live Stream"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>

              {/* Overlay Info Bar */}
              <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-4 pointer-events-none z-10">
                {/* LIVE Badge */}
                <div className="flex items-center gap-2">
                  <div className="bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 shadow-lg backdrop-blur-sm">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    LIVE
                  </div>
                  <div className="bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-md text-xs flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5" />
                    <span className="font-semibold">{viewerCount}</span> ผู้ชม
                  </div>
                </div>
              </div>

              {/* Bottom Info Bar */}
              <div className="bg-gradient-to-t from-black/90 to-transparent p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MonitorPlay className="w-5 h-5 text-red-500" />
                    <div>
                      <h2 className="text-lg font-bold text-white">{liveStream.title || "Live Stream"}</h2>
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <Users className="w-3.5 h-3.5" />
                        <span>{viewerCount} คนกำลังรับชมอยู่</span>
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <Dialog open={isEditingStream} onOpenChange={setIsEditingStream}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-white/70 hover:text-white pointer-events-auto">
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
                            <label htmlFor="title" className="text-right text-sm">
                              ชื่อเรื่อง
                            </label>
                            <Input id="title" value={editStreamTitle} onChange={(e) => setEditStreamTitle(e.target.value)} className="col-span-3" />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <label htmlFor="url" className="text-right text-sm">
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
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                  backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                  backgroundSize: '40px 40px'
                }} />
              </div>
              <div className="text-center z-10 p-8">
                <div className="w-24 h-24 rounded-2xl bg-zinc-800/50 border border-white/5 flex items-center justify-center mb-6 mx-auto backdrop-blur-sm">
                  <Radio className="w-12 h-12 text-white/20" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">ไม่มีการถ่ายทอดสดในขณะนี้</h2>
                <p className="text-muted-foreground max-w-md mb-8">ติดตามข่าวสารการแข่งขันที่หน้าแรก เพื่อไม่ให้พลาดทุกแมตช์สำคัญ</p>
                {isAdmin && (
                  <Dialog open={isEditingStream} onOpenChange={setIsEditingStream}>
                    <DialogTrigger asChild>
                      <Button className="bg-primary hover:bg-primary/80">
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
                          <label htmlFor="title" className="text-right text-sm">
                            ชื่อเรื่อง
                          </label>
                          <Input id="title" value={editStreamTitle} onChange={(e) => setEditStreamTitle(e.target.value)} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <label htmlFor="url" className="text-right text-sm">
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
              </div>
            </div>
          )}
        </div>

        {/* Chat Section */}
        <div className="w-full lg:w-[380px] flex flex-col border-l border-white/10 bg-zinc-950 overflow-hidden">
          {/* Chat Header */}
          <div className="p-3 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-white text-sm">แชทสด</h3>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[11px] font-semibold text-emerald-400">{viewerCount} ออนไลน์</span>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.userId === user.uid ? 'flex-row-reverse' : ''}`}>
                <AvatarCustom src={msg.userPhotoURL} name={msg.displayName} size="sm" />
                <div className={`flex flex-col ${msg.userId === user.uid ? 'items-end' : 'items-start'} max-w-[78%]`}>
                  <span className="text-[10px] font-semibold text-muted-foreground mb-0.5 px-1">
                    {censorText(msg.displayName)}
                  </span>
                  <div className={`px-3 py-2 rounded-lg text-sm ${msg.userId === user.uid ? 'bg-primary text-white rounded-tr-sm' : 'bg-zinc-800 text-white rounded-tl-sm'}`}>
                    {censorText(msg.text)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/10 bg-zinc-900/50 relative">
            {showEmoji && (
              <div className="absolute bottom-full right-0 mb-2 z-50">
                <EmojiPicker onEmojiClick={(emoji) => setNewMessage(prev => prev + emoji.emoji)} theme={Theme.DARK} />
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => setShowEmoji(!showEmoji)} className="text-muted-foreground hover:text-primary flex-shrink-0">
                <Smile className="w-5 h-5" />
              </Button>
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="พิมพ์ข้อความ..."
                className="bg-zinc-800/50 border-white/10 focus:border-primary/50 text-sm"
              />
              <Button onClick={handleSendMessage} size="icon" className="bg-primary hover:bg-primary/80 flex-shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
