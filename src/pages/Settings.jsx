import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  getSavedConfigs,
  addSavedConfig,
  removeSavedConfig,
  setActiveConfig,
  updateSavedConfig,
} from '../components/api/passcreatorApi';
import ConfigList from '../components/settings/ConfigList';
import AddConfigSheet from '../components/settings/AddConfigSheet';
import ConfigEditor from '../components/settings/ConfigEditor';
import UserManagement from './UserManagement';

export default function Settings() {
  const [configs, setConfigs] = useState(getSavedConfigs());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    base44.auth.me().then((user) => setIsOwner(user?.role === 'owner'));
  }, []);

  const refresh = () => setConfigs(getSavedConfigs());

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
          <p className="text-slate-400 text-sm mt-1">Manage your scanner accounts</p>
        </div>

        {/* ── Configurations ── */}
        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">Scanner Configurations</h2>
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

        {/* ── User Management ── */}
        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-4">
          <div>
            <h2 className="font-semibold text-white">User Management</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Promote or remove admin access for registered users.
            </p>
          </div>
          <UserManagement />
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