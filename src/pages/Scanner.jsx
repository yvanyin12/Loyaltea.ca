import { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Camera, Keyboard, Loader2, Settings } from 'lucide-react';
import { createPageUrl } from '@/utils';
import QRScanner from '../components/scanner/QRScanner';
import ScanResult from '../components/scanner/ScanResult';
import DebugPanel from '../components/scanner/DebugPanel';
import {
  getApiKey,
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

  const apiKey = getApiKey();
  const proxyUrl = getProxyUrl();
  const config = getSelectedConfig();

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

    log('info', `Barcode captured: "${barcodeValue}"`);
    log('info', `Proxy URL: ${proxyUrl || '(not set)'}`);
    log('info', `API key present: ${apiKey ? 'yes' : 'NO — missing'}`);
    log('info', `App config: ${config?.name || '(none selected)'}`);

    let scanResult = 'error';
    let passData = null;
    let errorMsg = '';
    let appScanSubmitted = false;

    try {
      // ── STEP 1: Validate pass via proxy ─────────────────────────────
      // Endpoint: POST {PROXY_URL}/validate
      // Payload:  { barcodeValue: string, apiKey: string }
      // Expected: { scanResult, passIdentifier, voided, error }
      const validateUrl = `${proxyUrl}/validate`;
      log('info', `Calling validatePass → POST ${validateUrl}`);
      log('info', `Payload: { barcodeValue: "${barcodeValue}", apiKey: "${apiKey ? '***' : 'MISSING'}" }`);

      const checkData = await checkPassByBarcode(barcodeValue, apiKey);
      log('ok', `Validate response received`);
      log('info', `Raw response: ${JSON.stringify(checkData)}`);

      // The proxy should return the normalised shape from passcreatorApi.js
      // If the proxy forwards Passcreator's raw response, handle both shapes:
      const responseError = checkData.error;
      const isVoided = checkData.voided;

      if (responseError && responseError !== '') {
        scanResult = 'unknown';
        log('warn', `Pass unknown — error field: "${responseError}"`);
      } else if (isVoided) {
        scanResult = 'already_voided';
        passData = checkData;
        log('warn', `Pass already voided`);
      } else {
        scanResult = 'valid';
        passData = checkData;
        log('ok', `Pass is VALID`);
      }

      // ── STEP 2: Track scan via proxy ─────────────────────────────────
      // Endpoint: POST {PROXY_URL}/track
      // Payload:  { barcodeValue, appConfigurationId, apiKey }
      if (config?.configurationId) {
        const trackUrl = `${proxyUrl}/track`;
        log('info', `Sending appscan → POST ${trackUrl}`);
        log('info', `Payload: { barcodeValue: "${barcodeValue}", appConfigurationId: "${config.configurationId}" }`);
        try {
          await createAppScan(barcodeValue, config.configurationId, apiKey);
          appScanSubmitted = true;
          log('ok', `App scan tracked successfully`);
        } catch (e) {
          log('warn', `App scan tracking failed (non-fatal): ${e.message}`);
        }
      } else {
        log('warn', `No app config selected — skipping appscan tracking`);
      }
    } catch (err) {
      scanResult = 'error';
      errorMsg = err.message;
      log('error', `Validation failed: ${err.message}`);
      if (!proxyUrl) {
        log('error', `No proxy URL set — go to Settings and enter your proxy endpoint`);
      }
    }

    // ── STEP 3: Save to local log ─────────────────────────────────────
    try {
      await base44.entities.ScanLog.create({
        barcodeValue,
        passIdentifier: passData?.identifier || '',
        appConfigurationId: config?.configurationId || '',
        appConfigurationName: config?.name || '',
        scanResult,
        isVoided: passData?.voided || false,
        appScanSubmitted,
        errorMessage: errorMsg,
      });
      log('ok', `Scan saved to local history`);
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

  const handleManualSubmit = () => {
    const val = manualValue.trim();
    if (val) handleScan(val);
  };

  const handleReset = () => {
    setResult(null);
    setManualValue('');
    setDebugLogs([]);
    setScanKey((k) => k + 1);
  };

  if (!apiKey || !proxyUrl) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center max-w-sm space-y-3">
          <AlertCircle className="w-14 h-14 text-amber-400 mx-auto" />
          <h2 className="text-white text-xl font-bold">Setup Required</h2>
          <div className="text-slate-400 text-sm space-y-1">
            {!apiKey && <p>⚠ Passcreator API key is missing</p>}
            {!proxyUrl && <p>⚠ Proxy URL is not configured</p>}
          </div>
          <p className="text-slate-500 text-xs">Configure both in Settings to start scanning.</p>
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
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <div>
          <h1 className="text-white font-bold text-lg leading-none">Pass Scanner</h1>
          {config ? (
            <p className="text-blue-400 text-xs mt-0.5">{config.name}</p>
          ) : (
            <p className="text-amber-500/80 text-xs mt-0.5">No config selected</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => { setResult(null); setMode(mode === 'camera' ? 'manual' : 'camera'); setScanKey(k => k + 1); }}
          className="text-slate-400 hover:text-white"
          title={mode === 'camera' ? 'Switch to manual input' : 'Switch to camera'}
        >
          {mode === 'camera' ? <Keyboard className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-8 gap-6">
        {result ? (
          <>
            <ScanResult result={result} onReset={handleReset} />
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