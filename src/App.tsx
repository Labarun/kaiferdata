import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RedirectIfAuth } from "@/components/auth/RedirectIfAuth";
import { ScaffoldPage } from "@/components/shared/ScaffoldPage";

// Layouts
import { PublicLayout } from "@/layouts/PublicLayout";
import { UserLayout } from "@/layouts/UserLayout";
import { AgentLayout } from "@/layouts/AgentLayout";
import { FullAdminLayout } from "@/layouts/FullAdminLayout";
import { StaffLayout } from "@/layouts/StaffLayout";

// Public pages
import BuyDataPage from "@/pages/public/BuyDataPage";
import TrackOrderPage from "@/pages/public/TrackOrderPage";
import PaymentCallbackPage from "@/pages/public/PaymentCallbackPage";

// Auth pages
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";

// Dashboard pages
import UserDashboardHome from "@/pages/user/UserDashboardHome";
import UserWalletPage from "@/pages/user/UserWalletPage";
import UserOrdersPage from "@/pages/user/UserOrdersPage";
import UserOrderDetailPage from "@/pages/user/UserOrderDetailPage";
import UserTransactionsPage from "@/pages/user/UserTransactionsPage";
import UserProfilePage from "@/pages/user/UserProfilePage";
import UserBuyDataPage from "@/pages/user/UserBuyDataPage";
import AgentDashboardHome from "@/pages/agent/AgentDashboardHome";
import AdminDashboardHome from "@/pages/admin/AdminDashboardHome";
import StaffDashboardHome from "@/pages/staff/StaffDashboardHome";
import StaffOrdersPage from "@/pages/staff/StaffOrdersPage";
import StaffOrderDetailPage from "@/pages/staff/StaffOrderDetailPage";
import StaffTransactionsPage from "@/pages/staff/StaffTransactionsPage";
import StaffTransactionDetailPage from "@/pages/staff/StaffTransactionDetailPage";
import StaffIntentsPage from "@/pages/staff/StaffIntentsPage";
import StaffIntentDetailPage from "@/pages/staff/StaffIntentDetailPage";
import StaffIssueQueuePage from "@/pages/staff/StaffIssueQueuePage";

// Admin functional pages
import SystemControlsPage from "@/pages/admin/SystemControlsPage";
import AdminNoticesPage from "@/pages/admin/AdminNoticesPage";
import AdminOrdersPage from "@/pages/admin/AdminOrdersPage";
import AdminOrderDetailPage from "@/pages/admin/AdminOrderDetailPage";
import AdminTransactionsPage from "@/pages/admin/AdminTransactionsPage";
import AdminTransactionDetailPage from "@/pages/admin/AdminTransactionDetailPage";
import AdminReconciliationPage from "@/pages/admin/AdminReconciliationPage";
import AdminIntentsPage from "@/pages/admin/AdminIntentsPage";
import AdminIntentDetailPage from "@/pages/admin/AdminIntentDetailPage";
import AdminPackagesPage from "@/pages/admin/AdminPackagesPage";

import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* ====== PUBLIC AREA ====== */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<BuyDataPage />} />
              <Route path="/buy" element={<BuyDataPage />} />
              <Route path="/track" element={<TrackOrderPage />} />
              <Route path="/payment/callback" element={<PaymentCallbackPage />} />
              <Route path="/login" element={<RedirectIfAuth><LoginPage /></RedirectIfAuth>} />
              <Route path="/register" element={<RedirectIfAuth><RegisterPage /></RedirectIfAuth>} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>

            {/* ====== USER DASHBOARD ====== */}
            <Route element={<ProtectedRoute allowedRoles={["user", "agent", "admin", "staff"]}><UserLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<UserDashboardHome />} />
              <Route path="/dashboard/buy" element={<UserBuyDataPage />} />
              <Route path="/dashboard/wallet" element={<UserWalletPage />} />
              <Route path="/dashboard/orders" element={<UserOrdersPage />} />
              <Route path="/dashboard/orders/:orderId" element={<UserOrderDetailPage />} />
              <Route path="/dashboard/transactions" element={<UserTransactionsPage />} />
              <Route path="/dashboard/profile" element={<UserProfilePage />} />
            </Route>

            {/* ====== AGENT DASHBOARD ====== */}
            <Route element={<ProtectedRoute allowedRoles={["agent", "admin"]}><AgentLayout /></ProtectedRoute>}>
              <Route path="/agent" element={<AgentDashboardHome />} />
              <Route path="/agent/store" element={<ScaffoldPage title="Store" description="Agent store coming in Phase 2" />} />
              <Route path="/agent/orders" element={<ScaffoldPage title="Orders" description="Agent orders coming in Phase 2" />} />
              <Route path="/agent/earnings" element={<ScaffoldPage title="Earnings" description="Earnings tracking coming in Phase 2" />} />
              <Route path="/agent/subscription" element={<ScaffoldPage title="Subscription" description="Subscription management coming in Phase 2" />} />
            </Route>

            {/* ====== ADMIN PANEL ====== */}
            <Route element={<ProtectedRoute allowedRoles={["admin"]}><FullAdminLayout /></ProtectedRoute>}>
              <Route path="/admin" element={<AdminDashboardHome />} />
              <Route path="/admin/packages" element={<AdminPackagesPage />} />
              <Route path="/admin/orders" element={<AdminOrdersPage />} />
              <Route path="/admin/orders/:orderId" element={<AdminOrderDetailPage />} />
              <Route path="/admin/transactions" element={<AdminTransactionsPage />} />
              <Route path="/admin/transactions/:transactionId" element={<AdminTransactionDetailPage />} />
              <Route path="/admin/reconciliation" element={<AdminReconciliationPage />} />
              <Route path="/admin/intents" element={<AdminIntentsPage />} />
              <Route path="/admin/intents/:intentId" element={<AdminIntentDetailPage />} />
              <Route path="/admin/deposits" element={<ScaffoldPage title="Deposits" description="Deposit management" />} />
              <Route path="/admin/users" element={<ScaffoldPage title="Users" description="User management" />} />
              <Route path="/admin/agents" element={<ScaffoldPage title="Agents" description="Agent management" />} />
              <Route path="/admin/tickets" element={<ScaffoldPage title="Tickets" description="Support ticket management" />} />
              <Route path="/admin/analytics" element={<ScaffoldPage title="Analytics" description="Platform analytics" />} />
              <Route path="/admin/notices" element={<AdminNoticesPage />} />
              <Route path="/admin/system-controls" element={<SystemControlsPage />} />
              <Route path="/admin/staff" element={<ScaffoldPage title="Staff" description="Staff management" />} />
            </Route>

            {/* ====== STAFF PANEL ====== */}
            <Route element={<ProtectedRoute allowedRoles={["staff", "admin"]}><StaffLayout /></ProtectedRoute>}>
              <Route path="/staff" element={<StaffDashboardHome />} />
              <Route path="/staff/orders" element={<StaffOrdersPage />} />
              <Route path="/staff/orders/:orderId" element={<StaffOrderDetailPage />} />
              <Route path="/staff/transactions" element={<StaffTransactionsPage />} />
              <Route path="/staff/transactions/:transactionId" element={<StaffTransactionDetailPage />} />
              <Route path="/staff/intents" element={<StaffIntentsPage />} />
              <Route path="/staff/intents/:intentId" element={<StaffIntentDetailPage />} />
              <Route path="/staff/issues" element={<StaffIssueQueuePage />} />
            </Route>

            {/* ====== CATCH-ALL ====== */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
