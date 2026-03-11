import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Plus } from 'lucide-react';
import {
  getProxyUrl,
  setProxyUrl,
  getSavedConfigs,
  addSavedConfig,
  removeSavedConfig,
  setActiveConfig,
  updateSavedConfig,
} from '../components/api/passcreatorApi';
import ConfigList from '../components/settings/ConfigList';
import AddConfigSheet from '../components/settings/AddConfigSheet';
import ConfigEditor from '../components/settings/ConfigEditor';

export default function Settings() {
  const [proxyUrl, setProxyUrlState] = useState(getProxyUrl());
  const [configs, setConfigs] = useState(getSavedConfigs());
  const [proxySaved, setProxySaved] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);

  const refresh = () => setConfigs(getSavedConfigs());

  const handleSaveProxy = () => {
    setProxyUrl(proxyUrl.trim());
    setProxySaved(true);
    setTimeout(() => setProxySaved(false), 2000);
  };

  const handleAdd = (cfg, makeActive = false) => {
    addSavedConfig(cfg);
    if (makeActive) setActiveConfig(cfg.configurationId);
    refresh();
  };

  const handleRemove = (id) => {
    removeSavedConfig(id);
    refresh();
  };

  const handleSetActive = (id) => {
    setActiveConfig(id);
    refresh();
  };

  const handleEditConfig = (cfg) => {
    setEditingConfig(cfg);
  };

  const handleUpdateConfig = (updated) => {
    updateSavedConfig(updated); // persists to 'pc_configs' via persistConfigs
    refresh();
    setEditingConfig(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-lg mx-auto px-5 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-slate-400 text-sm mt-1">Configure your scanner integration</p>
        </div>

        {/* ── Proxy URL ── */}
        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-4">
          <h2 className="font-semibold text-white">Proxy Server</h2>
          <div className="space-y-2">
            <Label className="text-slate-400 text-xs">Proxy URL</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={proxyUrl}
                onChange={(e) => setProxyUrlState(e.target.value)}
                placeholder="https://your-worker.workers.dev"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
              <Button onClick={handleSaveProxy} disabled={!proxyUrl.trim()}>
                {proxySaved ? <CheckCircle2 className="w-4 h-4" /> : 'Save'}
              </Button>
            </div>
            {proxySaved && <p className="text-emerald-400 text-xs">Proxy URL saved!</p>}
            <p className="text-slate-500 text-xs">
              The proxy server that forwards scan requests.
              Authorization is handled server-side — no API key needed here.
            </p>
          </div>
        </div>

        {/* ── Configurations ── */}
        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">Configurations</h2>
              <p className="text-slate-500 text-xs mt-0.5">
                Only the Active configuration is used by the scanner.
              </p>
            </div>
            <Button size="sm" onClick={() => setSheetOpen(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>

          <ConfigList
            configs={configs}
            onSetActive={handleSetActive}
            onRemove={handleRemove}
            onEdit={handleEditConfig}
          />
        </div>
      </div>

      <AddConfigSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAdd={handleAdd}
        savedConfigs={configs}
      />

      {editingConfig && (
        <ConfigEditor
          config={editingConfig}
          onUpdate={handleUpdateConfig}
          onClose={() => setEditingConfig(null)}
        />
      )}
    </div>
  );
}