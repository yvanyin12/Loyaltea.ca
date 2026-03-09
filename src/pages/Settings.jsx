import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, AlertCircle, Loader2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import {
  getApiKey, setApiKey,
  getProxyUrl, setProxyUrl,
  getSelectedConfig, setSelectedConfig,
  fetchConfigurations,
} from '../components/api/passcreatorApi';

export default function Settings() {
  const [apiKey, setApiKeyState] = useState(getApiKey());
  const [proxyUrl, setProxyUrlState] = useState(getProxyUrl());
  const [showKey, setShowKey] = useState(false);
  const [configs, setConfigs] = useState([]);
  const [selectedConfig, setSelectedConfigState] = useState(getSelectedConfig());
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [configError, setConfigError] = useState(null);
  const [saved, setSaved] = useState(false);

  const handleSaveKey = () => {
    setApiKey(apiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLoadConfigs = async () => {
    if (!apiKey.trim()) return;
    setLoadingConfigs(true);
    setConfigError(null);
    try {
      const data = await fetchConfigurations(apiKey.trim());
      setConfigs(Array.isArray(data) ? data : []);
      if (!Array.isArray(data) || data.length === 0) {
        setConfigError('No App Configurations found for this account.');
      }
    } catch (err) {
      let msg = err.message;
      if (msg.includes('Failed to fetch') || msg.toLowerCase().includes('cors')) {
        msg = 'Network error — CORS may be blocking the request. Ensure your API key is valid and your browser allows this connection.';
      }
      setConfigError(msg);
    }
    setLoadingConfigs(false);
  };

  const handleSelectConfig = (config) => {
    setSelectedConfigState(config);
    setSelectedConfig(config);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-lg mx-auto px-5 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-slate-400 text-sm mt-1">Configure your Passcreator integration</p>
        </div>

        {/* API Key */}
        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-4">
          <h2 className="font-semibold text-white">API Key</h2>
          <div className="space-y-2">
            <Label className="text-slate-400 text-xs">Passcreator API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKeyState(e.target.value)}
                  placeholder="Enter your API key..."
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 pr-10"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button onClick={handleSaveKey} disabled={!apiKey.trim()}>
                {saved ? <CheckCircle2 className="w-4 h-4" /> : 'Save'}
              </Button>
            </div>
            {saved && <p className="text-emerald-400 text-xs">API key saved!</p>}
            <p className="text-slate-500 text-xs">
              Find your API key in your Passcreator account under Account Settings → API.
            </p>
          </div>
        </div>

        {/* App Configuration */}
        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">App Configuration</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadConfigs}
              disabled={!apiKey.trim() || loadingConfigs}
              className="border-slate-700 text-slate-300 hover:text-white gap-2"
            >
              {loadingConfigs ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              {configs.length > 0 ? 'Refresh' : 'Load'}
            </Button>
          </div>

          {configError && (
            <div className="flex gap-2 text-amber-400 text-sm bg-amber-950/40 border border-amber-800 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{configError}</p>
            </div>
          )}

          {selectedConfig && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-950/30 border border-emerald-800 rounded-xl p-3">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <div>
                <p className="font-medium">{selectedConfig.name}</p>
                <p className="text-emerald-600 text-xs font-mono">{selectedConfig.configurationId}</p>
              </div>
            </div>
          )}

          {configs.length > 0 && (
            <div className="space-y-2">
              <Label className="text-slate-400 text-xs">Select Configuration</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {configs.map((cfg) => {
                  const isSelected = selectedConfig?.configurationId === cfg.configurationId;
                  return (
                    <button
                      key={cfg.configurationId}
                      onClick={() => handleSelectConfig(cfg)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-blue-950 border-blue-600 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <p className="font-medium text-sm">{cfg.name}</p>
                      <p className="text-xs mt-0.5 opacity-60 font-mono">{cfg.configurationId}</p>
                      {cfg.passTemplateName && (
                        <p className="text-xs mt-0.5 opacity-50">Template: {cfg.passTemplateName}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {configs.length === 0 && !configError && (
            <p className="text-slate-500 text-sm text-center py-4">
              Click "Load" to fetch your App Configurations from Passcreator.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}