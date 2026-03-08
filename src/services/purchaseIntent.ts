/**
 * Purchase Intent Service
 * Creates and manages purchase intents + payment verification for guest buy flows.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type DataPlan = Database["public"]["Tables"]["data_plans"]["Row"];
export type PurchaseIntent = Database["public"]["Tables"]["purchase_intents"]["Row"];

/** Generate a unique intent reference */
function generateIntentRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `KD-${ts}-${rand}`;
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

/** Create a guest purchase intent */
export async function createPurchaseIntent(params: {
  phoneNumber: string;
  network: string;
  plan: DataPlan;
  customerEmail?: string;
  customerName?: string;
}): Promise<PurchaseIntent> {
  const intentRef = generateIntentRef();

  const planSnapshot = {
    id: params.plan.id,
    plan_code: params.plan.plan_code,
    plan_name: params.plan.plan_name,
    amount: params.plan.amount,
    volume: params.plan.volume,
    network: params.plan.network,
    description: params.plan.description,
  };

  const { data, error } = await supabase
    .from("purchase_intents")
    .insert({
      intent_reference: intentRef,
      intent_type: "guest_buy",
      actor_type: "guest",
      source_channel: "public_guest_checkout",
      phone_number: params.phoneNumber,
      network: params.network,
      plan_id: params.plan.id,
      plan_snapshot: planSnapshot,
      amount_expected: Number(params.plan.amount),
      customer_email: params.customerEmail || null,
      customer_name: params.customerName || null,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Initialize Paystack payment for a purchase intent (server-side via edge function) */
export async function initializePayment(intentId: string): Promise<{
  authorization_url: string;
  access_code: string;
  reference: string;
  intent_reference: string;
}> {
  const { data, error } = await supabase.functions.invoke("initialize-payment", {
    body: { intent_id: intentId },
  });

  if (error) throw new Error(error.message || "Payment initialization failed");
  if (!data?.success) throw new Error(data?.error || "Payment initialization failed");
  return data;
}

/** Verify a Paystack payment and create order (server-side via edge function) */
export async function verifyPayment(reference: string): Promise<{
  success: boolean;
  order?: Record<string, unknown>;
  already_processed?: boolean;
  error?: string;
  status?: string;
  intent_reference?: string;
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

  // Try public_order_id first
  const { data: byOrderId } = await supabase
    .from("orders")
    .select("*")
    .eq("public_order_id", trimmed)
    .maybeSingle();

  if (byOrderId) return byOrderId;

  // Try via intent reference
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
