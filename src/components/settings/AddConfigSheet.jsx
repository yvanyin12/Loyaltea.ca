import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle2, Link2, Loader2, RefreshCw, ScanLine } from 'lucide-react';
import { fetchConfigurations } from '../api/passcreatorApi';
import QRScanner from '../scanner/QRScanner';

// ── Debug log panel ──────────────────────────────────────────────

function DebugLog({ logs }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 text-xs font-mono overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-slate-400 hover:text-slate-200"
      >
        <span>Debug log ({logs.length} lines)</span>
        <span>{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-0.5 max-h-64 overflow-y-auto">
          {logs.map((l, i) => (
            <p key={i} className="text-slate-300 break-all leading-5">{l}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared result card ───────────────────────────────────────────

function MatchResult({ cfg, isSaved, onAdd, onAddAndActivate }) {
  return (
    <div className="bg-emerald-950/30 border border-emerald-800 rounded-xl p-4 space-y-3">
      <p className="text-emerald-400 text-sm font-medium flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4" /> Configuration found
      </p>
      <div>
        <p className="text-white font-semibold">{cfg.name}</p>
        <p className="text-xs font-mono text-slate-400 mt-0.5 break-all">{cfg.configurationId}</p>
        {cfg.passTemplateName && (
          <p className="text-xs text-slate-500 mt-0.5">Template: {cfg.passTemplateName}</p>
        )}
      </div>
      {isSaved ? (
        <p className="text-emerald-400 text-xs flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Already saved
        </p>
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAdd(cfg)}
            className="flex-1 border-slate-600 text-slate-300 hover:text-white"
          >
            Add
          </Button>
          <Button
            size="sm"
            onClick={() => onAddAndActivate(cfg)}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            Add &amp; Set Active
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main sheet ───────────────────────────────────────────────────

export default function AddConfigSheet({ open, onClose, onAdd, savedConfigs }) {
  // Load All tab
  const [remoteConfigs, setRemoteConfigs] = useState([]);
  const [loadLoading, setLoadLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // QR tab  — states: 'scanning' | 'loading' | 'result' | 'error'
  const [qrKey, setQrKey] = useState(0);
  const [qrState, setQrState] = useState('scanning');
  const [qrResult, setQrResult] = useState(null);
  const [qrError, setQrError] = useState(null);
  const [qrDebugLogs, setQrDebugLogs] = useState([]);

  // Link tab — states: 'idle' | 'loading' | 'result'
  const [linkInput, setLinkInput] = useState('');
  const [linkState, setLinkState] = useState('idle');
  const [linkResult, setLinkResult] = useState(null);
  const [linkError, setLinkError] = useState(null);
  const [linkDebugLogs, setLinkDebugLogs] = useState([]);

  const isAlreadySaved = (id) => savedConfigs.some((c) => c.configurationId === id);

  // ── Shared matcher — branchLink first, UUID fallback ────────────
  const extractAndMatch = async (raw) => {
    const logs = [];
    const log = (msg) => { console.log('[ConfigImport]', msg); logs.push(msg); };

    const normalize = (s) => decodeURIComponent(s.trim().replace(/\/+$/, ''));
    const normalizedInput = normalize(raw);
    log(`RAW INPUT: "${raw}"`);
    log(`NORMALIZED: "${normalizedInput}"`);

    log(`Fetching configurations from proxy…`);
    const data = await fetchConfigurations();
    const list = Array.isArray(data) ? data : [];
    log(`Configurations received: ${list.length}`);

    // ── Step 1: match against appConfigurationLinks[].branchLink ──
    log(`Step 1: searching branchLink in appConfigurationLinks…`);
    const branchMatch = list.find((c) => {
      const links = c.appConfigurationLinks;
      if (!Array.isArray(links)) return false;
      return links.some((l) => {
        const bl = l.branchLink ? normalize(l.branchLink) : null;
        if (bl) log(`  comparing "${normalizedInput}" === "${bl}"`);
        return bl === normalizedInput;
      });
    });

    if (branchMatch) {
      log(`MATCHED via branchLink: "${branchMatch.name}" (${branchMatch.configurationId})`);
      return { ...branchMatch, _debugLogs: logs };
    }
    log(`No branchLink match found.`);

    // ── Step 2: fallback — UUID extraction ────────────────────────
    log(`Step 2: trying UUID extraction from input…`);
    const uuidMatch = normalizedInput.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    log(`UUID regex match: ${uuidMatch ? `"${uuidMatch[0]}"` : 'NO MATCH'}`);

    if (!uuidMatch) {
      const ids = list.map((c) => `"${c.configurationId}"`).join(', ');
      log(`No UUID in input. Available IDs for reference: [${ids || 'none'}]`);
      throw Object.assign(
        new Error('No matching configuration found. The link did not match any known configuration.'),
        { debugLogs: logs }
      );
    }

    const uuid = uuidMatch[0];
    log(`Matching UUID "${uuid}" against configurationId…`);
    const uuidCfgMatch = list.find((c) => c.configurationId === uuid);

    if (!uuidCfgMatch) {
      const ids = list.map((c) => `"${c.configurationId}"`).join(', ');
      log(`NO MATCH. Available IDs: [${ids || 'none'}]`);
      throw Object.assign(
        new Error(`No configuration matched identifier "${uuid}"`),
        { debugLogs: logs }
      );
    }

    log(`MATCHED via UUID: "${uuidCfgMatch.name}" (${uuidCfgMatch.configurationId})`);
    return { ...uuidCfgMatch, _debugLogs: logs };
  };

  // ── QR tab handlers ──────────────────────────────────────────────
  const handleQrScan = async (value) => {
    setQrState('loading');
    setQrError(null);
    setQrDebugLogs([]);
    try {
      const match = await extractAndMatch(value);
      setQrDebugLogs(match._debugLogs || []);
      setQrResult(match);
      setQrState('result');
    } catch (e) {
      setQrDebugLogs(e.debugLogs || []);
      setQrError(e.message);
      setQrState('error');
    }
  };

  const resetQr = () => {
    setQrState('scanning');
    setQrResult(null);
    setQrError(null);
    setQrKey((k) => k + 1);
  };

  // ── Link tab handlers ────────────────────────────────────────────
  const handleLinkImport = async () => {
    setLinkState('loading');
    setLinkError(null);
    setLinkResult(null);
    setLinkDebugLogs([]);
    try {
      const match = await extractAndMatch(linkInput);
      setLinkDebugLogs(match._debugLogs || []);
      setLinkResult(match);
      setLinkState('result');
    } catch (e) {
      setLinkDebugLogs(e.debugLogs || []);
      setLinkError(e.message);
      setLinkState('idle');
    }
  };

  const resetLink = () => {
    setLinkInput('');
    setLinkResult(null);
    setLinkError(null);
    setLinkDebugLogs([]);
    setLinkState('idle');
  };

  // ── Load All tab handler ─────────────────────────────────────────
  const handleLoad = async () => {
    setLoadLoading(true);
    setLoadError(null);
    try {
      const data = await fetchConfigurations();
      setRemoteConfigs(Array.isArray(data) ? data : []);
      if (!Array.isArray(data) || data.length === 0) setLoadError('No configurations found.');
    } catch (e) {
      setLoadError(e.message);
    }
    setLoadLoading(false);
  };

  // ── Add callbacks ────────────────────────────────────────────────
  const handleAdd = (cfg) => onAdd(cfg, false);
  const handleAddAndActivate = (cfg) => onAdd(cfg, true);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="bg-slate-900 border-slate-700 text-white rounded-t-2xl max-h-[90vh] overflow-y-auto"
      >
        <SheetHeader className="mb-4">
          <SheetTitle className="text-white">Add Scanner Account</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="qr">
          <TabsList className="bg-slate-800 w-full">
            <TabsTrigger value="qr" className="flex-1 data-[state=active]:bg-slate-700 text-slate-300 text-xs">
              Scan QR
            </TabsTrigger>
            <TabsTrigger value="link" className="flex-1 data-[state=active]:bg-slate-700 text-slate-300 text-xs">
              Paste Link
            </TabsTrigger>
          </TabsList>

          {/* ── Scan QR tab ── */}
          <TabsContent value="qr" className="mt-4 space-y-3 pb-4">
            {qrState === 'scanning' && (
              <>
                <p className="text-slate-400 text-sm text-center">
                  Point the camera at an account QR code.
                </p>
                <QRScanner key={qrKey} onScan={handleQrScan} />
              </>
            )}

            {qrState === 'loading' && (
              <div className="flex flex-col items-center gap-3 py-10">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                <p className="text-slate-400 text-sm">Matching configuration…</p>
              </div>
            )}

            {qrState === 'error' && (
              <>
                <div className="flex gap-2 text-amber-400 text-sm bg-amber-950/40 border border-amber-800 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{qrError}</p>
                </div>
                {qrDebugLogs.length > 0 && <DebugLog logs={qrDebugLogs} />}
                <Button
                  variant="outline"
                  onClick={resetQr}
                  className="w-full border-slate-700 text-slate-300 gap-2"
                >
                  <ScanLine className="w-4 h-4" /> Scan Again
                </Button>
              </>
            )}

            {qrState === 'result' && qrResult && (
              <>
                <MatchResult
                  cfg={qrResult}
                  isSaved={isAlreadySaved(qrResult.configurationId)}
                  onAdd={handleAdd}
                  onAddAndActivate={handleAddAndActivate}
                />
                <Button
                  variant="outline"
                  onClick={resetQr}
                  className="w-full border-slate-700 text-slate-300 gap-2"
                >
                  <ScanLine className="w-4 h-4" /> Scan Another
                </Button>
              </>
            )}
          </TabsContent>

          {/* ── Paste Link tab ── */}
          <TabsContent value="link" className="mt-4 space-y-3 pb-4">
            {linkState !== 'result' ? (
              <>
                <p className="text-slate-400 text-sm">
                  Paste an account link. The identifier will be extracted and matched automatically.
                </p>
                <Input
                  value={linkInput}
                  onChange={(e) => {
                    setLinkInput(e.target.value);
                    setLinkError(null);
                  }}
                  placeholder="https://... or paste an account link"
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
                <Button
                  onClick={handleLinkImport}
                  disabled={!linkInput.trim() || linkState === 'loading'}
                  className="w-full gap-2"
                >
                  {linkState === 'loading' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4" />
                  )}
                  {linkState === 'loading' ? 'Matching…' : 'Import'}
                </Button>
                {linkError && (
                  <div className="flex gap-2 text-amber-400 text-sm bg-amber-950/40 border border-amber-800 rounded-xl p-3">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{linkError}</p>
                  </div>
                )}
                {linkDebugLogs.length > 0 && <DebugLog logs={linkDebugLogs} />}
              </>
            ) : (
              <>
                <MatchResult
                  cfg={linkResult}
                  isSaved={isAlreadySaved(linkResult.configurationId)}
                  onAdd={handleAdd}
                  onAddAndActivate={handleAddAndActivate}
                />
                <Button
                  variant="outline"
                  onClick={resetLink}
                  className="w-full border-slate-700 text-slate-300 gap-2"
                >
                  <Link2 className="w-4 h-4" /> Paste Another Link
                </Button>
              </>
            )}
          </TabsContent>

          {/* ── Load All tab ── */}
          <TabsContent value="load" className="mt-4 space-y-3">
            <Button
              onClick={handleLoad}
              disabled={loadLoading}
              variant="outline"
              className="w-full border-slate-700 text-slate-300 hover:text-white gap-2"
            >
              {loadLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {loadLoading ? 'Fetching…' : 'Fetch Configurations'}
            </Button>

            {loadError && (
              <div className="flex gap-2 text-amber-400 text-sm bg-amber-950/40 border border-amber-800 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{loadError}</p>
              </div>
            )}

            <div className="space-y-2 pb-4">
              {remoteConfigs.map((cfg) => {
                const saved = isAlreadySaved(cfg.configurationId);
                return (
                  <div
                    key={cfg.configurationId}
                    className="bg-slate-800 border border-slate-700 rounded-xl p-3 space-y-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-white">{cfg.name}</p>
                      <p className="text-xs font-mono text-slate-400 truncate">
                        {cfg.configurationId}
                      </p>
                      {cfg.passTemplateName && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Template: {cfg.passTemplateName}
                        </p>
                      )}
                    </div>
                    {saved ? (
                      <span className="text-emerald-400 text-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                      </span>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAdd(cfg)}
                          className="flex-1 border-slate-600 text-slate-300 hover:text-white text-xs"
                        >
                          Add
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAddAndActivate(cfg)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs"
                        >
                          Add &amp; Set Active
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}