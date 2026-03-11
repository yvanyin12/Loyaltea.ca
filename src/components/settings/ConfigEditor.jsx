import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';

function inferLoyaltyType(config) {
  if (config.loyaltyType) return config.loyaltyType.toLowerCase();
  const name = (config.name || '').toLowerCase();
  if (name.includes('stamp')) return 'stamps';
  if (name.includes('point') || name.includes('loyalty')) return 'points';
  return 'points';
}

export default function ConfigEditor({ config, onUpdate, onClose }) {
  // Loyalty type is locked — determined once from saved config or name inference
  const loyaltyType = inferLoyaltyType(config);
  // null = nothing selected yet (forces user to pick for points mode)
  const [rewardPercent, setRewardPercent] = useState(
    config.rewardPercent != null ? config.rewardPercent : null
  );
  const [saved, setSaved] = useState(false);
  const [validationError, setValidationError] = useState('');
  const isStamps = loyaltyType === 'stamps';

  const presets = [
    { label: '5%', value: 0.05 },
    { label: '10%', value: 0.10 },
    { label: '15%', value: 0.15 },
    { label: '20%', value: 0.20 },
  ];

  const handleSave = () => {
    if (!isStamps) {
      const parsed = parseFloat(rewardPercent);
      if (rewardPercent === null || rewardPercent === '' || isNaN(parsed) || parsed <= 0) {
        setValidationError('Please select or enter a reward percentage before saving.');
        return;
      }
    }
    setValidationError('');
    const updated = {
      ...config,
      loyaltyType,
      rewardPercent: loyaltyType === 'points' ? parseFloat(rewardPercent) : undefined,
    };
    onUpdate(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLoyaltyTypeChange = (type) => {
    setLoyaltyType(type);
    setValidationError('');
    // Reset selection when switching to points so user must pick
    if (type === 'points') setRewardPercent(null);
  };

  const parsedReward = rewardPercent !== null ? parseFloat(rewardPercent) : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
        <div>
          <h3 className="font-semibold text-white text-lg">{config.name}</h3>
          <p className="text-slate-400 text-xs mt-1 font-mono">{config.configurationId}</p>
        </div>

        {/* Loyalty Type */}
        <div className="space-y-2 border-t border-slate-800 pt-4">
          <Label className="text-slate-300 text-sm font-medium">Loyalty Type</Label>
          <p className="text-slate-500 text-xs">Select whether this configuration uses Points or Stamps.</p>
          <div className="flex gap-2">
            {['points', 'stamps'].map((type) => (
              <button
                key={type}
                onClick={() => handleLoyaltyTypeChange(type)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                  loyaltyType === type
                    ? type === 'points' ? 'bg-blue-600 text-white' : 'bg-amber-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Reward % — only shown for points */}
        {loyaltyType === 'points' && (
          <div className="space-y-3 border-t border-slate-800 pt-4">
            <div>
              <Label className="text-slate-300 text-sm font-medium">
                Reward Percentage <span className="text-red-400">*</span>
              </Label>
              <p className="text-slate-500 text-xs mt-0.5">
                Points earned = amount spent × reward% × 100
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              {presets.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setRewardPercent(preset.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    parsedReward === preset.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div>
              <Label className="text-slate-400 text-xs">Custom value (decimal)</Label>
              <Input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={rewardPercent ?? ''}
                onChange={(e) => setRewardPercent(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white mt-1"
                placeholder="e.g. 0.10 for 10%"
              />
            </div>

            {parsedReward !== null && !isNaN(parsedReward) && parsedReward > 0 && (
              <div className="bg-slate-800/50 rounded-lg p-3 text-xs">
                <p className="text-slate-400">
                  Example: $10 × {parsedReward.toFixed(2)} × 100 ={' '}
                  <span className="text-blue-400 font-semibold">
                    {Math.round(parsedReward * 10 * 100).toLocaleString()} pts
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        {validationError && (
          <p className="text-red-400 text-xs">{validationError}</p>
        )}

        <div className="flex gap-2 border-t border-slate-800 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} className="flex-1 gap-2">
            {saved ? <Check className="w-4 h-4" /> : 'Save'}
          </Button>
        </div>
        {saved && <p className="text-emerald-400 text-xs text-center">Settings saved!</p>}
      </div>
    </div>
  );
}