---
name: agent-earnings-wallet
description: Separate agent earnings wallet — distinct from personal wallet, credited via commission trigger, withdrawn via v2 RPCs
type: feature
---
Agents have a SEPARATE earnings balance (`agent_earnings_wallets` + `agent_wallet_transactions` ledger), distinct from their personal `wallets` row. Commissions land here automatically via `handle_order_delivered_commission` (computes `selling - base` from the referral snapshot, falls back to legacy 8%). Withdrawals use `request/approve/reject_agent_withdrawal_v2_atomic` which route to the correct wallet kind via `withdrawal_requests.wallet_kind`. Personal wallet is for buying data; earnings wallet is for cashout to MoMo. Min withdrawal GH₵ 10.
