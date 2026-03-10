/**
 * Passcreator API — Proxy-based client
 *
 * All requests go through the Cloudflare Worker proxy.
 * The Worker injects the Authorization header — no API key needed in the frontend.
 *
 * PROXY CONTRACT (endpoints on the Worker)
 * ─────────────────────────────────────────
 * POST /configs   body: {}                            → Array of App Configuration objects
 * POST /validate  body: { barcodeValue }              → { voided, identifier, error, ... }
 * POST /track     body: { barcodeValue, appConfigurationId } → { submitted: boolean }
 */

const DEFAULT_PROXY_URL = 'https://square-bush-df0f.yvanyin123.workers.dev';

// ── Local storage helpers ────────────────────────────────────────

export const getProxyUrl = () =>
  localStorage.getItem('pc_proxy_url') || DEFAULT_PROXY_URL;

export const setProxyUrl = (url) =>
  localStorage.setItem('pc_proxy_url', url.replace(/\/$/, ''));

export const getSelectedConfig = () => {
  try { return JSON.parse(localStorage.getItem('pc_config') || 'null'); }
  catch { return null; }
};
export const setSelectedConfig = (config) =>
  localStorage.setItem('pc_config', JSON.stringify(config));

// ── Shared proxy fetch ───────────────────────────────────────────

async function proxyPost(path, body) {
  const proxyUrl = getProxyUrl();
  const fullUrl = `${proxyUrl}${path}`;
  console.debug('[Passcreator Proxy] POST', fullUrl, body);

  const res = await fetch(fullUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  console.debug('[Passcreator Proxy] Response', res.status, text);

  if (!res.ok) throw new Error(`Proxy error ${res.status}: ${text}`);

  try { return JSON.parse(text); }
  catch { throw new Error(`Proxy returned non-JSON: ${text}`); }
}

// ── Public API ───────────────────────────────────────────────────

export async function fetchConfigurations() {
  return proxyPost('/configs', {});
}

export async function checkPassByBarcode(barcodeValue) {
  return proxyPost('/validate', { barcodeValue });
}

export async function createAppScan(barcodeValue, appConfigurationId) {
  return proxyPost('/track', { barcodeValue, appConfigurationId });
}