import { useState } from 'react';
import { ChevronDown, ChevronUp, Bug } from 'lucide-react';

export default function DebugPanel({ logs }) {
  const [open, setOpen] = useState(false);

  if (!logs.length) return null;

  return (
    <div className="w-full max-w-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors w-full justify-center py-2"
      >
        <Bug className="w-3.5 h-3.5" />
        Debug log ({logs.length})
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 space-y-1.5 max-h-72 overflow-y-auto">
          {logs.map((entry, i) => (
            <div key={i} className="flex gap-2 text-xs font-mono">
              <span className={`flex-shrink-0 font-semibold ${
                entry.level === 'error' ? 'text-red-400' :
                entry.level === 'warn'  ? 'text-amber-400' :
                entry.level === 'ok'    ? 'text-emerald-400' :
                'text-blue-400'
              }`}>
                {entry.level === 'error' ? '✗' : entry.level === 'ok' ? '✓' : entry.level === 'warn' ? '!' : '→'}
              </span>
              <span className="text-slate-300 break-all">{entry.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}