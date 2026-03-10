import { TrendingUp, CheckCircle2, BarChart3 } from 'lucide-react';

export default function RevenueStats({ scans }) {
  const activeValid = scans.filter((s) => !s.isUndone && s.scanResult === 'valid');
  const totalRevenue = activeValid.reduce((sum, s) => sum + (s.amountSpent || 0), 0);
  const scansWithAmount = activeValid.filter((s) => s.amountSpent > 0);
  const avgSpend = scansWithAmount.length > 0 ? totalRevenue / scansWithAmount.length : 0;

  return (
    <div className="grid grid-cols-3 gap-3 mb-2">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center">
        <TrendingUp className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
        <p className="text-emerald-400 font-bold text-lg leading-none">€{totalRevenue.toFixed(2)}</p>
        <p className="text-slate-500 text-xs mt-1">Revenue</p>
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center">
        <CheckCircle2 className="w-4 h-4 text-blue-400 mx-auto mb-1" />
        <p className="text-blue-400 font-bold text-lg leading-none">{activeValid.length}</p>
        <p className="text-slate-500 text-xs mt-1">Valid Scans</p>
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center">
        <BarChart3 className="w-4 h-4 text-purple-400 mx-auto mb-1" />
        <p className="text-purple-400 font-bold text-lg leading-none">€{avgSpend.toFixed(2)}</p>
        <p className="text-slate-500 text-xs mt-1">Avg Spend</p>
      </div>
    </div>
  );
}