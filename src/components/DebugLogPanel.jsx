import { useState, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

export default function DebugLogPanel() {
  const [logs, setLogs] = useState([]);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    // Intercept console.log
    const originalLog = console.log;
    console.log = (...args) => {
      originalLog(...args); // Still log to browser console
      
      const message = args
        .map(arg => {
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg, null, 2);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        })
        .join(' ');

      setLogs(prev => [...prev, {
        id: Date.now() + Math.random(),
        message,
        timestamp: new Date().toLocaleTimeString(),
      }]);
    };

    return () => {
      console.log = originalLog;
    };
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 bg-slate-900 text-white px-3 py-2 rounded text-xs z-50"
      >
        Show Logs
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-4 bg-slate-900 border border-slate-700 rounded shadow-lg z-50 max-w-sm w-80">
      <div className="flex justify-between items-center p-3 border-b border-slate-700">
        <span className="text-white text-xs font-mono font-semibold">Debug Logs ({logs.length})</span>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-white"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
      
      <div className="max-h-64 overflow-y-auto bg-slate-950 p-2 space-y-1">
        {logs.length === 0 ? (
          <div className="text-slate-500 text-xs p-2">Waiting for logs...</div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="text-slate-300 text-xs font-mono whitespace-pre-wrap break-words bg-slate-900 p-2 rounded border border-slate-800">
              <span className="text-slate-500">[{log.timestamp}]</span> {log.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
}