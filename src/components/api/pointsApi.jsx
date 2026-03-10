/**
 * Points calculation and Passcreator field update logic
 */

export const getCurrentPoints = (passData) => {
  if (!passData || !passData.fields) return 0;
  const pointsField = passData.fields.find((f) => f.name === 'POINTS');
  if (!pointsField) return 0;
  const value = parseInt(pointsField.value || '0', 10);
  return isNaN(value) ? 0 : value;
};

export const hasPointsField = (passData) => {
  if (!passData || !passData.fields) return false;
  return passData.fields.some((f) => f.name === 'POINTS');
};

export const calculatePoints = (amountSpent, rewardPercent) => {
  return Math.round(amountSpent * rewardPercent * 1000);
};

/**
 * Update the POINTS field in Passcreator via the proxy
 * Proxy must support: POST /update-pass-field { passId, fieldName, fieldValue }
 */
export async function updatePointsField(proxyUrl, passId, newPointsValue) {
  const fullUrl = `${proxyUrl}/update-pass-field`;
  console.debug('[Points API] POST', fullUrl, { passId, fieldName: 'POINTS', fieldValue: newPointsValue });

  const res = await fetch(fullUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      passId,
      fieldName: 'POINTS',
      fieldValue: String(newPointsValue),
    }),
  });

  const text = await res.text();
  console.debug('[Points API] Response', res.status, text);

  if (!res.ok) throw new Error(`Update failed ${res.status}: ${text}`);

  try {
    return JSON.parse(text);
  } catch {
    return { success: true };
  }
}