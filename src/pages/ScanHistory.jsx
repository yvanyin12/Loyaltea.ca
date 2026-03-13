import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertCircle, Trash2, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import moment from 'moment-timezone';
import RevenueStats from '../components/history/RevenueStats';
import ScanCard from '../components/history/ScanCard';
import UndoConfirmDialog from '../components/history/UndoConfirmDialog';
import ClearHistoryDialog from '../components/history/ClearHistoryDialog';
import { undoScan } from '../components/api/undoApi';
import { getSelectedConfig } from '../components/api/passcreatorApi';

export default function ScanHistory() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [undoTarget, setUndoTarget] = useState(null); // scan pending undo confirmation
  const [undoLoading, setUndoLoading] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
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

  const handleUndoConfirm = async () => {
    if (!undoTarget) return;
    setUndoLoading(true);
    await undoScan(undoTarget);
    setUndoTarget(null);
    setUndoLoading(false);
    await loadScans();
  };

  const handleClearConfirm = async () => {
    setClearLoading(true);
    await Promise.all(scans.map((s) => base44.entities.ScanLog.delete(s.id)));
    setScans([]);
    setShowClearDialog(false);
    setClearLoading(false);
  };

  const exportCSV = () => {
    const headers = [
      'Date', 'Time (ET)',
      'Configuration', 'Loyalty Type',
      'Pass ID', 'Barcode / Generated ID',
      'First Name', 'Last Name', 'Customer Name',
      'Email Address', 'Phone Number',
      'Scan Result',
      'Amount Spent (CAD)', 'Points / Stamps Earned',
      'Previous Balance', 'New Balance',
    ];
    const rows = scans.map((s) => {
      const m = s.created_date ? moment.utc(s.created_date).tz('America/Toronto') : null;
      return [
        m ? m.format('MM/DD/YYYY') : '',
        m ? m.format('HH:mm:ss') : '',
        s.appConfigurationName || '',
        s.loyaltyMode || '',
        s.passIdentifier || '',
        s.barcodeValue || '',
        s.holderFirstName || '',
        s.holderLastName || '',
        s.holderName || '',
        s.holderEmail || '',
        s.holderPhone || '',
        s.scanResult || '',
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
      <UndoConfirmDialog
        scan={undoTarget}
        onConfirm={handleUndoConfirm}
        onCancel={() => setUndoTarget(null)}
        loading={undoLoading}
      />
      {showClearDialog && (
        <ClearHistoryDialog
          configName={activeConfigName}
          onConfirm={handleClearConfirm}
          onCancel={() => setShowClearDialog(false)}
          loading={clearLoading}
        />
      )}
      <div className="max-w-lg mx-auto px-5 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold">Scan History</h1>
            {activeConfigName && (
              <p className="text-blue-400 text-xs mt-0.5">{activeConfigName}</p>
            )}
            <p className="text-slate-400 text-sm mt-0.5">{scans.length} scan{scans.length !== 1 ? 's' : ''} recorded</p>
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
              <Button variant="ghost" size="icon" onClick={() => setShowClearDialog(true)} className="text-slate-400 hover:text-red-400">
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
            {scans.map((scan) => (
              <ScanCard key={scan.id} scan={scan} onUndo={setUndoTarget} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}