// Minimal consent state shared between the cookie banner and the ad loader.
// No real ad script is wired up yet — this is the gating layer that will
// control it once an ad network is configured.

const CONSENT_KEY = "fpl_ads_consent";

export type ConsentValue = "granted" | "denied" | "pending";

type ConsentListener = () => void;
const listeners = new Set<ConsentListener>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

export const getConsent = (): ConsentValue => {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === "granted" || stored === "denied") return stored;
  } catch {
    // localStorage unavailable (e.g. privacy mode) — treat as pending.
  }
  return "pending";
};

export const setConsent = (value: ConsentValue): void => {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Ignore storage errors; consent simply won't persist.
  }
  notifyListeners();
};

export const hasConsent = (): boolean => getConsent() === "granted";

export const onConsentChange = (listener: ConsentListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Loads the ad network script, gated behind consent.
 *
 * TODO(ads): implement the actual loader once an ad network is chosen, e.g.
 *   if (!hasConsent()) return;
 *   if (document.getElementById("ad-network-script")) return;
 *   const s = document.createElement("script");
 *   s.id = "ad-network-script";
 *   s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
 *   s.async = true;
 *   s.crossOrigin = "anonymous";
 *   document.head.appendChild(s);
 */
export const loadAdScript = (): void => {
  if (!hasConsent()) return;
  // No-op until a real ad script is configured. See the TODO above.
};
