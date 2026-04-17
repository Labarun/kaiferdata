# Memory: index.md
Updated: just now

# Project Memory

## Core
Ghana market exclusively (MTN, Telecel, AirtelTigo).
Auth: Username, phone, email. No email verification. Roles: User, Agent, Staff, Admin.
Commerce: Zero-trust backend pricing. Paystack (3% fee) + Wallet. Purchase Intent pattern.
Design: 'Light Liquid Glass' theme (blue/cyan). App-like, footer-less. Mobile inputs >=16px. Fintech pricing (GH₵X.XX).
Tech Stack: Supabase (RLS, pg_cron, Edge Functions). AfroHubGH API for supplier integration.
All admin financial/role actions go through SECURITY DEFINER atomic RPCs with audit_logs entries.

## Memories
- [Core Vision](mem://project/core-vision) — Production-grade Kaiferdata platform focused on long-term scalability
- [Market Focus](mem://project/market-focus) — Ghana market targeted platform supporting MTN, Telecel, AirtelTigo
- [Roles & Permissions](mem://architecture/roles-and-permissions) — 4-tier system: user, agent, staff (read-only support), admin
- [Commerce Pattern](mem://architecture/commerce-pattern) — Purchase Intent pattern decoupling plans from transactions
- [System Management](mem://features/system-management) — DB-driven toggles for emergency payment/fulfillment lockdown
- [Visual Direction](mem://style/visual-direction) — Light Liquid Glass aesthetic with mobile drawer/glass dock navigation
- [Identity Model](mem://architecture/identity-model) — Username/phone/email registration with immediate post-signup access
- [Fulfillment Pipeline](mem://architecture/fulfillment-pipeline) — Paid -> Processing -> Delivered timeline via supplier routing layer
- [Admin Recovery](mem://features/admin-recovery) — Tools to recover orphan payments and stuck intents
- [Color Palette](mem://style/color-palette) — Blue/cyan/teal base, dynamic switching to specific network colors
- [Branding Layout](mem://style/branding-layout) — Footer-less app-like structure, minimal JJ Solutions credit
- [Bundle Selection Flow](mem://style/ui-ux-patterns/bundle-selection-flow) — Direct checkout bottom sheet from bundle card tap
- [Logged-In Buy Flow](mem://features/logged-in-buy-flow) — Dashboard Buy Data page with Wallet/Paystack payment choices
- [Performance Constraints](mem://style/performance-constraints) — Capped backdrop-blur, React.memo, lazy loading for mobile fluid performance
- [Wallet Management](mem://features/wallet-management) — Real-time balances, Paystack deposit intents system
- [Pricing Display](mem://style/ui-ux-patterns/pricing-display) — Fintech format: GH₵X.XX with smaller currency symbol
- [Branding Assets](mem://style/branding-assets) — Official network logos housed in rounded-2xl glass containers
- [Payment Integrity](mem://architecture/payment-integrity) — Zero-trust amount validation, strict 0.02 GHS tolerance
- [Order Tracking](mem://features/order-tracking) — Real-time visual fulfillment timeline for guests and users
- [Hero Messaging](mem://style/hero-messaging) — Conversion-focused 'Buy Data Fast' with minimalist trust indicators
- [Mobile UI Resilience](mem://style/mobile-ui-resilience) — 16px minimum inputs, z-indexing, React Portals for overlays
- [Supplier API Integration](mem://features/supplier-api-integration) — Live catalog sync, maintaining manual pricing control
- [Automated Fulfillment Sync](mem://features/automated-fulfillment-sync) — Background polling via Edge Functions for order status
- [Real-Time Visibilty](mem://architecture/real-time-operational-visibility) — postgres_changes for live UI updates without refresh
- [Admin Overrides](mem://features/admin-operational-overrides) — Manual status overrides with detailed audit logging
- [Data Package Engine](mem://features/data-package-management) — Independent supplier_price and selling_price management
- [Background Automation](mem://architecture/background-automation-infrastructure) — pg_cron & pg_net scheduling for sync tasks
- [Naming Convention](mem://features/data-package-management/naming-convention) — Stable codes (e.g. MTN_1GB) for API mapping
- [AfroHubGH Implementation](mem://features/supplier-api-integration/afrohubgh-implementation) — Standardized on AfroHubGH production endpoints
- [Supplier Diagnostics](mem://features/supplier-diagnostics) — Admin tools for /v1/health and balance monitoring
- [Supplier Webhooks](mem://features/supplier-webhooks) — HMAC-SHA256 verified webhook for order status updates
- [Fulfillment Logic](mem://features/supplier-api-integration/afrohubgh-fulfillment-logic) — Robust resolution mapping to supplier UUIDs
- [Dashboard Premium UI](mem://style/visual-direction/dashboard-premium-hierarchy) — Immersive, richer glass effects for logged-in users
- [Support Integration](mem://style/support-integration) — Pulsing floating WhatsApp Channel button
- [Paystack Processing Fee](mem://features/paystack-processing-fee-system) — 3% markup on Paystack payments, excluding wallet funds
- [Drawer Interaction Stability](mem://style/mobile-ui-resilience/drawer-interaction-stability) — vaul drawer optimizations to prevent scroll jank
- [Concurrency Protection](mem://architecture/concurrency-protection) — SELECT FOR UPDATE atomic functions for financial flows
- [Security Auditing](mem://architecture/security-auditing) — Logging for rate limits, manipulation, and concurrency blocks
- [Rate Limiting](mem://architecture/rate-limiting) — Strict limits on financial endpoints to prevent abuse
- [Agent Withdrawals](mem://features/agent-withdrawals) — MoMo payout flow with atomic debit, admin approve/reject queue, auto-refund
- [Admin User Management](mem://features/admin-user-management) — Detailed admin tooling for roles, wallets, account status via SECURITY DEFINER RPCs
- [iOS PWA Standalone](mem://style/ios-pwa-standalone) — Manifest + Apple meta tags + safe-area-inset for installed-app feel
