'use client';

import { useEffect } from 'react';
import * as CC from 'vanilla-cookieconsent';
import 'vanilla-cookieconsent/dist/cookieconsent.css';
import './cookie-consent.css';
import { LOCALES, type Locale } from '@/i18n/config';
import { dictionaries, type Dictionary } from '@/i18n/dictionaries';
import { GA_ID, GTAG_SRC } from '@/lib/analytics';

function translation(t: Dictionary): CC.Translation {
  const c = t.cookies;
  const privacyLink = `<a href="/privacy">${t.common.privacyPolicy}</a>`;
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
  if (granted) void CC.loadScript(GTAG_SRC, { async: '' });
}

export function CookieConsent({ locale }: { locale: Locale }) {
  useEffect(() => {
    if (!GA_ID) return;
    void CC.run({
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
        analytics: { autoClear: { cookies: [{ name: /^_ga/ }] } },
      },
      onConsent: syncAnalytics,
      onChange: syncAnalytics,
      language: {
        default: locale,
        translations: Object.fromEntries(
          LOCALES.map((l) => [l, translation(dictionaries[l])]),
        ),
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run() is one-shot per page load; locale changes go through setLanguage below.
  }, []);

  useEffect(() => {
    if (GA_ID) void CC.setLanguage(locale);
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
  if (!GA_ID) return null;
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
