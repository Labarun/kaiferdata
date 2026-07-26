/**
 * Supplier Admin Service
 * Admin-side operations for supplier config, product sync, status sync, and bulk operations.
 */
import { supabase } from "@/integrations/supabase/client";
import { writeAuditLog } from "@/services/auth";

export interface Supplier {
  id: string;
  name: string;
  provider_code: string;
  api_base_url: string | null;
  auth_config: Record<string, unknown> | null;
  is_active: boolean;
  supported_networks: string[];
  request_timeout_ms: number;
  priority: number;
  metadata: Record<string, unknown> | null;
  supports_product_sync: boolean;
  supports_order_submission: boolean;
  supports_status_sync: boolean;
  polling_interval_seconds: number;
  last_product_sync_at: string | null;
  endpoint_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SupplierSyncLog {
  id: string;
  supplier_id: string | null;
  sync_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  packages_created: number;
  packages_updated: number;
  packages_deactivated: number;
  orders_updated: number;
  error_message: string | null;
  raw_response: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** Fetch all suppliers */
export async function fetchSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from("suppliers" as any)
    .select("*")
    .order("priority", { ascending: true });
  if (error) throw error;
  return (data as any[]) || [];
}

/** Create a supplier */
export async function createSupplier(supplier: Partial<Supplier>): Promise<Supplier> {
  const { data, error } = await supabase
    .from("suppliers" as any)
    .insert(supplier as any)
    .select()
    .single();
  if (error) throw error;
  return data as any;
}

/** Update a supplier */
export async function updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier> {
  const { data, error } = await supabase
    .from("suppliers" as any)
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as any;
}

/** Fetch recent sync logs */
export async function fetchSyncLogs(limit = 20): Promise<SupplierSyncLog[]> {
  const { data, error } = await supabase
    .from("supplier_sync_logs" as any)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as any[]) || [];
}

/** Trigger product sync via edge function */
export async function triggerProductSync(supplierId?: string, network?: string): Promise<Record<string, unknown>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/sync-supplier-products`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ supplier_id: supplierId, network }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Sync failed");
  return data;
}

/** Trigger order status sync via edge function */
export async function triggerStatusSync(orderId?: string): Promise<Record<string, unknown>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/sync-order-status`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ order_id: orderId }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Status sync failed");
  return data;
}

