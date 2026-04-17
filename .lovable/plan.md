
The user approved. I have all the decisions needed. Plan is finalized below — implementation will proceed in default mode after approval.

# Live-Safe Polish & Admin Operations Upgrade

A strict additive pass — no redesigns, no breaking changes to payment/wallet/supplier/agent flows.

## Phase 1 — Database (single migration)

**New tables**
- `withdrawal_requests` — id, user_id, agent_profile_id, amount, momo_number, momo_network, momo_name, status (pending/approved/rejected/paid), admin_note, requested_at, reviewed_at, reviewed_by, wallet_transaction_id
- `admin_user_notes` — id, user_id, admin_id, note, created_at

**New atomic RPCs (SECURITY DEFINER)**
- `debit_wallet_atomic(_wallet_id, _amount, _narration, _reference, _created_by)` — mirrors credit, with `FOR UPDATE` lock + balance check; raises if insufficient
- `request_agent_withdrawal_atomic(_user_id, _amount, _momo_*)` — locks agent wallet, debits via `debit_wallet_atomic`, inserts pending withdrawal_request
- `approve_agent_withdrawal_atomic(_request_id, _admin_id, _note)` — marks paid (funds already debited at request time)
- `reject_agent_withdrawal_atomic(_request_id, _admin_id, _note)` — refunds wallet via credit_wallet_atomic, marks rejected
- `admin_set_user_role(_target_user_id, _role, _admin_id)` — grants/revokes role with audit log; admin can manage all roles incl. admin
- `admin_credit_user_wallet(_target_user_id, _amount, _reason, _admin_id)` — admin-initiated wallet credit + audit log
- `admin_debit_user_wallet(_target_user_id, _amount, _reason, _admin_id)` — admin-initiated wallet debit + audit log
- `admin_set_account_status(_target_user_id, _status, _reason, _admin_id)` — active/suspended/banned + audit log

**RLS**: standard owner-read + admin-manage on new tables.

## Phase 2 — Loading Shell Fix (root cause of duplicated background)

**Root cause**: `App.tsx` wraps each lazy route with `<Suspense fallback={<PageLoader/>}>` *outside* the layout. During lazy chunk load, the previous layout stays mounted while `PageLoader` renders inside the new layout shell → two backgrounds visible.

**Fix**:
- Move `Suspense` boundary *inside* each layout, around `<Outlet />` only
- `PageLoader` becomes content-area only (no full-screen background)
- Layouts (`DashboardLayout`, `AdminLayout`, `PublicLayout`, `AgentLayout`, `UserLayout`, `StaffLayout`) own their single background; loader is centered inside the content slot
- Add `min-h-[60vh] grid place-items-center` wrapper for stability

## Phase 3 — iOS PWA (manifest + Apple meta only, no service worker)

- Create `public/manifest.webmanifest` with name, short_name, icons (192/512/maskable), `display: "standalone"`, `theme_color`, `background_color: #f8fafc`
- Add to `index.html` `<head>`:
  - `<link rel="manifest" href="/manifest.webmanifest">`
  - `<meta name="apple-mobile-web-app-capable" content="yes">`
  - `<meta name="apple-mobile-web-app-status-bar-style" content="default">`
  - `<meta name="apple-mobile-web-app-title" content="Kaiferdata">`
  - `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`
  - `<meta name="theme-color" content="#06b6d4">`
- Add `viewport-fit=cover` and CSS `env(safe-area-inset-*)` padding on bottom nav/dock to handle iPhone notch + home indicator
- Generate icons from existing logo

## Phase 4 — Menu Auto-Close on Navigation

- New hook `src/hooks/useCloseOnRouteChange.ts` — accepts `setOpen`, listens to `useLocation().pathname`
- Apply in: profile dropdown (DashboardLayout), admin sidebar Sheet, agent menu sheet, user menu sheet
- Also wrap dropdown items with explicit `onClick={() => setOpen(false)}` before navigation
- Verify `vaul` Drawer + Radix DropdownMenu close on `<NavLink>` activation

## Phase 5 — Agent Mobile Nav (4 tabs + More sheet)

**Bottom nav**: Dashboard, Orders, Earnings, Withdraw

**More sheet** (sheet from bottom, opens via secondary entry in header or dock overflow):
- Back to User Dashboard, Store Preview, Manage Store, Subscription, Notices, Profile, Sign Out

Edit `AgentLayout.tsx` navItems + add `<AgentMoreSheet>` component.

## Phase 6 — Admin User Management `/admin/users`

New `AdminUsersPage.tsx` + `AdminUserDetailDialog.tsx`:
- Search (name/email/username/phone), filter by role + account_status
- Detail dialog tabs: **Overview** (profile, role, account status, wallet balance), **Wallet** (credit/debit form + transaction history), **Orders** (recent), **Agent** (profile/subscription if any), **Roles** (manage all incl. admin with double-confirm), **Notes** (admin internal notes)
- All destructive/financial actions require AlertDialog confirmation
- All actions go through new RPCs → automatic audit_logs entries
- Permission gate: `has_role(admin)` server-side via RLS + RPC; client `ProtectedRoute` already enforces

New service `src/services/adminUsers.ts` wrapping the RPCs + queries.

Add route + nav entry (already exists in `FullAdminLayout`, page just needs creating).

## Phase 7 — Admin Notices Fix `/admin/notices`

Existing page likely incomplete. Rebuild as full CRUD:
- Form: title, body, notice_type (info/warning/critical/maintenance), audience (public/all/users/agents/staff/admins), is_active, starts_at, ends_at
- List with filters (active/scheduled/expired/all) + audience badge
- Toggle active, edit, delete (with confirm), preview
- Audit log on create/update/delete/toggle
- Verify `NoticeBanner` component reads correctly via existing RLS (it already does — schema is fine)

## Phase 8 — Withdrawals UI

- `src/pages/agent/AgentWithdrawPage.tsx` — current balance, request form (amount, MoMo number, network, name), recent requests list with status
- `src/services/agentWithdrawals.ts`
- Admin: add Withdrawals tab to `/admin/agents` or new `/admin/withdrawals` with approve/reject actions

## Phase 9 — Memory Update

Add `mem://features/admin-user-management`, `mem://features/agent-withdrawals`, `mem://style/ios-pwa-standalone`, update Core if needed.

## Files to Create
- migration (Phase 1)
- `public/manifest.webmanifest`, `public/icons/*`
- `src/hooks/useCloseOnRouteChange.ts`
- `src/pages/admin/AdminUsersPage.tsx`, `src/components/admin/AdminUserDetailDialog.tsx`
- `src/pages/agent/AgentWithdrawPage.tsx`, `src/components/agent/AgentMoreSheet.tsx`
- `src/services/adminUsers.ts`, `src/services/agentWithdrawals.ts`

## Files to Edit
- `index.html` (Apple meta + manifest link)
- `src/App.tsx` (move Suspense into layouts, register new routes)
- All 6 layouts (Suspense around Outlet, safe-area padding)
- `src/layouts/AgentLayout.tsx` (4 tabs + More)
- `src/components/shared/LoadingState.tsx` (PageLoader content-area variant)
- `src/pages/admin/AdminNoticesPage.tsx` (full CRUD rebuild)
- Profile dropdown + sidebar sheets (auto-close hook)

## Safety
- All financial ops via atomic RPCs with `FOR UPDATE` locks
- Audit logs on every admin action
- No changes to: paystack flows, supplier webhook, fulfillment pipeline, intent verification, public buy flow, existing wallet credit logic
- Migration is purely additive (new tables, new functions)

