/**
 * Kaiferdata Auth Service
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type AccountStatus = Database["public"]["Enums"]["account_status"];

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  username: string;
  phone: string;
  role: AppRole;
  accountStatus: AccountStatus;
}

interface EnsureUserScaffoldParams {
  userId: string;
  email?: string | null;
  fullName?: string | null;
  username?: string | null;
  phone?: string | null;
}

export async function ensureUserScaffold(params: EnsureUserScaffoldParams) {
  const { error } = await supabase.rpc("ensure_user_scaffold", {
    _user_id: params.userId,
    _email: params.email ?? null,
    _full_name: params.fullName ?? null,
    _username: params.username ?? null,
    _phone: params.phone ?? null,
  });

  if (error) {
    console.warn("ensureUserScaffold warning:", error);
  }
}

/** Sign up a new user */
export async function signUp(email: string, password: string, username: string, phone: string) {
  // Normalize inputs to prevent whitespace/case mismatches during login
  const cleanEmail = email.trim().toLowerCase();
  const cleanUsername = username.trim();
  const cleanPhone = phone.trim();

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: { full_name: cleanUsername, username: cleanUsername, phone: cleanPhone },
      emailRedirectTo: window.location.origin,
    },
  });

  if (data?.user && !error) {
    await ensureUserScaffold({
      userId: data.user.id,
      email: data.user.email ?? cleanEmail,
      fullName: cleanUsername,
      username: cleanUsername,
      phone: cleanPhone,
    });

    // After signup, update profile with username and phone
    await supabase
      .from("profiles")
      .update({ username: cleanUsername, phone: cleanPhone, full_name: cleanUsername })
      .eq("user_id", data.user.id);
  }

  return { data, error };
}

/** Resolve a username or phone to email, then sign in */
export async function signIn(identifier: string, password: string) {
  let email = identifier;

  // If it doesn't look like an email, resolve it
  if (!identifier.includes("@")) {
    const { data } = await supabase.rpc("resolve_login_identifier", { _identifier: identifier });
    if (!data) {
      return { data: null, error: { message: "No account found with that username or phone number." } as Error };
    }
    email = data as string;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

/** Sign out — global scope revokes the refresh token on the server, not just locally. */
export async function signOut() {
  const { error } = await supabase.auth.signOut({ scope: "global" });
  return { error };
}

/** Send password reset email */
export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  return { data, error };
}

/** Update password */
export async function updatePassword(password: string) {
  const { data, error } = await supabase.auth.updateUser({ password });
  return { data, error };
}

/** Fetch the current user's profile and role */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  await ensureUserScaffold({
    userId: user.id,
    email: user.email,
    fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
    username: (user.user_metadata?.username as string | undefined) ?? null,
    phone: (user.user_metadata?.phone as string | undefined) ?? null,
  });

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, account_status, username, phone")
    .eq("user_id", user.id)
    .single();

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
    username: profile?.username || "",
    phone: profile?.phone || "",
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

/**
 * Write an audit log entry.
 * Routed through the SECURITY DEFINER RPC `write_audit_log` so that
 * direct INSERT on audit_logs stays locked down (tamper-proof feed).
 * The RPC derives actor_id and actor_role from auth.uid() server-side.
 */
export async function writeAuditLog(params: {
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.rpc("write_audit_log", {
    _action: params.action,
    _target_type: params.targetType ?? undefined,
    _target_id: params.targetId ?? undefined,
    _metadata: (params.metadata ?? null) as never,
  });
}
