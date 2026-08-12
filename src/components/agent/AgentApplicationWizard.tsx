/**
 * AgentApplicationWizard — Premium 3-step application flow
 *
 * Steps:
 *   A. Personal & contact details
 *   B. Reseller / business intent
 *   C. Store setup (logo, name, tagline, agreements) → submit
 *
 * Slug strategy (fix):
 *   The store slug is NEVER a manual field in this flow. It's auto-generated
 *   on submit from the store name (with a short random suffix to ensure
 *   uniqueness). This prevents the early-step "Invalid store slug" failure
 *   and matches the product spec — applicants shouldn't pick URLs.
 *
 * Draft saves are step-aware: only fields collected up to the current step
 * are persisted, so a partial slug never reaches the database.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, ArrowRight, Upload, Loader2, ShieldCheck,
  AlertCircle, Sparkles, Store, User as UserIcon, Briefcase,
  TrendingUp, Clock, CalendarDays,
} from "lucide-react";
import {
  type AgentApplication,
  type AgentApplicationUpdate,
  saveApplicationDraft,
  submitApplication,
  uploadStoreLogo,
  generateUniqueStoreSlug,
} from "@/services/agent";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { EarningsPotential } from "./EarningsPotential";

interface Props {
  application: AgentApplication;
  /** Called after successful submit so the parent can refetch state. */
  onSubmitted: () => void;
  /** Optional — invoked when the user taps the back arrow to leave the wizard. Defaults to navigate("/dashboard"). */
  onExit?: () => void;
}

const STEPS = [
  { key: "personal", label: "About you", icon: UserIcon },
  { key: "intent",   label: "Your business", icon: Briefcase },
  { key: "store",    label: "Your store", icon: Store },
] as const;

