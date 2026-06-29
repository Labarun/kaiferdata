/**
 * GetAppPage — Device-aware install/download chooser.
 * Auto-routes Android → /get-app/android and iOS → /get-app/ios.
 * Other devices see a clean choice page.
 */
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Smartphone, Apple, Download, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { detectDevice } from "@/lib/deviceDetect";
import { SEOHead } from "@/components/seo/SEOHead";

export default function GetAppPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const kind = detectDevice();
    if (kind === "android") navigate("/get-app/android", { replace: true });
    else if (kind === "ios") navigate("/get-app/ios", { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-[80vh] container py-10 sm:py-14">
      <SEOHead
        title="Download the Kaiferdata App"
        description="Download the Kaiferdata app for Android or add to your iPhone home screen. Get faster data purchases, instant dashboard access, and an app-like experience."
      />
      <div className="max-w-md mx-auto text-center">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl glass-premium mb-5">
          <Smartphone className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-[26px] font-bold tracking-tight text-foreground">Get the Kaiferdata App</h1>
        <p className="text-[13.5px] text-muted-foreground/80 mt-2 leading-relaxed">
          Faster reorders, instant access to your dashboard, and an app-like experience.
        </p>

        <div className="mt-7 space-y-3">
          <Link
            to="/get-app/android"
            className="flex items-center gap-4 p-4 rounded-2xl glass-elevated border border-border/40 hover:border-primary/30 transition-colors text-left"
          >
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-foreground">Download for Android</p>
              <p className="text-[11.5px] text-muted-foreground/70 mt-0.5">APK file • ~30 MB</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
          </Link>

          <Link
            to="/get-app/ios"
            className="flex items-center gap-4 p-4 rounded-2xl glass-elevated border border-border/40 hover:border-primary/30 transition-colors text-left"
          >
            <div className="h-11 w-11 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
              <Apple className="h-5 w-5 text-info" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-foreground">Install on iPhone</p>
              <p className="text-[11.5px] text-muted-foreground/70 mt-0.5">Add to Home Screen — Safari</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
          </Link>
        </div>

        <Button asChild variant="ghost" size="sm" className="mt-6 text-[12px] text-muted-foreground/70">
          <Link to="/">Continue in browser</Link>
        </Button>
      </div>
    </div>
  );
}
