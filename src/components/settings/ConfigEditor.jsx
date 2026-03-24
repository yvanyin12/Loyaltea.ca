import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';

function inferLoyaltyType(config) {
  if (config.loyaltyType) return config.loyaltyType.toLowerCase();
  const name = (config.name || '').toLowerCase();
  if (name.includes('stamp')) return 'stamps';
  if (name.includes('one-time') || name.includes('one time') || name.includes('onetime') || name.includes('single')) return 'one_time';
  if (name.includes('prepaid')) return 'prepaid';
  if (name.includes('point') || name.includes('loyalty')) return 'points';
  return null; // unknown — user must select
}

const LOYALTY_TYPES = [
  { value: 'stamps', label: 'Stamps', color: 'amber' },
  { value: 'points', label: 'Points', color: 'blue' },
  { value: 'prepaid', label: 'Prepaid', color: 'emerald' },
  { value: 'one_time', label: 'One-Time Use', color: 'purple' },
];

const TYPE_STYLES = {
  stamps: 'bg-amber-600/20 text-amber-400 border-amber-600/40',
  one_time: 'bg-purple-600/20 text-purple-400 border-purple-600/40',
  prepaid: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/40',
  points: 'bg-blue-600/20 text-blue-400 border-blue-600/40',
};

export default function ConfigEditor({ config, onUpdate, onClose }) {
  const [loyaltyType, setLoyaltyType] = useState(inferLoyaltyType(config));
  const [rewardPercent, setRewardPercent] = useState(
    config.rewardPercent != null ? config.rewardPercent : null
  );
  const [saved, setSaved] = useState(false);
  const [validationError, setValidationError] = useState('');
  const isStamps = loyaltyType === 'stamps';
  const isOneTime = loyaltyType === 'one_time';
  const isPrepaid = loyaltyType === 'prepaid';
  const isSimple = isStamps || isOneTime || isPrepaid; // no reward% needed

  const presets = [
    { label: '5%', value: 0.05 },
    { label: '10%', value: 0.10 },
    { label: '15%', value: 0.15 },
    { label: '20%', value: 0.20 },
  ];

  const handleSave = () => {
    if (!loyaltyType) {
      setValidationError('Please select a loyalty type before saving.');
      return;
    }
    if (!isSimple) {
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
      rewardPercent: !isSimple ? parseFloat(rewardPercent) : undefined,
    };
    onUpdate(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const parsedReward = rewardPercent !== null ? parseFloat(rewardPercent) : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
        <div>
          <h3 className="font-semibold text-white text-lg">{config.name}</h3>
          <p className="text-slate-400 text-xs mt-1 font-mono">{config.configurationId}</p>
        </div>

        {/* Loyalty Type — explicitly selectable */}
        <div className="space-y-2 border-t border-slate-800 pt-4">
          <Label className="text-slate-300 text-sm font-medium">Loyalty Type <span className="text-red-400">*</span></Label>
          <p className="text-slate-500 text-xs">Select the correct loyalty system for this configuration.</p>
          <div className="grid grid-cols-2 gap-2">
            {LOYALTY_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setLoyaltyType(t.value)}
                className={`py-2 rounded-lg text-sm font-semibold border transition-all ${
                  loyaltyType === t.value
                    ? TYPE_STYLES[t.value]
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reward % — only shown for points */}
        {!isSimple && (
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
                className={`bg-slate-800 text-white mt-1 ${
                  rewardPercent === null || rewardPercent === '' ? 'border-red-600/60' : 'border-slate-700'
                }`}
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
          <div className="bg-red-950/40 border border-red-700/60 rounded-lg px-3 py-2">
            <p className="text-red-400 text-xs font-medium">{validationError}</p>
          </div>
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