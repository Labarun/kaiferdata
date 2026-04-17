---
name: subscription-gate
description: Premium pre-activation gating — approved-but-unsubscribed agents see blurred preview + paywall CTA on every gated feature
type: design
---
The `<SubscriptionGate>` component (in `src/components/agent/`) wraps pricing, marketing, customers, transactions, bulk orders, and withdrawals pages. When subscription is inactive, children are rendered blurred + non-interactive with a centered "Activate your store" card linking to `/agent/subscription`. Use `mode="action"` for inline lock badges on individual buttons. Gate state comes from `useSubscriptionSnapshot` which checks both `agent_profiles.status === 'active'` AND `agent_subscriptions.status === 'active'` AND `expires_at > now()`.
