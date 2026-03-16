import { CheckCircle2, XCircle, AlertCircle, RotateCcw, Wifi, Zap, Gift, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const RESULT_CONFIG = {
  valid: {
    bg: 'bg-emerald-950',
    border: 'border-emerald-500',
    glow: 'shadow-emerald-500/30',
    icon: CheckCircle2,
    iconColor: 'text-emerald-400',
    title: 'VALID',
    titleColor: 'text-emerald-400',
    subtitle: 'Pass is valid and accepted',
  },
  already_voided: {
    bg: 'bg-red-950',
    border: 'border-red-500',
    glow: 'shadow-red-500/30',
    icon: XCircle,
    iconColor: 'text-red-400',
    title: 'ALREADY USED',
    titleColor: 'text-red-400',
    subtitle: 'This pass has already been used',
  },
  unknown: {
    bg: 'bg-amber-950',
    border: 'border-amber-600',
    glow: 'shadow-amber-500/20',
    icon: AlertCircle,
    iconColor: 'text-amber-400',
    title: 'UNKNOWN',
    titleColor: 'text-amber-400',
    subtitle: 'Pass not found in the system',
  },
  error: {
    bg: 'bg-slate-900',
    border: 'border-slate-600',
    glow: 'shadow-slate-500/10',
    icon: Wifi,
    iconColor: 'text-slate-400',
    title: 'ERROR',
    titleColor: 'text-slate-300',
    subtitle: 'Scan could not be completed',
  },
};

export default function ScanResult({ result, onReset }) {
  const cfg = RESULT_CONFIG[result.status] || RESULT_CONFIG.error;
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`w-full max-w-sm rounded-3xl border-2 shadow-2xl ${cfg.bg} ${cfg.border} ${cfg.glow} p-8 text-center flex flex-col gap-6`}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
      >
        <Icon className={`w-20 h-20 mx-auto ${cfg.iconColor}`} />
      </motion.div>

      <div>
        <h2 className={`text-4xl font-black tracking-widest ${cfg.titleColor}`}>
          {cfg.title}
        </h2>
        <p className="text-slate-400 mt-1 text-sm">{cfg.subtitle}</p>
      </div>

      {result.barcodeValue && (
        <div className="bg-slate-900/60 rounded-xl px-4 py-3">
          <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Barcode</p>
          <p className="text-slate-300 font-mono text-sm break-all">{result.barcodeValue}</p>
        </div>
      )}

      {result.status === 'error' && result.error && (
        <p className="text-slate-500 text-xs">{result.error}</p>
      )}

      {result.pointsData && (
        <div className="bg-blue-950/50 border border-blue-800 rounded-xl p-4 space-y-2 text-left">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">Amount Spent</span>
            <span className="text-white font-mono font-semibold">${result.pointsData.amountSpent.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm border-t border-blue-800 pt-2">
            <span className="text-blue-300 font-semibold flex items-center gap-1">
              <Zap className="w-4 h-4" /> Points Earned
            </span>
            <span className="text-blue-300 font-mono font-semibold">{result.pointsData.pointsEarned.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm border-t border-blue-800 pt-2">
            <span className="text-emerald-300 font-semibold">New Balance</span>
            <span className="text-emerald-300 font-mono font-semibold">{result.pointsData.newBalance.toLocaleString()}</span>
          </div>
        </div>
      )}

      {result.redemptionData && (
        <div className="bg-red-950/50 border border-red-800 rounded-xl p-4 space-y-2 text-left">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="w-4 h-4 text-red-400" />
            <span className="text-red-300 font-bold text-sm uppercase tracking-wide">Points Redeemed</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">Previous Balance</span>
            <span className="text-white font-mono font-semibold">{result.redemptionData.previousBalance.toLocaleString()} pts</span>
          </div>
          <div className="flex items-center justify-between text-sm border-t border-red-800 pt-2">
            <span className="text-red-300 font-semibold flex items-center gap-1">
              <Minus className="w-4 h-4" /> Points Spent
            </span>
            <span className="text-red-300 font-mono font-semibold">−{result.redemptionData.pointsSpent.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm border-t border-red-800 pt-2">
            <span className="text-emerald-300 font-semibold">New Balance</span>
            <span className="text-emerald-300 font-mono font-semibold">{result.redemptionData.newBalance.toLocaleString()} pts</span>
          </div>
          {result.redemptionData.note && (
            <div className="border-t border-red-800 pt-2">
              <p className="text-slate-500 text-xs">Note</p>
              <p className="text-slate-300 text-sm">{result.redemptionData.note}</p>
            </div>
          )}
        </div>
      )}

      {result.stampsData && (
        <div className="bg-purple-950/50 border border-purple-800 rounded-xl p-4 space-y-2 text-left">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">Previous Stamps</span>
            <span className="text-white font-mono font-semibold text-lg">{result.stampsData.previousBalance}</span>
          </div>
          <div className="flex items-center justify-between text-sm border-t border-purple-800 pt-2">
            <span className="text-purple-300 font-semibold">Stamp Added</span>
            <span className="text-purple-300 font-mono font-semibold text-lg">+1</span>
          </div>
          <div className="flex items-center justify-between text-sm border-t border-purple-800 pt-2">
            <span className="text-emerald-300 font-semibold">New Total</span>
            <span className="text-emerald-300 font-mono font-semibold text-lg">{result.stampsData.newBalance}</span>
          </div>
        </div>
      )}

      <Button
        onClick={onReset}
        className="w-full h-12 text-base font-semibold gap-2"
        variant="outline"
      >
        <RotateCcw className="w-4 h-4" />
        Scan Again
      </Button>
    </motion.div>
  );
}