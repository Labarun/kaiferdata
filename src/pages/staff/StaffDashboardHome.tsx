/**
 * Staff Dashboard Home
 */
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { ShoppingCart, Users, ArrowDownToLine, Ticket, ArrowRightLeft, UserCheck } from "lucide-react";

export default function StaffDashboardHome() {
  return (
    <div className="animate-fade-in">
      <PageHeader title="Staff Dashboard" description="Restricted operations overview" />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <StatCard title="Orders" value="—" icon={ShoppingCart} description="Phase 2" />
        <StatCard title="Users" value="—" icon={Users} description="Phase 2" />
        <StatCard title="Deposits" value="—" icon={ArrowDownToLine} description="Phase 2" />
        <StatCard title="Tickets" value="—" icon={Ticket} description="Phase 2" />
        <StatCard title="Transactions" value="—" icon={ArrowRightLeft} description="Phase 2" />
        <StatCard title="Agent Apps" value="—" icon={UserCheck} description="Phase 2" />
      </div>
    </div>
  );
}
