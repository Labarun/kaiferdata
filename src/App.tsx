import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RedirectIfAuth } from "@/components/auth/RedirectIfAuth";
import { ScaffoldPage } from "@/components/shared/ScaffoldPage";
import { lazy, Suspense } from "react";

// Layouts — kept eager since they wrap all routes
import { PublicLayout } from "@/layouts/PublicLayout";
import { UserLayout } from "@/layouts/UserLayout";
import { AgentLayout } from "@/layouts/AgentLayout";
import { FullAdminLayout } from "@/layouts/FullAdminLayout";
import { StaffLayout } from "@/layouts/StaffLayout";

// Critical public page — eagerly loaded for fast first paint
import BuyDataPage from "@/pages/public/BuyDataPage";
import Index from "@/pages/Index";

// Lazy-loaded pages
const TrackOrderPage = lazy(() => import("@/pages/public/TrackOrderPage"));
const PaymentCallbackPage = lazy(() => import("@/pages/public/PaymentCallbackPage"));
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/auth/ResetPasswordPage"));
const AboutPage = lazy(() => import("@/pages/About"));
const UserDashboardHome = lazy(() => import("@/pages/user/UserDashboardHome"));
const UserWalletPage = lazy(() => import("@/pages/user/UserWalletPage"));
const UserOrdersPage = lazy(() => import("@/pages/user/UserOrdersPage"));
const UserOrderDetailPage = lazy(() => import("@/pages/user/UserOrderDetailPage"));
const UserTransactionsPage = lazy(() => import("@/pages/user/UserTransactionsPage"));
const UserProfilePage = lazy(() => import("@/pages/user/UserProfilePage"));
const UserBuyDataPage = lazy(() => import("@/pages/user/UserBuyDataPage"));
const AgentDashboardHome = lazy(() => import("@/pages/agent/AgentDashboardHome"));
const AdminDashboardHome = lazy(() => import("@/pages/admin/AdminDashboardHome"));
const StaffDashboardHome = lazy(() => import("@/pages/staff/StaffDashboardHome"));
const StaffOrdersPage = lazy(() => import("@/pages/staff/StaffOrdersPage"));
const StaffOrderDetailPage = lazy(() => import("@/pages/staff/StaffOrderDetailPage"));
const StaffTransactionsPage = lazy(() => import("@/pages/staff/StaffTransactionsPage"));
const StaffTransactionDetailPage = lazy(() => import("@/pages/staff/StaffTransactionDetailPage"));
const StaffIntentsPage = lazy(() => import("@/pages/staff/StaffIntentsPage"));
const StaffIntentDetailPage = lazy(() => import("@/pages/staff/StaffIntentDetailPage"));
const StaffIssueQueuePage = lazy(() => import("@/pages/staff/StaffIssueQueuePage"));
const SystemControlsPage = lazy(() => import("@/pages/admin/SystemControlsPage"));
const AdminNoticesPage = lazy(() => import("@/pages/admin/AdminNoticesPage"));
const AdminOrdersPage = lazy(() => import("@/pages/admin/AdminOrdersPage"));
const AdminOrderDetailPage = lazy(() => import("@/pages/admin/AdminOrderDetailPage"));
const AdminTransactionsPage = lazy(() => import("@/pages/admin/AdminTransactionsPage"));
const AdminTransactionDetailPage = lazy(() => import("@/pages/admin/AdminTransactionDetailPage"));
const AdminReconciliationPage = lazy(() => import("@/pages/admin/AdminReconciliationPage"));
const AdminIntentsPage = lazy(() => import("@/pages/admin/AdminIntentsPage"));
const AdminIntentDetailPage = lazy(() => import("@/pages/admin/AdminIntentDetailPage"));
const AdminPackagesPage = lazy(() => import("@/pages/admin/AdminPackagesPage"));
const AdminSupplierPage = lazy(() => import("@/pages/admin/AdminSupplierPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider defaultTheme="system" storageKey="kaifer-theme">
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
              {/* ====== PUBLIC AREA ====== */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/buy" element={<BuyDataPage />} />
                <Route path="/about" element={<AboutPage />} />
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
                <Route path="/admin/supplier" element={<AdminSupplierPage />} />
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
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
