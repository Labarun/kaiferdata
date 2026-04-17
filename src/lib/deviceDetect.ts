/**
 * Lightweight device detection for install/download routing.
 * Returns "ios" | "android" | "other".
 */
export type DeviceKind = "ios" | "android" | "other";

export function detectDevice(): DeviceKind {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  // iPadOS reports as Macintosh — check touch capability too
  const isIPad = /Macintosh/.test(ua) && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || isIPad) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

/**
 * Configurable APK download URL. Replace when the APK is uploaded.
 * Can be overridden via VITE_APK_URL at build time.
 */
export const APK_DOWNLOAD_URL =
  (import.meta as any).env?.VITE_APK_URL || "/downloads/kaiferdata.apk";

export const APK_SIZE_LABEL = "≈ 30 MB";
export const APK_VERSION_LABEL = "v1.0";
