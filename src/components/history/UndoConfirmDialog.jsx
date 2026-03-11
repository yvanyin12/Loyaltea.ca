import { Button } from '@/components/ui/button';
import { RotateCcw, Loader2 } from 'lucide-react';

export default function UndoConfirmDialog({ scan, onConfirm, onCancel, loading }) {
  if (!scan) return null;

  const mode = scan.loyaltyMode || (scan.pointsEarned != null ? 'points' : 'stamps');
  const isPoints = mode === 'points';

  const handleConfirmClick = () => {
    const tapTime = performance.now();
    console.log(`\n========== UNDO DEBUG LOG START ==========`);
    console.log(`[Phone] TAP: Confirm Undo button tapped at ${tapTime.toFixed(0)}ms`);
    console.log(`[Phone] TAP: Scan ID: ${scan.id.substring(0, 8)}...`);
    console.log(`[Phone] TAP: Pass ID: ${scan.passIdentifier}`);
    console.log(`[Phone] TAP: Loyalty mode: ${mode}`);
    if (isPoints) {
      console.log(`[Phone] TAP: Current points before undo: ${scan.newPointsBalance}`);
      console.log(`[Phone] TAP: Will revert to: ${scan.previousPointsBalance}`);
    } else {
      console.log(`[Phone] TAP: Current stamps before undo: (will fetch)`);
    }
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 space-y-4">

        <div className="flex items-center gap-3">
          <div className="bg-amber-500/20 rounded-full p-2 flex-shrink-0">
            <RotateCcw className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Undo Transaction?</h3>
            <p className="text-slate-400 text-xs mt-0.5">
              This will reverse the loyalty transaction.
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
            <span className="text-white capitalize">{mode}</span>
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
          {!isPoints && (
            <div className="flex justify-between">
              <span className="text-slate-400">Action</span>
              <span className="text-amber-400">Remove 1 stamp</span>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 rounded-lg">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
            <span className="text-sm text-slate-300">Updating pass…</span>
          </div>
        )}

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