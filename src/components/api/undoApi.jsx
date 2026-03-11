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
 * and writes it back via /update-stored-value — the same mechanism used for points.
 * Also best-effort deletes the app scan record.
 * Then creates an audit reversal record.
 * Finally, immediately refetches pass details to ensure fresh state.
 */
export async function undoStampsScan(originalScan) {
  const proxyUrl = getProxyUrl();

  console.log('[Undo Stamps] ── BEGIN ──────────────────────────');
  console.log('[Undo Stamps] originalScan:', JSON.stringify(originalScan, null, 2));
  console.log('[Undo Stamps] loyaltyMode: stamps');
  console.log('[Undo Stamps] appScanId:', originalScan.appScanId);
  console.log('[Undo Stamps] passIdentifier:', originalScan.passIdentifier);

  let stampsBefore = null;
  let stampsAfter = null;

  // 1. Fetch current stamp count and decrement by 1
  if (originalScan.passIdentifier) {
    console.log('[Undo Stamps] Fetching current pass details to read stamp count...');
    const passData = await fetchPassDetails(originalScan.passIdentifier);
    stampsBefore = parseInt(passData?.storedValue ?? 0, 10);
    console.log('[Undo Stamps] Current stamp count (storedValue):', stampsBefore);

    stampsAfter = Math.max(0, stampsBefore - 1);
    console.log('[Undo Stamps] Target stamp count after undo:', stampsAfter);
    console.log('[Undo Stamps] Sending /update-stored-value:', { passId: originalScan.passIdentifier, newValue: stampsAfter });

    const updateResult = await updateStoredValue(proxyUrl, originalScan.passIdentifier, stampsAfter);
    console.log('[Undo Stamps] /update-stored-value response:', JSON.stringify(updateResult));
    console.log('[Undo Stamps] Stamp count after undo:', stampsAfter);
  } else {
    console.warn('[Undo Stamps] No passIdentifier on scan — cannot update stamp count in provider!');
  }

  // 2. Best-effort delete the app scan record
  if (originalScan.appScanId) {
    console.log('[Undo Stamps] Attempting to delete app scan record:', originalScan.appScanId);
    try {
      const deleteResult = await deleteAppScan(originalScan.appScanId);
      console.log('[Undo Stamps] delete-scan response:', JSON.stringify(deleteResult));
    } catch (e) {
      console.warn('[Undo Stamps] delete-scan failed (non-fatal):', e.message);
    }
  }

  // 3. Refetch pass details to confirm updated state
  if (originalScan.passIdentifier) {
    console.log('[Undo Stamps] Refetching pass details to verify stamp count...');
    try {
      const verifyData = await fetchPassDetails(originalScan.passIdentifier);
      const stampsVerified = parseInt(verifyData?.storedValue ?? 0, 10);
      console.log('[Undo Stamps] Verification: stamp count now =', stampsVerified);
    } catch (e) {
      console.warn('[Undo Stamps] Could not verify final stamp count:', e.message);
    }
  }

  console.log('[Undo Stamps] ── DONE — stamps:', stampsBefore, '→', stampsAfter, '──────────');

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
 * 3. Creates an audit reversal record with negative points/amount.
 * 4. Refetches pass details to ensure fresh state.
 */
export async function undoPointsScan(originalScan) {
  const proxyUrl = getProxyUrl();
  const pointsEarned = originalScan.pointsEarned || 0;

  // Revert to the balance that existed before the original scan
  const revertedBalance =
    originalScan.previousPointsBalance ??
    (originalScan.newPointsBalance - pointsEarned);

  // 1. Revert stored value in Passcreator
  if (originalScan.passIdentifier) {
    await updateStoredValue(proxyUrl, originalScan.passIdentifier, revertedBalance);
  }

  // 2. Delete app scan (best-effort — don't fail the whole undo if this errors)
  if (originalScan.appScanId) {
    try {
      await deleteAppScan(originalScan.appScanId);
    } catch (e) {
      console.warn('[Undo] Could not delete app scan record:', e.message);
    }
  }

  // 3. Refetch pass details to confirm updated state
  if (originalScan.passIdentifier) {
    try {
      const verifyData = await fetchPassDetails(originalScan.passIdentifier);
      const pointsVerified = parseInt(verifyData?.storedValue ?? 0, 10);
      console.log('[Undo Points] Verification: point balance now =', pointsVerified);
    } catch (e) {
      console.warn('[Undo Points] Could not verify final point balance:', e.message);
    }
  }

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