/**
 * NoticeBanner - Displays active notices as banners
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Info, Wrench, AlertCircle, X } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Notice = Database["public"]["Tables"]["notices"]["Row"];

const iconMap = {
  service_notice: Wrench,
  maintenance_notice: AlertTriangle,
  info_notice: Info,
  warning_notice: AlertCircle,
};

const styleMap = {
  service_notice: "bg-info/10 text-info border-info/20",
  maintenance_notice: "bg-warning/10 text-warning border-warning/20",
  info_notice: "bg-primary/10 text-primary border-primary/20",
  warning_notice: "bg-destructive/10 text-destructive border-destructive/20",
};

interface NoticeBannerProps {
  /** Filter by audience. If not provided, fetches all visible notices */
  audience?: string;
}

export function NoticeBanner({ audience }: NoticeBannerProps) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchNotices() {
      const now = new Date().toISOString();
      let query = supabase
        .from("notices")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      // Date window filtering
      query = query.or(`starts_at.is.null,starts_at.lte.${now}`);
      query = query.or(`ends_at.is.null,ends_at.gte.${now}`);

      const { data } = await query;
      setNotices(data || []);
    }
    fetchNotices();
  }, [audience]);

  const visibleNotices = notices.filter(n => !dismissed.has(n.id));
  if (visibleNotices.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {visibleNotices.map((notice) => {
        const Icon = iconMap[notice.notice_type] || Info;
        const style = styleMap[notice.notice_type] || styleMap.info_notice;
        return (
          <div key={notice.id} className={`flex items-start gap-3 p-3 rounded-lg border ${style}`}>
            <Icon className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{notice.title}</p>
              {notice.body && <p className="text-xs opacity-80 mt-0.5">{notice.body}</p>}
            </div>
            <button
              onClick={() => setDismissed(prev => new Set(prev).add(notice.id))}
              className="shrink-0 opacity-60 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
