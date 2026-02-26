import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, Trash2 } from 'lucide-react';

export default function SecretariatPanels() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [panels, setPanels] = useState<any[]>([]);
  const [panelJudges, setPanelJudges] = useState<Record<string, any[]>>({});
  const [categories, setCategories] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [judges, setJudges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddJudge, setShowAddJudge] = useState<string | null>(null);
  const [selectedJudge, setSelectedJudge] = useState('');

  const [newPanel, setNewPanel] = useState({ name: '', level: 'national', country_id: '', region_id: '', category_id: '' });

  const fetchData = async () => {
    const [panelsRes, catsRes, countriesRes, regionsRes, rolesRes, profilesRes, pjRes] = await Promise.all([
      supabase.from('panels').select('*'),
      supabase.from('categories').select('*').order('id'),
      supabase.from('countries').select('*').order('name'),
      supabase.from('regions').select('*'),
      supabase.from('user_roles').select('user_id').eq('role', 'judge'),
      supabase.from('profiles').select('*'),
      supabase.from('panel_judges').select('*'),
    ]);

    setPanels(panelsRes.data || []);
    setCategories(catsRes.data || []);
    setCountries(countriesRes.data || []);
    setRegions(regionsRes.data || []);

    const judgeIds = rolesRes.data?.map(r => r.user_id) || [];
    const judgeProfiles = profilesRes.data?.filter(p => judgeIds.includes(p.user_id)) || [];
    setJudges(judgeProfiles);

    const pjMap: Record<string, any[]> = {};
    (pjRes.data || []).forEach(pj => {
      if (!pjMap[pj.panel_id]) pjMap[pj.panel_id] = [];
      const profile = profilesRes.data?.find(p => p.user_id === pj.judge_id);
      pjMap[pj.panel_id].push({ ...pj, profile });
    });
    setPanelJudges(pjMap);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const createPanel = async () => {
    if (!newPanel.name || !newPanel.level) {
      toast({ title: 'Name and level required', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('panels').insert({
      name: newPanel.name,
      level: newPanel.level,
      country_id: newPanel.country_id || null,
      region_id: newPanel.region_id || null,
      category_id: newPanel.category_id ? parseInt(newPanel.category_id) : null,
      chair_id: null,
    });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Panel created!' });
      setShowCreate(false);
      setNewPanel({ name: '', level: 'national', country_id: '', region_id: '', category_id: '' });
      fetchData();
    }
  };

  const addJudgeToPanel = async () => {
    if (!showAddJudge || !selectedJudge) return;
    const { error } = await supabase.from('panel_judges').insert({ panel_id: showAddJudge, judge_id: selectedJudge });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Judge added to panel' });
      setShowAddJudge(null);
      setSelectedJudge('');
      fetchData();
    }
  };

  const removeJudge = async (pjId: string) => {
    await supabase.from('panel_judges').delete().eq('id', pjId);
    toast({ title: 'Judge removed' });
    fetchData();
  };

  const levelColor = (level: string) => {
    if (level === 'national') return 'bg-primary/20 text-primary';
    if (level === 'regional') return 'bg-warning/20 text-warning';
    return 'bg-success/20 text-success';
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold">Judging <span className="text-gradient-gold">Panels</span></h1>
            <p className="mt-1 text-muted-foreground">Create and manage National, Regional, and Global panels</p>
          </div>
          <Button className="bg-gradient-gold gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Create Panel
          </Button>
        </div>

        {loading ? <p className="text-muted-foreground">Loading...</p> : (
          <div className="space-y-4">
            {panels.map(panel => {
              const cat = categories.find(c => c.id === panel.category_id);
              const country = countries.find(c => c.id === panel.country_id);
              const region = regions.find(r => r.id === panel.region_id);
              const judges_list = panelJudges[panel.id] || [];

              return (
                <Card key={panel.id} className="glass-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="font-display text-lg">{panel.name || 'Unnamed Panel'}</CardTitle>
                        <Badge className={`${levelColor(panel.level)} border-0 text-xs`}>{panel.level}</Badge>
                      </div>
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowAddJudge(panel.id)}>
                        <Users className="h-3 w-3" /> Add Judge
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {cat?.name || 'All categories'} · {country ? `${country.flag_emoji} ${country.name}` : region?.name || 'Global'}
                    </p>
                  </CardHeader>
                  <CardContent>
                    {judges_list.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No judges assigned yet</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {judges_list.map((pj: any) => (
                          <div key={pj.id} className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-1.5 text-sm">
                            <span>{pj.profile?.full_name || 'Unknown'}</span>
                            <span className="text-xs text-muted-foreground">{pj.profile?.country || ''}</span>
                            <button onClick={() => removeJudge(pj.id)} className="text-muted-foreground hover:text-destructive ml-1">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {panels.length === 0 && <p className="text-muted-foreground text-center py-12">No panels created yet. Create one to start assigning judges.</p>}
          </div>
        )}

        {/* Create Panel Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader><DialogTitle className="font-display">Create New Panel</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Panel Name *</Label>
                <Input value={newPanel.name} onChange={e => setNewPanel(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Kenya National Panel" className="mt-1 bg-secondary" />
              </div>
              <div>
                <Label>Level *</Label>
                <Select value={newPanel.level} onValueChange={v => setNewPanel(p => ({ ...p, level: v }))}>
                  <SelectTrigger className="mt-1 bg-secondary"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="national">National</SelectItem>
                    <SelectItem value="regional">Regional</SelectItem>
                    <SelectItem value="global">Global</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newPanel.level === 'national' && (
                <div>
                  <Label>Country</Label>
                  <Select value={newPanel.country_id} onValueChange={v => setNewPanel(p => ({ ...p, country_id: v }))}>
                    <SelectTrigger className="mt-1 bg-secondary"><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>{countries.map(c => <SelectItem key={c.id} value={c.id}>{c.flag_emoji} {c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {newPanel.level === 'regional' && (
                <div>
                  <Label>Region</Label>
                  <Select value={newPanel.region_id} onValueChange={v => setNewPanel(p => ({ ...p, region_id: v }))}>
                    <SelectTrigger className="mt-1 bg-secondary"><SelectValue placeholder="Select region" /></SelectTrigger>
                    <SelectContent>{regions.filter(r => r.id !== 'global').map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Category (optional)</Label>
                <Select value={newPanel.category_id} onValueChange={v => setNewPanel(p => ({ ...p, category_id: v }))}>
                  <SelectTrigger className="mt-1 bg-secondary"><SelectValue placeholder="All categories" /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button className="w-full bg-gradient-gold font-semibold" onClick={createPanel}>Create Panel</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Judge to Panel Dialog */}
        <Dialog open={!!showAddJudge} onOpenChange={() => setShowAddJudge(null)}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader><DialogTitle className="font-display">Add Judge to Panel</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Select Judge</Label>
                <Select value={selectedJudge} onValueChange={setSelectedJudge}>
                  <SelectTrigger className="mt-1 bg-secondary"><SelectValue placeholder="Choose a judge" /></SelectTrigger>
                  <SelectContent>
                    {judges.map(j => (
                      <SelectItem key={j.user_id} value={j.user_id}>{j.full_name} ({j.country || 'No country'})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full bg-gradient-gold font-semibold" onClick={addJudgeToPanel}>Add Judge</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
