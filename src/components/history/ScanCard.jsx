import { CheckCircle2, XCircle, AlertCircle, Wifi } from 'lucide-react';
import moment from 'moment-timezone';

const RESULT_STYLE = {
  valid: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/40 border-emerald-800',
    label: 'Confirmed',
  },
  already_voided: {
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-950/40 border-red-800',
    label: 'Already Used',
  },
  unknown: {
    icon: AlertCircle,
    color: 'text-amber-400',
    bg: 'bg-amber-950/30 border-amber-800',
    label: 'Unknown',
  },
  error: {
    icon: Wifi,
    color: 'text-slate-400',
    bg: 'bg-slate-800/50 border-slate-700',
    label: 'Error',
  },
};

const formatTime = (dateString) => {
  try {
    return moment.utc(dateString).tz('America/Toronto').format('MMM D, YYYY h:mm:ss A');
  } catch {
    return '—';
  }
};

export default function ScanCard({ scan }) {
  const style = RESULT_STYLE[scan.scanResult] || RESULT_STYLE.error;
  const Icon = style.icon;

  return (
    <div className={`rounded-xl border p-3 transition-opacity ${style.bg}`}>
      <div className="flex gap-3 items-start">
        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${style.color}`} />

        <div className="flex-1 min-w-0">
          {/* Top row: label + badges + timestamp + undo button */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center flex-wrap gap-1.5">
              <span className={`text-sm font-semibold ${style.color}`}>
                {style.label}
              </span>
            </div>

            <span className="text-slate-500 text-xs whitespace-nowrap">
              {scan.created_date ? formatTime(scan.created_date) : '—'}
            </span>
          </div>

          {/* Barcode */}
          <p className="text-slate-300 font-mono text-xs mt-0.5 truncate">
            {scan.barcodeValue || '—'}
          </p>

          {/* Config name */}
          {scan.appConfigurationName && (
            <p className="text-slate-500 text-xs mt-0.5">{scan.appConfigurationName}</p>
          )}

          {/* Amount */}
          {scan.amountSpent != null && scan.amountSpent !== 0 && (
            <p
              className={`text-xs mt-1 font-semibold ${
                scan.amountSpent < 0 ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {scan.amountSpent < 0 ? '−' : ''}CAD $
              {Math.abs(Number(scan.amountSpent)).toFixed(2)}
            </p>
          )}

          {/* Points */}
          {scan.loyaltyMode === 'points' && (
            <div className="text-xs mt-1 space-y-0.5">
              {scan.pointsEarned != null && (
                <p
                  className={`font-semibold ${
                    scan.pointsEarned < 0 ? 'text-red-400' : 'text-blue-400'
                  }`}
                >
                  {scan.pointsEarned >= 0 ? '+' : ''}
                  {scan.pointsEarned.toLocaleString()} pts
                </p>
              )}
              {scan.newPointsBalance != null && (
                <p className="text-emerald-400">
                  Balance: {scan.newPointsBalance.toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Error message */}
          {scan.errorMessage && (
            <p className="text-red-400/70 text-xs mt-1 line-clamp-2">
              {scan.errorMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}