import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function ClearHistoryDialog({ configName, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 pb-24">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 space-y-4 max-h-[80vh] overflow-y-auto">

        <div className="flex items-center gap-3">
          <div className="bg-red-500/20 rounded-full p-2 flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Clear Scan History?</h3>
            <p className="text-slate-400 text-xs mt-0.5">
              This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-3 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Configuration</span>
            <span className="text-white font-medium">{configName || 'All'}</span>
          </div>
          <div className="text-slate-400 text-xs mt-2">
            All scan records for this configuration will be permanently deleted.
          </div>
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
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Clear History'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}