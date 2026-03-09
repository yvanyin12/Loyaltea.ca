const BASE_URL = 'https://app.passcreator.com';

export const getApiKey = () => localStorage.getItem('pc_api_key') || '';
export const setApiKey = (key) => localStorage.setItem('pc_api_key', key);

export const getSelectedConfig = () => {
  try { return JSON.parse(localStorage.getItem('pc_config') || 'null'); }
  catch { return null; }
};
export const setSelectedConfig = (config) =>
  localStorage.setItem('pc_config', JSON.stringify(config));

export async function fetchConfigurations(apiKey) {
  const res = await fetch(`${BASE_URL}/api/appconfiguration`, {
    headers: { Authorization: apiKey },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

export async function checkPassByBarcode(barcodeValue, apiKey) {
  const res = await fetch(
    `${BASE_URL}/api/pass/checkbyid/${encodeURIComponent(barcodeValue)}`,
    { headers: { Authorization: apiKey } }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

export async function createAppScan(barcodeValue, appConfigurationId, apiKey) {
  const res = await fetch(`${BASE_URL}/api/appscan`, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      scannedBarcodeValue: barcodeValue,
      appConfigurationId,
      additionalProperties: [],
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}