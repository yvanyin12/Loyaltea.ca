import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Settings } from 'lucide-react';

export default function ConfigList({ configs, onSetActive, onRemove, onEdit }) {
  if (configs.length === 0) {
    return (
      <p className="text-slate-500 text-sm text-center py-6">
        No accounts saved yet. Click "Add" to get started.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {configs.map((cfg) => (
        <div
          key={cfg.configurationId}
          className={`rounded-xl border p-3 transition-all ${
            cfg.active
              ? 'bg-blue-950/50 border-blue-600'
              : 'bg-slate-800 border-slate-700'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-white text-sm">{cfg.name}</span>
                <Badge
                  className={
                    cfg.active
                      ? 'bg-blue-600 text-white text-xs px-2 py-0'
                      : 'bg-slate-700 text-slate-400 text-xs px-2 py-0'
                  }
                >
                  {cfg.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5 truncate">
                {cfg.configurationId}
              </p>
              {cfg.passTemplateName && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Template: {cfg.passTemplateName}
                </p>
              )}
              {cfg.rewardPercent != null && (
                <p className="text-xs text-blue-400 mt-0.5">
                  Reward: {(cfg.rewardPercent * 100).toFixed(0)}%
                </p>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {!cfg.active && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSetActive(cfg.configurationId)}
                  className="border-blue-700 text-blue-400 hover:text-blue-300 hover:border-blue-500 text-xs h-7 px-2"
                >
                  Set Active
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(cfg)}
                className="text-slate-500 hover:text-blue-400 h-7 w-7 p-0"
              >
                <Settings className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRemove(cfg.configurationId)}
                className="text-slate-500 hover:text-red-400 h-7 w-7 p-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}