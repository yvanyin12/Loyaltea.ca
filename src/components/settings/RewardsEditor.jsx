import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { addReward, updateReward, deleteReward } from '@/lib/rewardsStore';

function RewardRow({ reward, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(reward.label);
  const [points, setPoints] = useState(String(reward.points));

  const handleSave = () => {
    const pts = parseInt(points, 10);
    if (!label.trim() || isNaN(pts) || pts <= 0) return;
    updateReward(reward.id, { label: label.trim(), points: pts });
    onUpdate();
    setEditing(false);
  };

  const handleCancel = () => {
    setLabel(reward.label);
    setPoints(String(reward.points));
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-2 border-b border-slate-800">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Reward name"
          className="bg-slate-800 border-slate-700 text-white text-sm h-8 flex-1"
        />
        <Input
          type="number"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          placeholder="Points"
          className="bg-slate-800 border-slate-700 text-white text-sm h-8 w-24"
          min="1"
        />
        <Button size="icon" variant="ghost" onClick={handleSave} className="h-8 w-8 text-emerald-400 hover:text-emerald-300">
          <Check className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={handleCancel} className="h-8 w-8 text-slate-400 hover:text-slate-300">
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-800">
      <div>
        <p className="text-white text-sm font-medium">{reward.label}</p>
        <p className="text-slate-500 text-xs">{reward.points.toLocaleString()} pts</p>
      </div>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" onClick={() => setEditing(true)} className="h-7 w-7 text-slate-400 hover:text-white">
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => { deleteReward(reward.id); onDelete(); }} className="h-7 w-7 text-slate-400 hover:text-red-400">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function RewardsEditor({ rewards, onRefresh }) {
  const [newLabel, setNewLabel] = useState('');
  const [newPoints, setNewPoints] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const handleAdd = () => {
    const pts = parseInt(newPoints, 10);
    if (!newLabel.trim() || isNaN(pts) || pts <= 0) return;
    addReward({ label: newLabel.trim(), points: pts });
    setNewLabel('');
    setNewPoints('');
    setShowAdd(false);
    onRefresh();
  };

  return (
    <div className="space-y-1">
      {rewards.length === 0 && (
        <p className="text-slate-600 text-sm py-2">No rewards configured yet.</p>
      )}
      {rewards.map((r) => (
        <RewardRow key={r.id} reward={r} onUpdate={onRefresh} onDelete={onRefresh} />
      ))}

      {showAdd ? (
        <div className="flex items-center gap-2 pt-3">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Reward name"
            className="bg-slate-800 border-slate-700 text-white text-sm h-8 flex-1"
            autoFocus
          />
          <Input
            type="number"
            value={newPoints}
            onChange={(e) => setNewPoints(e.target.value)}
            placeholder="Points"
            className="bg-slate-800 border-slate-700 text-white text-sm h-8 w-24"
            min="1"
          />
          <Button size="icon" variant="ghost" onClick={handleAdd} className="h-8 w-8 text-emerald-400 hover:text-emerald-300">
            <Check className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setShowAdd(false)} className="h-8 w-8 text-slate-400 hover:text-slate-300">
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdd(true)}
          className="mt-2 gap-1.5 text-slate-400 hover:text-white px-0"
        >
          <Plus className="w-3.5 h-3.5" /> Add Reward
        </Button>
      )}
    </div>
  );
}