export function AgentApplicationWizard({ application, onSubmitted, onExit }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isReturning = application.status === "needs_changes";
  const [stepIdx, setStepIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state — initialised from existing application row
  const [form, setForm] = useState({
    full_name: application.full_name || user?.fullName || "",
    phone: application.phone || "",
    email: application.email || user?.email || "",
    city: application.city || "",
    business_name: application.business_name || "",

    has_sold_data_before: application.has_sold_data_before ?? false,
    selling_channels: application.selling_channels || "",
    expected_customer_base: application.expected_customer_base || "",
    motivation: application.motivation || "",
    social_link: application.social_link || "",

    store_name: application.store_name || "",
    store_logo_url: application.store_logo_url || "",
    store_tagline: application.store_tagline || "",
    agreed_to_terms: application.agreed_to_terms,
    acknowledged_subscription: application.acknowledged_subscription,
  });

  /* ── Step validators (step-aware, never blocks on slug) ──── */
  const stepValid = useMemo(() => {
    switch (stepIdx) {
      case 0:
        return form.full_name.trim().length >= 2
          && form.phone.trim().length >= 10
          && form.email.includes("@")
          && form.city.trim().length >= 2;
      case 1:
        return form.selling_channels.trim().length >= 3
          && form.motivation.trim().length >= 10;
      case 2:
        return form.store_name.trim().length >= 2
          && form.agreed_to_terms
          && form.acknowledged_subscription;
      default: return false;
    }
  }, [stepIdx, form]);

  /* ── Step-aware draft save ──────────────────────────────────
   * Only fields collected up to and including the current step
   * are sent to the DB. The slug is intentionally never sent here. */
  const buildPatchForStep = (idx: number): AgentApplicationUpdate => {
    const patch: AgentApplicationUpdate = {};
    if (idx >= 0) {
      patch.full_name = form.full_name;
      patch.phone = form.phone;
      patch.email = form.email;
      patch.city = form.city;
      patch.business_name = form.business_name;
    }
    if (idx >= 1) {
      patch.has_sold_data_before = form.has_sold_data_before;
      patch.selling_channels = form.selling_channels;
      patch.expected_customer_base = form.expected_customer_base;
      patch.motivation = form.motivation;
      patch.social_link = form.social_link;
    }
    if (idx >= 2) {
      patch.store_name = form.store_name;
      patch.store_logo_url = form.store_logo_url;
      patch.store_tagline = form.store_tagline;
      patch.agreed_to_terms = form.agreed_to_terms;
      patch.acknowledged_subscription = form.acknowledged_subscription;
    }
    if (isReturning && idx > 0) {
      patch.status = "draft";
    }
    return patch;
  };

  const persist = async (idx: number): Promise<boolean> => {
    setSaving(true);
    try {
      await saveApplicationDraft(application.id, buildPatchForStep(idx));
      return true;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Couldn't save your progress.";
      toast({ title: "Save failed", description: message, variant: "destructive" });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const goNext = async () => {
    if (!stepValid || saving) return;
    const ok = await persist(stepIdx);
    if (!ok) return;
    setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setStepIdx((i) => Math.max(i - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!stepValid) return;
    setSubmitting(true);
    try {
      // Auto-generate a unique slug from the store name on final submit.
      const slug = await generateUniqueStoreSlug(
        form.store_name || form.business_name || form.full_name || "store",
        application.id,
      );
      const finalPatch = buildPatchForStep(2);
      finalPatch.store_slug = slug;
      await saveApplicationDraft(application.id, finalPatch);
      await submitApplication(application.id);
      toast({
        title: "Application submitted",
        description: "We'll review it shortly. You'll see the result on this page.",
      });
      onSubmitted();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Submit failed";
      toast({ title: "Submit failed", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Logo upload ─────────────────────────────────────── */
  const handleLogoUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const url = await uploadStoreLogo(user.id, file);
      setForm((f) => ({ ...f, store_logo_url: url }));
      // Only persist the logo field — never partial slug data.
      await saveApplicationDraft(application.id, { store_logo_url: url });
      toast({ title: "Logo uploaded" });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Upload failed";
      toast({ title: "Upload failed", description: message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  /* ── Render ──────────────────────────────────────────── */
  return (
    <div className="space-y-5 pb-32 md:pb-12">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => (onExit ? onExit() : navigate("/dashboard"))}
          className="text-[12px] text-muted-foreground/70 flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {onExit ? "Overview" : "Dashboard"}
        </button>
        {saving && (
          <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving…
          </span>
        )}
      </div>

      {/* Hero */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles className="h-4 w-4 text-primary/60" />
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
            Agent Application
          </p>
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          {STEPS[stepIdx].label}
        </h1>
        <p className="text-[12px] text-muted-foreground mt-1">
          Step {stepIdx + 1} of {STEPS.length}
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-2 animate-fade-in">
        {STEPS.map((s, i) => {
          const isDone = i < stepIdx;
          const isCurrent = i === stepIdx;
          return (
            <div
              key={s.key}
              className={cn(
                "flex-1 h-1.5 rounded-full transition-all duration-300",
                isDone && "bg-primary",
                isCurrent && "bg-primary/70",
                !isDone && !isCurrent && "bg-muted",
              )}
            />
          );
        })}
      </div>

      {/* Admin note (needs_changes) */}
      {isReturning && application.admin_note && (
        <div className="glass-card rounded-xl p-4 border-l-4 border-warning animate-fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-semibold text-foreground">Admin requested changes</p>
              <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{application.admin_note}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP CONTENT ── */}
      <div className="space-y-4 animate-fade-in" key={stepIdx}>
        {stepIdx === 0 && (
          <>
            <Field label="Full name" required>
              <Input value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Your legal name" className="h-11 rounded-xl" />
            </Field>
            <Field label="Phone (Ghana)" required>
              <Input value={form.phone} type="tel" inputMode="tel"
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0244..." className="h-11 rounded-xl" />
            </Field>
            <Field label="Email" required>
              <Input value={form.email} type="email" inputMode="email"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com" className="h-11 rounded-xl" />
            </Field>
            <Field label="City / town" required>
              <Input value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="e.g. Accra" className="h-11 rounded-xl" />
            </Field>
            <Field label="Business name" hint="Optional">
              <Input value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                placeholder="Your trading name" className="h-11 rounded-xl" />
            </Field>
          </>
        )}

        {stepIdx === 1 && (
          <>
            <EarningsPotential />
            <Field label="Have you sold data before?">
              <div className="flex gap-2">
                <ToggleChip active={form.has_sold_data_before === true}
                  onClick={() => setForm({ ...form, has_sold_data_before: true })}>Yes</ToggleChip>
                <ToggleChip active={form.has_sold_data_before === false}
                  onClick={() => setForm({ ...form, has_sold_data_before: false })}>No</ToggleChip>
              </div>
            </Field>
            <Field label="Where will you sell?" required>
              <Textarea value={form.selling_channels}
                onChange={(e) => setForm({ ...form, selling_channels: e.target.value })}
                placeholder="WhatsApp, social media, my shop, etc."
                className="rounded-xl min-h-[80px]" />
            </Field>
            <Field label="Expected customer base" hint="Rough estimate is fine">
              <Input value={form.expected_customer_base}
                onChange={(e) => setForm({ ...form, expected_customer_base: e.target.value })}
                placeholder="e.g. 30-50 customers / week" className="h-11 rounded-xl" />
            </Field>
            <Field label="Why do you want to become an agent?" required>
              <Textarea value={form.motivation}
                onChange={(e) => setForm({ ...form, motivation: e.target.value })}
                placeholder="Tell us a little about your goals…"
                className="rounded-xl min-h-[100px]" />
            </Field>
            <Field label="WhatsApp / social link" hint="Optional">
              <Input value={form.social_link}
                onChange={(e) => setForm({ ...form, social_link: e.target.value })}
                placeholder="https://…" className="h-11 rounded-xl" />
            </Field>
          </>
        )}

        {stepIdx === 2 && (
          <>
            {/* Logo */}
            <Field label="Store logo" hint="PNG, JPG or WEBP · max 2 MB">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-2xl glass-card overflow-hidden flex items-center justify-center shrink-0">
                  {form.store_logo_url
                    ? <img src={form.store_logo_url} alt="Store logo" className="h-full w-full object-cover" />
                    : <Store className="h-6 w-6 text-muted-foreground/40" />}
                </div>
                <label className={cn(
                  "flex-1 flex items-center justify-center gap-2 h-11 rounded-xl",
                  "glass-card border border-primary/20 cursor-pointer text-sm font-medium",
                  "hover:bg-primary/5 transition-colors",
                  uploading && "opacity-50 pointer-events-none",
                )}>
                  {uploading
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
                    : <><Upload className="h-4 w-4" /> {form.store_logo_url ? "Replace logo" : "Upload logo"}</>}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />
                </label>
              </div>
            </Field>

            <Field label="Store name" required hint="Your store URL is generated automatically">
              <Input value={form.store_name}
                onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                placeholder="e.g. John's Data" className="h-11 rounded-xl" />
            </Field>

            <Field label="Tagline" hint="One short line shown on your store">
              <Input value={form.store_tagline}
                onChange={(e) => setForm({ ...form, store_tagline: e.target.value })}
                placeholder="e.g. Cheap & fast data, anytime." className="h-11 rounded-xl" />
            </Field>

            {/* Agreements */}
            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <Checkbox checked={form.agreed_to_terms}
                  onCheckedChange={(v) => setForm({ ...form, agreed_to_terms: v === true })}
                  className="mt-0.5" />
                <span className="text-[12px] text-muted-foreground leading-relaxed">
                  I agree to the Kaiferdata agent terms and to provide accurate information.
                </span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <Checkbox checked={form.acknowledged_subscription}
                  onCheckedChange={(v) => setForm({ ...form, acknowledged_subscription: v === true })}
                  className="mt-0.5" />
                <span className="text-[12px] text-muted-foreground leading-relaxed">
                  I understand that, after approval, an active subscription is required
                  to keep my agent benefits and storefront active.
                </span>
              </label>
            </div>
          </>
        )}
      </div>

      {/* ── Footer actions ── */}
      <div className="flex items-center gap-2 pt-2">
        {stepIdx > 0 && (
          <Button variant="outline" className="flex-1 h-11 rounded-xl glass-card border-primary/20" onClick={goBack}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
          </Button>
        )}
        {stepIdx < STEPS.length - 1 ? (
          <Button className="flex-1 h-11 rounded-xl" disabled={!stepValid || saving} onClick={goNext}>
            Continue <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        ) : (
          <Button className="flex-1 h-11 rounded-xl" disabled={!stepValid || submitting} onClick={handleSubmit}>
            {submitting
              ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Submitting…</>
              : <><ShieldCheck className="h-4 w-4 mr-1.5" /> Submit application</>}
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── Small helpers ─────────────────────────────────────── */
function Field({
  label, hint, required, children,
}: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12px] font-semibold text-foreground/80 flex items-center gap-1.5">
        {label}
        {required && <span className="text-destructive/80">*</span>}
        {hint && <span className="text-[10px] text-muted-foreground/60 font-normal">· {hint}</span>}
      </Label>
      {children}
    </div>
  );
}

function ToggleChip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-xl text-[12px] font-semibold transition-all duration-200",
        active
          ? "glass-elevated ring-2 ring-primary/25 text-primary"
          : "glass-card text-muted-foreground hover:text-foreground",
      )}>
      {children}
    </button>
  );
}
