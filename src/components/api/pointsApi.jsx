/**
 * Stored Value (loyalty balance) calculation and Passcreator update logic.
 *
 * Passcreator stores the loyalty balance in the pass's `storedValue` field.
 *
 * Proxy endpoint required:
 *   POST /update-stored-value
 *   Body: { passId: string, newValue: number }
 *
 *   Proxy must call:
 *     PUT https://app.passcreator.com/api/pass/{passId}
 *     Headers: Authorization: <apiKey>, Content-Type: application/json
 *     Body: { "storedValue": newValue }
 *
 *   ⚠️  There is NO separate /storedvalue endpoint in Passcreator.
 *   storedValue is updated via the standard pass update endpoint (PUT /api/pass/{id}).
 */

/**
 * Returns the current stored value (loyalty balance) from pass data.
 * The storedValue field is a top-level field on the pass object, e.g. { storedValue: 200, ... }
 */
export const getCurrentStoredValue = (passData) => {
  if (!passData) return 0;
  const value = parseInt(passData.storedValue ?? 0, 10);
  return isNaN(value) ? 0 : value;
};

/**
 * Returns true if this pass uses stored value for loyalty balance.
 * storedValue is present (not null/undefined) on loyalty passes.
 */
export const hasStoredValue = (passData) => {
  if (!passData) return false;
  return passData.storedValue !== undefined && passData.storedValue !== null;
};

/**
 * pointsEarned = round(amountSpent * rewardPercent * 100)
 * Example: $10 * 0.10 * 100 = 100 pts
 */
export const calculatePoints = (amountSpent, rewardPercent) => {
  return Math.round(amountSpent * rewardPercent * 100);
};

/**
 * Update the stored value (loyalty balance) in Passcreator via the proxy.
 *
 * Proxy must handle:
 *   POST /update-stored-value { passId, newValue }
 *   → PUT https://app.passcreator.com/api/pass/{passId}
 *      Body: { "storedValue": newValue }
 *
 * ⚠️  Passcreator does NOT have a /storedvalue sub-endpoint.
 *     Use the standard pass update endpoint with the storedValue field.
 */
export async function updateStoredValue(proxyUrl, passId, newValue) {
  const fullUrl = `${proxyUrl}/update-stored-value`;
  const payload = { passId, newValue };

  console.debug('[Stored Value API] POST', fullUrl, payload);

  const res = await fetch(fullUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  console.debug('[Stored Value API] Response', res.status, text);

  if (!res.ok) throw new Error(`Update stored value failed ${res.status}: ${text}`);

  try {
    return JSON.parse(text);
  } catch {
    return { success: true };
  }
}

/**
 * Trigger a pass update/push notification in Passcreator after stored value change.
 * This ensures the wallet receives the updated pass immediately.
 *
 * Proxy must handle:
 *   POST /push-pass-update { passId }
 *   → GET https://app.passcreator.com/api/pass/{passId}  (fetch current pass)
 *   → PUT https://app.passcreator.com/api/pass/{passId}  (re-save to trigger push)
 *      Body: { ... all current pass fields ... }
 *
 * This signals Passcreator to push the updated pass to all devices holding it.
 */
export async function triggerPassPush(proxyUrl, passId) {
  const fullUrl = `${proxyUrl}/push-pass-update`;
  const payload = { passId };

  console.debug('[Pass Push API] POST', fullUrl, payload);

  const res = await fetch(fullUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  console.debug('[Pass Push API] Response', res.status, text);

  if (!res.ok) throw new Error(`Push pass update failed ${res.status}: ${text}`);

  try {
    return JSON.parse(text);
  } catch {
    return { success: true };
  }
}