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
  getSavedConfigs,
  checkPassByBarcode,
  fetchPassDetails,
  createAppScan,
} from '../components/api/passcreatorApi';
import {
  getCurrentStoredValue,
  hasStoredValue,
  calculatePoints,
  updateStoredValue,
} from '../components/api/pointsApi';
import PointsConfirmation from '../components/scanner/PointsConfirmation';

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

  // Points mode state
  const [pointsFlow, setPointsFlow] = useState(null); // { passData, configId, barcodeValue, currentPoints, rewardPercent, configName }
  const [pointsLoading, setPointsLoading] = useState(false);

  // Holder info — extracted once from passData, shared across flow steps
  const [holderInfo, setHolderInfo] = useState({ firstName: '', lastName: '', name: '', email: '', phone: '' });

  const proxyUrl = getProxyUrl();

  const log = (level, message) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
    const fullMsg = `[${timestamp}] ${message}`;
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
      `[Scanner] ${fullMsg}`
    );
    setDebugLogs((prev) => [...prev, { level, message: fullMsg }]);
  };



  const handleScan = async (barcodeValue) => {
    if (processing) return;
    setProcessing(true);
    setDebugLogs([]);

    log('info', `Barcode captured: "${barcodeValue}"`);
    log('info', `Proxy URL: ${proxyUrl}`);

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
        log('ok', `Pass is VALID — identifier: "${checkData.identifier}"`);

        // Fetch full pass details to get storedValue and passTemplateGuid
        log('info', `Fetching full pass details for "${checkData.identifier}"...`);
        try {
          const fullPass = await fetchPassDetails(checkData.identifier);
          log('ok', `RAW fullPass response: ${JSON.stringify(fullPass)}`);
          passData = { ...checkData, ...fullPass };
        } catch (e) {
          log('error', `Failed to fetch full pass details: ${e.message}`);
        }

        log('info', `RAW passData (merged): ${JSON.stringify(passData)}`);
        log('info', `passData.passTemplateGuid: "${passData.passTemplateGuid}"`);
        log('info', `passData.storedValue: ${JSON.stringify(passData.storedValue)}`);
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

    // Extract holder info from Passcreator response
    // Priority: 1) passFieldData object/array  2) passData text block  3) top-level fields
    const extractHolderInfo = (p) => {
      if (!p) return { firstName: '', lastName: '', name: '', email: '', phone: '' };

      // --- SOURCE 1: passFieldData ---
      // Can be an array of { label/identifier/name, value } or a plain object
      const pfd = p.passFieldData || p.passFields || p.fieldData || null;

      const pfdLookup = {};
      if (pfd && typeof pfd === 'object') {
        const entries = Array.isArray(pfd) ? pfd : Object.entries(pfd).map(([k, v]) => ({ key: k, value: v }));
        for (const entry of entries) {
          if (!entry || typeof entry !== 'object') continue;
          const val = String(entry.value ?? entry.fieldValue ?? entry.content ?? '').trim();
          if (!val) continue;
          // Index by every descriptive key on the entry
          const keys = [
            entry.key, entry.identifier, entry.fieldIdentifier,
            entry.name, entry.label, entry.fieldType, entry.type, entry.title,
          ].filter(Boolean);
          for (const k of keys) pfdLookup[String(k).toLowerCase()] = val;
        }
      }

      // --- SOURCE 2: passData text block ---
      // Passcreator sometimes returns a formatted text blob, e.g. "NAME: Yvan\nLAST NAME: Yin\n..."
      const passDataText = typeof p.passData === 'string' ? p.passData : '';
      const parseTextLine = (label) => {
        // Match "LABEL: value" or "LABEL : value" case-insensitively
        const re = new RegExp(`^${label}\\s*:\\s*(.+)$`, 'im');
        const m = passDataText.match(re);
        return m ? m[1].trim() : '';
      };
      const textFirstName = parseTextLine('(?:first\\s*name|fname|prenom|vorname)');
      const textLastName  = parseTextLine('(?:last\\s*name|lname|surname|nom|nachname)');
      const textName      = parseTextLine('(?:(?:customer\\s*)?name|full\\s*name|nom)');
      const textEmail     = parseTextLine('(?:email(?:\\s*address)?|courriel|mail)');
      const textPhone     = parseTextLine('(?:phone(?:\\s*number)?|mobile|telephone|tel|cell|handy)');
      // In Passcreator, "NAME:" means first name when "LAST NAME:" also exists
      const effectiveTextFirstName = textFirstName || (textLastName ? textName : '');

      // --- SOURCE 3: top-level / nested objects (last resort) ---
      const sources = [p, p.holder, p.customer, p.passholder, p.owner].filter(Boolean);
      const getTopLevel = (...keys) => {
        for (const k of keys) {
          for (const src of sources) {
            const v = src[k] || src[k.toLowerCase()];
            if (v && typeof v === 'string' && v.trim()) return v.trim();
          }
        }
        return '';
      };

      // Also build lookup from all personalization variants (existing logic kept as extra fallback)
      const persRaw = p.personalization || p.personalizations || p.personalizationFields || [];
      const persArr = Array.isArray(persRaw) ? persRaw : Object.values(persRaw);
      const persLookup = {};
      for (const entry of persArr) {
        if (!entry || typeof entry !== 'object') continue;
        const val = String(entry.value || entry.fieldValue || entry.content || '').trim();
        if (!val) continue;
        const keys = [entry.identifier, entry.fieldType, entry.fieldIdentifier, entry.name, entry.key, entry.label, entry.type].filter(Boolean);
        for (const k of keys) persLookup[k.toLowerCase()] = val;
      }

      // Resolve each field: passFieldData > passData text > top-level > personalization
      const resolve = (pfdKeys, txtVal, topKeys) => {
        for (const k of pfdKeys) { if (pfdLookup[k]) return pfdLookup[k]; }
        if (txtVal) return txtVal;
        const tl = getTopLevel(...topKeys);
        if (tl) return tl;
        for (const k of pfdKeys) { if (persLookup[k]) return persLookup[k]; }
        return '';
      };

      const firstName = resolve(
        ['firstname', 'first_name', 'first name', 'fname', 'forename', 'givenname', 'given_name', 'prenom'],
        effectiveTextFirstName,
        ['firstName', 'first_name', 'fname', 'forename']
      );
      const lastName = resolve(
        ['lastname', 'last_name', 'last name', 'lname', 'surname', 'familyname', 'family_name', 'nom', 'nachname'],
        textLastName,
        ['lastName', 'last_name', 'lname', 'surname']
      );
      const name = [firstName, lastName].filter(Boolean).join(' ')
        || resolve(
            ['name', 'fullname', 'full_name', 'holdername', 'displayname', 'customername'],
            textName,
            ['name', 'fullName', 'holderName', 'displayName']
          );
      const email = resolve(
        ['email', 'emailaddress', 'email_address', 'holderemail', 'mail', 'courriel'],
        textEmail,
        ['email', 'emailAddress', 'holderEmail', 'mail']
      );
      const phone = resolve(
        ['phone', 'phonenumber', 'phone_number', 'mobile', 'mobilenumber', 'holderphone', 'telephone', 'cell', 'tel'],
        textPhone,
        ['phone', 'phoneNumber', 'mobile', 'holderPhone', 'telephone']
      );

      log('info', `Final extracted → firstName: "${firstName}" | lastName: "${lastName}" | name: "${name}" | email: "${email}" | phone: "${phone}"`);
      return { firstName, lastName, name, email, phone };
    };

    const extracted = extractHolderInfo(passData);
    setHolderInfo(extracted);

    log('info', `Final holder payload to save: ${JSON.stringify({ holderFirstName: extracted.firstName, holderLastName: extracted.lastName, holderName: extracted.name, holderEmail: extracted.email, holderPhone: extracted.phone })}`);

    if (scanResult === 'valid') {
    const passTemplateGuid = passData?.passTemplateGuid || passData?.passTemplate?.guid || passData?.passTemplate?.id || null;

    // Use ONLY the currently selected config — never auto-switch
    const selectedConfig = getSelectedConfig();

    log('info', `--- CONFIG VALIDATION ---`);
    log('info', `currently selected config name: "${selectedConfig?.name ?? 'none'}"`);
    log('info', `currently selected config id: "${(selectedConfig?.configurationId || selectedConfig?.id) ?? 'none'}"`);
         log('info', `currently selected config passTemplateId: "${selectedConfig?.passTemplateId ?? 'none'}"`);
         log('info', `scanned pass template guid: "${passTemplateGuid}"`);
         log('info', `scanned pass template name: "${passData?.passTemplateName ?? 'not set'}"`);

         if (!selectedConfig) {
           log('error', `REJECTED: no config selected — go to Settings and select a configuration`);
           setResult({ status: 'error', barcodeValue, passData, error: 'No configuration selected. Go to Settings and select a configuration.', appScanSubmitted: false });
           setProcessing(false);
           return;
         }

         if (!passTemplateGuid) {
           log('error', `REJECTED: scanned pass has no passTemplateGuid`);
           setResult({ status: 'error', barcodeValue, passData, error: 'Pass has no template ID. Cannot validate against selected configuration.', appScanSubmitted: false });
           setProcessing(false);
           return;
         }

         // Strict check: scanned pass must belong to the selected config's template
         const templateMatches = selectedConfig.passTemplateId === passTemplateGuid;
         if (!templateMatches) {
           log('error', `REJECTED: scanned pass template "${passTemplateGuid}" does NOT match selected config template "${selectedConfig.passTemplateId}"`);
           log('error', `final decision: INVALID_MISMATCH`);
           setResult({
             status: 'error',
             barcodeValue,
             passData,
             error: `This pass does not belong to the selected account. Please check the scanner settings and try again.`,
             appScanSubmitted: false,
           });
           setProcessing(false);
           return;
         }

         log('ok', `Template match confirmed ✓ — pass belongs to selected config "${selectedConfig.name}"`);

         const config = selectedConfig;
         const configId = config?.configurationId || config?.id || null;

         // Determine selected config's loyalty type
         const configSavedType = config?.loyaltyType ? config.loyaltyType.toLowerCase() : null;
         const configNameLower = (config?.name || '').toLowerCase();
         let configLoyaltyType;
         if (configSavedType) {
           configLoyaltyType = configSavedType;
         } else if (configNameLower.includes('stamp')) {
           configLoyaltyType = 'stamps';
         } else if (configNameLower.includes('point') || configNameLower.includes('loyalty')) {
           configLoyaltyType = 'points';
         } else {
           configLoyaltyType = 'stamps'; // safe default
         }

         log('info', `currently selected config loyalty type: ${configLoyaltyType.toUpperCase()}`);
         log('info', `final decision: ${configLoyaltyType === 'stamps' ? 'VALID_STAMPS' : 'VALID_POINTS'}`);

         if (configLoyaltyType === 'stamps') {
           log('info', `branch taken: STAMPS_FLOW → adding 1 stamp via attendance scan`);
           const scanMode = config?.scanMode ?? 1;
           setConfirmPending({ passData, configName: config?.name || '', scanMode, barcodeValue, configId, scanResult });
         } else {
           log('info', `branch taken: POINTS_FLOW → opening Points Loyalty screen`);
           const currentPoints = getCurrentStoredValue(passData);
           const rewardPercent = (typeof config?.rewardPercent === 'number' && !isNaN(config.rewardPercent))
             ? config.rewardPercent
             : 0.10;
           log('info', `currentBalance: ${currentPoints}, rewardPercent: ${rewardPercent} (${(rewardPercent * 100).toFixed(2)}%)`);
           setPointsFlow({ passData, configId, barcodeValue, currentPoints, rewardPercent, configName: config?.name || '' });
         }
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
      log('info', `[STAMPS] Saving ScanLog — holder: firstName="${holderInfo.firstName}" lastName="${holderInfo.lastName}" email="${holderInfo.email}" phone="${holderInfo.phone}"`);
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
        loyaltyMode: 'stamps',
        isUndone: false,
        isReversal: false,
        holderFirstName: holderInfo.firstName,
        holderLastName: holderInfo.lastName,
        holderName: holderInfo.name,
        holderEmail: holderInfo.email,
        holderPhone: holderInfo.phone,
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

    // CRITICAL: Fetch updated pass data immediately after successful stamp scan
    if (appScanSubmitted && passData?.identifier) {
      log('info', `[REFRESH] Fetching updated pass after stamp scan...`);
      try {
        const updatedPass = await fetchPassDetails(passData.identifier);
        log('ok', `[REFRESH] Updated pass data received: storedValue=${updatedPass?.storedValue}`);
        // Update the result to show latest data
        setResult((prev) => ({
          ...prev,
          passData: { ...passData, ...updatedPass },
        }));
      } catch (e) {
        log('warn', `[REFRESH] Could not fetch updated pass: ${e.message}`);
      }
    }

    setConfirmPending(null);
    setConfirmLoading(false);
    };

  const handleCancelScan = () => {
    setConfirmPending(null);
    setPointsFlow(null);
    setResult(null);
  };

  const handlePointsConfirm = async (amountSpent) => {
    if (!pointsFlow) return;
    setPointsLoading(true);

    const { passData, configId, barcodeValue, currentPoints, rewardPercent, configName } = pointsFlow;
    const config = getSelectedConfig();

    try {
      // Calculate points earned
      const pointsEarned = calculatePoints(amountSpent, rewardPercent);
      const newBalance = currentPoints + pointsEarned;

      log('info', `--- POINTS CALCULATION ---`);
      log('info', `config name: "${configName}"`);
      log('info', `config id: "${configId}"`);
      log('info', `rewardPercent from saved config: ${rewardPercent} (${(rewardPercent * 100).toFixed(2)}%)`);
      log('info', `passId (identifier): "${passData?.identifier}"`);
      log('info', `previousStoredValue: ${currentPoints}`);
      log('info', `amountSpent: $${amountSpent}`);
      log('info', `rewardPercent used: ${rewardPercent}`);
      log('info', `formula: round(${amountSpent} × ${rewardPercent} × 1000) = ${pointsEarned}`);
      log('info', `newStoredValue: ${currentPoints} + ${pointsEarned} = ${newBalance}`);

      // Submit the app scan (attendance tracking)
      const resolvedScanStatus = 2; // attendance
      const trackPayload = {
        appConfigurationId: configId,
        passId: passData?.identifier || '',
        scanStatus: resolvedScanStatus,
        createdOn: new Date().toISOString(),
        scannedBarcodeValue: barcodeValue,
        deviceName: 'Base44 Scanner',
      };

      log('info', `Submitting app scan...`);
      let appScanId = null;
      let appScanSubmitted = false;

      try {
        const trackResponse = await createAppScan(trackPayload);
        appScanSubmitted = true;
        appScanId = trackResponse?.appScanId || trackResponse?.identifier || null;
        log('ok', `App scan tracked: ${appScanId}`);
      } catch (e) {
        log('error', `App scan failed: ${e.message}`);
      }

      // Update stored value (loyalty balance) in Passcreator
      const svPayload = { passId: passData?.identifier || '', newValue: newBalance };
      log('info', `--- STORED VALUE UPDATE ---`);
      log('info', `POST ${proxyUrl}/update-stored-value`);
      log('info', `Payload: ${JSON.stringify(svPayload)}`);
      try {
        const svResponse = await updateStoredValue(proxyUrl, passData?.identifier, newBalance);
        log('ok', `Response: ${JSON.stringify(svResponse)}`);
        log('ok', `Stored value updated to ${newBalance} ✓`);
      } catch (e) {
        log('error', `FAILED to update stored value: ${e.message}`);
      }

      // Save to database
      log('info', `[POINTS] Saving ScanLog — holder: firstName="${holderInfo.firstName}" lastName="${holderInfo.lastName}" email="${holderInfo.email}" phone="${holderInfo.phone}"`);
      await base44.entities.ScanLog.create({
        barcodeValue,
        passIdentifier: passData?.identifier || '',
        appConfigurationId: configId,
        appConfigurationName: configName,
        scanResult: 'valid',
        isVoided: false,
        appScanSubmitted,
        appScanId: appScanId || '',
        loyaltyMode: 'points',
        amountSpent,
        pointsEarned,
        previousPointsBalance: currentPoints,
        newPointsBalance: newBalance,
        isUndone: false,
        holderFirstName: holderInfo.firstName,
        holderLastName: holderInfo.lastName,
        holderName: holderInfo.name,
        holderEmail: holderInfo.email,
        holderPhone: holderInfo.phone,
      });

      setResult({
        status: 'valid',
        barcodeValue,
        passData,
        error: '',
        appScanSubmitted,
        pointsData: {
          amountSpent,
          pointsEarned,
          previousBalance: currentPoints,
          newBalance,
        },
      });

      setPointsFlow(null);
    } catch (e) {
      log('error', `Points flow failed: ${e.message}`);
    }

    setPointsLoading(false);
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
    setPointsFlow(null);
    setHolderInfo({ firstName: '', lastName: '', name: '', email: '', phone: '' });
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
        {pointsFlow ? (
          <>
            <PointsConfirmation
              passIdentifier={pointsFlow.passData?.identifier}
              configName={pointsFlow.configName}
              rewardPercent={pointsFlow.rewardPercent}
              currentPoints={pointsFlow.currentPoints}
              onConfirm={handlePointsConfirm}
              onCancel={handleCancelScan}
              loading={pointsLoading}
            />
            <DebugPanel logs={debugLogs} />
          </>
        ) : confirmPending ? (
          <>
            <ScanConfirmation
              passData={confirmPending.passData}
              configName={confirmPending.configName}
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