import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, XCircle, AlertCircle, Wifi, Trash2, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import moment from 'moment-timezone';
import RevenueStats from '../components/history/RevenueStats';
import { getSelectedConfig } from '../components/api/passcreatorApi';

const RESULT_STYLE = {
  valid: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800', label: 'Confirmed' },
  already_voided: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-950/40 border-red-800', label: 'Already Used' },
  unknown: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-950/30 border-amber-800', label: 'Unknown' },
  error: { icon: Wifi, color: 'text-slate-400', bg: 'bg-slate-800/50 border-slate-700', label: 'Error' },
};

// Format timestamp to Montreal time (Eastern Time)
const formatMontrealTime = (dateString) => {
  try {
    return moment.utc(dateString).tz('America/Toronto').format('MMM D, YYYY h:mm:ss A');
  } catch {
    return '—';
  }
};

export default function ScanHistory() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const activeConfig = getSelectedConfig();
  const activeConfigId = activeConfig?.configurationId || activeConfig?.id || null;
  const activeConfigName = activeConfig?.name || null;

  const loadScans = async () => {
    setLoading(true);
    let data = await base44.entities.ScanLog.list('-created_date', 500);
    // Filter to only show scans for the currently selected config
    if (activeConfigId) {
      data = data.filter((s) => s.appConfigurationId === activeConfigId);
    }
    setScans(data);
    setLoading(false);
  };

  useEffect(() => { loadScans(); }, [activeConfigId]);

  const handleClear = async () => {
    const label = activeConfigName ? `"${activeConfigName}"` : 'selected configuration';
    if (!window.confirm(`Clear all scan history for ${label}?`)) return;
    await Promise.all(scans.map((s) => base44.entities.ScanLog.delete(s.id)));
    setScans([]);
  };

  const exportCSV = () => {
    const headers = [
      'Date', 'Time (ET)', 'Configuration',
      'Customer Name', 'Customer Email', 'Customer Phone',
      'Pass ID', 'Barcode', 'Result', 'Loyalty Mode',
      'Amount Spent (CAD)', 'Points Earned', 'Prev Balance', 'New Balance',
    ];
    const rows = scans.map((s) => {
      const m = s.created_date ? moment.utc(s.created_date).tz('America/Toronto') : null;
      return [
        m ? m.format('MM/DD/YYYY') : '',
        m ? m.format('HH:mm:ss') : '',
        s.appConfigurationName || '',
        s.holderName || '',
        s.holderEmail || '',
        s.holderPhone || '',
        s.passIdentifier || '',
        s.barcodeValue || '',
        s.scanResult || '',
        s.loyaltyMode || '',
        s.amountSpent != null ? Number(s.amountSpent).toFixed(2) : '',
        s.pointsEarned != null ? s.pointsEarned : '',
        s.previousPointsBalance != null ? s.previousPointsBalance : '',
        s.newPointsBalance != null ? s.newPointsBalance : '',
      ];
    });
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const montrealDate = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Toronto',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now);
    const configSlug = (activeConfigName || 'all').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    a.download = `scan-history-${configSlug}-${montrealDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-lg mx-auto px-5 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold">Scan History</h1>
            <p className="text-slate-400 text-sm mt-1">{scans.length} scan{scans.length !== 1 ? 's' : ''} recorded</p>
          </div>
          <div className="flex gap-2">
            {scans.length > 0 && (
              <Button variant="ghost" size="icon" onClick={exportCSV} className="text-slate-400 hover:text-white" title="Export CSV">
                <Download className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={loadScans} className="text-slate-400 hover:text-white">
              <RefreshCw className="w-4 h-4" />
            </Button>
            {scans.length > 0 && (
              <Button variant="ghost" size="icon" onClick={handleClear} className="text-slate-400 hover:text-red-400">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Revenue stats */}
        {scans.length > 0 && <RevenueStats scans={scans} />}

        {/* Scan list */}
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
          <div className="space-y-2 mt-5">
            {scans.map((scan) => {
              const style = RESULT_STYLE[scan.scanResult] || RESULT_STYLE.error;
              const Icon = style.icon;
              const undone = scan.isUndone;
              return (
                <div
                  key={scan.id}
                  className={`rounded-xl border p-3 ${style.bg}`}
                >
                  <div className="flex gap-3 items-start">
                    <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${style.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-semibold ${style.color}`}>
                          {style.label}
                        </span>
                        <span className="text-slate-500 text-xs whitespace-nowrap">
                          {scan.created_date ? formatMontrealTime(scan.created_date) : '—'}
                        </span>
                      </div>
                      <p className="text-slate-300 font-mono text-xs mt-0.5 truncate">{scan.barcodeValue || '—'}</p>
                      {scan.appConfigurationName && (
                        <p className="text-slate-500 text-xs mt-0.5">{scan.appConfigurationName}</p>
                      )}
                      {scan.amountSpent != null && scan.amountSpent > 0 && (
                        <p className="text-xs mt-1 font-semibold text-emerald-400">
                          CAD ${Number(scan.amountSpent).toFixed(2)}
                        </p>
                      )}
                      {scan.loyaltyMode === 'points' && (
                        <div className="text-xs mt-1 space-y-0.5">
                          <p className="text-blue-400 font-semibold">
                            {scan.pointsEarned != null ? `+${scan.pointsEarned.toLocaleString()} pts` : 'Points pending'}
                          </p>
                          {scan.newPointsBalance != null && (
                            <p className="text-emerald-400">Balance: {scan.newPointsBalance.toLocaleString()}</p>
                          )}
                        </div>
                      )}
                      {scan.errorMessage && (
                        <p className="text-red-400/70 text-xs mt-1 line-clamp-2">{scan.errorMessage}</p>
                      )}
                    </div>

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