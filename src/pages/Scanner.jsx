import { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Camera, Keyboard, Loader2, Settings } from 'lucide-react';
import { createPageUrl } from '@/utils';
import QRScanner from '../components/scanner/QRScanner';
import ScanResult from '../components/scanner/ScanResult';
import {
  getApiKey,
  getSelectedConfig,
  checkPassByBarcode,
  createAppScan,
} from '../components/api/passcreatorApi';

export default function Scanner() {
  const [mode, setMode] = useState('camera');
  const [manualValue, setManualValue] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [scanKey, setScanKey] = useState(0); // remount QRScanner on reset

  const apiKey = getApiKey();
  const config = getSelectedConfig();

  const handleScan = async (barcodeValue) => {
    if (processing) return;
    setProcessing(true);

    let scanResult = 'error';
    let passData = null;
    let errorMsg = '';
    let appScanSubmitted = false;

    try {
      const checkData = await checkPassByBarcode(barcodeValue, apiKey);

      if (checkData.error && checkData.error !== '') {
        scanResult = 'unknown';
      } else if (checkData.voided) {
        scanResult = 'already_voided';
        passData = checkData;
      } else {
        scanResult = 'valid';
        passData = checkData;
      }

      if (config?.configurationId) {
        try {
          await createAppScan(barcodeValue, config.configurationId, apiKey);
          appScanSubmitted = true;
        } catch (e) {
          // Non-fatal: scan result still displayed
        }
      }
    } catch (err) {
      scanResult = 'error';
      errorMsg = err.message;
      if (err.message.includes('Failed to fetch') || err.message.toLowerCase().includes('cors')) {
        errorMsg = 'Network error — the Passcreator API may not allow browser requests directly. Check your API key or contact support.';
      }
    }

    // Save to local log
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
    setScanKey((k) => k + 1);
  };

  if (!apiKey) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-14 h-14 text-amber-400 mx-auto mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">API Key Required</h2>
          <p className="text-slate-400 mb-6 text-sm">
            Set up your Passcreator API key in Settings to start scanning passes.
          </p>
          <Link to={createPageUrl('Settings')}>
            <Button className="gap-2">
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
          <ScanResult result={result} onReset={handleReset} />
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