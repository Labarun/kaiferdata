/**
 * Security Center
 * One place to monitor and control the platform's security: threat overview,
 * audit activity, account access, money/fraud signals, and kill switches.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw, LayoutDashboard, ScrollText, Users, Banknote, SlidersHorizontal } from "lucide-react";
import { SecurityOverview } from "@/components/admin/security/SecurityOverview";
import { SecurityActivityLog } from "@/components/admin/security/SecurityActivityLog";
import { SecurityAccounts } from "@/components/admin/security/SecurityAccounts";
import { SecurityMoney } from "@/components/admin/security/SecurityMoney";
import { SecurityControls } from "@/components/admin/security/SecurityControls";

const TABS = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "activity", label: "Activity", icon: ScrollText },
  { value: "accounts", label: "Accounts", icon: Users },
  { value: "money", label: "Money & Fraud", icon: Banknote },
  { value: "controls", label: "Controls", icon: SlidersHorizontal },
];

export default function SecurityCenterPage() {
  const [tab, setTab] = useState("overview");
  const qc = useQueryClient();

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <PageHeader title="Security Center" description="Monitor threats and control platform-wide security" />
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0"
          onClick={() => qc.invalidateQueries({ queryKey: ["security"] })}
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-2">
        <TabsList className="w-full justify-start overflow-x-auto h-auto flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
              <t.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <SecurityOverview onNavigate={setTab} />
        </TabsContent>
        <TabsContent value="activity" className="mt-6">
          <SecurityActivityLog />
        </TabsContent>
        <TabsContent value="accounts" className="mt-6">
          <SecurityAccounts />
        </TabsContent>
        <TabsContent value="money" className="mt-6">
          <SecurityMoney />
        </TabsContent>
        <TabsContent value="controls" className="mt-6">
          <SecurityControls />
        </TabsContent>
      </Tabs>
    </div>
  );
}
