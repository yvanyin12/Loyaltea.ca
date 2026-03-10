import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle2, Link2, Loader2, RefreshCw, ScanLine } from 'lucide-react';
import { fetchConfigurations } from '../api/passcreatorApi';
import QRScanner from '../scanner/QRScanner';

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

  // Link tab — states: 'idle' | 'loading' | 'result'
  const [linkInput, setLinkInput] = useState('');
  const [linkState, setLinkState] = useState('idle');
  const [linkResult, setLinkResult] = useState(null);
  const [linkError, setLinkError] = useState(null);

  const isAlreadySaved = (id) => savedConfigs.some((c) => c.configurationId === id);

  // ── Shared UUID extractor + matcher ─────────────────────────────
  const extractAndMatch = async (raw) => {
    const uuidMatch = raw.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
    );
    if (!uuidMatch) throw new Error('No valid configuration identifier found.');
    const uuid = uuidMatch[0];
    const data = await fetchConfigurations();
    const match = Array.isArray(data) ? data.find((c) => c.configurationId === uuid) : null;
    if (!match) throw new Error(`No configuration matched the identifier: ${uuid}`);
    return match;
  };

  // ── QR tab handlers ──────────────────────────────────────────────
  const handleQrScan = async (value) => {
    setQrState('loading');
    setQrError(null);
    try {
      const match = await extractAndMatch(value);
      setQrResult(match);
      setQrState('result');
    } catch (e) {
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
    try {
      const match = await extractAndMatch(linkInput);
      setLinkResult(match);
      setLinkState('result');
    } catch (e) {
      setLinkError(e.message);
      setLinkState('idle');
    }
  };

  const resetLink = () => {
    setLinkInput('');
    setLinkResult(null);
    setLinkError(null);
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
          <SheetTitle className="text-white">Add Configuration</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="qr">
          <TabsList className="bg-slate-800 w-full">
            <TabsTrigger value="qr" className="flex-1 data-[state=active]:bg-slate-700 text-slate-300 text-xs">
              Scan QR
            </TabsTrigger>
            <TabsTrigger value="link" className="flex-1 data-[state=active]:bg-slate-700 text-slate-300 text-xs">
              Paste Link
            </TabsTrigger>
            <TabsTrigger value="load" className="flex-1 data-[state=active]:bg-slate-700 text-slate-300 text-xs">
              Load All
            </TabsTrigger>
          </TabsList>

          {/* ── Scan QR tab ── */}
          <TabsContent value="qr" className="mt-4 space-y-3 pb-4">
            {qrState === 'scanning' && (
              <>
                <p className="text-slate-400 text-sm text-center">
                  Point the camera at a configuration QR code.
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
                  Paste a configuration link. The identifier will be extracted and matched automatically.
                </p>
                <Input
                  value={linkInput}
                  onChange={(e) => {
                    setLinkInput(e.target.value);
                    setLinkError(null);
                  }}
                  placeholder="https://... or paste a configuration link"
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