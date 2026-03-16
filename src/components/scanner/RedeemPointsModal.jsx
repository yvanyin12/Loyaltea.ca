import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Gift, Minus, Loader2, ChevronLeft, AlertCircle } from 'lucide-react';

const PRESET_REWARDS = [
  { label: 'Free Drink', points: 100 },
  { label: '$5 Off', points: 500 },
  { label: '$10 Off', points: 1000 },
  { label: '$25 Off', points: 2500 },
];

// Step 1: Enter points to spend
// Step 2: Confirm before submitting
export default function RedeemPointsModal({ passIdentifier, configName, currentPoints, onConfirm, onCancel, loading }) {
  const [step, setStep] = useState('input'); // 'input' | 'confirm'
  const [pointsToSpend, setPointsToSpend] = useState('');
  const [note, setNote] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(null);

  const pts = parseInt(pointsToSpend, 10);
  const isValidPoints = !isNaN(pts) && pts > 0 && pts <= currentPoints;
  const newBalance = isValidPoints ? currentPoints - pts : currentPoints;
  const overLimit = !isNaN(pts) && pts > 0 && pts > currentPoints;

  const handlePresetClick = (preset) => {
    setSelectedPreset(preset.label);
    setPointsToSpend(String(preset.points));
    if (!note) setNote(preset.label);
  };

  const handlePointsChange = (val) => {
    setPointsToSpend(val);
    setSelectedPreset(null);
  };

  if (step === 'confirm') {
    return (
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-white font-bold text-lg">Confirm Redemption</h2>
          <p className="text-slate-400 text-sm">{configName}</p>
        </div>

        <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">Current Balance</span>
            <span className="text-white font-mono font-semibold">{currentPoints.toLocaleString()} pts</span>
          </div>
          <div className="flex items-center justify-between text-sm border-t border-red-800 pt-3">
            <span className="text-red-300 font-semibold flex items-center gap-1">
              <Minus className="w-4 h-4" /> Points to Spend
            </span>
            <span className="text-red-300 font-mono font-semibold text-lg">−{pts.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm border-t border-red-800 pt-3">
            <span className="text-emerald-300 font-semibold">New Balance</span>
            <span className="text-emerald-300 font-mono font-semibold text-lg">{newBalance.toLocaleString()} pts</span>
          </div>
          {note && (
            <div className="border-t border-red-800 pt-3">
              <p className="text-slate-500 text-xs">Reason</p>
              <p className="text-slate-300 text-sm font-medium mt-0.5">{note}</p>
            </div>
          )}
        </div>

        <p className="text-amber-400 text-xs text-center font-medium">
          ⚠ This will subtract {pts.toLocaleString()} points from the customer's balance.
        </p>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={() => setStep('input')} disabled={loading} className="flex-1 gap-1.5">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          <Button
            onClick={() => onConfirm({ pointsToSpend: pts, note, newBalance })}
            disabled={loading}
            className="flex-1 gap-2 bg-red-600 hover:bg-red-500 text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
            {loading ? 'Redeeming...' : 'Redeem Points'}
          </Button>
        </div>

        <Button variant="ghost" onClick={onCancel} disabled={loading} className="w-full text-slate-500 hover:text-slate-300 text-sm">
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-white font-bold text-lg flex items-center justify-center gap-2">
          <Gift className="w-5 h-5 text-red-400" /> Spend Points
        </h2>
        <p className="text-slate-400 text-sm">{configName}</p>
      </div>

      {/* Current balance */}
      <div className="bg-slate-800 rounded-xl p-3 text-center">
        <p className="text-slate-500 text-xs mb-1">Current Balance</p>
        <p className="text-emerald-300 text-3xl font-bold font-mono">{currentPoints.toLocaleString()}</p>
        <p className="text-slate-500 text-xs">points</p>
      </div>

      {/* Preset rewards */}
      <div className="space-y-2">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Quick Rewards</p>
        <div className="grid grid-cols-2 gap-2">
          {PRESET_REWARDS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handlePresetClick(preset)}
              disabled={preset.points > currentPoints}
              className={`rounded-lg px-3 py-2.5 text-left transition-all border ${
                selectedPreset === preset.label
                  ? 'bg-red-600/30 border-red-500 text-white'
                  : preset.points > currentPoints
                  ? 'bg-slate-800/40 border-slate-700/40 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-red-600/60 hover:text-white'
              }`}
            >
              <p className="text-sm font-semibold">{preset.label}</p>
              <p className="text-xs opacity-70">{preset.points.toLocaleString()} pts</p>
            </button>
          ))}
        </div>
      </div>

      {/* Custom amount */}
      <div className="space-y-1.5">
        <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Custom Points</label>
        <Input
          type="number"
          min="1"
          max={currentPoints}
          value={pointsToSpend}
          onChange={(e) => handlePointsChange(e.target.value)}
          placeholder="Enter points to spend"
          className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
        />
        {overLimit && (
          <p className="text-red-400 text-xs flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Cannot exceed current balance of {currentPoints.toLocaleString()} pts
          </p>
        )}
        {isValidPoints && (
          <p className="text-emerald-400 text-xs">
            New balance after redemption: <span className="font-semibold font-mono">{newBalance.toLocaleString()} pts</span>
          </p>
        )}
      </div>

      {/* Note field */}
      <div className="space-y-1.5">
        <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Reason / Note <span className="text-slate-600 normal-case font-normal">(optional)</span></label>
        <Input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Free drink, $10 off"
          className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button
          onClick={() => setStep('confirm')}
          disabled={!isValidPoints}
          className="flex-1 gap-2 bg-red-600 hover:bg-red-500 text-white"
        >
          <Gift className="w-4 h-4" /> Review
        </Button>
      </div>
    </div>
  );
}