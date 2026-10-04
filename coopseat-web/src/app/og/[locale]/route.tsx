import { ImageResponse } from 'next/og';
import { DEFAULT_LOCALE, LOCALES, isLocale } from '@/i18n/config';
import { dictionaries } from '@/i18n/dictionaries';

const ARMCHAIR = [
  'M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3',
  'M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z',
  'M5 18v2',
  'M19 18v2',
];

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

/** Social preview image, one per locale so shared Portuguese links show Portuguese copy. */
export async function GET(_req: Request, ctx: { params: Promise<{ locale: string }> }) {
  const { locale } = await ctx.params;
  const t = dictionaries[isLocale(locale) ? locale : DEFAULT_LOCALE];
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 96px',
          background: 'radial-gradient(circle at 85% 15%, rgba(176,243,210,0.22), transparent 55%), #0b1016',
          color: '#eef3f7',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 34,
              background: '#b0f3d2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="76" height="76" viewBox="0 0 24 24" fill="none" stroke="#122b25" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {ARMCHAIR.map((d) => (
                <path key={d} d={d} />
              ))}
            </svg>
          </div>
          <div style={{ display: 'flex', fontSize: 84, fontWeight: 700, letterSpacing: -4 }}>
            coop<span style={{ marginLeft: -8, fontWeight: 400, color: '#a5b2c0' }}>seat</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 56, fontSize: 60, fontWeight: 700, lineHeight: 1.15, letterSpacing: -2 }}>
          <span>{t.home.headlineLead}</span>
          <span style={{ color: '#b0f3d2' }}>{t.home.headlineAccent}</span>
        </div>
        <div style={{ display: 'flex', marginTop: 28, fontSize: 30, color: '#97a6b3', maxWidth: 900 }}>{t.meta.description}</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
