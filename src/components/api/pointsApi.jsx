/**
 * Stored Value (loyalty balance) calculation and Passcreator update logic.
 *
 * Passcreator stores the loyalty balance in the pass's `storedValue` field,
 * NOT in a custom field called POINTS.
 *
 * Proxy endpoint required:
 *   POST /update-stored-value
 *   Body: { passId: string, newValue: number }
 *   Proxy translates to: PUT https://app.passcreator.com/api/pass/{passId}/storedvalue
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
 * pointsEarned = round(amountSpent * rewardPercent * 1000)
 * Example: $10 * 0.10 * 1000 = 1000 pts
 */
export const calculatePoints = (amountSpent, rewardPercent) => {
  return Math.round(amountSpent * rewardPercent * 1000);
};

/**
 * Update the stored value (loyalty balance) in Passcreator via the proxy.
 *
 * Proxy must handle:
 *   POST /update-stored-value { passId, newValue }
 *   → PUT https://app.passcreator.com/api/pass/{passId}/storedvalue  { value: newValue }
 *
 * Raw request payload: { passId: "<pass UUID>", newValue: <integer> }
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