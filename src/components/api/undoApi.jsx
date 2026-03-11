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
  console.log(`\n[Phone REFETCH] ========== Starting poll cycle at ${pollStartTime.toFixed(0)}ms ==========`);
  console.log(`[Phone REFETCH] Expected value after undo: ${expectedValue}`);
  console.log(`[Phone REFETCH] Will retry up to ${maxRetries} times with ${delayMs}ms delay`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (attempt > 1) {
      const waitTime = performance.now();
      console.log(`[Phone REFETCH] [Attempt ${attempt}] Waiting ${delayMs}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      const resumeTime = performance.now();
      console.log(`[Phone REFETCH] [Attempt ${attempt}] Resumed at ${resumeTime.toFixed(0)}ms (waited ${(resumeTime - waitTime).toFixed(0)}ms)`);
    }

    const attemptTime = performance.now();
    console.log(`[Phone REFETCH] [Attempt ${attempt}/${maxRetries}] Fetching pass details at ${attemptTime.toFixed(0)}ms...`);

    try {
      const fetchStart = performance.now();
      const passData = await fetchPassDetails(passIdentifier);
      const fetchEnd = performance.now();
      
      console.log(`[Phone REFETCH] [Attempt ${attempt}] Response received at ${fetchEnd.toFixed(0)}ms (${(fetchEnd - fetchStart).toFixed(0)}ms latency)`);
      console.log(`[Phone REFETCH] [Attempt ${attempt}] RAW RESPONSE:`, JSON.stringify(passData, null, 2));
      
      const currentValue = parseInt(passData?.storedValue ?? 0, 10);
      console.log(`[Phone REFETCH] [Attempt ${attempt}] Parsed storedValue: ${currentValue}`);
      console.log(`[Phone REFETCH] [Attempt ${attempt}] Expected: ${expectedValue}, Match: ${currentValue === expectedValue ? '✓ YES' : '✗ NO'}`);

      if (currentValue === expectedValue) {
        const totalElapsed = fetchEnd - pollStartTime;
        console.log(`[Phone REFETCH] ✓✓✓ SUCCESS on attempt ${attempt}: Value matched in ${totalElapsed.toFixed(0)}ms`);
        return { success: true, value: currentValue, elapsedMs: totalElapsed, attempts: attempt };
      }

      if (attempt === maxRetries) {
        const totalElapsed = fetchEnd - pollStartTime;
        console.warn(`[Phone REFETCH] ✗✗✗ FAILED: Max retries (${maxRetries}) reached after ${totalElapsed.toFixed(0)}ms`);
        console.warn(`[Phone REFETCH] Final value: ${currentValue}, Expected: ${expectedValue}, Mismatch: ${currentValue - expectedValue}`);
        return { success: false, value: currentValue, expectedValue, elapsedMs: totalElapsed, attempts: attempt };
      }
    } catch (e) {
      const errTime = performance.now();
      console.warn(`[Phone REFETCH] [Attempt ${attempt}] EXCEPTION at ${errTime.toFixed(0)}ms:`, e.message);
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

  console.log(`\n[Phone API] ═══════════════════════════════════════════════════════════`);
  console.log(`[Phone API] STAMPS UNDO REQUEST at ${submitTime.toFixed(0)}ms`);
  console.log(`[Phone API] Pass ID: ${originalScan.passIdentifier}`);
  console.log(`[Phone API] App Scan ID: ${originalScan.appScanId}`);

  let stampsBefore = null;
  let stampsAfter = null;

  // 1. Fetch current stamp count and decrement by 1
  if (originalScan.passIdentifier) {
    const fetchStartTime = performance.now();
    console.log(`[Phone API] [Step 1] Fetching current stamp count at ${fetchStartTime.toFixed(0)}ms...`);
    const passData = await fetchPassDetails(originalScan.passIdentifier);
    const fetchEndTime = performance.now();
    stampsBefore = parseInt(passData?.storedValue ?? 0, 10);
    console.log(`[Phone API] [Step 1] Response at ${fetchEndTime.toFixed(0)}ms (${(fetchEndTime - fetchStartTime).toFixed(0)}ms)`);
    console.log(`[Phone API] [Step 1] RAW PASS DATA:`, JSON.stringify(passData, null, 2));
    console.log(`[Phone API] [Step 1] Parsed stampsBefore: ${stampsBefore}`);

    stampsAfter = Math.max(0, stampsBefore - 1);
    console.log(`[Phone API] [Step 1] Calculated stampsAfter: ${stampsAfter}`);
    
    const updateStartTime = performance.now();
    console.log(`[Phone API] [Step 2] Sending UPDATE to Passcreator at ${updateStartTime.toFixed(0)}ms...`);
    const updateResult = await updateStoredValue(proxyUrl, originalScan.passIdentifier, stampsAfter);
    const updateEndTime = performance.now();
    console.log(`[Phone API] [Step 2] UPDATE confirmed at ${updateEndTime.toFixed(0)}ms (${(updateEndTime - updateStartTime).toFixed(0)}ms)`);
    console.log(`[Phone API] [Step 2] Passcreator response:`, JSON.stringify(updateResult));
  } else {
    console.warn('[Phone API] No passIdentifier!');
  }

  // 2. Best-effort delete the app scan record
  if (originalScan.appScanId) {
    const deleteStartTime = performance.now();
    console.log(`[Phone API] [Step 3] Deleting app scan at ${deleteStartTime.toFixed(0)}ms...`);
    try {
      const deleteResult = await deleteAppScan(originalScan.appScanId);
      const deleteEndTime = performance.now();
      console.log(`[Phone API] [Step 3] Delete confirmed at ${deleteEndTime.toFixed(0)}ms (${(deleteEndTime - deleteStartTime).toFixed(0)}ms)`);
    } catch (e) {
      console.warn('[Phone API] [Step 3] Delete failed (non-fatal):', e.message);
    }
  }

  // 3. Poll for updated value until it matches expected state or timeout
  let pollResult = null;
  if (originalScan.passIdentifier && stampsAfter !== null) {
    pollResult = await pollPassDetailsUntilUpdated(originalScan.passIdentifier, stampsAfter, 5, 1000);
  }

  const finalTime = performance.now();
  const totalElapsed = finalTime - submitTime;
  console.log(`\n[Phone API] ═══════════════════════════════════════════════════════════`);
  console.log(`[Phone API] UNDO COMPLETE: ${stampsBefore} → ${stampsAfter} in ${totalElapsed.toFixed(0)}ms`);
  console.log(`[Phone API] Poll result: ${pollResult?.success ? '✓ SUCCESS' : '✗ FAILED'}`);
  console.log(`[Phone API] Now returning to UI layer for state update...`);

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

  console.log(`\n[Phone API] ═══════════════════════════════════════════════════════════`);
  console.log(`[Phone API] POINTS UNDO REQUEST at ${submitTime.toFixed(0)}ms`);
  console.log(`[Phone API] Pass ID: ${originalScan.passIdentifier}`);
  console.log(`[Phone API] App Scan ID: ${originalScan.appScanId}`);
  console.log(`[Phone API] Current balance: ${originalScan.newPointsBalance}`);
  console.log(`[Phone API] Points earned: ${pointsEarned}`);

  // Revert to the balance that existed before the original scan
  const revertedBalance =
    originalScan.previousPointsBalance ??
    (originalScan.newPointsBalance - pointsEarned);

  console.log(`[Phone API] Target balance after undo: ${revertedBalance}`);

  // 1. Revert stored value in Passcreator
  if (originalScan.passIdentifier) {
    const updateStartTime = performance.now();
    console.log(`[Phone API] [Step 1] Sending UPDATE to Passcreator at ${updateStartTime.toFixed(0)}ms...`);
    const updateResult = await updateStoredValue(proxyUrl, originalScan.passIdentifier, revertedBalance);
    const updateEndTime = performance.now();
    console.log(`[Phone API] [Step 1] UPDATE confirmed at ${updateEndTime.toFixed(0)}ms (${(updateEndTime - updateStartTime).toFixed(0)}ms)`);
    console.log(`[Phone API] [Step 1] Passcreator response:`, JSON.stringify(updateResult));
  }

  // 2. Delete app scan (best-effort — don't fail the whole undo if this errors)
  if (originalScan.appScanId) {
    const deleteStartTime = performance.now();
    console.log(`[Phone API] [Step 2] Deleting app scan at ${deleteStartTime.toFixed(0)}ms...`);
    try {
      await deleteAppScan(originalScan.appScanId);
      const deleteEndTime = performance.now();
      console.log(`[Phone API] [Step 2] Delete confirmed at ${deleteEndTime.toFixed(0)}ms (${(deleteEndTime - deleteStartTime).toFixed(0)}ms)`);
    } catch (e) {
      console.warn('[Phone API] [Step 2] Delete failed (non-fatal):', e.message);
    }
  }

  // 3. Poll for updated value until it matches expected state or timeout
  let pollResult = null;
  if (originalScan.passIdentifier) {
    pollResult = await pollPassDetailsUntilUpdated(originalScan.passIdentifier, revertedBalance, 5, 1000);
  }

  const finalTime = performance.now();
  const totalElapsed = finalTime - submitTime;
  console.log(`\n[Phone API] ═══════════════════════════════════════════════════════════`);
  console.log(`[Phone API] UNDO COMPLETE: ${originalScan.newPointsBalance} → ${revertedBalance} in ${totalElapsed.toFixed(0)}ms`);
  console.log(`[Phone API] Poll result: ${pollResult?.success ? '✓ SUCCESS' : '✗ FAILED'}`);
  console.log(`[Phone API] Now returning to UI layer for state update...`);

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