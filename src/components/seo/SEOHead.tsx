/**
 * SEOHead — Sets per-page <title>, meta description, canonical URL,
 * and Open Graph / Twitter Card tags dynamically.
 *
 * Works client-side via useEffect (Vite SPA — no SSR).
 * Each page imports this and passes its own metadata.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_NAME = "Kaiferdata";
const DOMAIN = "https://kaiferdata.com";
const DEFAULT_OG_IMAGE = `${DOMAIN}/og-image.png`;

interface SEOHeadProps {
  /** Page-specific title (SITE_NAME is appended automatically unless `raw` is set) */
  title: string;
  /** Meta description — keep between 120-160 characters for best SERP display */
  description: string;
  /** Override the canonical path (defaults to current pathname) */
  canonicalPath?: string;
  /** Override the OG image URL */
  ogImage?: string;
  /** If true, use the title exactly as given without appending site name */
  raw?: boolean;
}

function setMetaTag(property: string, content: string, isName = false) {
  const attr = isName ? "name" : "property";
  let el = document.querySelector(`meta[${attr}="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function setHreflang(href: string, hreflang: string) {
  let el = document.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "alternate");
    el.setAttribute("hreflang", hreflang);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function SEOHead({
  title,
  description,
  canonicalPath,
  ogImage,
  raw = false,
}: SEOHeadProps) {
  const { pathname } = useLocation();
  const fullTitle = raw ? title : `${title} | ${SITE_NAME}`;
  const canonical = `${DOMAIN}${canonicalPath ?? pathname}`;
  const image = ogImage ?? DEFAULT_OG_IMAGE;

  useEffect(() => {
    // Title
    document.title = fullTitle;

    // Core meta
    setMetaTag("description", description, true);

    // Canonical
    setCanonical(canonical);
    
    // Hreflang
    setHreflang(canonical, "en-GH");

    // Open Graph
    setMetaTag("og:title", fullTitle);
    setMetaTag("og:description", description);
    setMetaTag("og:url", canonical);
    setMetaTag("og:image", image);
    setMetaTag("og:type", "website");
    setMetaTag("og:site_name", SITE_NAME);

    // Twitter Card
    setMetaTag("twitter:title", fullTitle, true);
    setMetaTag("twitter:description", description, true);
    setMetaTag("twitter:image", image, true);
    setMetaTag("twitter:card", "summary_large_image", true);
  }, [fullTitle, description, canonical, image]);

  return null;
}
