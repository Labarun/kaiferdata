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
import LandingPage from "@/pages/public/LandingPage";
import BuyDataPage from "@/pages/public/BuyDataPage";
import TrackOrderPage from "@/pages/public/TrackOrderPage";

// Auth pages
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";

// Dashboard pages
import UserDashboardHome from "@/pages/user/UserDashboardHome";
import AgentDashboardHome from "@/pages/agent/AgentDashboardHome";
import AdminDashboardHome from "@/pages/admin/AdminDashboardHome";
import StaffDashboardHome from "@/pages/staff/StaffDashboardHome";

// Admin functional pages
import SystemControlsPage from "@/pages/admin/SystemControlsPage";
import AdminNoticesPage from "@/pages/admin/AdminNoticesPage";

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
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<RedirectIfAuth><LoginPage /></RedirectIfAuth>} />
              <Route path="/register" element={<RedirectIfAuth><RegisterPage /></RedirectIfAuth>} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>

            {/* ====== USER DASHBOARD ====== */}
            <Route element={<ProtectedRoute allowedRoles={["user", "agent", "admin", "staff"]}><UserLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<UserDashboardHome />} />
              <Route path="/dashboard/wallet" element={<ScaffoldPage title="Wallet" description="Wallet management coming in Phase 2" />} />
              <Route path="/dashboard/orders" element={<ScaffoldPage title="Orders" description="Order history coming in Phase 2" />} />
              <Route path="/dashboard/deposits" element={<ScaffoldPage title="Deposits" description="Deposit management coming in Phase 2" />} />
              <Route path="/dashboard/notices" element={<ScaffoldPage title="Notices" description="Your notifications" />} />
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
              <Route path="/admin/orders" element={<ScaffoldPage title="Orders" description="Order management" />} />
              <Route path="/admin/transactions" element={<ScaffoldPage title="Transactions" description="Transaction management" />} />
              <Route path="/admin/reconciliation" element={<ScaffoldPage title="Reconciliation" description="Reconciliation tools" />} />
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
              <Route path="/staff/orders" element={<ScaffoldPage title="Orders" description="Order management" />} />
              <Route path="/staff/users" element={<ScaffoldPage title="Users" description="User management" />} />
              <Route path="/staff/deposits" element={<ScaffoldPage title="Deposits" description="Deposit management" />} />
              <Route path="/staff/tickets" element={<ScaffoldPage title="Tickets" description="Support ticket management" />} />
              <Route path="/staff/transactions" element={<ScaffoldPage title="Transactions" description="Transaction viewing" />} />
              <Route path="/staff/agent-applications" element={<ScaffoldPage title="Agent Applications" description="Review agent applications" />} />
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
