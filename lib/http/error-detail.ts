/**
 * The sentence to show a person when a request failed.
 *
 * The API answers an error with `{"error": "validation_error", "detail": "..."}`.
 * Only `detail` is written for a human; the rest is for us. Handing the whole
 * body to a `<p>` puts raw JSON in front of whoever is on the page - and on the
 * public portals that is a candidate mid-onboarding, who can do nothing with it.
 *
 * Reads the body once, so call it on a response nothing else has consumed.
 */
export async function readErrorDetail(res: Response, fallback: string): Promise<string> {
  const raw = await res.text().catch(() => '');
  if (!raw.trim()) return fallback;

  try {
    const detail = (JSON.parse(raw) as { detail?: unknown })?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    // A request that fails schema validation carries a list of field errors
    // rather than a sentence. The first one is the one worth showing.
    if (Array.isArray(detail)) {
      const first = detail.find(d => typeof (d as { msg?: unknown })?.msg === 'string');
      if (first) return (first as { msg: string }).msg;
    }
  } catch {
    // Not JSON at all, so it came from a proxy or gateway rather than from us.
    // Its body is a stack trace or an HTML page - the fallback is kinder.
  }
  return fallback;
}
