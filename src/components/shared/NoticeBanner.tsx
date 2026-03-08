/**
 * NoticeBanner - Premium glass-styled notice display
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
  service_notice: "bg-info/8 border-info/20 text-info",
  maintenance_notice: "bg-warning/8 border-warning/20 text-warning",
  info_notice: "bg-primary/8 border-primary/20 text-primary",
  warning_notice: "bg-destructive/8 border-destructive/20 text-destructive",
};

interface NoticeBannerProps {
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
          <div
            key={notice.id}
            className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border ${style} animate-fade-in`}
          >
            <div className="h-5 w-5 rounded-md bg-current/10 flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="h-3 w-3" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold">{notice.title}</p>
              {notice.body && <p className="text-[11px] opacity-75 mt-0.5 leading-relaxed">{notice.body}</p>}
            </div>
            <button
              onClick={() => setDismissed(prev => new Set(prev).add(notice.id))}
              className="shrink-0 opacity-50 hover:opacity-100 transition-opacity p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}