/** Trigger supplier health check */
export async function triggerHealthCheck(supplierId: string): Promise<Record<string, unknown>> {
  // Fetch supplier config
  const { data: supplier, error } = await supabase
    .from("suppliers" as any)
    .select("*")
    .eq("id", supplierId)
    .single();
  if (error || !supplier) throw new Error("Supplier not found");

  const s = supplier as any;
  const endpointConfig = (s.endpoint_config || {}) as Record<string, unknown>;
  const authConfig = (s.auth_config || {}) as Record<string, unknown>;
  const healthEndpoint = (endpointConfig.health || {}) as Record<string, unknown>;
  const balanceEndpoint = (endpointConfig.balance || {}) as Record<string, unknown>;

  const healthPath = (healthEndpoint.path as string) || "/v1/health";
  const balancePath = (balanceEndpoint.path as string) || "/v1/account/balance";

  // Build auth headers
  const secretName = (authConfig.secret_name as string) || "SUPPLIER_API_KEY";
  // We can't access edge function secrets from client, so we call via edge function
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  // We'll use a simple proxy through a diagnostics call
  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/supplier-diagnostics`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ supplier_id: supplierId, checks: ["health", "balance"] }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Health check failed");
  return data;
}

/** Admin manual status update for a single order */
export async function updateOrderStatus(
  orderId: string,
  newStatus: string,
  note?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  // Get current order status
  const { data: order } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();

  // Update order
  const { error: updateErr } = await supabase
    .from("orders")
    .update({ 
      status: newStatus as any,
      ...(note ? { delivery_message: note } : {}) 
    })
    .eq("id", orderId);
  if (updateErr) throw updateErr;

  // Log status change
  await supabase.from("order_status_history").insert({
    order_id: orderId,
    old_status: order?.status,
    new_status: newStatus,
    source: "admin_manual_update",
    note: note || `Manually changed by admin`,
    metadata: { admin_user_id: user?.id },
  } as any);

  // Audit log
  await writeAuditLog({
    action: "order_status_manual_update",
    targetType: "order",
    targetId: orderId,
    metadata: { old_status: order?.status, new_status: newStatus, note },
  });
}

/** Admin explicit wallet refund for a single order */
export async function refundOrder(
  orderId: string,
  note?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data: order } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();

  const oldStatus = order?.status || null;

  const { data: refundResult, error: refundErr } = await supabase.rpc(
    "refund_wallet_purchase_atomic",
    {
      _order_id: orderId,
      _reason: note || "Admin manual refund",
      _actor_id: user?.id || null,
    }
  );
  if (refundErr) throw refundErr;
  
  const res = Array.isArray(refundResult) ? refundResult[0] : refundResult;
  if (!res?.refunded) {
    const { error: updateErr } = await supabase
      .from("orders")
      .update({ 
        status: "refunded" as any,
        ...(note ? { delivery_message: note } : {}) 
      })
      .eq("id", orderId);
    if (updateErr) throw updateErr;
  } else if (note) {
    await supabase.from("orders").update({ delivery_message: note }).eq("id", orderId);
  }

  await supabase.from("order_status_history").insert({
    order_id: orderId,
    old_status: oldStatus,
    new_status: "refunded",
    source: "admin_manual_refund",
    note: note || `Manual explicit refund by admin`,
    metadata: { admin_user_id: user?.id, wallet_refund_attempted: true, wallet_refund_success: !!res?.refunded },
  } as any);

  await writeAuditLog({
    action: "order_manual_refund",
    targetType: "order",
    targetId: orderId,
    metadata: { old_status: oldStatus, note, refund_result: res },
  });
}

/** Admin bulk status update for multiple orders */
export async function bulkUpdateOrderStatus(
  orderIds: string[],
  newStatus: string,
  note?: string
): Promise<{ updated: number; errors: string[] }> {
  const { data: { user } } = await supabase.auth.getUser();
  let updated = 0;
  const errors: string[] = [];

  for (const orderId of orderIds) {
    try {
      // Get current status
      const { data: order } = await supabase
        .from("orders")
        .select("status, public_order_id")
        .eq("id", orderId)
        .single();

      if (!order) {
        errors.push(`Order ${orderId} not found`);
        continue;
      }

      const oldStatus = order.status;

      // Normal update
      const { error: updateErr } = await supabase
        .from("orders")
        .update({ 
          status: newStatus as any,
          ...(note ? { delivery_message: note } : {}) 
        })
        .eq("id", orderId);

      if (updateErr) {
        errors.push(`${order.public_order_id}: ${updateErr.message}`);
        continue;
      }

      // Log
      await supabase.from("order_status_history").insert({
        order_id: orderId,
        old_status: oldStatus,
        new_status: newStatus,
        source: "admin_bulk_update",
        note: note || `Bulk status update by admin`,
        metadata: { admin_user_id: user?.id, bulk: true },
      } as any);

      updated++;
    } catch (err) {
      errors.push(`${orderId}: ${String(err)}`);
    }
  }

  // Audit log for bulk operation
  await writeAuditLog({
    action: "order_bulk_status_update",
    targetType: "order",
    targetId: orderIds[0],
    metadata: { order_count: orderIds.length, new_status: newStatus, updated, errors_count: errors.length, note },
  });

  return { updated, errors };
}

/** Admin explicit wallet refund for multiple orders */
export async function bulkRefundOrders(
  orderIds: string[],
  note?: string
): Promise<{ updated: number; errors: string[] }> {
  const { data: { user } } = await supabase.auth.getUser();
  let updated = 0;
  const errors: string[] = [];

  for (const orderId of orderIds) {
    try {
      const { data: order } = await supabase
        .from("orders")
        .select("status, public_order_id")
        .eq("id", orderId)
        .single();

      if (!order) {
        errors.push(`Order ${orderId} not found`);
        continue;
      }

      const oldStatus = order.status;

      const { data: refundResult, error: refundErr } = await supabase.rpc(
        "refund_wallet_purchase_atomic",
        {
          _order_id: orderId,
          _reason: note || "Bulk admin manual refund",
          _actor_id: user?.id || null,
        }
      );
      if (refundErr) throw refundErr;
      
      const res = Array.isArray(refundResult) ? refundResult[0] : refundResult;
      if (!res?.refunded) {
        const { error: updateErr } = await supabase
          .from("orders")
          .update({ 
            status: "refunded" as any,
            ...(note ? { delivery_message: note } : {}) 
          })
          .eq("id", orderId);
        if (updateErr) {
          errors.push(`${order.public_order_id}: ${updateErr.message}`);
          continue;
        }
      } else if (note) {
        await supabase.from("orders").update({ delivery_message: note }).eq("id", orderId);
      }

      await supabase.from("order_status_history").insert({
        order_id: orderId,
        old_status: oldStatus,
        new_status: "refunded",
        source: "admin_bulk_refund",
        note: note || `Bulk manual explicit refund by admin`,
        metadata: { admin_user_id: user?.id, bulk: true, wallet_refund_attempted: true, wallet_refund_success: !!res?.refunded },
      } as any);

      updated++;
    } catch (err) {
      errors.push(`${orderId}: ${String(err)}`);
    }
  }

  await writeAuditLog({
    action: "order_bulk_manual_refund",
    targetType: "order",
    targetId: orderIds[0],
    metadata: { order_count: orderIds.length, updated, errors_count: errors.length, note },
  });

  return { updated, errors };
}

/** Delete a supplier */
export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await supabase
    .from("suppliers" as any)
    .delete()
    .eq("id", id);
  if (error) throw error;
}
