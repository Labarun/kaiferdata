/**
 * GetAppIosPage — Premium Add-to-Home-Screen guide for iPhone users.
 */
import { Link } from "react-router-dom";
import { Share, Plus, Home, CheckCircle2, Apple } from "lucide-react";
import { Button } from "@/components/ui/button";
import appIcon from "@/assets/kaiferdata-icon.png";

const STEPS = [
  {
    icon: Apple,
    title: "Open in Safari",
    desc: "Make sure you're viewing kaiferdata.com in the Safari browser, not Chrome or another app.",
  },
  {
    icon: Share,
    title: "Tap the Share button",
    desc: "It's the square icon with an arrow at the bottom of the screen.",
  },
  {
    icon: Plus,
    title: "Choose Add to Home Screen",
    desc: "Scroll down in the share sheet and select \"Add to Home Screen\".",
  },
  {
    icon: Home,
    title: "Tap Add to confirm",
    desc: "Kaiferdata will appear on your home screen and open like a real app.",
  },
];

export default function GetAppIosPage() {
  return (
    <div className="min-h-[80vh] container py-8 sm:py-12">
      <div className="max-w-md mx-auto">
        {/* Hero */}
        <div className="relative rounded-3xl overflow-hidden glass-premium border border-border/40 p-6 sm:p-7 text-center">
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-info/15 blur-3xl" />
            <div className="absolute -bottom-14 -left-12 w-44 h-44 rounded-full bg-primary/10 blur-3xl" />
          </div>

          <div className="relative">
            <div className="mx-auto h-20 w-20 rounded-3xl overflow-hidden shadow-xl shadow-info/20 ring-1 ring-border/40">
              <img src={appIcon} alt="Kaiferdata" className="h-full w-full object-cover" />
            </div>
            <h1 className="mt-4 text-[22px] font-bold tracking-tight text-foreground">Install on iPhone</h1>
            <p className="text-[12.5px] text-muted-foreground/75 mt-1.5 leading-relaxed">
              Kaiferdata works just like an app on iPhone. Add it to your home screen in a few seconds.
            </p>
          </div>
        </div>

        {/* Steps */}
        <ol className="mt-5 space-y-3">
          {STEPS.map((s, i) => (
            <li key={i} className="relative p-4 rounded-2xl glass-subtle border border-border/40">
              <div className="flex items-start gap-3">
                <div className="relative shrink-0">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-info/15 to-primary/10 flex items-center justify-center">
                    <s.icon className="h-4 w-4 text-info" />
                  </div>
                  <span className="absolute -top-1.5 -left-1.5 h-5 w-5 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-foreground leading-tight">{s.title}</p>
                  <p className="text-[11.5px] text-muted-foreground/75 mt-1 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        {/* Reassurance */}
        <div className="mt-5 p-4 rounded-2xl glass-subtle border border-border/40 flex items-start gap-3">
          <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
          <div>
            <p className="text-[12.5px] font-semibold text-foreground">Works offline & loads fast</p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-relaxed">
              Once added, Kaiferdata launches instantly from your home screen — no browser bar, full screen.
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Button asChild variant="ghost" size="sm" className="text-[12px] text-muted-foreground/70">
            <Link to="/get-app/android">On Android instead?</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
