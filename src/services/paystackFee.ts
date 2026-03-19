/**
 * Paystack Fee Calculator — Single source of truth for Paystack processing fees.
 * 
 * Rule: 3% fee on top of the base amount for all Paystack payments.
 * This applies to: guest orders, logged-in Paystack orders, wallet deposits.
 * Does NOT apply to: wallet-funded purchases.
 */

export const PAYSTACK_FEE_RATE = 0.03; // 3%

export interface PaystackAmountBreakdown {
  /** Original product/deposit amount */
  baseAmount: number;
  /** 3% Paystack processing fee */
  feeAmount: number;
  /** Fee rate as decimal (0.03) */
  feeRate: number;
  /** Total charged: base + fee */
  totalAmount: number;
}

/**
 * Calculate Paystack fee breakdown for any base amount.
 * All amounts are rounded to 2 decimal places (GHS precision).
 */
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

/**
 * Format amount to 2 decimal places string
 */
export function formatGHS(amount: number): string {
  return amount.toFixed(2);
}
