/**
 * Undo / Reversal logic for loyalty scans.
 *
 * STAMPS: Deletes the original app scan via Passcreator API (removes the stamp).
 * POINTS: Reverts the stored value in Passcreator by subtracting pointsEarned,
 *         then also deletes the app scan record.
 *
 * In both cases:
 *  - The original ScanLog is marked isUndone = true
 *  - A new reversal ScanLog is created (isReversal = true, reversedScanId = original.id)
 */

import { deleteAppScan, fetchPassDetails, getProxyUrl } from './passcreatorApi';
import { updateStoredValue } from './pointsApi';
import { base44 } from '@/api/base44Client';

// Polling helper to refetch pass details until the value matches expected state or timeout
async function pollPassDetailsUntilUpdated(passIdentifier, expectedValue, maxRetries = 5, delayMs = 1000) {
  const pollStartTime = performance.now();
  console.log(`[Undo Poll] Starting poll at ${pollStartTime.toFixed(0)}ms, expecting value: ${expectedValue}`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (attempt > 1) {
      console.log(`[Undo Poll] Waiting ${delayMs}ms before attempt ${attempt}/${maxRetries}...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const attemptTime = performance.now();
    console.log(`[Undo Poll] Attempt ${attempt}/${maxRetries} at ${attemptTime.toFixed(0)}ms (${(attemptTime - pollStartTime).toFixed(0)}ms elapsed)`);

    try {
      const passData = await fetchPassDetails(passIdentifier);
      const currentValue = parseInt(passData?.storedValue ?? 0, 10);
      const fetchTime = performance.now();
      console.log(`[Undo Poll] Fetched value: ${currentValue} at ${fetchTime.toFixed(0)}ms (${(fetchTime - attemptTime).toFixed(0)}ms fetch time)`);

      if (currentValue === expectedValue) {
        const totalElapsed = fetchTime - pollStartTime;
        console.log(`[Undo Poll] ✓ Value matched! Took ${totalElapsed.toFixed(0)}ms total.`);
        return { success: true, value: currentValue, elapsedMs: totalElapsed, attempts: attempt };
      }

      if (attempt === maxRetries) {
        console.warn(`[Undo Poll] ✗ Max retries reached. Final value: ${currentValue}, expected: ${expectedValue}`);
        return { success: false, value: currentValue, expectedValue, elapsedMs: fetchTime - pollStartTime, attempts: attempt };
      }
    } catch (e) {
      console.warn(`[Undo Poll] Attempt ${attempt} failed:`, e.message);
    }
  }

  return { success: false, elapsedMs: performance.now() - pollStartTime, attempts: maxRetries };
}

// ── Eligibility ───────────────────────────────────────────────────────────────

/**
 * A scan is eligible for undo if:
 *  - it was a confirmed valid scan
 *  - it hasn't already been reversed
 *  - it is not itself a reversal record
 */
export const isUndoable = (scan) =>
  scan.scanResult === 'valid' && !scan.isUndone && !scan.isReversal;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Infer loyalty mode for older records that may not have it persisted. */
const inferMode = (scan) =>
  scan.loyaltyMode || (scan.pointsEarned != null ? 'points' : 'stamps');

/** Mark original as undone and create the reversal log record. */
const finalizeUndo = async (originalScan, reversalFields) => {
  await base44.entities.ScanLog.update(originalScan.id, { isUndone: true });

  return base44.entities.ScanLog.create({
    barcodeValue: originalScan.barcodeValue,
    passIdentifier: originalScan.passIdentifier || '',
    appConfigurationId: originalScan.appConfigurationId || '',
    appConfigurationName: originalScan.appConfigurationName || '',
    scanResult: 'valid',
    isVoided: false,
    appScanSubmitted: true,
    isUndone: false,
    isReversal: true,
    reversedScanId: originalScan.id,
    holderFirstName: originalScan.holderFirstName || '',
    holderLastName: originalScan.holderLastName || '',
    holderName: originalScan.holderName || '',
    holderEmail: originalScan.holderEmail || '',
    holderPhone: originalScan.holderPhone || '',
    ...reversalFields,
  });
};

// ── Stamps ────────────────────────────────────────────────────────────────────

/**
 * Undo a STAMPS scan.
 * Fetches the current stamp count from Passcreator, decrements by 1,
 * and writes it back via /update-stored-value.
 * Then polls for confirmation that the value was updated.
 * Also best-effort deletes the app scan record.
 * Then creates an audit reversal record.
 */
export async function undoStampsScan(originalScan) {
  const proxyUrl = getProxyUrl();
  const submitTime = performance.now();

  console.log(`[Undo Stamps] ── BEGIN at ${submitTime.toFixed(0)}ms ──────────────────────────`);
  console.log('[Undo Stamps] originalScan:', JSON.stringify(originalScan, null, 2));
  console.log('[Undo Stamps] loyaltyMode: stamps');
  console.log('[Undo Stamps] appScanId:', originalScan.appScanId);
  console.log('[Undo Stamps] passIdentifier:', originalScan.passIdentifier);

  let stampsBefore = null;
  let stampsAfter = null;

  // 1. Fetch current stamp count and decrement by 1
  if (originalScan.passIdentifier) {
    const fetchStartTime = performance.now();
    console.log(`[Undo Stamps] Fetching current pass details at ${fetchStartTime.toFixed(0)}ms...`);
    const passData = await fetchPassDetails(originalScan.passIdentifier);
    const fetchEndTime = performance.now();
    stampsBefore = parseInt(passData?.storedValue ?? 0, 10);
    console.log(`[Undo Stamps] Fetched at ${fetchEndTime.toFixed(0)}ms (${(fetchEndTime - fetchStartTime).toFixed(0)}ms): stampsBefore = ${stampsBefore}`);

    stampsAfter = Math.max(0, stampsBefore - 1);
    console.log(`[Undo Stamps] Target after undo: ${stampsAfter}`);
    console.log(`[Undo Stamps] Sending /update-stored-value at ${performance.now().toFixed(0)}ms...`);

    const updateStartTime = performance.now();
    const updateResult = await updateStoredValue(proxyUrl, originalScan.passIdentifier, stampsAfter);
    const updateEndTime = performance.now();
    console.log(`[Undo Stamps] Passcreator confirmed undo at ${updateEndTime.toFixed(0)}ms (${(updateEndTime - updateStartTime).toFixed(0)}ms request time)`);
    console.log('[Undo Stamps] /update-stored-value response:', JSON.stringify(updateResult));
  } else {
    console.warn('[Undo Stamps] No passIdentifier on scan — cannot update stamp count in provider!');
  }

  // 2. Best-effort delete the app scan record
  if (originalScan.appScanId) {
    const deleteStartTime = performance.now();
    console.log(`[Undo Stamps] Deleting app scan at ${deleteStartTime.toFixed(0)}ms...`);
    try {
      const deleteResult = await deleteAppScan(originalScan.appScanId);
      const deleteEndTime = performance.now();
      console.log(`[Undo Stamps] Delete confirmed at ${deleteEndTime.toFixed(0)}ms (${(deleteEndTime - deleteStartTime).toFixed(0)}ms)`);
    } catch (e) {
      console.warn('[Undo Stamps] delete-scan failed (non-fatal):', e.message);
    }
  }

  // 3. Poll for updated value until it matches expected state or timeout
  let pollResult = null;
  if (originalScan.passIdentifier && stampsAfter !== null) {
    console.log(`[Undo Stamps] Starting polling cycle at ${performance.now().toFixed(0)}ms...`);
    pollResult = await pollPassDetailsUntilUpdated(originalScan.passIdentifier, stampsAfter, 5, 1000);
    console.log(`[Undo Stamps] Poll result:`, JSON.stringify(pollResult));
  }

  const finalTime = performance.now();
  const totalElapsed = finalTime - submitTime;
  console.log(`[Undo Stamps] ── COMPLETE at ${finalTime.toFixed(0)}ms (${totalElapsed.toFixed(0)}ms total) ──`);
  console.log(`[Undo Stamps] stamps: ${stampsBefore} → ${stampsAfter}`);

  return finalizeUndo(originalScan, {
    loyaltyMode: 'stamps',
    amountSpent:
      originalScan.amountSpent != null
        ? -Math.abs(Number(originalScan.amountSpent))
        : undefined,
  });
}

// ── Points ────────────────────────────────────────────────────────────────────

/**
 * Undo a POINTS scan.
 * 1. Reverts the stored value in Passcreator to previousPointsBalance.
 * 2. Deletes the app scan record (best-effort).
 * 3. Polls for confirmation that the value was updated.
 * 4. Creates an audit reversal record with negative points/amount.
 */
export async function undoPointsScan(originalScan) {
  const proxyUrl = getProxyUrl();
  const pointsEarned = originalScan.pointsEarned || 0;
  const submitTime = performance.now();

  console.log(`[Undo Points] ── BEGIN at ${submitTime.toFixed(0)}ms ──────────────────────────`);

  // Revert to the balance that existed before the original scan
  const revertedBalance =
    originalScan.previousPointsBalance ??
    (originalScan.newPointsBalance - pointsEarned);

  console.log(`[Undo Points] Target balance after undo: ${revertedBalance}`);

  // 1. Revert stored value in Passcreator
  if (originalScan.passIdentifier) {
    const updateStartTime = performance.now();
    console.log(`[Undo Points] Sending /update-stored-value at ${updateStartTime.toFixed(0)}ms...`);
    await updateStoredValue(proxyUrl, originalScan.passIdentifier, revertedBalance);
    const updateEndTime = performance.now();
    console.log(`[Undo Points] Passcreator confirmed undo at ${updateEndTime.toFixed(0)}ms (${(updateEndTime - updateStartTime).toFixed(0)}ms request time)`);
  }

  // 2. Delete app scan (best-effort — don't fail the whole undo if this errors)
  if (originalScan.appScanId) {
    const deleteStartTime = performance.now();
    console.log(`[Undo Points] Deleting app scan at ${deleteStartTime.toFixed(0)}ms...`);
    try {
      await deleteAppScan(originalScan.appScanId);
      const deleteEndTime = performance.now();
      console.log(`[Undo Points] Delete confirmed at ${deleteEndTime.toFixed(0)}ms (${(deleteEndTime - deleteStartTime).toFixed(0)}ms)`);
    } catch (e) {
      console.warn('[Undo Points] Could not delete app scan record:', e.message);
    }
  }

  // 3. Poll for updated value until it matches expected state or timeout
  let pollResult = null;
  if (originalScan.passIdentifier) {
    console.log(`[Undo Points] Starting polling cycle at ${performance.now().toFixed(0)}ms...`);
    pollResult = await pollPassDetailsUntilUpdated(originalScan.passIdentifier, revertedBalance, 5, 1000);
    console.log(`[Undo Points] Poll result:`, JSON.stringify(pollResult));
  }

  const finalTime = performance.now();
  const totalElapsed = finalTime - submitTime;
  console.log(`[Undo Points] ── COMPLETE at ${finalTime.toFixed(0)}ms (${totalElapsed.toFixed(0)}ms total) ──`);

  // 4. Create reversal audit record
  return finalizeUndo(originalScan, {
    loyaltyMode: 'points',
    amountSpent:
      originalScan.amountSpent != null
        ? -Math.abs(Number(originalScan.amountSpent))
        : undefined,
    pointsEarned: -pointsEarned,
    previousPointsBalance: originalScan.newPointsBalance,
    newPointsBalance: revertedBalance,
  });
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

/**
 * Undo any scan — dispatches to the correct handler based on loyalty mode.
 */
export async function undoScan(originalScan) {
  const mode = inferMode(originalScan);
  return mode === 'points'
    ? undoPointsScan(originalScan)
    : undoStampsScan(originalScan);
}