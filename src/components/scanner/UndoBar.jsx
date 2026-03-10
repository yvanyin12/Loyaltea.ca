import { Undo2, Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function UndoBar({ show, countdown, onUndo, loading, message }) {
  if (message) {
    const ok = message.type === 'success';
    return (
      <div className={`w-full max-w-sm rounded-xl px-4 py-3 flex items-center gap-3 border ${ok ? 'bg-emerald-950/50 border-emerald-800' : 'bg-red-950/50 border-red-800'}`}>
        {ok
          ? <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
        <span className={`text-sm font-semibold ${ok ? 'text-emerald-300' : 'text-red-300'}`}>{message.text}</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full max-w-sm rounded-xl px-4 py-3 flex items-center gap-3 bg-slate-800/50 border border-slate-700">
        <Loader2 className="w-5 h-5 text-amber-400 animate-spin flex-shrink-0" />
        <span className="text-slate-300 text-sm">Reversing scan...</span>
      </div>
    );
  }

  if (!show) return null;

  return (
    <div className="w-full max-w-sm rounded-xl bg-amber-950/40 border border-amber-800 px-4 py-3 flex items-center justify-between gap-3">
      <span className="text-amber-300 text-sm font-medium">
        Scan recorded — undo within <span className="font-bold">{countdown}s</span>
      </span>
      <button
        onClick={onUndo}
        className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
      >
        <Undo2 className="w-3.5 h-3.5" />
        Undo
      </button>
    </div>
  );
}