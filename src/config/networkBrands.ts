/**
 * Network brand configuration — centralized color & logo mapping
 * for Ghana telecom networks used across the buy flow.
 */
import logoMtn from "@/assets/logo-mtn.png";
import logoTelecel from "@/assets/logo-telecel.png";
import logoAirtelTigo from "@/assets/logo-airteltigo.png";

export interface NetworkBrand {
  logo: string;
  /** HSL values (without wrapping hsl()) for the brand's primary color */
  hsl: string;
  /** Tailwind-ready active ring class */
  activeRing: string;
  /** Tailwind-ready active icon bg */
  activeIconBg: string;
  /** Gradient tint for active tile */
  activeTint: string;
  /** CSS glow class */
  glowClass: string;
  /** Active border */
  activeBorderColor: string;
}

export const NETWORK_BRANDS: Record<string, NetworkBrand> = {
  MTN: {
    logo: logoMtn,
    hsl: "44 72% 42%",           // refined MTN gold — richer, less raw
    activeRing: "ring-[hsl(44_65%_48%/0.28)]",
    activeIconBg: "bg-[hsl(44_60%_46%/0.12)]",
    activeTint: "from-[hsl(44_60%_46%/0.07)] via-transparent to-[hsl(42_50%_52%/0.025)]",
    glowClass: "glow-mtn",
    activeBorderColor: "border-[hsl(44_55%_52%/0.3)]",
  },
  Telecel: {
    logo: logoTelecel,
    hsl: "0 72% 46%",           // Telecel red
    activeRing: "ring-[hsl(0_72%_55%/0.3)]",
    activeIconBg: "bg-[hsl(0_72%_50%/0.12)]",
    activeTint: "from-[hsl(0_72%_50%/0.06)] via-transparent to-[hsl(0_55%_55%/0.02)]",
    glowClass: "glow-telecel",
    activeBorderColor: "border-[hsl(0_60%_58%/0.3)]",
  },
  AirtelTigo: {
    logo: logoAirtelTigo,
    hsl: "212 72% 45%",         // AirtelTigo blue
    activeRing: "ring-[hsl(212_72%_55%/0.3)]",
    activeIconBg: "bg-[hsl(212_72%_50%/0.12)]",
    activeTint: "from-[hsl(212_72%_50%/0.06)] via-transparent to-[hsl(212_55%_55%/0.02)]",
    glowClass: "glow-airteltigo",
    activeBorderColor: "border-[hsl(212_55%_58%/0.3)]",
  },
};

const FALLBACK: NetworkBrand = {
  logo: "",
  hsl: "213 73% 40%",
  activeRing: "ring-primary/20",
  activeIconBg: "bg-primary/8",
  activeTint: "from-primary/5 via-transparent to-transparent",
  glowClass: "glow-brand",
  activeBorderColor: "border-primary/25",
};

export function getNetworkBrand(network: string): NetworkBrand {
  return NETWORK_BRANDS[network] || FALLBACK;
}
