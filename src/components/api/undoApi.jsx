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

import { deleteAppScan } from './passcreatorApi';
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

/** Check if a scan is a redemption */
export const isRedemption = (scan) => !!scan.isRedemption;

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
 * 1. Reverts the stored value in Passcreator to remove the stamp (previousPointsBalance - 1).
 * 2. Deletes the app scan record (best-effort).
 * 3. Creates an audit reversal record.
 */
export async function undoStampsScan(originalScan) {
  // Calculate reverted stamp count
  const currentStamps = Number(originalScan.newPointsBalance) || 0;
  const revertedStamps = Math.max(0, currentStamps - 1);

  // 1. Revert stored value in Passcreator (remove 1 stamp)
  if (originalScan.passIdentifier) {
    try {
      await updateStoredValue(originalScan.passIdentifier, revertedStamps);
    } catch (e) {
      console.warn('[Undo Stamps] Failed to update stamp count:', e.message);
    }
  }

  // 2. Delete app scan (best-effort)
  if (originalScan.appScanId) {
    try {
      await deleteAppScan(originalScan.appScanId);
    } catch (e) {
      console.warn('[Undo Stamps] delete-scan failed (ignored):', e.message);
    }
  }

  // 3. Create reversal audit record
  return finalizeUndo(originalScan, {
    loyaltyMode: 'stamps',
    amountSpent:
      originalScan.amountSpent != null
        ? -Math.abs(Number(originalScan.amountSpent))
        : undefined,
    previousPointsBalance: originalScan.newPointsBalance,
    newPointsBalance: revertedStamps,
  });
}

// ── Points ────────────────────────────────────────────────────────────────────

/**
 * Undo a POINTS scan.
 * 1. Reverts the stored value in Passcreator to previousPointsBalance.
 * 2. Deletes the app scan record (best-effort).
 * 3. Creates an audit reversal record with negative points/amount.
 */
export async function undoPointsScan(originalScan) {
  const pointsEarned = Number(originalScan.pointsEarned) || 0;

  // Revert to the balance that existed before the original scan
  const revertedBalance = Number(
    originalScan.previousPointsBalance ??
    (originalScan.newPointsBalance - pointsEarned)
  );

  // 1. Revert stored value in Passcreator
  if (originalScan.passIdentifier) {
    await updateStoredValue(originalScan.passIdentifier, revertedBalance);
  }

  // 2. Delete app scan (best-effort — don't fail the whole undo if this errors)
  if (originalScan.appScanId) {
    try {
      await deleteAppScan(originalScan.appScanId);
    } catch (e) {
      console.warn('[Undo] Could not delete app scan record:', e.message);
    }
  }

  // 3. Create reversal audit record
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