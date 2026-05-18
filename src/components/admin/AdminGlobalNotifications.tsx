import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Global Admin Notification Listener
 * Subscribes to real-time events on relevant tables and shows toasts.
 * Must be rendered within an authenticated admin layout.
 */
export function AdminGlobalNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    // Only admins should listen to global events
    if (!user || user.role !== "admin") return;

    const channel = supabase.channel("admin_global_notifications")
      // Listen for new agent applications
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "agent_applications" },
        (payload) => {
          if (payload.new.status === "submitted") {
            toast.info("New Agent Application", {
              description: `Application received from ${payload.new.store_name || payload.new.email}`,
              duration: 5000,
            });
          }
        }
      )
      // Listen for new agent withdrawals
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "agent_withdrawals" },
        (payload) => {
          if (payload.new.status === "pending") {
            const amount = Number(payload.new.amount).toLocaleString(undefined, { minimumFractionDigits: 2 });
            toast.info("New Withdrawal Request", {
              description: `GH₵${amount} requested by ${payload.new.momo_name || payload.new.momo_number}`,
              duration: 5000,
            });
          }
        }
      )
      // Listen for order failures
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          // If status transitioned to failed
          if (payload.new.status === "failed" && payload.old.status !== "failed") {
            const message = payload.new.delivery_message || payload.new.supplier_status || "Unknown error";
            toast.error(`Order Failed: ${payload.new.public_order_id}`, {
              description: message,
              duration: 8000,
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.debug("Admin notifications active");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return null; // This is a logic-only component
}
