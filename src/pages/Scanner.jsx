import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Camera, Keyboard, Loader2, Settings } from 'lucide-react';
import { createPageUrl } from '@/utils';
import QRScanner from '../components/scanner/QRScanner';
import ScanResult from '../components/scanner/ScanResult';
import DebugPanel from '../components/scanner/DebugPanel';
import AmountInput from '../components/scanner/AmountInput';
import UndoBar from '../components/scanner/UndoBar';
import {
  getProxyUrl,
  getSelectedConfig,
  checkPassByBarcode,
  createAppScan,
  deleteAppScan,
} from '../components/api/passcreatorApi';

const UNDO_SECONDS = 15;

export default function Scanner() {
  const [mode, setMode] = useState('camera');
  const [manualValue, setManualValue] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [scanKey, setScanKey] = useState(0);
  const [debugLogs, setDebugLogs] = useState([]);
  const [pendingScanId, setPendingScanId] = useState(null);
  const [showAmountInput, setShowAmountInput] = useState(false);

  // Undo state
  const [undoCountdown, setUndoCountdown] = useState(0);
  const [undoLoading, setUndoLoading] = useState(false);
  const [undoMessage, setUndoMessage] = useState(null); // { type: 'success'|'error', text }
  const undoTimerRef = useRef(null);
  // snapshot of the last scan for undo
  const lastScanRef = useRef(null);

  const proxyUrl = getProxyUrl();

  const log = (level, message) => {
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
      `[Scanner] ${message}`
    );
    setDebugLogs((prev) => [...prev, { level, message }]);
  };

  // Start countdown after a successful scan
  const startUndoCountdown = (scanSnapshot) => {
    lastScanRef.current = scanSnapshot;
    setUndoMessage(null);
    setUndoCountdown(UNDO_SECONDS);
    clearInterval(undoTimerRef.current);
    undoTimerRef.current = setInterval(() => {
      setUndoCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(undoTimerRef.current);
          lastScanRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleUndo = async () => {
    // [UNDO START] — logged before anything else so we know the button was clicked
    log('info', `[UNDO START] Undo button clicked`);

    const snap = lastScanRef.current;

    if (!snap) {
      log('error', `[UNDO FAILED] No scan snapshot found — lastScanRef is null`);
      setUndoMessage({ type: 'error', text: 'Nothing to undo' });
      return;
    }

    clearInterval(undoTimerRef.current);
    setUndoCountdown(0);
    setUndoLoading(true);
    lastScanRef.current = null;

    // ── Original scan details ─────────────────────────────────────
    log('info', `[UNDO] scanLogId="${snap.scanLogId}"`);
    log('info', `[UNDO] passId="${snap.passIdentifier}"`);
    log('info', `[UNDO] appConfigurationId="${snap.appConfigurationId}"`);
    log('info', `[UNDO] scannedBarcodeValue="${snap.barcodeValue}"`);
    log('info', `[UNDO] original scanStatus=${snap.scanStatus}`);
    log('info', `[UNDO] appScanId (Passcreator)="${snap.appScanId ?? '(missing)'}"`);
    log('info', `[UNDO] amountSpent=${snap.amountSpent ?? '(not entered)'}`);

    if (!snap.appScanId) {
      log('error', `[UNDO FAILED] Cannot undo — appScanId was not captured from /track response. The proxy must return the scan identifier so we can call DELETE /api/appscan/{id}.`);
      setUndoLoading(false);
      setUndoMessage({ type: 'error', text: 'Undo failed — scan ID not available (see debug log)' });
      return;
    }

    // Passcreator undo = DELETE /api/appscan/{identifier}
    // Proxy must handle: POST /delete-scan { identifier } → DELETE https://app.passcreator.com/api/appscan/{identifier}
    const deletePayload = { identifier: snap.appScanId };
    log('info', `[UNDO] UNDO REQUEST PAYLOAD: ${JSON.stringify(deletePayload)}`);
    log('info', `[UNDO] Method: proxy POST /delete-scan → DELETE https://app.passcreator.com/api/appscan/${snap.appScanId}`);

    let reverseOk = false;
    try {
      const reverseResponse = await deleteAppScan(snap.appScanId);
      log('ok', `[UNDO] UNDO RESPONSE: ${JSON.stringify(reverseResponse)}`);
      reverseOk = true;
    } catch (e) {
      log('error', `[UNDO] UNDO RESPONSE: ERROR — ${e.message}`);
    }

    try {
      await base44.entities.ScanLog.update(snap.scanLogId, { isUndone: true });
    } catch (e) {
      log('warn', `[UNDO] DB update failed: ${e.message}`);
    }

    setUndoLoading(false);
    if (reverseOk) {
      log('ok', `[UNDO SUCCESS] Reverse sent successfully — wallet update handled by Passcreator automation`);
      setUndoMessage({ type: 'success', text: 'Scan undone successfully' });
    } else {
      log('error', `[UNDO FAILED] /reverse call failed — local record marked undone but wallet may not have changed`);
      setUndoMessage({ type: 'error', text: 'Undo failed — see debug log' });
    }
  };

  const handleScan = async (barcodeValue) => {
    if (processing) return;
    setProcessing(true);
    setDebugLogs([]);

    // Read fresh from localStorage at scan time to avoid stale closure
    const config = getSelectedConfig();
    // Resolve the config ID — field may be 'configurationId' or 'id' depending on API response
    const configId = config?.configurationId || config?.id || null;

    log('info', `Barcode captured: "${barcodeValue}"`);
    log('info', `Proxy URL: ${proxyUrl}`);
    log('info', `Config raw: ${JSON.stringify(config)}`);
    log('info', `Config keys: ${config ? Object.keys(config).join(', ') : '(null)'}`);
    log('info', `configurationId resolved: ${configId ?? '(undefined)'}`);

    let scanResult = 'error';
    let passData = null;
    let errorMsg = '';
    let appScanSubmitted = false;
    let appScanId = null; // identifier returned by /track, used for Undo (DELETE /api/appscan/{id})

    try {
      log('info', `POST ${proxyUrl}/validate  { barcodeValue: "${barcodeValue}" }`);
      const checkData = await checkPassByBarcode(barcodeValue);
      log('ok', `VALIDATE response: ${JSON.stringify(checkData)}`);
      log('info', `  → identifier: ${checkData.identifier ?? '(missing)'}  voided: ${checkData.voided}  error: "${checkData.error || ''}"`); 

      const responseError = checkData.error;
      const isVoided = checkData.voided;

      if (responseError && responseError !== '') {
        scanResult = 'unknown';
        log('warn', `Pass unknown — error: "${responseError}"`);
      } else if (isVoided) {
        scanResult = 'already_voided';
        passData = checkData;
        log('warn', `Pass already voided`);
      } else {
        scanResult = 'valid';
        passData = checkData;
        log('ok', `Pass is VALID`);
      }

      if (configId) {
        // Passcreator scanStatus values:
        // 0 = voided after this scan, 1 = was already voided (invalid), 2 = attendance saved (valid loyalty scan), 3 = pass not found
        const resolvedScanStatus = scanResult === 'valid' ? 2 : scanResult === 'already_voided' ? 1 : 3;
        const trackPayload = {
          appConfigurationId: configId,
          passId: passData?.identifier || '',
          scanStatus: resolvedScanStatus,
          createdOn: new Date().toISOString(),
          scannedBarcodeValue: barcodeValue,
          deviceName: 'Base44 Scanner',
        };
        log('info', `POST ${proxyUrl}/track  payload: ${JSON.stringify(trackPayload)}`);
        log('info', `scanStatus sent: ${resolvedScanStatus} (${resolvedScanStatus === 2 ? 'VALID — attendance saved, triggers loyalty update' : resolvedScanStatus === 1 ? 'ALREADY VOIDED — no loyalty update' : 'UNKNOWN PASS — no loyalty update'})`);
        try {
          const trackResponse = await createAppScan(trackPayload);
          log('ok', `/track raw response: ${JSON.stringify(trackResponse)}`);
          appScanSubmitted = true;
          // Capture the appscan identifier for undo (DELETE /api/appscan/{identifier})
          appScanId = trackResponse?.identifier || trackResponse?.id || null;
          log('ok', `App scan tracked ✓ appScanId="${appScanId}" — wallet update depends on Passcreator automation`);
          if (!appScanId) log('warn', `No appscan identifier in /track response — Undo will not be able to reverse wallet effect`);
        } catch (e) {
          log('error', `App scan tracking FAILED: ${e.message}`);
        }
      } else {
        log('warn', `No configId found — skipping /track. Config in storage: ${JSON.stringify(config)}`);
      }
    } catch (err) {
      scanResult = 'error';
      errorMsg = err.message;
      log('error', `Failed: ${err.message}`);
    }

    try {
      const created = await base44.entities.ScanLog.create({
        barcodeValue,
        passIdentifier: passData?.identifier || '',
        appConfigurationId: configId || '',
        appConfigurationName: config?.name || '',
        scanResult,
        isVoided: passData?.voided || false,
        appScanSubmitted,
        errorMessage: errorMsg,
        isUndone: false,
      });
      if (scanResult === 'valid' && created?.id) {
        setPendingScanId(created.id);
        // Store snapshot for undo — countdown starts after amount input is dismissed
        lastScanRef.current = {
          scanLogId: created.id,
          barcodeValue,
          passIdentifier: passData?.identifier || '',
          appConfigurationId: configId || '',
          scanStatus: 2,
          appScanId: appScanId, // Passcreator appscan UUID — required for DELETE undo
          amountSpent: null,
        };
        log('info', `[UNDO SNAPSHOT] Stored for undo: scanLogId=${created.id}, passId="${passData?.identifier || ''}", configId="${configId || ''}", appScanId="${appScanId || '(none — undo will not work)'}"`);
        if (!appScanId) log('warn', `[UNDO SNAPSHOT] appScanId is null — /track response did not include an identifier. Check proxy /track response above.`);
        setShowAmountInput(true);
      }
    } catch (_) {}

    setResult({
      status: scanResult,
      barcodeValue,
      passData,
      error: errorMsg,
      appScanSubmitted,
    });
    setProcessing(false);
  };

  const handleAmountSave = async (amount) => {
    if (pendingScanId) {
      try {
        await base44.entities.ScanLog.update(pendingScanId, { amountSpent: amount });
      } catch (_) {}
    }
    // Attach amount to snapshot so undo payload can include it
    if (lastScanRef.current) lastScanRef.current.amountSpent = amount;
    setShowAmountInput(false);
    // Start undo countdown now that amount is done
    if (lastScanRef.current) startUndoCountdown(lastScanRef.current);
  };

  const handleAmountSkip = () => {
    setShowAmountInput(false);
    // Start undo countdown now that amount step is skipped
    if (lastScanRef.current) startUndoCountdown(lastScanRef.current);
  };

  const handleManualSubmit = () => {
    const val = manualValue.trim();
    if (val) handleScan(val);
  };

  const handleReset = () => {
    setResult(null);
    setManualValue('');
    setDebugLogs([]);
    setScanKey((k) => k + 1);
    setShowAmountInput(false);
    setPendingScanId(null);
    clearInterval(undoTimerRef.current);
    setUndoCountdown(0);
    setUndoMessage(null);
    setUndoLoading(false);
    lastScanRef.current = null;
  };

  if (!proxyUrl) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center max-w-sm space-y-3">
          <AlertCircle className="w-14 h-14 text-amber-400 mx-auto" />
          <h2 className="text-white text-xl font-bold">Setup Required</h2>
          <p className="text-slate-400 text-sm">Proxy URL is not configured.</p>
          <Link to={createPageUrl('Settings')}>
            <Button className="gap-2 mt-2">
              <Settings className="w-4 h-4" /> Go to Settings
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <div>
          <h1 className="text-white font-bold text-lg leading-none">Pass Scanner</h1>
          {getSelectedConfig() ? (
            <p className="text-blue-400 text-xs mt-0.5">{getSelectedConfig().name}</p>
          ) : (
            <p className="text-amber-500/80 text-xs mt-0.5">No config selected — go to Settings</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setResult(null);
            setMode(mode === 'camera' ? 'manual' : 'camera');
            setScanKey((k) => k + 1);
          }}
          className="text-slate-400 hover:text-white"
          title={mode === 'camera' ? 'Switch to manual input' : 'Switch to camera'}
        >
          {mode === 'camera' ? <Keyboard className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-8 gap-6">
        {result ? (
          <>
            <ScanResult result={result} onReset={handleReset} />
            {showAmountInput && result.status === 'valid' && (
              <AmountInput onSave={handleAmountSave} onSkip={handleAmountSkip} />
            )}
            <UndoBar
              show={undoCountdown > 0}
              countdown={undoCountdown}
              onUndo={handleUndo}
              loading={undoLoading}
              message={undoMessage}
            />
            <DebugPanel logs={debugLogs} />
          </>
        ) : processing ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-14 h-14 text-blue-400 animate-spin" />
            <p className="text-slate-400">Checking pass...</p>
          </div>
        ) : mode === 'camera' ? (
          <QRScanner key={scanKey} onScan={handleScan} />
        ) : (
          <div className="w-full max-w-sm flex flex-col gap-4">
            <p className="text-slate-400 text-center text-sm">Enter or paste the barcode value</p>
            <Input
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              placeholder="Barcode / Pass ID"
              autoFocus
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-center text-base h-14 rounded-xl"
            />
            <Button
              onClick={handleManualSubmit}
              disabled={!manualValue.trim()}
              className="h-12 text-base font-semibold"
            >
              Check Pass
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}