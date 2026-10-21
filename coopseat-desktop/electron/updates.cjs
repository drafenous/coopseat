/** `major.minor.patch`, ignoring a leading `v` and any pre-release suffix. Returns <0, 0 or >0. */
function compareSemver(a, b) {
  const parts = (v) =>
    String(v)
      .trim()
      .replace(/^v/i, '')
      .split(/[-+]/)[0]
      .split('.')
      .map((n) => Number.parseInt(n, 10) || 0);
  const [pa, pb] = [parts(a), parts(b)];
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** True when `latest` is a newer `major.minor.patch` than the running app. */
function isNewer(current, latest) {
  if (typeof current !== 'string' || typeof latest !== 'string') return false;
  if (!/^\d+\.\d+\.\d+/.test(latest)) return false;
  return compareSemver(latest, current) > 0;
}

/** Version field from `GET /api/desktop/release`, or null when the body is unusable. */
function parseReleaseVersion(body) {
  const version = body && typeof body === 'object' ? body.version : null;
  return typeof version === 'string' && /^\d+\.\d+\.\d+/.test(version)
    ? version
    : null;
}

module.exports = { compareSemver, isNewer, parseReleaseVersion };
