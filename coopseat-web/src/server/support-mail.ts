export const CONTACT_INBOX = 'contact@coopseat.com';
export const HELP_INBOX = 'help@coopseat.com';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textToHtml(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

/** One line per field in text, and the same fields as paragraphs in HTML. */
export function renderMail(rows: [string, string][]): {
  html: string;
  text: string;
} {
  return {
    text: rows.map(([label, value]) => `${label}: ${value}`).join('\n'),
    html: rows
      .map(
        ([label, value]) =>
          `<p><strong>${escapeHtml(label)}</strong><br>${textToHtml(value)}</p>`,
      )
      .join(''),
  };
}

/** Collapses whitespace so a name cannot break the subject line. */
export function subjectName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}
