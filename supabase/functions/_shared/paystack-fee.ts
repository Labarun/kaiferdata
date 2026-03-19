/**
 * Paystack Fee Calculator — Server-side (Edge Functions)
 * Single source of truth, mirrored from frontend.
 * 
 * 3% fee on all Paystack payments.
 */

export const PAYSTACK_FEE_RATE = 0.03;

export interface PaystackAmountBreakdown {
  baseAmount: number;
  feeAmount: number;
  feeRate: number;
  totalAmount: number;
}

export function calculatePaystackFee(baseAmount: number): PaystackAmountBreakdown {
  const base = Math.round(baseAmount * 100) / 100;
  const fee = Math.round(base * PAYSTACK_FEE_RATE * 100) / 100;
  const total = Math.round((base + fee) * 100) / 100;

  return {
    baseAmount: base,
    feeAmount: fee,
    feeRate: PAYSTACK_FEE_RATE,
    totalAmount: total,
  };
}
