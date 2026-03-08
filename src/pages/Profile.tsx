import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { User, Calendar, Mail, Phone, MapPin, Shield, Key, Edit2 } from 'lucide-react';

export default function Profile() {
  const { user, profile, role } = useAuth();
  const { toast } = useToast();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', organization: '', position: '' });

  useEffect(() => {
    if (profile) {
      setEditForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        organization: profile.organization || '',
        position: profile.position || '',
      });
    }
  }, [profile]);

  const roleLabelMap: Record<string, string> = {
    submitter: 'Applicant', judge: 'Judge', country_representative: 'Country Representative',
    secretariat: 'Secretariat', admin: 'Admin', super_admin: 'Super Admin',
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Password updated successfully' });
      setShowPasswordDialog(false);
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleProfileUpdate = async () => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({
      full_name: editForm.full_name.trim(),
      phone: editForm.phone.trim() || null,
      organization: editForm.organization.trim() || null,
      position: editForm.position.trim() || null,
    }).eq('user_id', user.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile updated' });
      setEditing(false);
      window.location.reload();
    }
  };

  const appNumber = (profile as any)?.application_number;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto animate-fade-in space-y-6">
        <h1 className="font-display text-3xl font-bold">
          My <span className="text-gradient-gold">Profile</span>
        </h1>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/20 text-3xl font-bold text-primary">
                {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 space-y-1">
                <h2 className="font-display text-2xl font-bold">{profile?.full_name || 'User'}</h2>
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/20 text-primary border-0">{role ? roleLabelMap[role] || role : 'User'}</Badge>
                  {appNumber && (
                    <Badge variant="outline" className="border-border text-xs">
                      ID: #{String(appNumber).padStart(4, '0')}
                    </Badge>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setEditing(true)}>
                <Edit2 className="h-3.5 w-3.5" /> Edit
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email
              </CardTitle>
            </CardHeader>
            <CardContent><p className="font-medium">{profile?.email || user?.email}</p></CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Phone className="h-4 w-4" /> Phone
              </CardTitle>
            </CardHeader>
            <CardContent><p className="font-medium">{profile?.phone || 'Not set'}</p></CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Country
              </CardTitle>
            </CardHeader>
            <CardContent><p className="font-medium">{profile?.country || 'Not set'}</p></CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Joined
              </CardTitle>
            </CardHeader>
            <CardContent><p className="font-medium">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Unknown'}</p></CardContent>
          </Card>
          {profile?.organization && (
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Organization
                </CardTitle>
              </CardHeader>
              <CardContent><p className="font-medium">{profile.organization}</p></CardContent>
            </Card>
          )}
          {profile?.position && (
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" /> Position
                </CardTitle>
              </CardHeader>
              <CardContent><p className="font-medium">{profile.position}</p></CardContent>
            </Card>
          )}
        </div>

        {/* Security */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" /> Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="gap-2" onClick={() => setShowPasswordDialog(true)}>
              <Key className="h-4 w-4" /> Change Password
            </Button>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editing} onOpenChange={setEditing}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader><DialogTitle className="font-display">Edit Profile</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input value={editForm.full_name} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} className="mt-1 bg-secondary" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} className="mt-1 bg-secondary" />
              </div>
              <div>
                <Label>Organization</Label>
                <Input value={editForm.organization} onChange={e => setEditForm(p => ({ ...p, organization: e.target.value }))} className="mt-1 bg-secondary" />
              </div>
              <div>
                <Label>Position</Label>
                <Input value={editForm.position} onChange={e => setEditForm(p => ({ ...p, position: e.target.value }))} className="mt-1 bg-secondary" />
              </div>
              <Button className="w-full bg-gradient-gold font-semibold" onClick={handleProfileUpdate}>Save Changes</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Password Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent className="bg-card border-border max-w-sm">
            <DialogHeader><DialogTitle className="font-display">Change Password</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>New Password</Label>
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1 bg-secondary" placeholder="Min 6 characters" />
              </div>
              <div>
                <Label>Confirm Password</Label>
                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-1 bg-secondary" />
              </div>
              <Button className="w-full bg-gradient-gold font-semibold" onClick={handlePasswordChange} disabled={changingPassword}>
                {changingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
