const HANDOFF_MS = 1800;

/**
 * Opens `coopseat://party/<nickname>`. If the app does not take the window
 * (nothing is installed, or the protocol is ignored), the page goes to the
 * download URL. A browser prompt that blurs the window counts as a handoff,
 * so cancelling that prompt stays on this page.
 */
export function openDesktopRoom(nickname: string, downloadHref: string): void {
  let handedOff = false;
  const mark = () => {
    handedOff = true;
  };
  const onVisibility = () => {
    if (document.hidden) mark();
  };
  window.addEventListener('blur', mark);
  document.addEventListener('visibilitychange', onVisibility);
  window.location.href = `coopseat://party/${encodeURIComponent(nickname)}`;
  window.setTimeout(() => {
    window.removeEventListener('blur', mark);
    document.removeEventListener('visibilitychange', onVisibility);
    if (!handedOff) window.location.assign(downloadHref);
  }, HANDOFF_MS);
}
