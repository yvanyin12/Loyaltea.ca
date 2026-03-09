import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, XCircle, AlertCircle, Wifi, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const RESULT_STYLE = {
  valid: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800', label: 'Valid' },
  already_voided: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-950/40 border-red-800', label: 'Already Used' },
  unknown: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-950/30 border-amber-800', label: 'Unknown' },
  error: { icon: Wifi, color: 'text-slate-400', bg: 'bg-slate-800/50 border-slate-700', label: 'Error' },
};

export default function ScanHistory() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadScans = async () => {
    setLoading(true);
    const data = await base44.entities.ScanLog.list('-created_date', 100);
    setScans(data);
    setLoading(false);
  };

  useEffect(() => { loadScans(); }, []);

  const handleClear = async () => {
    if (!window.confirm('Clear all scan history?')) return;
    await Promise.all(scans.map((s) => base44.entities.ScanLog.delete(s.id)));
    setScans([]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-lg mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Scan History</h1>
            <p className="text-slate-400 text-sm mt-1">{scans.length} scan{scans.length !== 1 ? 's' : ''} recorded</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={loadScans}
              className="text-slate-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            {scans.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="text-slate-400 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <RefreshCw className="w-8 h-8 text-slate-600 animate-spin" />
          </div>
        ) : scans.length === 0 ? (
          <div className="text-center py-16">
            <AlertCircle className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500">No scans yet.</p>
            <p className="text-slate-600 text-sm mt-1">Start scanning passes on the Scanner tab.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scans.map((scan) => {
              const style = RESULT_STYLE[scan.scanResult] || RESULT_STYLE.error;
              const Icon = style.icon;
              return (
                <div
                  key={scan.id}
                  className={`rounded-xl border p-4 flex gap-3 items-start ${style.bg}`}
                >
                  <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${style.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-semibold ${style.color}`}>{style.label}</span>
                      <span className="text-slate-500 text-xs whitespace-nowrap">
                        {scan.created_date
                          ? format(new Date(scan.created_date), 'MMM d, HH:mm')
                          : '—'}
                      </span>
                    </div>
                    <p className="text-slate-300 font-mono text-xs mt-1 truncate">
                      {scan.barcodeValue || '—'}
                    </p>
                    {scan.appConfigurationName && (
                      <p className="text-slate-500 text-xs mt-0.5">{scan.appConfigurationName}</p>
                    )}
                    {scan.errorMessage && (
                      <p className="text-red-400/70 text-xs mt-1 line-clamp-2">{scan.errorMessage}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}