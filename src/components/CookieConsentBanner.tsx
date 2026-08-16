import { useEffect } from "react";
import * as CookieConsent from "vanilla-cookieconsent";
import "vanilla-cookieconsent/dist/cookieconsent.css";
import { hasConsent, loadAdScript, setConsent } from "@/lib/consent";

/**
 * Cookie consent banner (vanilla-cookieconsent). It gates the ad script
 * loading behind the user's consent. There is no real ad script yet, so
 * `loadAdScript` is a no-op — the gating logic is ready to wire up.
 */
export const CookieConsentBanner = () => {
  useEffect(() => {
    // If consent was already granted in a previous session, load ads right away.
    if (hasConsent()) loadAdScript();

    CookieConsent.run({
      mode: "opt-in",
      categories: {
        necessary: {
          enabled: true,
          readOnly: true,
        },
        advertising: {
          enabled: false,
          readOnly: false,
          services: {
            ads: {
              label: "Advertisements",
              onAccept: () => loadAdScript(),
              onReject: () => {
                // Nothing to tear down until a real ad script exists.
              },
            },
          },
        },
      },
      onConsent: ({ cookie }) => {
        const accepted = cookie.categories.includes("advertising");
        setConsent(accepted ? "granted" : "denied");
        if (accepted) loadAdScript();
      },
      language: {
        default: "en",
        translations: {
          en: {
            consentModal: {
              title: "We value your privacy",
              description:
                "This site uses cookies to show non-personalized ads and keep the service free. You can accept or decline below.",
              acceptAllBtn: "Accept all",
              acceptNecessaryBtn: "Reject all",
              showPreferencesBtn: "Manage preferences",
            },
            preferencesModal: {
              title: "Consent preferences",
              acceptAllBtn: "Accept all",
              acceptNecessaryBtn: "Reject all",
              savePreferencesBtn: "Save preferences",
              closeIconLabel: "Close",
              sections: [
                {
                  title: "Strictly necessary cookies",
                  description:
                    "Required for the site to function. These cannot be disabled.",
                  linkedCategory: "necessary",
                },
                {
                  title: "Advertisements",
                  description:
                    "Used to serve ads that help keep this tool free.",
                  linkedCategory: "advertising",
                },
              ],
            },
          },
        },
      },
    });
  }, []);

  return null;
};
