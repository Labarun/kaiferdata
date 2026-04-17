/**
 * Wallet Purchase Service
 *
 * Calls the secure `wallet-purchase` edge function so a logged-in user can
 * pay for a bundle directly with their personal wallet balance.
 *
 * The edge function performs server-side price re-resolution and an atomic
 * debit + order creation, then triggers fulfillment. The frontend NEVER
 * controls the amount charged.
 */
import { supabase } from "@/integrations/supabase/client";

export interface WalletPurchaseInput {
  packageId: string;
  network: string;
  phoneNumber: string;
  customerName?: string;
  customerEmail?: string;
}

export interface WalletPurchaseResult {
  success: boolean;
  order_id: string;
  public_order_id: string;
  amount_charged: number;
  new_balance: number;
  txn_id: string;
  fulfillment?: unknown;
}

export async function purchaseWithWallet(input: WalletPurchaseInput): Promise<WalletPurchaseResult> {
  const { data, error } = await supabase.functions.invoke("wallet-purchase", {
    body: {
      package_id: input.packageId,
      network: input.network,
      phone_number: input.phoneNumber,
      customer_name: input.customerName ?? null,
      customer_email: input.customerEmail ?? null,
    },
  });

  if (error) {
    // The supabase client wraps non-2xx as FunctionsHttpError; pull the body
    // for a friendly message when possible.
    const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
    if (ctx?.json) {
      try {
        const payload = await ctx.json();
        throw new Error(payload?.error || error.message || "Wallet purchase failed");
      } catch (_) {
        // fall through
      }
    }
    throw new Error(error.message || "Wallet purchase failed");
  }

  if (!data?.success) {
    throw new Error(data?.error || "Wallet purchase failed");
  }
  return data as WalletPurchaseResult;
}
