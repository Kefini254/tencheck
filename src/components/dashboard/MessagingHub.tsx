import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare, Send, Paperclip, ArrowLeft, Plus, Users, Building2,
  Wrench, ChevronRight, Image as ImageIcon, FileText, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MessagingHubProps {
  userId: string;
  userRole: string;
}

export const MessagingHub = ({ userId, userRole }: MessagingHubProps) => {
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [showNewThread, setShowNewThread] = useState(false);

  if (selectedThread) {
    return (
      <ThreadView
        threadId={selectedThread}
        userId={userId}
        onBack={() => setSelectedThread(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent">
            <MessageSquare className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-foreground">Messages</h2>
            <p className="text-sm text-muted-foreground">Your conversations</p>
          </div>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowNewThread(!showNewThread)}>
          {showNewThread ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showNewThread ? "Cancel" : "New"}
        </Button>
      </div>

      <AnimatePresence>
        {showNewThread && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <NewThreadForm userId={userId} userRole={userRole} onCreated={(id) => { setShowNewThread(false); setSelectedThread(id); }} />
          </motion.div>
        )}
      </AnimatePresence>

      <ThreadList userId={userId} onSelect={setSelectedThread} />
    </div>
  );
};

const NewThreadForm = ({ userId, userRole, onCreated }: { userId: string; userRole: string; onCreated: (id: string) => void }) => {
  const [recipientPhone, setRecipientPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientPhone.trim() || !message.trim()) return;
    setCreating(true);

    // Find recipient by phone
    const { data: recipient } = await supabase
      .from("profiles")
      .select("user_id, name, role")
      .eq("phone", recipientPhone.trim())
      .maybeSingle();

    if (!recipient) {
      toast.error("No user found with that phone number");
      setCreating(false);
      return;
    }

    // Create thread
    const threadData: any = { subject: subject || "New Conversation", thread_type: "general" };
    if (userRole === "tenant") { threadData.tenant_id = userId; }
    if (userRole === "landlord") { threadData.landlord_id = userId; }
    if (userRole === "service_worker") { threadData.service_worker_id = userId; }
    if (recipient.role === "tenant") { threadData.tenant_id = recipient.user_id; }
    if (recipient.role === "landlord") { threadData.landlord_id = recipient.user_id; }
    if (recipient.role === "service_worker") { threadData.service_worker_id = recipient.user_id; }

    const { data: thread, error: threadErr } = await supabase
      .from("threads")
      .insert(threadData)
      .select()
      .single();

    if (threadErr || !thread) {
      toast.error(threadErr?.message || "Failed to create thread");
      setCreating(false);
      return;
    }

    // Add participants
    await supabase.from("thread_participants").insert([
      { thread_id: thread.id, user_id: userId, role: userRole },
      { thread_id: thread.id, user_id: recipient.user_id, role: recipient.role },
    ]);

    // Send first message
    await supabase.from("messages").insert({
      thread_id: thread.id,
      sender_id: userId,
      receiver_id: recipient.user_id,
      content: message,
      message_type: "text",
    });

    setCreating(false);
    onCreated(thread.id);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="font-semibold text-foreground text-sm mb-3">Start a Conversation</h3>
      <form onSubmit={handleCreate} className="space-y-3">
        <Input placeholder="Recipient phone number" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} required />
        <Input placeholder="Subject (optional)" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Textarea placeholder="Write your message..." value={message} onChange={(e) => setMessage(e.target.value)} rows={2} required />
        <Button type="submit" size="sm" disabled={creating} className="w-full">
          {creating ? "Creating..." : "Send Message"}
        </Button>
      </form>
    </div>
  );
};

