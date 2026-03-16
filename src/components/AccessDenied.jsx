import { base44 } from '@/api/base44Client';
import { ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AccessDenied() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-red-900/30 border border-red-700/40">
          <ShieldOff className="w-8 h-8 text-red-400" />
        </div>
        <div>
          <h1 className="text-white text-2xl font-bold">Access Denied</h1>
          <p className="text-slate-400 text-sm mt-2">
            You do not have permission to access this app.
            <br />
            Please contact the administrator to request access.
          </p>
        </div>
        <Button
          variant="outline"
          className="border-slate-700 text-slate-300 hover:text-white"
          onClick={() => base44.auth.logout()}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}