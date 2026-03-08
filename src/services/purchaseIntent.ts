/**
 * Purchase Intent Service
 * Creates and manages purchase intents for guest and user buy flows.
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
  
  // Create plan snapshot for immutability
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
      // Intent expires in 30 minutes
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
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