const ThreadList = ({ userId, onSelect }: { userId: string; onSelect: (id: string) => void }) => {
  const { data: threads, isLoading } = useQuery({
    queryKey: ["threads", userId],
    queryFn: async () => {
      // Get thread IDs user participates in
      const { data: participations } = await supabase
        .from("thread_participants")
        .select("thread_id")
        .eq("user_id", userId);
      
      if (!participations?.length) return [];
      const threadIds = participations.map(p => p.thread_id);

      const { data: threads } = await supabase
        .from("threads")
        .select("*")
        .in("id", threadIds)
        .order("updated_at", { ascending: false });

      if (!threads?.length) return [];

      // Get last message and participant names for each thread
      const results = await Promise.all(threads.map(async (thread: any) => {
        const { data: lastMsg } = await supabase
          .from("messages")
          .select("content, sender_id, created_at, read_status")
          .eq("thread_id", thread.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { data: participants } = await supabase
          .from("thread_participants")
          .select("user_id, role")
          .eq("thread_id", thread.id);

        const otherIds = (participants || []).filter(p => p.user_id !== userId).map(p => p.user_id);
        let otherNames: string[] = [];
        if (otherIds.length) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, name")
            .in("user_id", otherIds);
          otherNames = (profiles || []).map(p => p.name || "Unknown");
        }

        // Unread count
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("thread_id", thread.id)
          .neq("sender_id", userId)
          .eq("read_status", false);

        return { ...thread, lastMessage: lastMsg, otherNames, unreadCount: count || 0 };
      }));

      return results;
    },
    refetchInterval: 10000,
  });

  // Subscribe to realtime
  useEffect(() => {
    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        // Will be handled by refetchInterval
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  if (!threads?.length) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border p-10 text-center">
        <MessageSquare className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {threads.map((thread: any) => {
        const typeIcon = thread.thread_type === "service_request" ? Wrench : thread.thread_type === "property" ? Building2 : Users;
        const TypeIcon = typeIcon;
        return (
          <button
            key={thread.id}
            onClick={() => onSelect(thread.id)}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors text-left"
          >
            <div className="p-2 rounded-lg bg-accent shrink-0">
              <TypeIcon className="h-4 w-4 text-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground truncate">
                  {thread.otherNames?.join(", ") || thread.subject || "Conversation"}
                </p>
                {thread.unreadCount > 0 && (
                  <Badge className="bg-primary text-primary-foreground text-[10px] h-5 min-w-5 flex items-center justify-center">
                    {thread.unreadCount}
                  </Badge>
                )}
              </div>
              {thread.lastMessage && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {thread.lastMessage.content}
                </p>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        );
      })}
    </div>
  );
};

const ThreadView = ({ threadId, userId, onBack }: { threadId: string; userId: string; onBack: () => void }) => {
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages", threadId],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      // Mark as read
      if (data?.length) {
        const unreadIds = data.filter(m => m.sender_id !== userId && !m.read_status).map(m => m.id);
        if (unreadIds.length) {
          await supabase.from("messages").update({ read_status: true }).in("id", unreadIds);
        }
      }

      // Get sender profiles
      if (!data?.length) return [];
      const senderIds = [...new Set(data.map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", senderIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      // Get attachments
      const msgIds = data.map(m => m.id);
      const { data: attachments } = await supabase
        .from("message_attachments")
        .select("*")
        .in("message_id", msgIds);
      const attachMap = new Map<string, any[]>();
      (attachments || []).forEach(a => {
        if (!attachMap.has(a.message_id)) attachMap.set(a.message_id, []);
        attachMap.get(a.message_id)!.push(a);
      });

      // Generate signed URLs for attachments
      const enrichedData = await Promise.all(data.map(async (m) => {
        const atts = attachMap.get(m.id) || [];
        const signedAtts = await Promise.all(atts.map(async (att: any) => {
          // If file_path is a raw path (not a full URL), create a signed URL
          if (att.file_path && !att.file_path.startsWith("http")) {
            const { data: signedData } = await supabase.storage
              .from("message-attachments")
              .createSignedUrl(att.file_path, 3600);
            return { ...att, signedUrl: signedData?.signedUrl || att.file_path };
          }
          return { ...att, signedUrl: att.file_path };
        }));
        return { ...m, sender: profileMap.get(m.sender_id), attachments: signedAtts };
      }));
      return enrichedData;
    },
    refetchInterval: 5000,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`thread-${threadId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["messages", threadId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [threadId, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!newMessage.trim()) return;
      const { error } = await supabase.from("messages").insert({
        thread_id: threadId,
        sender_id: userId,
        content: newMessage.trim(),
        message_type: "text",
      });
      if (error) throw error;
      // Update thread timestamp
      await supabase.from("threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["messages", threadId] });
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const filePath = `${threadId}/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("message-attachments").upload(filePath, file);
    if (uploadErr) { toast.error("Upload failed"); setUploading(false); return; }

    // Create message with attachment (store raw path, use signed URLs for display)
    const { data: msg, error: msgErr } = await supabase.from("messages").insert({
      thread_id: threadId,
      sender_id: userId,
      content: `📎 ${file.name}`,
      message_type: "file",
    }).select().single();

    if (!msgErr && msg) {
      await supabase.from("message_attachments").insert({
        message_id: msg.id,
        file_path: filePath,
        file_type: file.type.startsWith("image") ? "image" : "pdf",
        uploaded_by: userId,
      });
    }

    setUploading(false);
    queryClient.invalidateQueries({ queryKey: ["messages", threadId] });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-display font-bold text-foreground">Conversation</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)}</div>
        ) : messages?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No messages yet</p>
        ) : (
          messages?.map((msg: any) => {
            const isOwn = msg.sender_id === userId;
            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isOwn ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  {!isOwn && (
                    <p className={`text-[10px] font-semibold mb-0.5 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {msg.sender?.name || "Unknown"}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.attachments?.map((att: any) => (
                    <div key={att.id} className="mt-2">
                      {att.file_type === "image" ? (
                        <img src={att.signedUrl || att.file_path} alt="attachment" className="rounded-lg max-w-full max-h-48 object-cover" />
                      ) : (
                        <a href={att.signedUrl || att.file_path} target="_blank" rel="noopener" className="flex items-center gap-1.5 text-xs underline">
                          <FileText className="h-3 w-3" /> View file
                        </a>
                      )}
                    </div>
                  ))}
                  <p className={`text-[10px] mt-1 ${isOwn ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="pt-3 border-t border-border">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage.mutate(); }} className="flex gap-2">
          <div className="relative">
            <label htmlFor="msg-file" className="p-2.5 rounded-lg border border-border hover:bg-muted cursor-pointer inline-flex">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
            </label>
            <input id="msg-file" type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </div>
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
            disabled={sendMessage.isPending}
          />
          <Button type="submit" size="sm" disabled={sendMessage.isPending || !newMessage.trim()} className="shrink-0 gap-1">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default MessagingHub;
