import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Trash2 } from 'lucide-react';

export default function SecretariatUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'super_admin';

  const fetchUsers = async () => {
    const { data: roles } = await supabase.from('user_roles').select('id, user_id, role');
    if (!roles?.length) { setLoading(false); return; }
    const userIds = [...new Set(roles.map(r => r.user_id))];
    const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', userIds);
    const roleMap: Record<string, { role: string; roleId: string }> = {};
    roles.forEach(r => { roleMap[r.user_id] = { role: r.role, roleId: r.id }; });
    const enriched = (profiles || []).map(p => ({ ...p, currentRole: roleMap[p.user_id]?.role || 'submitter', roleId: roleMap[p.user_id]?.roleId }));
    setUsers(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const updateRole = async (userId: string, roleId: string, newRole: string, oldRole: string) => {
    if (newRole === 'judge' && oldRole === 'submitter') {
      await supabase.from('submissions').delete().eq('submitter_id', userId);
    }
    if (newRole === 'submitter' && oldRole !== 'submitter') {
      await supabase.from('submissions').update({ is_locked: false, submission_count: 0 }).eq('submitter_id', userId);
    }
    const { error } = await supabase.from('user_roles').update({ role: newRole as any }).eq('id', roleId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Role updated to ${newRole}` });
      await supabase.from('notifications').insert({
        user_id: userId,
        title: `Role Updated to ${newRole.charAt(0).toUpperCase() + newRole.slice(1)}`,
        message: newRole === 'judge'
          ? 'You have been promoted to Judge. Log in to start reviewing applications from your region.'
          : `Your role has been updated to ${newRole}.`,
        type: 'info',
      });
      fetchUsers();
    }
  };

  const deleteUser = async (userId: string, userName: string) => {
    setDeleting(userId);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: `User "${userName}" has been permanently deleted.` });
      fetchUsers();
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    }
    setDeleting(null);
  };

  const roleBadgeColors: Record<string, string> = {
    secretariat: 'bg-destructive/20 text-destructive',
    judge: 'bg-primary/20 text-primary',
    submitter: 'bg-success/20 text-success',
    applicant: 'bg-success/20 text-success',
    admin: 'bg-accent/20 text-accent',
  };

  const roleDisplayName = (role: string) => role === 'submitter' ? 'Applicant' : role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <h1 className="mb-2 font-display text-3xl font-bold">Manage <span className="text-gradient-gold">Users</span></h1>
        <p className="mb-8 text-muted-foreground">View users, update roles (Applicant → Judge / Admin). Promoting to Judge deletes their submissions.{isAdmin && ' Admins can permanently delete user accounts.'}</p>

        <Card className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Current Role</TableHead>
                <TableHead>Change Role</TableHead>
                <TableHead>Credentials</TableHead>
                <TableHead>Joined</TableHead>
                {isAdmin && <TableHead>Activity</TableHead>}
                {isAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={isAdmin ? 9 : 7} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>

              ) : users.map(u => (
                <TableRow key={u.id} className="border-border">
                  <TableCell className="font-medium">{u.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>{u.country || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge className={`${roleBadgeColors[u.currentRole] || ''} border-0`}>{roleDisplayName(u.currentRole)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Select value={u.currentRole} onValueChange={v => updateRole(u.user_id, u.roleId, v, u.currentRole)}>
                      <SelectTrigger className="w-[130px] h-8 text-xs bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="submitter">Applicant</SelectItem>
                        <SelectItem value="judge">Judge</SelectItem>
                        <SelectItem value="country_representative">Country Representative</SelectItem>
                        <SelectItem value="secretariat">Secretariat</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {u.credentials_path ? (
                      <Button variant="ghost" size="sm" className="text-xs" onClick={async () => {
                        const { data } = await supabase.storage.from('documents').createSignedUrl(u.credentials_path, 3600);
                        if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                      }}>View</Button>
                    ) : <span className="text-xs text-muted-foreground">None</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={deleting === u.user_id}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>⚠️ Permanently Delete User</AlertDialogTitle>
                            <AlertDialogDescription>
                              You are about to <strong>permanently delete</strong> the account of <strong>{u.full_name}</strong> ({u.email}).
                              <br /><br />
                              This will remove:
                              <ul className="list-disc ml-4 mt-2 space-y-1">
                                <li>Their profile and authentication credentials</li>
                                <li>All their submissions, scores, and rankings</li>
                                <li>All notifications and judge assignments</li>
                              </ul>
                              <br />
                              <strong className="text-destructive">This action is irreversible.</strong>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteUser(u.user_id, u.full_name)}
                            >
                              {deleting === u.user_id ? 'Deleting...' : 'Delete Permanently'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  );
}
