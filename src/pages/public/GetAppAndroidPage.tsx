/**
 * GetAppAndroidPage — Premium APK download page.
 * APK URL is configurable via VITE_APK_URL.
 */
import { Link } from "react-router-dom";
import { Download, Zap, Shield, Smartphone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APK_DOWNLOAD_URL, APK_SIZE_LABEL, APK_VERSION_LABEL } from "@/lib/deviceDetect";
import appIcon from "@/assets/kaiferdata-icon.png";

export default function GetAppAndroidPage() {
  return (
    <div className="min-h-[80vh] container py-8 sm:py-12">
      <div className="max-w-md mx-auto">
        {/* Hero */}
        <div className="relative rounded-3xl overflow-hidden glass-premium border border-border/40 p-6 sm:p-7 text-center">
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-primary/15 blur-3xl" />
            <div className="absolute -bottom-14 -left-12 w-44 h-44 rounded-full bg-info/10 blur-3xl" />
          </div>

          <div className="relative">
            <div className="mx-auto h-20 w-20 rounded-3xl overflow-hidden shadow-xl shadow-primary/20 ring-1 ring-border/40">
              <img src={appIcon} alt="Kaiferdata" className="h-full w-full object-cover" />
            </div>
            <h1 className="mt-4 text-[22px] font-bold tracking-tight text-foreground">Kaiferdata for Android</h1>
            <p className="text-[12.5px] text-muted-foreground/75 mt-1.5">
              Buy data faster with the official app
            </p>

            <div className="mt-5 flex items-center justify-center gap-3 text-[11px] text-muted-foreground/65">
              <span className="font-semibold tabular-nums">{APK_SIZE_LABEL}</span>
              <span className="h-3 w-px bg-border/50" />
              <span className="tabular-nums">{APK_VERSION_LABEL}</span>
              <span className="h-3 w-px bg-border/50" />
              <span>Android 7+</span>
            </div>

            <Button
              asChild
              className="w-full mt-6 h-12 rounded-2xl text-[14px] font-semibold bg-gradient-to-r from-primary to-info hover:opacity-95 shadow-lg shadow-primary/25"
            >
              <a href={APK_DOWNLOAD_URL} download>
                <Download className="h-4 w-4 mr-1.5" />
                Download APK
              </a>
            </Button>
            <p className="mt-2 text-[10.5px] text-muted-foreground/55">
              You may need to allow installs from your browser
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-5 space-y-2">
          {[
            { icon: Zap, title: "Lightning fast", sub: "Instant bundle reorders" },
            { icon: Smartphone, title: "App-like feel", sub: "Smooth, native experience" },
            { icon: Shield, title: "Secure", sub: "Same trusted Kaiferdata account" },
          ].map((b) => (
            <div key={b.title} className="flex items-center gap-3 p-3 rounded-2xl glass-subtle border border-border/40">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <b.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-foreground leading-tight">{b.title}</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">{b.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Install steps */}
        <div className="mt-5 p-4 rounded-2xl glass-subtle border border-border/40">
          <p className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider mb-3">After download</p>
          <ol className="space-y-2.5">
            {[
              "Open the downloaded APK file",
              "Allow install from this source if prompted",
              "Tap Install — sign in with your account",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                <span className="text-[12.5px] text-foreground/80 leading-snug">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-6 text-center">
          <Button asChild variant="ghost" size="sm" className="text-[12px] text-muted-foreground/70">
            <Link to="/get-app/ios">On iPhone instead?</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
