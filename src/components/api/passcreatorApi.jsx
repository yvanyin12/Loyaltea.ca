/**
 * Passcreator API — Proxy-based client
 *
 * PROXY CONTRACT
 * ─────────────────────────────────────────
 * POST /configs   body: {}                              → Array of App Configuration objects
 * POST /validate  body: { barcodeValue }                → { voided, identifier, error, ... }
 * POST /track     body: { appConfigurationId, passId, scanStatus, createdOn, scannedBarcodeValue, deviceName }
 * POST /reverse   body: { appConfigurationId, passId, scannedBarcodeValue }  → reversal confirmation
 */

const DEFAULT_PROXY_URL = 'https://square-bush-df0f.yvanyin123.workers.dev';

// ── Proxy URL ────────────────────────────────────────────────────

export const getProxyUrl = () =>
  localStorage.getItem('pc_proxy_url') || DEFAULT_PROXY_URL;

export const setProxyUrl = (url) =>
  localStorage.setItem('pc_proxy_url', url.replace(/\/$/, ''));

// ── Multi-config storage ─────────────────────────────────────────

const persistConfigs = (configs) => {
  localStorage.setItem('pc_configs', JSON.stringify(configs));
  // Keep pc_config in sync with the active config (used by Scanner)
  const active = configs.find((c) => c.active) || null;
  localStorage.setItem('pc_config', JSON.stringify(active));
};

export const getSavedConfigs = () => {
  try {
    const stored = localStorage.getItem('pc_configs');
    if (stored) return JSON.parse(stored);
    // One-time migration from old single-config storage
    const old = getSelectedConfig();
    if (old) {
      const migrated = [{ ...old, active: true }];
      persistConfigs(migrated);
      return migrated;
    }
    return [];
  } catch {
    return [];
  }
};

export const addSavedConfig = (cfg) => {
  const configs = getSavedConfigs();
  if (configs.find((c) => c.configurationId === cfg.configurationId)) return; // no duplicates
  persistConfigs([...configs, { ...cfg, active: false }]);
};

export const removeSavedConfig = (configurationId) => {
  const configs = getSavedConfigs().filter((c) => c.configurationId !== configurationId);
  persistConfigs(configs);
};

export const setActiveConfig = (configurationId) => {
  const configs = getSavedConfigs().map((c) => ({
    ...c,
    active: c.configurationId === configurationId,
  }));
  persistConfigs(configs);
};

// ── Legacy single-config helpers (used by Scanner page) ──────────

export const getSelectedConfig = () => {
  try {
    return JSON.parse(localStorage.getItem('pc_config') || 'null');
  } catch {
    return null;
  }
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

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Proxy returned non-JSON: ${text}`);
  }
}

// ── Public API ───────────────────────────────────────────────────

export async function fetchConfigurations() {
  return proxyPost('/configs', {});
}

export async function checkPassByBarcode(barcodeValue) {
  return proxyPost('/validate', { barcodeValue });
}

export async function createAppScan(payload) {
  return proxyPost('/track', payload);
}

export async function reverseAppScan(payload) {
  return proxyPost('/reverse', payload);
}