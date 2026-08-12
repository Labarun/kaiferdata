/**
 * Markdown -> safe HTML.
 *
 * `marked` passes raw HTML embedded in markdown straight through, so its output
 * MUST be sanitized before it is handed to `dangerouslySetInnerHTML`.
 */
import { marked } from "marked";
import DOMPurify from "dompurify";

export function renderMarkdownSafe(markdown: string): string {
  const raw = marked.parse(markdown || "") as string;
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "iframe", "object", "embed", "form", "input"],
    FORBID_ATTR: ["style", "onerror", "onload", "onclick"],
  });
}
