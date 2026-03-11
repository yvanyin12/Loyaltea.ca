import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertCircle, Trash2, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import moment from 'moment-timezone';
import RevenueStats from '../components/history/RevenueStats';
import ScanCard from '../components/history/ScanCard';
import UndoConfirmDialog from '../components/history/UndoConfirmDialog';
import DebugPanel from '../components/history/DebugPanel';
import { undoScan } from '../components/api/undoApi';
import { getSelectedConfig } from '../components/api/passcreatorApi';

export default function ScanHistory() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [undoTarget, setUndoTarget] = useState(null); // scan pending undo confirmation
  const [undoLoading, setUndoLoading] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);
  const activeConfig = getSelectedConfig();
  const activeConfigId = activeConfig?.configurationId || activeConfig?.id || null;
  const activeConfigName = activeConfig?.name || null;

  // Helper to add debug logs
  const addLog = (message) => {
    setDebugLogs((prev) => [...prev, message]);
    console.log(message);
  };

  const loadScans = async () => {
    const fetchStartTime = performance.now();
    console.log(`\n[DEVICE] ═══════════════════════════════════════════════════════════`);
    console.log(`[DEVICE] loadScans() invoked at ${fetchStartTime.toFixed(0)}ms`);
    
    const dbQueryTime = performance.now();
    let data = await base44.entities.ScanLog.list('-created_date', 500);
    const dbResultTime = performance.now();
    console.log(`[DEVICE] [DB QUERY] ScanLog.list() returned at ${dbResultTime.toFixed(0)}ms`);
    console.log(`[DEVICE] [DB QUERY] Latency: ${(dbResultTime - dbQueryTime).toFixed(0)}ms`);
    console.log(`[DEVICE] [DB QUERY] Raw count: ${data.length} scans`);
    
    // Inspect first scan BEFORE filtering to check for stale data
    const firstScanRaw = data[0];
    if (firstScanRaw) {
      console.log(`[DEVICE] [DB QUERY] ⚠️ First scan RAW (before filter):`, {
        id: firstScanRaw.id.substring(0, 8),
        config: firstScanRaw.appConfigurationId,
        isUndone: firstScanRaw.isUndone,
        isReversal: firstScanRaw.isReversal,
        pointsEarned: firstScanRaw.pointsEarned,
        newPointsBalance: firstScanRaw.newPointsBalance,
        timestamp: new Date(firstScanRaw.created_date).toISOString(),
      });
    }
    
    // Filter to only show scans for the currently selected config
    if (activeConfigId) {
      const beforeFilter = data.length;
      data = data.filter((s) => s.appConfigurationId === activeConfigId);
      console.log(`[DEVICE] [DB FILTER] Filtered for config "${activeConfigId}": ${data.length}/${beforeFilter} scans`);
    }
    
    const firstScan = data[0];
    if (firstScan) {
      console.log(`[DEVICE] [DB FILTERED] First scan AFTER filter:`, {
        id: firstScan.id.substring(0, 8),
        isUndone: firstScan.isUndone,
        isReversal: firstScan.isReversal,
        pointsEarned: firstScan.pointsEarned,
        newPointsBalance: firstScan.newPointsBalance,
      });
    }
    
    // Log cache behavior
    console.log(`[DEVICE] [CACHE CHECK] Checking if data looks fresh...`);
    if (firstScan && firstScan.updated_date) {
      const updatedMs = new Date(firstScan.updated_date).getTime();
      const nowMs = Date.now();
      const ageMs = nowMs - updatedMs;
      console.log(`[DEVICE] [CACHE CHECK] First scan was updated ${ageMs}ms ago (${(ageMs/1000).toFixed(1)}s)`);
      if (ageMs > 10000) {
        console.warn(`[DEVICE] [CACHE CHECK] ⚠️ Data is > 10 seconds old — possible stale cache!`);
      }
    }
    
    const setStateTime = performance.now();
    console.log(`[DEVICE] [STATE UPDATE] setScans() called at ${setStateTime.toFixed(0)}ms with ${data.length} items`);
    setScans(data);
    
    const setLoadingTime = performance.now();
    console.log(`[DEVICE] [STATE UPDATE] setLoading(false) called at ${setLoadingTime.toFixed(0)}ms`);
    setLoading(false);
    
    const completeTime = performance.now();
    console.log(`[DEVICE] [COMPLETE] loadScans() sync code done at ${completeTime.toFixed(0)}ms (${(completeTime - fetchStartTime).toFixed(0)}ms total)`);
    console.log(`[DEVICE] [RENDER PENDING] React will now batch updates and trigger re-render asynchronously`);
    console.log(`[DEVICE] ═══════════════════════════════════════════════════════════\n`);
  };

  useEffect(() => { loadScans(); }, [activeConfigId]);

  // Monitor render phase to detect when component actually displays new data
  useEffect(() => {
    const renderTime = performance.now();
    console.log(`\n[RENDER] ═══════════════════════════════════════════════════════════`);
    console.log(`[RENDER] ScanHistory component re-rendered at ${renderTime.toFixed(0)}ms`);
    
    const firstScan = scans[0];
    if (firstScan) {
      console.log(`[RENDER] First scan visible on screen:`, {
        id: firstScan.id.substring(0, 8),
        isUndone: firstScan.isUndone,
        isReversal: firstScan.isReversal,
        pointsEarned: firstScan.pointsEarned,
        newPointsBalance: firstScan.newPointsBalance,
      });
      
      if (firstScan.updated_date) {
        const updatedMs = new Date(firstScan.updated_date).getTime();
        const nowMs = Date.now();
        const ageMs = nowMs - updatedMs;
        console.log(`[RENDER] Data freshness: updated ${(ageMs/1000).toFixed(1)}s ago`);
      }
    } else {
      console.log(`[RENDER] No scans to display`);
    }
    
    console.log(`[RENDER] Total scans in state: ${scans.length}`);
    console.log(`[RENDER] Loading state: ${loading}`);
    console.log(`[RENDER] ═══════════════════════════════════════════════════════════\n`);
  }, [scans]);

  const handleUndoConfirm = async () => {
    if (!undoTarget) return;
    const uiStartTime = performance.now();
    console.log(`\n\n`);
    console.log(`╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║ FULL UNDO FLOW TRACE (Device-side)                             ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝`);
    console.log(`[UNDO] [T=0ms] User tapped Confirm Undo button at ${uiStartTime.toFixed(0)}ms`);
    console.log(`[UNDO] [TARGET] Scan ID: ${undoTarget.id.substring(0, 8)}`);
    console.log(`[UNDO] [TARGET] Pass ID: ${undoTarget.passIdentifier}`);
    console.log(`[UNDO] [TARGET] Current balance: ${undoTarget.newPointsBalance || '(stamps mode)'}`);
    
    setUndoLoading(true);
    const stateSetTime = performance.now();
    console.log(`[UNDO] [T=${(stateSetTime - uiStartTime).toFixed(0)}ms] setUndoLoading(true) executed`);
    
    try {
      const apiCallTime = performance.now();
      console.log(`\n[UNDO] [T=${(apiCallTime - uiStartTime).toFixed(0)}ms] ► Calling undoScan() API...`);
      await undoScan(undoTarget);
      
      const apiReturnTime = performance.now();
      console.log(`[UNDO] [T=${(apiReturnTime - uiStartTime).toFixed(0)}ms] ◄ undoScan() completed (${(apiReturnTime - apiCallTime).toFixed(0)}ms API time)`);
      console.log(`[UNDO] [API RESULT] Passcreator updated, reversal record created`);
      
      console.log(`\n[UNDO] [T=${(apiReturnTime - uiStartTime).toFixed(0)}ms] ► Calling loadScans() to fetch fresh data...`);
      const dbStartTime = performance.now();
      await loadScans();
      
      const dbEndTime = performance.now();
      console.log(`[UNDO] [T=${(dbEndTime - uiStartTime).toFixed(0)}ms] ◄ loadScans() completed (${(dbEndTime - dbStartTime).toFixed(0)}ms DB time)`);
      console.log(`[UNDO] [DB RESULT] Fresh data fetched, setScans() state updated`);
      
      const totalTime = dbEndTime - uiStartTime;
      console.log(`\n[UNDO] [T=${totalTime.toFixed(0)}ms] SYNC CODE COMPLETE — state should be updated`);
      console.log(`[UNDO] [TIMING BREAKDOWN]:`);
      console.log(`       API call:  ${(apiReturnTime - apiCallTime).toFixed(0)}ms`);
      console.log(`       DB fetch:  ${(dbEndTime - dbStartTime).toFixed(0)}ms`);
      console.log(`       Total:     ${totalTime.toFixed(0)}ms`);
    } finally {
      const finalTime = performance.now();
      console.log(`\n[UNDO] [T=${(finalTime - uiStartTime).toFixed(0)}ms] Finally block executing`);
      setUndoTarget(null);
      const nullSetTime = performance.now();
      console.log(`[UNDO] [T=${(nullSetTime - uiStartTime).toFixed(0)}ms] setUndoTarget(null) executed`);
      
      setUndoLoading(false);
      const loadingSetTime = performance.now();
      console.log(`[UNDO] [T=${(loadingSetTime - uiStartTime).toFixed(0)}ms] setUndoLoading(false) executed`);
      
      console.log(`\n[UNDO] [NEXT] React will batch state updates and trigger re-render`);
      console.log(`[UNDO] [NEXT] Dialog will close, ScanHistory will re-render with fresh scans`);
      console.log(`[UNDO] ⏳ NOW MONITORING RENDER PHASE — watch browser for next logs...`);
      console.log(`╚════════════════════════════════════════════════════════════════╝\n`);
    }
  };

  const handleClear = async () => {
    const label = activeConfigName ? `"${activeConfigName}"` : 'selected configuration';
    if (!window.confirm(`Clear all scan history for ${label}?`)) return;
    await Promise.all(scans.map((s) => base44.entities.ScanLog.delete(s.id)));
    setScans([]);
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
            {scans.map((scan) => (
              <ScanCard key={scan.id} scan={scan} onUndo={setUndoTarget} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}