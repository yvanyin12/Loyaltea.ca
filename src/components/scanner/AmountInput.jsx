import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Euro, Check, SkipForward } from 'lucide-react';

export default function AmountInput({ onSave, onSkip }) {
  const [value, setValue] = useState('');

  const handleSave = () => {
    const amount = parseFloat(value);
    onSave(isNaN(amount) ? 0 : amount);
  };

  return (
    <div className="bg-slate-800 border border-emerald-800/50 rounded-xl p-4 space-y-3 w-full max-w-sm">
      <p className="text-slate-300 text-sm font-medium flex items-center gap-2">
        <Euro className="w-4 h-4 text-emerald-400" />
        Amount Spent
      </p>
      <Input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && value && handleSave()}
        placeholder="0.00"
        autoFocus
        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 text-2xl font-semibold text-center h-14"
        min="0"
        step="0.01"
      />
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onSkip}
          className="flex-1 border-slate-600 text-slate-400 hover:text-white gap-1 h-10"
        >
          <SkipForward className="w-4 h-4" /> Skip
        </Button>
        <Button
          onClick={handleSave}
          disabled={!value}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-1 h-10"
        >
          <Check className="w-4 h-4" /> Save
        </Button>
      </div>
    </div>
  );
}