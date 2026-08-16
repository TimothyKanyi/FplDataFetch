interface AdBannerProps {
  slot: string;
  className?: string;
}

/**
 * Ad slot placeholder.
 *
 * TODO(ads): wire this up to a real ad network:
 *   1. Add the network's loader <script> tag to `index.html` — in the <head>
 *      or right before the closing </body> tag. For AdSense it looks like:
 *      <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXX" crossorigin="anonymous"></script>
 *      (See the matching TODO comment in index.html.)
 *   2. Replace the placeholder body below with the network's <ins> tag, e.g.:
 *      <ins className="adsbygoogle" style={{ display: "block" }}
 *           data-ad-client="ca-pub-XXXX" data-ad-slot={slot} data-ad-format="auto" />
 *   3. Call the network's push/refresh API on mount, gated behind cookie consent
 *      (use `hasConsent()` + `onConsentChange()` from src/lib/consent.ts).
 *   4. Keep this placement BELOW the standings table, above-the-fold-free and
 *      NOT sticky (no `fixed`/`sticky` positioning).
 */
export const AdBanner = ({ slot, className }: AdBannerProps) => {
  // Dev-only placeholder so layout can be previewed before a real ad snippet
  // is added. Renders nothing in production.
  if (!import.meta.env.DEV) return null;

  return (
    <div
      aria-hidden="true"
      className={`flex h-24 w-full max-w-3xl mx-auto items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-sm text-muted-foreground ${
        className ?? ""
      }`}
    >
      Ad slot {slot}
    </div>
  );
};
