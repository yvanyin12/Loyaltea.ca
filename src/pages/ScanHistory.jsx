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
    addLog(`\n[DEVICE] ═══════════════════════════════════════════════════════════`);
    addLog(`[DEVICE] loadScans() invoked at ${fetchStartTime.toFixed(0)}ms`);
    
    const dbQueryTime = performance.now();
    let data = await base44.entities.ScanLog.list('-created_date', 500);
    const dbResultTime = performance.now();
    addLog(`[DEVICE] [DB QUERY] ScanLog.list() returned at ${dbResultTime.toFixed(0)}ms`);
    addLog(`[DEVICE] [DB QUERY] Latency: ${(dbResultTime - dbQueryTime).toFixed(0)}ms`);
    addLog(`[DEVICE] [DB QUERY] Raw count: ${data.length} scans`);
    
    // Inspect first scan BEFORE filtering to check for stale data
    const firstScanRaw = data[0];
    if (firstScanRaw) {
      addLog(`[DEVICE] [DB QUERY] First scan RAW (before filter):`);
      addLog(`  ID: ${firstScanRaw.id.substring(0, 8)}`);
      addLog(`  Config: ${firstScanRaw.appConfigurationId}`);
      addLog(`  isUndone: ${firstScanRaw.isUndone}`);
      addLog(`  isReversal: ${firstScanRaw.isReversal}`);
      addLog(`  Points: ${firstScanRaw.pointsEarned}`);
      addLog(`  Balance: ${firstScanRaw.newPointsBalance}`);
    }
    
    // Filter to only show scans for the currently selected config
    if (activeConfigId) {
      const beforeFilter = data.length;
      data = data.filter((s) => s.appConfigurationId === activeConfigId);
      addLog(`[DEVICE] [DB FILTER] Filtered for config "${activeConfigId}": ${data.length}/${beforeFilter} scans`);
    }
    
    const firstScan = data[0];
    if (firstScan) {
      addLog(`[DEVICE] [DB FILTERED] First scan AFTER filter:`);
      addLog(`  ID: ${firstScan.id.substring(0, 8)}`);
      addLog(`  isUndone: ${firstScan.isUndone}`);
      addLog(`  isReversal: ${firstScan.isReversal}`);
      addLog(`  Points: ${firstScan.pointsEarned}`);
      addLog(`  Balance: ${firstScan.newPointsBalance}`);
    }
    
    // Log cache behavior
    addLog(`[DEVICE] [CACHE CHECK] Checking if data looks fresh...`);
    if (firstScan && firstScan.updated_date) {
      const updatedDate = new Date(firstScan.updated_date);
      const updatedMs = updatedDate.getTime();
      const nowMs = Date.now();
      const ageMs = nowMs - updatedMs;
      
      // Check for invalid/future timestamps
      if (isNaN(updatedMs)) {
        addLog(`[DEVICE] [CACHE CHECK] ⚠️ INVALID TIMESTAMP: "${firstScan.updated_date}"`);
      } else if (ageMs < 0) {
        addLog(`[DEVICE] [CACHE CHECK] ⚠️ FUTURE TIMESTAMP: updated ${(-ageMs/1000).toFixed(1)}s in the future`);
        addLog(`[DEVICE] [CACHE CHECK] This suggests timezone or clock skew issue`);
      } else {
        addLog(`[DEVICE] [CACHE CHECK] Data freshness: ${(ageMs/1000).toFixed(1)}s ago`);
        if (ageMs > 10000) {
          addLog(`[DEVICE] [CACHE CHECK] ⚠️ Data is > 10 seconds old — possible stale cache!`);
        }
      }
    }
    
    const setStateTime = performance.now();
    addLog(`[DEVICE] [STATE UPDATE] setScans() called at ${setStateTime.toFixed(0)}ms with ${data.length} items`);
    setScans(data);
    
    const setLoadingTime = performance.now();
    addLog(`[DEVICE] [STATE UPDATE] setLoading(false) called at ${setLoadingTime.toFixed(0)}ms`);
    setLoading(false);
    
    const completeTime = performance.now();
    addLog(`[DEVICE] [COMPLETE] loadScans() sync code done at ${completeTime.toFixed(0)}ms (${(completeTime - fetchStartTime).toFixed(0)}ms total)`);
    addLog(`[DEVICE] [RENDER PENDING] React will now batch updates and trigger re-render asynchronously`);
    addLog(`[DEVICE] ═══════════════════════════════════════════════════════════`);
  };

  useEffect(() => { loadScans(); }, [activeConfigId]);

  // Monitor render phase to detect when component actually displays new data
  useEffect(() => {
    const renderTime = performance.now();
    
    // Only log if there are active debug logs (undo was triggered)
    if (debugLogs.length > 0) {
      const firstScan = scans[0];
      if (firstScan) {
        addLog(`\n[RENDER] ═════════════════════════════════════════════════════════════`);
        addLog(`[RENDER] Component re-rendered at ${renderTime.toFixed(0)}ms`);
        addLog(`[RENDER] [AFTER] First scan visible:`);
        addLog(`  ID: ${firstScan.id.substring(0, 8)}`);
        addLog(`  isUndone: ${firstScan.isUndone}`);
        addLog(`  isReversal: ${firstScan.isReversal}`);
        addLog(`  Points: ${firstScan.pointsEarned}`);
        addLog(`  Balance: ${firstScan.newPointsBalance}`);
        
        if (firstScan.updated_date) {
          const updatedDate = new Date(firstScan.updated_date);
          const updatedMs = updatedDate.getTime();
          const nowMs = Date.now();
          const ageMs = nowMs - updatedMs;
          
          if (isNaN(updatedMs)) {
            addLog(`  Updated: INVALID TIMESTAMP`);
          } else if (ageMs < 0) {
            addLog(`  Updated: ${(-ageMs/1000).toFixed(1)}s in the future (clock skew?)`);
          } else {
            addLog(`  Updated: ${(ageMs/1000).toFixed(1)}s ago`);
          }
        }
      }
      
      addLog(`[RENDER] Total scans: ${scans.length}`);
      addLog(`[RENDER] Loading: ${loading}`);
      addLog(`[RENDER] ═════════════════════════════════════════════════════════════`);
    }
  }, [scans]);

  const handleUndoConfirm = async () => {
    if (!undoTarget) return;
    const uiStartTime = performance.now();
    
    // Clear previous logs and start fresh
    setDebugLogs([]);
    
    addLog(`╔════════════════════════════════════════════════════════════════╗`);
    addLog(`║ UNDO FLOW TRACE - DEVICE SIDE                                 ║`);
    addLog(`╚════════════════════════════════════════════════════════════════╝`);
    addLog(`[UNDO] [T=0ms] Confirm Undo tapped at ${uiStartTime.toFixed(0)}ms`);
    addLog(`[UNDO] [BEFORE] Scan ID: ${undoTarget.id.substring(0, 8)}`);
    addLog(`[UNDO] [BEFORE] Pass ID: ${undoTarget.passIdentifier}`);
    addLog(`[UNDO] [BEFORE] Balance: ${undoTarget.newPointsBalance || '(stamps mode)'}`);
    addLog(`[UNDO] [BEFORE] Points earned: ${undoTarget.pointsEarned || 'N/A'}`);
    
    setUndoLoading(true);
    const stateSetTime = performance.now();
    addLog(`[UNDO] [T=${(stateSetTime - uiStartTime).toFixed(0)}ms] setUndoLoading(true)`);
    
    try {
      const apiCallTime = performance.now();
      addLog(`[UNDO] [T=${(apiCallTime - uiStartTime).toFixed(0)}ms] ► Calling undoScan()...`);
      await undoScan(undoTarget);
      
      const apiReturnTime = performance.now();
      addLog(`[UNDO] [T=${(apiReturnTime - uiStartTime).toFixed(0)}ms] ◄ undoScan() returned`);
      addLog(`[UNDO] [API TIME] ${(apiReturnTime - apiCallTime).toFixed(0)}ms`);
      addLog(`[UNDO] [API RESULT] Passcreator & reversal record updated`);
      
      addLog(`\n[UNDO] [T=${(apiReturnTime - uiStartTime).toFixed(0)}ms] ► Calling loadScans()...`);
      const dbStartTime = performance.now();
      await loadScans();
      
      const dbEndTime = performance.now();
      addLog(`[UNDO] [T=${(dbEndTime - uiStartTime).toFixed(0)}ms] ◄ loadScans() returned`);
      addLog(`[UNDO] [DB TIME] ${(dbEndTime - dbStartTime).toFixed(0)}ms`);
      
      const totalTime = dbEndTime - uiStartTime;
      addLog(`\n[UNDO] [T=${totalTime.toFixed(0)}ms] ✓ SYNC CODE COMPLETE`);
      addLog(`[UNDO] [BREAKDOWN]`);
      addLog(`  API:  ${(apiReturnTime - apiCallTime).toFixed(0)}ms`);
      addLog(`  DB:   ${(dbEndTime - dbStartTime).toFixed(0)}ms`);
      addLog(`  Total: ${totalTime.toFixed(0)}ms`);
    } finally {
      const finalTime = performance.now();
      addLog(`[UNDO] [T=${(finalTime - uiStartTime).toFixed(0)}ms] setUndoTarget(null)`);
      setUndoTarget(null);
      
      addLog(`[UNDO] [T=${(finalTime - uiStartTime).toFixed(0)}ms] setUndoLoading(false)`);
      setUndoLoading(false);
      
      addLog(`\n[UNDO] ⏳ Waiting for React re-render...`);
      addLog(`╚════════════════════════════════════════════════════════════════╝`);
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
      <DebugPanel logs={debugLogs} />
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