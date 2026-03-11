import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DollarSign, Zap, Loader2 } from 'lucide-react';

export default function PointsConfirmation({
  passIdentifier,
  configName,
  rewardPercent,
  currentPoints,
  onConfirm,
  onCancel,
  loading,
}) {
  const [amount, setAmount] = useState('');
  const [pointsPreview, setPointsPreview] = useState(0);

  const handleAmountChange = (value) => {
    setAmount(value);
    if (value) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        const earned = Math.round(num * rewardPercent * 100);
        setPointsPreview(earned);
      } else {
        setPointsPreview(0);
      }
    } else {
      setPointsPreview(0);
    }
  };

  const canConfirm = amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0;
  const newBalance = currentPoints + pointsPreview;

  return (
    <div className="w-full max-w-sm space-y-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-white font-bold text-lg">Points Loyalty</h2>
        <p className="text-slate-400 text-sm">{configName}</p>
        <p className="text-amber-400 text-xs font-semibold">Enter purchase amount to calculate &amp; apply points</p>
      </div>

      {/* Pass ID */}
      <div className="bg-slate-800 rounded-lg p-3">
        <p className="text-slate-500 text-xs mb-1">Pass ID</p>
        <p className="text-white font-mono text-sm truncate">{passIdentifier}</p>
      </div>

      {/* Amount Input */}
      <div className="space-y-2">
        <label className="text-slate-300 text-xs font-semibold">Amount Spent (CAD)</label>
        <div className="flex gap-2">
          <DollarSign className="w-5 h-5 text-slate-500 mt-2.5" />
          <Input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0.00"
            disabled={loading}
            autoFocus
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Points Preview */}
      {amount && (
        <div className="bg-blue-950/40 border border-blue-800 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">Current Balance</span>
            <span className="text-white font-mono">{currentPoints.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm border-t border-blue-800 pt-2">
            <span className="text-blue-300 font-semibold flex items-center gap-1">
              <Zap className="w-4 h-4" /> Earned
            </span>
            <span className="text-blue-300 font-semibold font-mono">{pointsPreview.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm border-t border-blue-800 pt-2">
            <span className="text-emerald-300 font-semibold">New Balance</span>
            <span className="text-emerald-300 font-semibold font-mono">{newBalance.toLocaleString()}</span>
          </div>
          <p className="text-slate-500 text-xs mt-2">
            {amount} × {(rewardPercent * 100).toFixed(0)}% × 100 = {pointsPreview.toLocaleString()} pts
          </p>
        </div>
      )}

      {/* Current Balance Display */}
      {!amount && (
        <div className="bg-slate-800 rounded-lg p-3">
          <p className="text-slate-500 text-xs mb-1">Current Points Balance</p>
          <p className="text-emerald-300 text-2xl font-bold font-mono">{currentPoints.toLocaleString()}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={() => onConfirm(parseFloat(amount))}
          disabled={!canConfirm || loading}
          className="flex-1 gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {loading ? 'Updating...' : 'Confirm & Update'}
        </Button>
      </div>
    </div>
  );
}