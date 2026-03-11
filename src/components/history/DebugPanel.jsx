import { useState } from 'react';
import { ChevronDown, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DebugPanel({ logs = [] }) {
  const [isOpen, setIsOpen] = useState(false);

  const copyToClipboard = () => {
    const text = logs.join('\n');
    navigator.clipboard.writeText(text);
  };

  if (!logs.length) return null;

  return (
    <div className="fixed bottom-24 left-0 right-0 z-40 mx-4 mb-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-lg">
        {/* Header */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800 transition"
        >
          <div className="text-left">
            <h3 className="text-sm font-mono font-bold text-blue-400">DEBUG LOG</h3>
            <p className="text-xs text-slate-500">{logs.length} entries</p>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Content */}
        {isOpen && (
          <div className="border-t border-slate-700 bg-slate-950 p-3 max-h-64 overflow-y-auto">
            <div className="space-y-1 font-mono text-xs text-slate-300">
              {logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`${
                    log.includes('ERROR') || log.includes('FAILED')
                      ? 'text-red-400'
                      : log.includes('SUCCESS') || log.includes('✓')
                        ? 'text-green-400'
                        : log.includes('===') || log.includes('T=')
                          ? 'text-blue-400'
                          : 'text-slate-400'
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700">
              <Button
                size="sm"
                variant="outline"
                onClick={copyToClipboard}
                className="text-xs flex-1 text-slate-400 border-slate-600 hover:bg-slate-800"
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}