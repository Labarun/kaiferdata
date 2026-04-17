---
name: agent-pricing-model
description: Per-bundle full selling price (not % markup) — agents set absolute price, profit auto-computed as selling - agent_base_price
type: feature
---
Agents set the **full selling price** per bundle on `/agent/pricing`, not a percentage markup. Stored in `agent_bundle_prices`. Admin sets `data_packages.agent_base_price` (the cost to the agent) + `is_agent_resaleable` flag. Validation in `upsert_agent_bundle_price` enforces selling ≥ base, ≤ 10× base. Storefront uses `fetchPublishedAgentBundles` which falls back to public `selling_price` for any bundle the agent hasn't priced yet. Intent snapshots `agent_selling_price` + `agent_base_price` into `order_context.referral` so commission trigger gets exact profit.
