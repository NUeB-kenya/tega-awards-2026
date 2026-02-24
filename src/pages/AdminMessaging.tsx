import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Send } from 'lucide-react';

export default function AdminMessaging() {
  const { toast } = useToast();
  const [target, setTarget] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!target || !title || !message) {
      toast({ title: 'Fill all fields', variant: 'destructive' });
      return;
    }
    setSending(true);

    // Get user IDs by role
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');
    let userIds: string[] = [];

    if (target === 'all') {
      userIds = [...new Set(roles?.map(r => r.user_id) || [])];
    } else {
      userIds = roles?.filter(r => r.role === target).map(r => r.user_id) || [];
    }

    // Insert notifications for all
    const notifications = userIds.map(uid => ({
      user_id: uid,
      title,
      message,
      type: 'info' as const,
    }));

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    toast({ title: `Message sent to ${userIds.length} ${target} users!` });
    setTitle('');
    setMessage('');
    setSending(false);
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in max-w-2xl">
        <h1 className="mb-2 font-display text-3xl font-bold">
          <span className="text-gradient-gold">Broadcast</span> Message
        </h1>
        <p className="mb-8 text-muted-foreground">Send notifications to groups of users</p>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display">Compose Message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Send To</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger className="mt-1 bg-secondary"><SelectValue placeholder="Select audience" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="submitter">All Applicants</SelectItem>
                  <SelectItem value="judge">All Judges</SelectItem>
                  <SelectItem value="secretariat">All Secretariat</SelectItem>
                  <SelectItem value="all">Everyone</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm"
                placeholder="Notification title"
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea value={message} onChange={e => setMessage(e.target.value)} className="mt-1 bg-secondary min-h-[120px]" placeholder="Write your message..." />
            </div>
            <Button className="w-full bg-gradient-gold font-semibold gap-2" onClick={handleSend} disabled={sending}>
              <Send className="h-4 w-4" />
              {sending ? 'Sending...' : 'Send Notification'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
