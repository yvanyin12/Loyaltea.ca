import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Floating bar shown when an admin is previewing restaurant mode.
 * Clicking "Exit" clears the preview flag and reloads.
 */
export default function RestaurantModePreview() {
  const handleExit = () => {
    localStorage.removeItem('pc_preview_restaurant');
    window.location.reload();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 flex items-center justify-between px-4 py-2">
      <div className="flex items-center gap-2 text-amber-950 text-xs font-semibold">
        <Eye className="w-3.5 h-3.5" />
        Previewing Restaurant Mode
      </div>
      <Button
        size="sm"
        onClick={handleExit}
        className="h-6 px-3 text-xs bg-amber-950 text-amber-100 hover:bg-amber-900"
      >
        Exit Preview
      </Button>
    </div>
  );
}