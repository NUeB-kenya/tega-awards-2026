import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Send } from 'lucide-react';

type AudienceMode = 'role' | 'user';

const ROLE_OPTIONS = [
  { value: 'submitter', label: 'All Applicants' },
  { value: 'judge', label: 'All Judges' },
  { value: 'country_representative', label: 'All Country Representatives' },
  { value: 'secretariat', label: 'All Secretariat' },
  { value: 'admin', label: 'All Admins' },
  { value: 'super_admin', label: 'All Super Admins' },
  { value: 'all', label: 'Everyone' },
];

export default function AdminMessaging() {
  const { toast } = useToast();
  const [audienceMode, setAudienceMode] = useState<AudienceMode>('role');
  const [targetRole, setTargetRole] = useState('submitter');
  const [targetUserId, setTargetUserId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<any[]>([]);

  useEffect(() => {
    const fetchRecipients = async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, email, country').order('full_name'),
        supabase.from('user_roles').select('user_id, role'),
      ]);
      setProfiles(profilesRes.data || []);
      setUserRoles(rolesRes.data || []);
    };

    fetchRecipients();
  }, []);

  const roleMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    userRoles.forEach((r: any) => {
      if (!map[r.user_id]) map[r.user_id] = [];
      map[r.user_id].push(r.role);
    });
    return map;
  }, [userRoles]);

  const recipientCount = useMemo(() => {
    if (audienceMode === 'user') return targetUserId ? 1 : 0;
    if (targetRole === 'all') return new Set(userRoles.map((r: any) => r.user_id)).size;
    return userRoles.filter((r: any) => r.role === targetRole).length;
  }, [audienceMode, targetRole, targetUserId, userRoles]);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: 'Fill all fields', variant: 'destructive' });
      return;
    }

    if (audienceMode === 'user' && !targetUserId) {
      toast({ title: 'Select a recipient', variant: 'destructive' });
      return;
    }

    if (audienceMode === 'role' && !targetRole) {
      toast({ title: 'Select a target role', variant: 'destructive' });
      return;
    }

    setSending(true);

    let userIds: string[] = [];
    if (audienceMode === 'user') {
      userIds = [targetUserId];
    } else if (targetRole === 'all') {
      userIds = [...new Set(userRoles.map((r: any) => r.user_id))];
    } else {
      userIds = userRoles.filter((r: any) => r.role === targetRole).map((r: any) => r.user_id);
    }

    if (userIds.length === 0) {
      setSending(false);
      toast({ title: 'No recipients found for this selection', variant: 'destructive' });
      return;
    }

    const notifications = userIds.map((uid) => ({
      user_id: uid,
      title: title.trim(),
      message: message.trim(),
      type: 'info' as const,
    }));

    const { error } = await supabase.from('notifications').insert(notifications);

    setSending(false);

    if (error) {
      toast({ title: 'Message sending failed', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: `Message sent to ${userIds.length} recipient${userIds.length > 1 ? 's' : ''}` });
    setTitle('');
    setMessage('');
    if (audienceMode === 'user') setTargetUserId('');
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl animate-fade-in">
        <h1 className="mb-2 font-display text-3xl font-bold">
          <span className="text-gradient-gold">Broadcast</span> Message
        </h1>
        <p className="mb-8 text-muted-foreground">Send in-app notifications by role or individual profile</p>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display">Compose Message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Audience Type</Label>
              <Select value={audienceMode} onValueChange={(v) => setAudienceMode(v as AudienceMode)}>
                <SelectTrigger className="mt-1 bg-secondary"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="role">By Role</SelectItem>
                  <SelectItem value="user">By Individual Profile</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {audienceMode === 'role' ? (
              <div>
                <Label>Send To</Label>
                <Select value={targetRole} onValueChange={setTargetRole}>
                  <SelectTrigger className="mt-1 bg-secondary"><SelectValue placeholder="Select audience" /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label>Select Profile</Label>
                <Select value={targetUserId} onValueChange={setTargetUserId}>
                  <SelectTrigger className="mt-1 bg-secondary"><SelectValue placeholder="Choose a user" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        {p.full_name} ({p.email}) {p.country ? `· ${p.country}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {targetUserId && roleMap[targetUserId]?.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">Roles: {roleMap[targetUserId].join(', ')}</p>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground">Recipients: {recipientCount}</p>

            <div>
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 bg-secondary"
                placeholder="Notification title"
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1 min-h-[120px] bg-secondary" placeholder="Write your message..." />
            </div>
            <Button className="w-full gap-2 bg-gradient-gold font-semibold" onClick={handleSend} disabled={sending}>
              <Send className="h-4 w-4" />
              {sending ? 'Sending...' : 'Send Notification'}
            </Button>

            <p className="text-xs text-muted-foreground">Note: this sends in-app notifications. Email delivery requires dedicated email provider integration.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
