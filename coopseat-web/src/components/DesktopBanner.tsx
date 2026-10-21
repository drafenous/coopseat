'use client';

import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { DESKTOP_BANNER_COOKIE } from './desktop-banner';

export function DesktopBanner({
  message,
  downloadHref,
  downloadLabel,
  closeLabel,
}: {
  message: string;
  downloadHref: string;
  downloadLabel: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-accent/25 bg-[#13241c] py-2 pr-1.5 pl-4">
      <p className="min-w-0 text-[13px] leading-snug text-foreground">
        {message}
      </p>
      <div className="flex shrink-0 items-center gap-1">
        <a
          href={downloadHref}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-semibold text-accent-ink transition hover:bg-accent-hover"
        >
          <Download size={15} />
          {downloadLabel}
        </a>
        <button
          type="button"
          aria-label={closeLabel}
          onClick={() => {
            const secure = location.protocol === 'https:' ? '; Secure' : '';
            document.cookie = `${DESKTOP_BANNER_COOKIE}=hidden; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax${secure}`;
            setOpen(false);
          }}
          className="grid size-8 place-items-center rounded-md text-[#8d9dad] hover:bg-white/5 hover:text-[#eef3f7]"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
