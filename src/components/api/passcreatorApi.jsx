/**
 * Passcreator API — Proxy-based client
 *
 * All requests go through YOUR proxy server, never directly to app.passcreator.com.
 * This avoids CORS issues and keeps the Passcreator API key off the browser.
 *
 * ─────────────────────────────────────────────────────────────────
 * PROXY CONTRACT  (implement these 3 endpoints on your server)
 * ─────────────────────────────────────────────────────────────────
 *
 * 1. LOAD APP CONFIGURATIONS
 *    POST {PROXY_URL}/configs
 *    Body:     { apiKey: string }
 *    Response: Array of Passcreator App Configuration objects
 *              [ { configurationId, name, passTemplateName, scanMode, ... } ]
 *
 * 2. VALIDATE PASS
 *    POST {PROXY_URL}/validate
 *    Body:     { barcodeValue: string, apiKey: string }
 *    Response: {
 *                scanResult: "valid" | "already_voided" | "unknown",
 *                passIdentifier: string | null,
 *                voided: boolean,
 *                passTemplateGuid: string | null,
 *                error: string  // empty string if no error
 *              }
 *
 * 3. TRACK SCAN (App Scan)
 *    POST {PROXY_URL}/track
 *    Body:     { barcodeValue: string, appConfigurationId: string, apiKey: string }
 *    Response: { submitted: boolean }
 *
 * ─────────────────────────────────────────────────────────────────
 * Your proxy should:
 *  - Accept the apiKey from the request body
 *  - Forward the real request to app.passcreator.com with Authorization: apiKey
 *  - Return the response in the shape above
 * ─────────────────────────────────────────────────────────────────
 */

// ── Local storage helpers ────────────────────────────────────────

export const getApiKey      = () => localStorage.getItem('pc_api_key') || '';
export const setApiKey      = (key) => localStorage.setItem('pc_api_key', key);

export const getProxyUrl    = () => localStorage.getItem('pc_proxy_url') || '';
export const setProxyUrl    = (url) => localStorage.setItem('pc_proxy_url', url.replace(/\/$/, ''));

export const getSelectedConfig = () => {
  try { return JSON.parse(localStorage.getItem('pc_config') || 'null'); }
  catch { return null; }
};
export const setSelectedConfig = (config) =>
  localStorage.setItem('pc_config', JSON.stringify(config));

// ── Shared proxy fetch ───────────────────────────────────────────

async function proxyPost(path, body) {
  const proxyUrl = getProxyUrl();
  if (!proxyUrl) throw new Error('No proxy URL configured. Set it in Settings.');

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

export async function fetchConfigurations(apiKey) {
  // POST {PROXY_URL}/configs   body: { apiKey }
  return proxyPost('/configs', { apiKey });
}

export async function checkPassByBarcode(barcodeValue, apiKey) {
  // POST {PROXY_URL}/validate   body: { barcodeValue, apiKey }
  return proxyPost('/validate', { barcodeValue, apiKey });
}

export async function createAppScan(barcodeValue, appConfigurationId, apiKey) {
  // POST {PROXY_URL}/track   body: { barcodeValue, appConfigurationId, apiKey }
  return proxyPost('/track', { barcodeValue, appConfigurationId, apiKey });
}