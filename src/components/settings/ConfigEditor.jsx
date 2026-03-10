import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, Check } from 'lucide-react';

export default function ConfigEditor({ config, onUpdate, onClose }) {
  const [rewardPercent, setRewardPercent] = useState(config.rewardPercent ?? 0.10);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const updated = { ...config, rewardPercent: parseFloat(rewardPercent) || 0.10 };
    onUpdate(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const presets = [
    { label: '5%', value: 0.05 },
    { label: '10%', value: 0.10 },
    { label: '15%', value: 0.15 },
    { label: '20%', value: 0.20 },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
        <div>
          <h3 className="font-semibold text-white text-lg">{config.name}</h3>
          <p className="text-slate-400 text-xs mt-1 font-mono">{config.configurationId}</p>
        </div>

        <div className="space-y-3 border-t border-slate-800 pt-4">
          <div>
            <Label className="text-slate-300 text-sm font-medium">Reward Percentage</Label>
            <p className="text-slate-500 text-xs mt-0.5">
              Points earned = amount spent × reward% × 1000
            </p>
          </div>

          {/* Presets */}
          <div className="flex gap-2 flex-wrap">
            {presets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setRewardPercent(preset.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  parseFloat(rewardPercent) === preset.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom input */}
          <div>
            <Label className="text-slate-400 text-xs">Custom value (decimal)</Label>
            <Input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={rewardPercent}
              onChange={(e) => setRewardPercent(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white mt-1"
              placeholder="0.10"
            />
          </div>

          {/* Example calculation */}
          <div className="bg-slate-800/50 rounded-lg p-3 text-xs space-y-1">
            <p className="text-slate-400">
              Example: $10 spent × {(parseFloat(rewardPercent) || 0.10).toFixed(2)} × 1000 ={' '}
              <span className="text-blue-400 font-semibold">
                {Math.round((parseFloat(rewardPercent) || 0.10) * 10 * 1000).toLocaleString()} pts
              </span>
            </p>
          </div>
        </div>

        <div className="flex gap-2 border-t border-slate-800 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 gap-2"
          >
            {saved ? <Check className="w-4 h-4" /> : 'Save'}
          </Button>
        </div>
        {saved && <p className="text-emerald-400 text-xs text-center">Settings saved!</p>}
      </div>
    </div>
  );
}