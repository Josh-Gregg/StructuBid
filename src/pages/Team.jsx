import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Mail, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function TeamPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('team_member');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const me = await base44.auth.me();
      setCurrentUser(me);
      if (me.role === 'admin') {
        const userList = await base44.entities.User.list();
        setUsers(userList);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    
    setIsInviting(true);
    try {
      const systemRole = inviteRole === 'admin' ? 'admin' : 'user';
      try {
        await base44.users.inviteUser(inviteEmail, systemRole);
      } catch (systemErr) {
        console.warn("System invite error:", systemErr);
      }
      
      const appUrl = window.location.origin;
      const body = `Hello,\n\nYou have been invited to join the Great White Construction app as a ${inviteRole.replace('_', ' ')}.\n\nPlease click the link below to sign in or sign up:\n${appUrl}\n\nThank you!`;
      
      await base44.integrations.Core.SendEmail({
        to: inviteEmail,
        subject: "Invitation to Great White Construction App",
        body: body,
        from_name: "Great White Construction"
      });

      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      fetchData(); // Refresh list to show new user
    } catch (err) {
      toast.error(err.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await base44.entities.User.update(userId, { role: newRole });
      toast.success('User role updated');
      fetchData();
    } catch (err) {
      toast.error('Failed to update user role');
    }
  };

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (currentUser?.role !== 'admin') return <div className="p-8 text-center font-medium text-gray-500">Unauthorized. Only admins can manage the team.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in">
      <div className="flex items-center justify-between border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Team Management</h1>
          <p className="text-gray-500 mt-1">Invite users and manage their roles within the app.</p>
        </div>
        <div className="bg-blue-50 text-blue-800 p-3 rounded-xl flex items-center gap-3">
          <Users className="w-5 h-5" />
          <span className="font-bold">{users.length} Total Users</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-4">
            <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Invite New User
            </h2>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">Email Address</Label>
                <Input 
                  type="email" 
                  placeholder="colleague@example.com" 
                  value={inviteEmail} 
                  onChange={e => setInviteEmail(e.target.value)} 
                  required 
                  className="bg-gray-50 border-gray-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="bg-gray-50 border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin (Full Access)</SelectItem>
                    <SelectItem value="team_member">Team Member (Create/Edit Proposals)</SelectItem>
                    <SelectItem value="client">Client (View/Accept Proposals)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={isInviting} className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold">
                {isInviting ? 'Sending...' : 'Send Invitation'}
                {!isInviting && <Plus className="w-4 h-4 ml-2" />}
              </Button>
            </form>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-4 px-6 font-bold text-gray-600 text-sm uppercase tracking-wider">User</th>
                  <th className="py-4 px-6 font-bold text-gray-600 text-sm uppercase tracking-wider">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                          {(u.full_name || u.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{u.full_name || 'Pending Invite'}</div>
                          <div className="text-sm text-gray-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <Select 
                        value={u.role || 'client'} 
                        onValueChange={(val) => handleRoleChange(u.id, val)}
                        disabled={u.id === currentUser.id}
                      >
                        <SelectTrigger className="w-40 bg-white border-gray-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="team_member">Team Member</SelectItem>
                          <SelectItem value="client">Client</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No users found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}