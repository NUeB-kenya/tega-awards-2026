import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function SecretariatUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');
      if (!roles?.length) { setLoading(false); return; }

      const userIds = [...new Set(roles.map(r => r.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', userIds);

      const roleMap: Record<string, string[]> = {};
      roles.forEach(r => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });

      const enriched = (profiles || []).map(p => ({
        ...p,
        roles: roleMap[p.user_id] || [],
      }));
      setUsers(enriched);
      setLoading(false);
    };
    fetch();
  }, []);

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      secretariat: 'bg-destructive/20 text-destructive',
      judge: 'bg-primary/20 text-primary',
      submitter: 'bg-success/20 text-success',
    };
    return <Badge key={role} className={`${colors[role] || ''} border-0 mr-1`}>{role}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <h1 className="mb-2 font-display text-3xl font-bold">Manage <span className="text-gradient-gold">Users</span></h1>
        <p className="mb-8 text-muted-foreground">View all registered users and their roles</p>

        <Card className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : users.map(u => (
                <TableRow key={u.id} className="border-border">
                  <TableCell className="font-medium">{u.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>{u.roles.map((r: string) => roleBadge(r))}</TableCell>
                  <TableCell>{u.organization || 'N/A'}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  );
}
