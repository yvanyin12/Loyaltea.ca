import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, ShieldOff, Loader2, UserPlus } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [me, setMe] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.User.list(),
      base44.auth.me(),
    ]).then(([allUsers, currentUser]) => {
      setUsers(allUsers);
      setMe(currentUser);
      setLoading(false);
    });
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;
    setInviting(true);
    setInviteMsg(null);
    try {
      await base44.users.inviteUser(email, 'admin');
      setInviteMsg({ type: 'success', text: `Invite sent to ${email}` });
      setInviteEmail('');
      // Refresh user list
      const allUsers = await base44.entities.User.list();
      setUsers(allUsers);
    } catch (err) {
      setInviteMsg({ type: 'error', text: err.message || 'Failed to send invite' });
    }
    setInviting(false);
  };

  const toggleAdmin = async (user) => {
    setUpdating(user.id);
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    await base44.entities.User.update(user.id, { role: newRole });
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u));
    setUpdating(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Invite form */}
      <form onSubmit={handleInvite} className="flex gap-2">
        <Input
          type="email"
          placeholder="Email address"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm h-9"
        />
        <Button type="submit" size="sm" disabled={inviting || !inviteEmail.trim()} className="gap-1.5 shrink-0">
          {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
          Invite Admin
        </Button>
      </form>
      {inviteMsg && (
        <p className={`text-xs ${inviteMsg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
          {inviteMsg.text}
        </p>
      )}
      <div className="space-y-3">
      {users.map((user) => {
        const isMe = user.id === me?.id;
        const isAdmin = user.role === 'admin';
        return (
          <div key={user.id} className="flex items-center justify-between bg-slate-800/60 rounded-xl px-4 py-3 border border-slate-700/50">
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{user.full_name || '—'}</p>
              <p className="text-slate-400 text-xs truncate">{user.email}</p>
            </div>
            <div className="flex items-center gap-2 ml-3 shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isAdmin ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' : 'bg-slate-700/60 text-slate-400'
              }`}>
                {isAdmin ? 'Admin' : 'User'}
              </span>
              {!isMe && (
                <Button
                  size="sm"
                  variant="ghost"
                  className={`gap-1.5 text-xs h-7 px-2 ${isAdmin ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20' : 'text-blue-400 hover:text-blue-300 hover:bg-blue-900/20'}`}
                  onClick={() => toggleAdmin(user)}
                  disabled={updating === user.id}
                >
                  {updating === user.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : isAdmin ? (
                    <><ShieldOff className="w-3 h-3" /> Remove</>
                  ) : (
                    <><Shield className="w-3 h-3" /> Make Admin</>
                  )}
                </Button>
              )}
              {isMe && <span className="text-xs text-slate-500 italic">you</span>}
            </div>
          </div>
        );
      })}
      {users.length === 0 && (
        <p className="text-slate-500 text-sm text-center py-4">No users found.</p>
      )}
    </div>
  );
}