import { useState, useEffect } from 'react';
import { Undo2, Loader2 } from 'lucide-react';

const TOTAL = 15;

export default function UndoTimer({ onUndo, onExpire }) {
  const [remaining, setRemaining] = useState(TOTAL);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (remaining <= 0) { onExpire(); return; }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  const handleClick = async () => {
    if (!window.confirm('Undo this scan? This will reverse the wallet change.')) return;
    setLoading(true);
    await onUndo();
    // parent unmounts this on success, no need to reset loading
  };

  return (
    <div className="w-full max-w-sm">
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full flex items-center justify-between gap-3 bg-amber-950/40 border border-amber-800 rounded-xl px-4 py-3 text-amber-400 hover:bg-amber-950/60 transition-colors disabled:opacity-50"
      >
        <div className="flex items-center gap-2">
          {loading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Undo2 className="w-4 h-4" />
          }
          <span className="text-sm font-semibold">Undo Scan</span>
        </div>
        <span className="text-xs text-amber-600 font-mono">{remaining}s</span>
      </button>
      <div className="h-0.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
        <div
          className="h-full bg-amber-600 transition-all duration-1000 ease-linear"
          style={{ width: `${(remaining / TOTAL) * 100}%` }}
        />
      </div>
    </div>
  );
}