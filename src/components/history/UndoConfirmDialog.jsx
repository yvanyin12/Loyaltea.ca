import { Button } from '@/components/ui/button';
import { RotateCcw, Loader2 } from 'lucide-react';

export default function UndoConfirmDialog({ scan, onConfirm, onCancel, loading }) {
  if (!scan) return null;

  const mode = scan.loyaltyMode || (scan.pointsEarned != null ? 'points' : 'stamps');
  const isPoints = mode === 'points';
  const isPrepaid = mode === 'prepaid';
  const isOneTime = mode === 'one_time';

  const modeLabel = { points: 'Points', stamps: 'Stamps', prepaid: 'Prepaid', one_time: 'One-time' }[mode] || mode;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 pb-24">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 space-y-4 max-h-[80vh] overflow-y-auto">

        <div className="flex items-center gap-3">
          <div className="bg-amber-500/20 rounded-full p-2 flex-shrink-0">
            <RotateCcw className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Undo Transaction?</h3>
            <p className="text-slate-400 text-xs mt-0.5">
              {isOneTime ? 'This will reactivate the pass so it can be used again.' : 'This will reverse the loyalty transaction.'}
            </p>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-3 space-y-2 text-xs">
          {scan.holderName && (
            <div className="flex justify-between">
              <span className="text-slate-400">Customer</span>
              <span className="text-white font-medium">{scan.holderName}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-400">Loyalty mode</span>
            <span className="text-white">{modeLabel}</span>
          </div>
          {scan.amountSpent != null && scan.amountSpent > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-400">Original amount</span>
              <span className="text-white">CAD ${Number(scan.amountSpent).toFixed(2)}</span>
            </div>
          )}
          {isPoints && scan.pointsEarned != null && (
            <div className="flex justify-between">
              <span className="text-slate-400">Points to reverse</span>
              <span className="text-red-400 font-semibold">
                −{scan.pointsEarned.toLocaleString()} pts
              </span>
            </div>
          )}
          {isPoints && scan.previousPointsBalance != null && (
            <div className="flex justify-between">
              <span className="text-slate-400">Balance will revert to</span>
              <span className="text-amber-400 font-semibold">
                {scan.previousPointsBalance.toLocaleString()} pts
              </span>
            </div>
          )}
          {isPrepaid && (
            <div className="flex justify-between">
              <span className="text-slate-400">Action</span>
              <span className="text-amber-400">+1 added back to balance</span>
            </div>
          )}
          {isPrepaid && scan.previousPointsBalance != null && (
            <div className="flex justify-between">
              <span className="text-slate-400">Balance will revert to</span>
              <span className="text-amber-400 font-semibold">{scan.previousPointsBalance}</span>
            </div>
          )}
          {isOneTime && (
            <div className="flex justify-between">
              <span className="text-slate-400">Action</span>
              <span className="text-amber-400">Reactivate pass</span>
            </div>
          )}
          {!isPoints && !isPrepaid && !isOneTime && (
            <div className="flex justify-between">
              <span className="text-slate-400">Action</span>
              <span className="text-amber-400">Remove 1 stamp</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 border-slate-700 text-slate-300 hover:text-white"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Confirm Undo'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}