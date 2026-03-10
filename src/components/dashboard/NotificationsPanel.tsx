import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell, MessageSquare, CreditCard, Wrench, AlertTriangle,
  CheckCircle, Check, Trash2
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NotificationsPanelProps {
  userId: string;
}

const NOTIF_ICONS: Record<string, any> = {
  new_message: MessageSquare,
  payment_verification: CreditCard,
  service_request: Wrench,
  dispute_alert: AlertTriangle,
};

const NOTIF_COLORS: Record<string, string> = {
  new_message: "bg-accent text-accent-foreground",
  payment_verification: "bg-primary/10 text-primary",
  service_request: "bg-yellow-500/10 text-yellow-600",
  dispute_alert: "bg-destructive/10 text-destructive",
};

export const NotificationsPanel = ({ userId }: NotificationsPanelProps) => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    refetchInterval: 15000,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        toast.info((payload.new as any).title || "New notification");
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, queryClient]);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ read_status: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase.from("notifications").update({ read_status: true }).eq("user_id", userId).eq("read_status", false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All marked as read");
    },
  });

  const unreadCount = notifications?.filter(n => !n.read_status).length || 0;
  const filtered = notifications?.filter((n: any) => filter === "all" || n.notification_type === filter) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent relative">
            <Bell className="h-5 w-5 text-accent-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-foreground">Notifications</h2>
            <p className="text-sm text-muted-foreground">{unreadCount} unread</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="outline" onClick={() => markAllRead.mutate()} className="gap-1 text-xs">
            <Check className="h-3 w-3" /> Mark All Read
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["all", "new_message", "payment_verification", "service_request", "dispute_alert"].map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === t ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground"
            }`}
          >
            {t === "all" ? "All" : t.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-10 text-center">
          <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No notifications</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((notif: any) => {
            const Icon = NOTIF_ICONS[notif.notification_type] || Bell;
            const colorClass = NOTIF_COLORS[notif.notification_type] || "bg-muted text-muted-foreground";
            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                  notif.read_status ? "border-border bg-card" : "border-primary/20 bg-primary/5"
                }`}
                onClick={() => !notif.read_status && markRead.mutate(notif.id)}
              >
                <div className={`p-2 rounded-lg shrink-0 ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${notif.read_status ? "text-foreground" : "text-foreground font-semibold"}`}>
                    {notif.title}
                  </p>
                  {notif.body && <p className="text-xs text-muted-foreground truncate mt-0.5">{notif.body}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(notif.created_at).toLocaleString()}
                  </p>
                </div>
                {!notif.read_status && (
                  <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Bell icon with unread count for header
export const NotificationBell = ({ userId, onClick }: { userId: string; onClick?: () => void }) => {
  const { data: count } = useQuery({
    queryKey: ["notif-count", userId],
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read_status", false);
      return count || 0;
    },
    refetchInterval: 15000,
  });

  return (
    <button onClick={onClick} className="relative p-2 rounded-lg hover:bg-muted transition-colors">
      <Bell className="h-5 w-5 text-muted-foreground" />
      {(count ?? 0) > 0 && (
        <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
          {count}
        </span>
      )}
    </button>
  );
};

export default NotificationsPanel;
