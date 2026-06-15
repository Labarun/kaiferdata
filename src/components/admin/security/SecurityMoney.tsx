/**
 * Security Center — Money & Fraud tab
 * Pending withdrawals (payout risk), failed/reversed payments, supplier failures.
 * Actions on withdrawals deliberately link out to the dedicated Withdrawals page
 * so the dual-wallet refund logic stays in one place.
 */
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  getPendingWithdrawals, getSuspiciousPayments, getSupplierFailures,
} from "@/services/securityCenter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Banknote, CreditCard, Server, ArrowUpRight } from "lucide-react";

const cedi = (n: number) => `₵${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function SecurityMoney() {
  const withdrawals = useQuery({ queryKey: ["security", "pending-withdrawals"], queryFn: async () => (await getPendingWithdrawals()).data, refetchInterval: 60_000 });
  const payments = useQuery({ queryKey: ["security", "suspicious-payments"], queryFn: async () => (await getSuspiciousPayments()).data });
  const supplier = useQuery({ queryKey: ["security", "supplier-failures"], queryFn: async () => (await getSupplierFailures()).data });

  const pendingTotal = (withdrawals.data ?? []).reduce((s, w) => s + Number(w.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Pending withdrawals */}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Banknote className="h-4 w-4 text-amber-500" /> Pending withdrawals
            {withdrawals.data?.length ? <Badge variant="outline" className="ml-1">{cedi(pendingTotal)}</Badge> : null}
          </CardTitle>
          <Button asChild variant="outline" size="sm" className="h-7 text-xs gap-1">
            <Link to="/admin/withdrawals">Review & action <ArrowUpRight className="h-3 w-3" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {withdrawals.isLoading ? <Spinner /> : !withdrawals.data?.length ? (
            <Empty>No withdrawals awaiting review.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>MoMo</TableHead>
                    <TableHead className="hidden sm:table-cell">Wallet</TableHead>
                    <TableHead className="text-right">Requested</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.data.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-semibold">{cedi(w.amount)}</TableCell>
                      <TableCell className="text-xs">
                        <span className="font-medium">{w.momo_name}</span>
                        <span className="text-muted-foreground"> · {w.momo_network} {w.momo_number}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground capitalize">{w.wallet_kind?.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(w.requested_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suspicious payments */}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-destructive" /> Failed / reversed payments (48h)
          </CardTitle>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs gap-1">
            <Link to="/admin/reconciliation">Reconciliation <ArrowUpRight className="h-3 w-3" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {payments.isLoading ? <Spinner /> : !payments.data?.length ? (
            <Empty>No failed or reversed payments in the last 48 hours.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Reference</TableHead>
                    <TableHead className="text-right">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.data.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold">{cedi(p.total_amount ?? p.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] capitalize ${p.status === "reversed" ? "border-destructive/40 text-destructive" : "border-amber-500/40 text-amber-500"}`}>
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs font-mono text-muted-foreground">{p.provider_reference?.slice(0, 18)}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supplier failures */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Server className="h-4 w-4 text-amber-500" /> Supplier delivery failures (24h)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {supplier.isLoading ? <Spinner /> : !supplier.data?.length ? (
            <Empty>No supplier delivery failures in the last 24 hours.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead className="text-right">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplier.data.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.order_id?.slice(0, 12)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{s.error_message || s.normalized_result || "—"}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Spinner() {
  return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
}
function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground py-8 text-center">{children}</p>;
}
