/** Turns a GoTrue QR payload into something an `<img>` can render. */
export function qrImageSrc(qr: string): string {
  const trimmed = qr.trim();
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }
  if (trimmed.includes('<svg')) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed)}`;
  }
  return trimmed;
}

export function securityCodeFile(preamble: string, codes: string[]): string {
  return `${preamble.trim()}\n\n${codes.join('\n')}\n`;
}

export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
