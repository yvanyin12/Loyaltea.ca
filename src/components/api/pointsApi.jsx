/**
 * Points / Stored Value logic for Passcreator loyalty passes.
 *
 * Passcreator stores the loyalty balance in the pass's "storedValue" field
 * (a first-class numeric field on the pass object), NOT in any custom field.
 *
 * Reading:  passData.storedValue  (number, returned by /validate)
 * Writing:  POST {proxyUrl}/update-stored-value  { passId, newValue }
 *
 * Your Cloudflare proxy must implement /update-stored-value and forward to:
 *   PUT  https://api.passcreator.com/api/v1/pass/{passId}
 *   Body: { "storedValue": newValue }
 *   Headers: Authorization: Bearer <API_KEY>
 */

/** Read the current stored value (loyalty balance) from a pass object */
export const getCurrentPoints = (passData) => {
  if (!passData) return 0;
  const val = passData.storedValue;
  if (val === undefined || val === null) return 0;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? 0 : parsed;
};

/** Detect whether this pass uses stored value for loyalty */
export const hasPointsField = (passData) => {
  if (!passData) return false;
  return passData.storedValue !== undefined && passData.storedValue !== null;
};

/** pointsEarned = round(amountSpent × rewardPercent × 1000) */
export const calculatePoints = (amountSpent, rewardPercent) => {
  return Math.round(amountSpent * rewardPercent * 1000);
};

/**
 * Update the stored value (loyalty balance) on the pass via the proxy.
 *
 * Proxy endpoint: POST {proxyUrl}/update-stored-value
 * Request body:   { passId: string, newValue: number }
 *
 * The proxy should call Passcreator:
 *   PUT https://api.passcreator.com/api/v1/pass/{passId}
 *   { storedValue: newValue }
 */
export async function updateStoredValue(proxyUrl, passId, newValue) {
  const fullUrl = `${proxyUrl}/update-stored-value`;
  const payload = { passId, newValue };

  console.debug('[Points API] POST', fullUrl, payload);

  const res = await fetch(fullUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  console.debug('[Points API] Response', res.status, text);

  if (!res.ok) throw new Error(`Update stored value failed ${res.status}: ${text}`);

  try {
    return JSON.parse(text);
  } catch {
    return { success: true };
  }
}

// Legacy alias — kept so nothing else breaks
export const updatePointsField = updateStoredValue;