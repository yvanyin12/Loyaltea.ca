import { Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ScanConfirmation({ passData, configName, currentStamps, onConfirm, onCancel, loading }) {
  return (
    <div className="w-full max-w-sm rounded-xl bg-slate-800/80 border border-slate-700 p-5 space-y-4">
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-white font-semibold text-sm">Confirm Scan</h3>
            <p className="text-slate-400 text-xs mt-1">Review details before submitting</p>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-700">
          {passData?.identifier ? (
            <div>
              <p className="text-slate-400 text-xs">Pass ID</p>
              <p className="text-white font-mono text-sm truncate">{passData.identifier}</p>
            </div>
          ) : null}

          {configName ? (
            <div>
              <p className="text-slate-400 text-xs">Program</p>
              <p className="text-white text-sm">{configName}</p>
            </div>
          ) : null}

          {typeof currentStamps === 'number' && (
            <div className="bg-blue-950/30 border border-blue-800/50 rounded-lg p-3 mt-2">
              <p className="text-slate-400 text-xs mb-1">Current Stamps</p>
              <p className="text-white text-2xl font-bold">{currentStamps}</p>
              <p className="text-blue-400 text-xs mt-1">+1 stamp will be added</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          onClick={onCancel}
          disabled={loading}
          variant="outline"
          className="flex-1"
        >
          <X className="w-4 h-4" />
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500"
        >
          <Check className="w-4 h-4" />
          {loading ? 'Submitting...' : 'Confirm'}
        </Button>
      </div>
    </div>
  );
}