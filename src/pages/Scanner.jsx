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
import ScanConfirmation from '../components/scanner/ScanConfirmation';
import {
  getProxyUrl,
  getSelectedConfig,
  checkPassByBarcode,
  createAppScan,
} from '../components/api/passcreatorApi';

export default function Scanner() {
  const [mode, setMode] = useState('camera');
  const [manualValue, setManualValue] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [scanKey, setScanKey] = useState(0);
  const [debugLogs, setDebugLogs] = useState([]);
  const [pendingScanId, setPendingScanId] = useState(null);
  const [showAmountInput, setShowAmountInput] = useState(false);

  // Pre-scan confirmation state
  const [confirmPending, setConfirmPending] = useState(null); // { passData, configName, scanMode, barcodeValue, configId, scanResult }
  const [confirmLoading, setConfirmLoading] = useState(false);

  const proxyUrl = getProxyUrl();

  const log = (level, message) => {
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
      `[Scanner] ${message}`
    );
    setDebugLogs((prev) => [...prev, { level, message }]);
  };



  const handleScan = async (barcodeValue) => {
    if (processing) return;
    setProcessing(true);
    setDebugLogs([]);

    // Read fresh from localStorage at scan time to avoid stale closure
    const config = getSelectedConfig();
    const configId = config?.configurationId || config?.id || null;

    log('info', `Barcode captured: "${barcodeValue}"`);
    log('info', `Proxy URL: ${proxyUrl}`);
    log('info', `Config raw: ${JSON.stringify(config)}`);
    log('info', `Config keys: ${config ? Object.keys(config).join(', ') : '(null)'}`);
    log('info', `configurationId resolved: ${configId ?? '(undefined)'}`);

    let scanResult = 'error';
    let passData = null;
    let errorMsg = '';

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
    } catch (err) {
      scanResult = 'error';
      errorMsg = err.message;
      log('error', `Failed: ${err.message}`);
    }

    setResult({
      status: scanResult,
      barcodeValue,
      passData,
      error: errorMsg,
      appScanSubmitted: false,
    });

    // Show confirmation dialog for valid passes
    if (scanResult === 'valid' && configId) {
      const scanMode = config?.scanMode ?? 1; // default to attendance mode
      setConfirmPending({
        passData,
        configName: config?.name || '',
        scanMode,
        barcodeValue,
        configId,
        scanResult,
      });
    }

    setProcessing(false);
  };

  const handleConfirmScan = async () => {
    if (!confirmPending) return;
    setConfirmLoading(true);

    const { passData, configId, barcodeValue, scanMode } = confirmPending;
    const config = getSelectedConfig();

    log('info', `[CONFIRMED] Submitting scan to Passcreator...`);

    const resolvedScanStatus = scanMode === 0 ? 0 : 2; // 0 = void, 2 = attendance
    const trackPayload = {
      appConfigurationId: configId,
      passId: passData?.identifier || '',
      scanStatus: resolvedScanStatus,
      createdOn: new Date().toISOString(),
      scannedBarcodeValue: barcodeValue,
      deviceName: 'Base44 Scanner',
    };

    log('info', `POST ${proxyUrl}/track  payload: ${JSON.stringify(trackPayload)}`);

    let appScanSubmitted = false;
    let appScanId = null;
    let errorMsg = '';

    try {
      const trackResponse = await createAppScan(trackPayload);
      log('ok', `/track raw response: ${JSON.stringify(trackResponse)}`);
      appScanSubmitted = true;
      appScanId = trackResponse?.appScanId || trackResponse?.identifier || trackResponse?.id || null;
      log('ok', `App scan tracked ✓ appScanId="${appScanId}"`);
    } catch (e) {
      log('error', `App scan tracking FAILED: ${e.message}`);
      errorMsg = e.message;
    }

    // Save to database
    try {
      const created = await base44.entities.ScanLog.create({
        barcodeValue,
        passIdentifier: passData?.identifier || '',
        appConfigurationId: configId,
        appConfigurationName: config?.name || '',
        scanResult: 'valid',
        isVoided: false,
        appScanSubmitted,
        appScanId: appScanId || '',
        errorMessage: errorMsg,
        isUndone: false,
      });
      if (created?.id) {
        setPendingScanId(created.id);
        // Show amount input for revenue tracking
        if (appScanSubmitted) {
          setShowAmountInput(true);
        }
      }
    } catch (e) {
      log('error', `Failed to save scan: ${e.message}`);
    }

    setConfirmPending(null);
    setConfirmLoading(false);
  };

  const handleCancelScan = () => {
    setConfirmPending(null);
    setResult(null);
  };

  const handleAmountSave = async (amount) => {
    if (pendingScanId) {
      try {
        await base44.entities.ScanLog.update(pendingScanId, { amountSpent: amount });
      } catch (_) {}
    }
    setShowAmountInput(false);
    setResult(null);
    setPendingScanId(null);
  };

  const handleAmountSkip = () => {
    setShowAmountInput(false);
    setResult(null);
    setPendingScanId(null);
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
    setConfirmPending(null);
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
        {confirmPending ? (
          <>
            <ScanConfirmation
              passData={confirmPending.passData}
              configName={confirmPending.configName}
              scanMode={confirmPending.scanMode}
              onConfirm={handleConfirmScan}
              onCancel={handleCancelScan}
              loading={confirmLoading}
            />
            <DebugPanel logs={debugLogs} />
          </>
        ) : result ? (
          <>
            <ScanResult result={result} onReset={handleReset} />
            {showAmountInput && result.status === 'valid' && (
              <AmountInput onSave={handleAmountSave} onSkip={handleAmountSkip} />
            )}
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