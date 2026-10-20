'use client';

import { useEffect } from 'react';
import Clarity from '@microsoft/clarity';
import * as CC from 'vanilla-cookieconsent';
import 'vanilla-cookieconsent/dist/cookieconsent.css';
import './cookie-consent.css';
import { LOCALES, localeHref, type Locale } from '@/i18n/config';
import { dictionaries, type Dictionary } from '@/i18n/dictionaries';
import {
  CLARITY_ID,
  GA_ID,
  GTAG_SRC,
  hasOptionalAnalytics,
} from '@/lib/analytics';

const clarityConsent = (granted: boolean) =>
  ({
    ad_Storage: 'denied',
    analytics_Storage: granted ? 'granted' : 'denied',
  }) as const;

let clarityStarted = false;

function syncClarity(granted: boolean) {
  if (!CLARITY_ID) return;
  if (!granted) {
    if (clarityStarted) Clarity.consentV2(clarityConsent(false));
    return;
  }
  if (!clarityStarted) {
    Clarity.init(CLARITY_ID);
    clarityStarted = true;
  }
  Clarity.consentV2(clarityConsent(true));
}

function translation(locale: Locale, t: Dictionary): CC.Translation {
  const c = t.cookies;
  const privacyLink = `<a href="${localeHref(locale, '/privacy')}">${t.common.privacyPolicy}</a>`;
  return {
    consentModal: {
      title: c.consent.title,
      description: c.consent.description,
      acceptAllBtn: c.acceptAll,
      acceptNecessaryBtn: c.acceptNecessary,
      showPreferencesBtn: c.consent.customize,
      footer: privacyLink,
    },
    preferencesModal: {
      title: c.preferences,
      acceptAllBtn: c.acceptAll,
      acceptNecessaryBtn: c.acceptNecessary,
      savePreferencesBtn: c.save,
      closeIconLabel: c.close,
      sections: [
        { description: c.intro },
        {
          title: c.necessary.title,
          description: c.necessary.description,
          linkedCategory: 'necessary',
        },
        {
          title: c.analytics.title,
          description: c.analytics.description,
          linkedCategory: 'analytics',
        },
        { title: c.more.title, description: c.more.description(privacyLink) },
      ],
    },
  };
}

function syncAnalytics() {
  const granted = CC.acceptedCategory('analytics');
  window.gtag?.('consent', 'update', {
    analytics_storage: granted ? 'granted' : 'denied',
  });
  if (granted && GA_ID) void CC.loadScript(GTAG_SRC, { async: '' });
  syncClarity(granted);
}

export function CookieConsent({ locale }: { locale: Locale }) {
  useEffect(() => {
    if (!hasOptionalAnalytics) return;
    void CC.run({
      revision: 1,
      guiOptions: {
        consentModal: {
          layout: 'box inline',
          position: 'bottom right',
          equalWeightButtons: true,
        },
        preferencesModal: { layout: 'box', equalWeightButtons: true },
      },
      categories: {
        necessary: { enabled: true, readOnly: true },
        analytics: {
          autoClear: {
            cookies: [{ name: /^_ga/ }, { name: '_clck' }, { name: '_clsk' }],
          },
        },
      },
      onConsent: syncAnalytics,
      onChange: syncAnalytics,
      language: {
        default: locale,
        translations: Object.fromEntries(
          LOCALES.map((l) => [l, translation(l, dictionaries[l])]),
        ),
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run() is one-shot per page load; locale changes go through setLanguage below.
  }, []);

  useEffect(() => {
    if (hasOptionalAnalytics) void CC.setLanguage(locale);
  }, [locale]);

  return null;
}

export function CookiePreferencesButton({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  if (!hasOptionalAnalytics) return null;
  return (
    <button
      type="button"
      className={className}
      onClick={() => CC.showPreferences()}
    >
      {children}
    </button>
  );
}
