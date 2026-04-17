/**
 * AgentApplicationWizard — Premium 3-step application flow
 *
 * Steps:
 *   A. Personal & contact details
 *   B. Reseller / business intent
 *   C. Store setup (slug, logo, agreements) → review → submit
 *
 * Auto-saves draft on step transitions. Re-opens cleanly when an applicant
 * comes back to a `needs_changes` application — admin's note is shown at
 * the top, and submit re-flips status to "submitted".
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, ArrowRight, Check, Upload, Loader2, ShieldCheck,
  AlertCircle, Sparkles, Store, User as UserIcon, Briefcase,
} from "lucide-react";
import {
  type AgentApplication,
  saveApplicationDraft,
  submitApplication,
  isValidSlug,
  isSlugAvailable,
  slugify,
  uploadStoreLogo,
} from "@/services/agent";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Props {
  application: AgentApplication;
  /** Called after successful submit so the parent can refetch state. */
  onSubmitted: () => void;
}

const STEPS = [
  { key: "personal", label: "About you", icon: UserIcon },
  { key: "intent",   label: "Your business", icon: Briefcase },
  { key: "store",    label: "Your store", icon: Store },
] as const;

export function AgentApplicationWizard({ application, onSubmitted }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isReturning = application.status === "needs_changes";
  const [stepIdx, setStepIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);

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
    store_slug: application.store_slug || "",
    store_logo_url: application.store_logo_url || "",
    store_tagline: application.store_tagline || "",
    agreed_to_terms: application.agreed_to_terms,
    acknowledged_subscription: application.acknowledged_subscription,
  });

  // Auto-derive slug from store name when slug is empty
  useEffect(() => {
    if (!form.store_slug && form.store_name) {
      setForm((f) => ({ ...f, store_slug: slugify(f.store_name) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.store_name]);

  // Live slug availability check (debounced)
  useEffect(() => {
    if (!form.store_slug) { setSlugError(null); return; }
    if (!isValidSlug(form.store_slug)) {
      setSlugError("3-32 lowercase letters, numbers or dashes.");
      return;
    }
    setSlugError(null);
    setSlugChecking(true);
    const t = setTimeout(async () => {
      const available = await isSlugAvailable(form.store_slug, application.id);
      setSlugError(available ? null : "This name is already taken.");
      setSlugChecking(false);
    }, 400);
    return () => clearTimeout(t);
  }, [form.store_slug, application.id]);

  /* ── Step validators ─────────────────────────────────── */
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
          && isValidSlug(form.store_slug)
          && !slugError
          && !slugChecking
          && form.agreed_to_terms
          && form.acknowledged_subscription;
      default: return false;
    }
  }, [stepIdx, form, slugError, slugChecking]);

  /* ── Save draft helper ───────────────────────────────── */
  const persist = async () => {
    setSaving(true);
    try {
      await saveApplicationDraft(application.id, {
        ...form,
        // any edits during needs_changes flip back to draft
        status: isReturning && stepIdx > 0 ? "draft" : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const goNext = async () => {
    if (!stepValid) return;
    await persist();
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
      await persist();
      await submitApplication(application.id);
      toast({
        title: "Application submitted",
        description: "We'll review it shortly. You'll see the result on this page.",
      });
      onSubmitted();
    } catch (e: any) {
      toast({ title: "Submit failed", description: e?.message, variant: "destructive" });
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
      await saveApplicationDraft(application.id, { store_logo_url: url });
      toast({ title: "Logo uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  /* ── Render ──────────────────────────────────────────── */
  return (
    <div className="space-y-5 pb-24">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-[12px] text-muted-foreground/70 flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
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

            <Field label="Store name" required>
              <Input value={form.store_name}
                onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                placeholder="e.g. John's Data" className="h-11 rounded-xl" />
            </Field>

            <Field label="Store URL" required>
              <div className="flex items-center gap-1 glass-card rounded-xl pl-3 pr-1 h-11 border border-input">
                <span className="text-[12px] text-muted-foreground/70 shrink-0">kaiferdata.com/store/</span>
                <Input value={form.store_slug}
                  onChange={(e) => setForm({ ...form, store_slug: slugify(e.target.value) })}
                  placeholder="johns-data" className="h-9 border-0 bg-transparent px-1 focus-visible:ring-0 text-[14px] font-mono" />
                {slugChecking && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/60 mr-2" />}
                {!slugChecking && form.store_slug && !slugError && (
                  <Check className="h-3.5 w-3.5 text-primary mr-2" />
                )}
              </div>
              {slugError && <p className="text-[11px] text-destructive mt-1">{slugError}</p>}
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
                  I understand that, after approval, an active subscription
                  (GH₵50 / month or GH₵400 / year) is required to keep my agent
                  benefits and storefront active.
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
        {hint && !required && <span className="text-[10px] text-muted-foreground/60 font-normal">· {hint}</span>}
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
