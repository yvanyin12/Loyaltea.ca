import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle2, Link2, Loader2, RefreshCw } from 'lucide-react';
import { fetchConfigurations } from '../api/passcreatorApi';

export default function AddConfigSheet({ open, onClose, onAdd, savedConfigs }) {
  const [remoteConfigs, setRemoteConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [linkInput, setLinkInput] = useState('');
  const [linkResult, setLinkResult] = useState(null);
  const [linkError, setLinkError] = useState(null);
  const [linkLoading, setLinkLoading] = useState(false);

  const handleLoad = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchConfigurations();
      setRemoteConfigs(Array.isArray(data) ? data : []);
      if (!Array.isArray(data) || data.length === 0) setError('No configurations found.');
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const isAlreadySaved = (configurationId) =>
    savedConfigs.some((c) => c.configurationId === configurationId);

  const handleAdd = (cfg) => {
    onAdd(cfg);
  };

  const handleLinkImport = async () => {
    setLinkError(null);
    setLinkResult(null);
    const uuidMatch = linkInput.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
    );
    if (!uuidMatch) {
      setLinkError('No valid configuration UUID found in the pasted text.');
      return;
    }
    const uuid = uuidMatch[0];
    setLinkLoading(true);
    try {
      const data = await fetchConfigurations();
      const match = Array.isArray(data)
        ? data.find((c) => c.configurationId === uuid)
        : null;
      if (match) {
        setLinkResult(match);
      } else {
        setLinkError(
          `UUID ${uuid} was found in the link but didn't match any saved configuration.`
        );
      }
    } catch (e) {
      setLinkError(e.message);
    }
    setLinkLoading(false);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="bg-slate-900 border-slate-700 text-white rounded-t-2xl max-h-[90vh] overflow-y-auto"
      >
        <SheetHeader className="mb-4">
          <SheetTitle className="text-white">Add Configuration</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="load">
          <TabsList className="bg-slate-800 w-full">
            <TabsTrigger value="load" className="flex-1 data-[state=active]:bg-slate-700 text-slate-300">
              Load Configurations
            </TabsTrigger>
            <TabsTrigger value="link" className="flex-1 data-[state=active]:bg-slate-700 text-slate-300">
              Import Configuration
            </TabsTrigger>
          </TabsList>

          {/* ── Load tab ── */}
          <TabsContent value="load" className="mt-4 space-y-3">
            <Button
              onClick={handleLoad}
              disabled={loading}
              variant="outline"
              className="w-full border-slate-700 text-slate-300 hover:text-white gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {loading ? 'Fetching…' : 'Fetch Configurations'}
            </Button>

            {error && (
              <div className="flex gap-2 text-amber-400 text-sm bg-amber-950/40 border border-amber-800 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-2 pb-4">
              {remoteConfigs.map((cfg) => {
                const saved = isAlreadySaved(cfg.configurationId);
                return (
                  <div
                    key={cfg.configurationId}
                    className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
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
                      <span className="text-emerald-400 text-xs flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                      </span>
                    ) : (
                      <Button size="sm" onClick={() => handleAdd(cfg)} className="shrink-0">
                        Add
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* ── Link import tab ── */}
          <TabsContent value="link" className="mt-4 space-y-3 pb-4">
            <p className="text-slate-400 text-sm">
              Paste a scanner configuration link or QR URL. The app will extract the
              configuration and match it automatically.
            </p>
            <Input
              value={linkInput}
              onChange={(e) => {
                setLinkInput(e.target.value);
                setLinkResult(null);
                setLinkError(null);
              }}
              placeholder="https://... or paste a configuration link"
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
            <Button
              onClick={handleLinkImport}
              disabled={!linkInput.trim() || linkLoading}
              className="w-full gap-2"
            >
              {linkLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              Import
            </Button>

            {linkError && (
              <div className="flex gap-2 text-amber-400 text-sm bg-amber-950/40 border border-amber-800 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{linkError}</p>
              </div>
            )}

            {linkResult && (
              <div className="bg-emerald-950/30 border border-emerald-800 rounded-xl p-4 space-y-2">
                <p className="text-emerald-400 text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Configuration matched
                </p>
                <p className="text-white font-medium">{linkResult.name}</p>
                <p className="text-xs font-mono text-slate-400">{linkResult.configurationId}</p>
                {linkResult.passTemplateName && (
                  <p className="text-xs text-slate-500">Template: {linkResult.passTemplateName}</p>
                )}
                {isAlreadySaved(linkResult.configurationId) ? (
                  <p className="text-emerald-400 text-xs flex items-center gap-1 mt-2">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Already saved
                  </p>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleAdd(linkResult)}
                    className="w-full mt-2"
                  >
                    Add to Scanner
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}