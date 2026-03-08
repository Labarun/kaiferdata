/**
 * Kaiferdata Auth Service
 * Centralized authentication utilities for the platform.
 * All auth operations go through this service.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type AccountStatus = Database["public"]["Enums"]["account_status"];

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  accountStatus: AccountStatus;
}

/** Sign up a new user */
export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: window.location.origin,
    },
  });
  return { data, error };
}

/** Sign in with email/password */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

/** Sign out */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/** Send password reset email */
export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  return { data, error };
}

/** Update password (used on reset-password page) */
export async function updatePassword(password: string) {
  const { data, error } = await supabase.auth.updateUser({ password });
  return { data, error };
}

/** Fetch the current user's profile and role */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, account_status")
    .eq("user_id", user.id)
    .single();

  // Fetch highest-priority role
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const roleOrder: Record<string, number> = { admin: 1, staff: 2, agent: 3, user: 4 };
  const roles = (roleData || []).map(r => r.role);
  roles.sort((a, b) => (roleOrder[a] || 99) - (roleOrder[b] || 99));
  const primaryRole = roles[0] || "user";

  return {
    id: user.id,
    email: profile?.email || user.email || "",
    fullName: profile?.full_name || "",
    role: primaryRole as AppRole,
    accountStatus: (profile?.account_status || "active") as AccountStatus,
  };
}

/** Get the dashboard path for a given role */
export function getDashboardPath(role: AppRole): string {
  switch (role) {
    case "admin": return "/admin";
    case "staff": return "/staff";
    case "agent": return "/agent";
    case "user":
    default: return "/dashboard";
  }
}

/** Write an audit log entry */
export async function writeAuditLog(params: {
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    actor_role: roleData?.role || "user",
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId,
    metadata: params.metadata as Database["public"]["Tables"]["audit_logs"]["Insert"]["metadata"],
  });
}
