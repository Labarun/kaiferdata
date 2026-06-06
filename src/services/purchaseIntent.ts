/**
 * Purchase Intent Service
 * Creates and manages purchase intents + payment flows for:
 * - Guest buy (public)
 * - Logged-in buy (direct Paystack)
 * - Wallet deposits
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { ensureUserScaffold } from "@/services/auth";

export type DataPlan = Database["public"]["Tables"]["data_plans"]["Row"];
export type PurchaseIntent = Database["public"]["Tables"]["purchase_intents"]["Row"];

/** Generate a unique intent reference */
function generateIntentRef(prefix = "KD"): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

/** Fetch all active data plans, grouped by network */
export async function fetchDataPlans(): Promise<DataPlan[]> {
  const { data, error } = await supabase
    .from("data_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

/** Get unique networks from plans */
export function getNetworks(plans: DataPlan[]): string[] {
  return [...new Set(plans.map((p) => p.network))];
}

/** Filter plans by network */
export function filterPlansByNetwork(plans: DataPlan[], network: string): DataPlan[] {
  return plans.filter((p) => p.network === network);
}

/** Create a guest/user purchase intent using DataPackage-bridged plan */
export async function createPurchaseIntent(params: {
  phoneNumber: string;
  network: string;
  plan: DataPlan;
  customerEmail?: string;
  customerName?: string;
  actorType?: string;
  actorId?: string;
  sourceChannel?: string;
  intentType?: string;
  /** Optional referral attribution (agent storefront sales). Stored in order_context. */
  referral?: {
    agent_profile_id: string;
    agent_user_id: string;
    store_slug: string;
    store_name: string;
  };
  /** Optional bulk numbers for bulk purchasing. If provided, intent is treated as a bulk order. */
  bulkPhoneNumbers?: string[];
}): Promise<PurchaseIntent> {
  if (params.actorType === "user" && params.actorId) {
    const { data: authData } = await supabase.auth.getUser();
    const authUser = authData.user;
    if (authUser && authUser.id === params.actorId) {
      await ensureUserScaffold({
        userId: authUser.id,
        email: authUser.email,
        fullName: (authUser.user_metadata?.full_name as string | undefined) ?? params.customerName ?? null,
        username: (authUser.user_metadata?.username as string | undefined) ?? null,
        phone: (authUser.user_metadata?.phone as string | undefined) ?? null,
      });
    }
  }

  const intentRef = generateIntentRef("KD");

  const planSnapshot = {
    id: params.plan.id,
    plan_code: params.plan.plan_code,
    plan_name: params.plan.plan_name,
    amount: params.plan.amount,
    volume: params.plan.volume,
    network: params.plan.network,
    description: params.plan.description,
  };

  const isBulk = Array.isArray(params.bulkPhoneNumbers) && params.bulkPhoneNumbers.length > 0;
  const quantity = isBulk ? params.bulkPhoneNumbers!.length : 1;
  const expectedAmount = Number(params.plan.amount) * quantity;
  const primaryPhone = isBulk ? "BULK" : params.phoneNumber;

  const orderContext = params.referral
    ? { referral: params.referral, ...(isBulk ? { bulk_numbers: params.bulkPhoneNumbers } : {}) }
    : (isBulk ? { bulk_numbers: params.bulkPhoneNumbers } : null);

  const { data, error } = await supabase
    .from("purchase_intents")
    .insert({
      intent_reference: intentRef,
      intent_type: isBulk ? "agent_bulk_buy" : (params.intentType || "guest_buy"),
      actor_type: params.actorType || "guest",
      actor_id: params.actorId || null,
      source_channel: params.sourceChannel || (params.referral ? "agent_storefront" : "public_guest_checkout"),
      phone_number: primaryPhone,
      network: params.network,
      plan_id: null, // FK removed — we rely on plan_snapshot
      plan_snapshot: planSnapshot,
      amount_expected: expectedAmount,
      customer_email: params.customerEmail || null,
      customer_name: params.customerName || null,
      order_context: orderContext,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("createPurchaseIntent error:", error);
    throw new Error("Failed to create order. Please try again.");
  }
  return data;
}

/** Create a wallet deposit intent */
export async function createDepositIntent(params: {
  amount: number;
  userId: string;
  userEmail?: string;
  userName?: string;
}): Promise<PurchaseIntent> {
  await ensureUserScaffold({
    userId: params.userId,
    email: params.userEmail ?? null,
    fullName: params.userName ?? null,
  });

  const intentRef = generateIntentRef("DEP");

  const { data, error } = await supabase
    .from("purchase_intents")
    .insert({
      intent_reference: intentRef,
      intent_type: "wallet_deposit",
      actor_type: "user",
      actor_id: params.userId,
      source_channel: "user_dashboard",
      phone_number: "0000000000", // not applicable for deposits
      network: "DEPOSIT",
      plan_id: null,
      plan_snapshot: {
        type: "wallet_deposit",
        amount: params.amount,
      },
      amount_expected: params.amount,
      customer_email: params.userEmail || null,
      customer_name: params.userName || null,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("createDepositIntent error:", error);
    throw new Error("Failed to create deposit request. Please try again.");
  }
  return data;
}

/** Initialize Paystack payment for a purchase/deposit intent.
 *  Resilient error handling: when the edge function returns a non-2xx,
 *  supabase-js wraps it in a FunctionsHttpError with a generic message and
 *  the real response body sits on `error.context`. We unwrap it so users
 *  see the actual reason ("Payments temporarily disabled", "Package not
 *  found", "Too many attempts", etc.) instead of a confusing generic error. */
export async function initializePayment(intentId: string): Promise<{
  authorization_url: string;
  access_code: string;
  reference: string;
  intent_reference: string;
}> {
  const { data, error } = await supabase.functions.invoke("initialize-payment", {
    body: { intent_id: intentId },
  });

  if (error) {
    // Try to extract the real edge-function JSON body
    let serverMessage: string | null = null;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        if (body && typeof body === "object") {
          serverMessage = (body.error as string) || null;
          // If the server says it's already completed, treat as already-paid
          if ((body as { already_completed?: boolean }).already_completed) {
            throw new Error("This payment has already been completed.");
          }
        }
      }
    } catch (parseErr) {
      // Fall through to generic message — never crash on parse failure
      if (parseErr instanceof Error && parseErr.message === "This payment has already been completed.") {
        throw parseErr;
      }
    }
    console.error("[initializePayment] edge error:", error, "server:", serverMessage);
    throw new Error(serverMessage || "Could not start payment. Please try again.");
  }

  if (!data?.success) {
    console.error("[initializePayment] non-success response:", data);
    throw new Error(data?.error || "Could not start payment. Please try again.");
  }
  return data;
}

/** Verify a Paystack payment (works for both purchases and deposits) */
export async function verifyPayment(reference: string): Promise<{
  success: boolean;
  order?: Record<string, unknown>;
  deposit?: Record<string, unknown>;
  already_processed?: boolean;
  error?: string;
  status?: string;
  intent_reference?: string;
  intent_type?: string;
}> {
  const { data, error } = await supabase.functions.invoke("verify-payment", {
    body: { reference },
  });

  if (error) throw new Error(error.message || "Payment verification failed");
  return data;
}

/** Lookup a purchase intent by reference (for tracking) */
export async function lookupIntent(reference: string): Promise<PurchaseIntent | null> {
  const { data, error } = await supabase
    .from("purchase_intents")
    .select("*")
    .eq("intent_reference", reference.trim().toUpperCase())
    .single();

  if (error) return null;
  return data;
}

/** Lookup an order by public order ID or intent reference */
export async function lookupOrder(ref: string): Promise<Record<string, unknown> | null> {
  const trimmed = ref.trim().toUpperCase();

  const { data: byOrderId } = await supabase
    .from("orders")
    .select("*")
    .eq("public_order_id", trimmed)
    .maybeSingle();

  if (byOrderId) return byOrderId;

  const intent = await lookupIntent(trimmed);
  if (intent) {
    const { data: byIntent } = await supabase
      .from("orders")
      .select("*")
      .eq("intent_id", intent.id)
      .maybeSingle();

    if (byIntent) return byIntent;
  }

  return null;
}
