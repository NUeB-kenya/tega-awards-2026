import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, Check } from 'lucide-react';
import tegaLogo from '@/assets/tega-logo.png';

interface CountryOption {
  id: string;
  name: string;
  phone_code: string;
  flag_emoji: string;
}

export default function Auth() {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryOption | null>(null);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [countryOpen, setCountryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Hidden admin login: 5 taps on bottom-right logo
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  useEffect(() => {
    supabase.from('countries').select('id, name, phone_code, flag_emoji').order('name').then(({ data }) => {
      if (data) setCountries(data as CountryOption[]);
    });
  }, []);

  const handleSecretTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 2000);
    if (tapCountRef.current >= 5) {
      setShowAdminLogin(true);
      tapCountRef.current = 0;
    }
  };

  if (user) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);
    if (error) {
      toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
    } else {
      navigate('/dashboard');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCountry) {
      toast({ title: 'Country required', description: 'Please select your country code.', variant: 'destructive' });
      return;
    }
    if (!phoneNumber.trim() || phoneNumber.trim().length < 6) {
      toast({ title: 'Phone required', description: 'Please enter a valid phone number.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const fullPhone = `${selectedCountry.phone_code}${phoneNumber.trim()}`;
    const { error } = await signUp(signupEmail, signupPassword, signupName, selectedCountry.name, fullPhone);
    setIsLoading(false);
    if (error) {
      toast({ title: 'Signup failed', description: error.message, variant: 'destructive' });
    } else {
      toast({
        title: 'Check your email!',
        description: 'We sent you a verification link. Please verify your email before logging in.',
      });
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-dark p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 flex flex-col items-center gap-3">
          <img src={tegaLogo} alt="TEGA" className="h-24 w-auto max-w-[240px] object-contain" />
          <h1 className="font-display text-3xl font-bold">
            <span className="text-foreground">TEGA </span>
            <span className="text-gradient-gold">Portal</span>
          </h1>
          <p className="text-sm text-muted-foreground text-center">
            Transforming Education Global Awards
          </p>
        </div>

        <Card className="glass-card glow-gold">
          <Tabs defaultValue={showAdminLogin ? 'admin' : 'login'}>
            <CardHeader className="pb-4">
              <TabsList className={`grid w-full ${showAdminLogin ? 'grid-cols-3' : 'grid-cols-2'} bg-secondary`}>
                <TabsTrigger value="login">Log In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                {showAdminLogin && <TabsTrigger value="admin">Admin</TabsTrigger>}
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="login" className="mt-0">
                <CardTitle className="mb-1 font-display text-xl">Welcome Back</CardTitle>
                <CardDescription className="mb-6">Sign in to access your dashboard</CardDescription>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="you@example.com" required className="mt-1.5 bg-secondary border-border" />
                  </div>
                  <div>
                    <Label htmlFor="login-password">Password</Label>
                    <Input id="login-password" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" required className="mt-1.5 bg-secondary border-border" />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-gold font-semibold" disabled={isLoading}>
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <CardTitle className="mb-1 font-display text-xl">Create Account</CardTitle>
                <CardDescription className="mb-6">Sign up as an applicant for the TEGA Awards</CardDescription>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input id="signup-name" value={signupName} onChange={e => setSignupName(e.target.value)} placeholder="Your full name" required className="mt-1.5 bg-secondary border-border" />
                  </div>
                  <div>
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} placeholder="you@example.com" required className="mt-1.5 bg-secondary border-border" />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <div className="mt-1.5 flex gap-2">
                      <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className="w-[140px] shrink-0 justify-between bg-secondary border-border text-sm px-2">
                            {selectedCountry ? (
                              <span className="truncate">{selectedCountry.flag_emoji} {selectedCountry.phone_code}</span>
                            ) : (
                              <span className="text-muted-foreground">Code</span>
                            )}
                            <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[260px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search country..." />
                            <CommandList>
                              <CommandEmpty>No country found.</CommandEmpty>
                              <CommandGroup>
                                {countries.map(c => (
                                  <CommandItem
                                    key={c.id}
                                    value={`${c.name} ${c.phone_code}`}
                                    onSelect={() => { setSelectedCountry(c); setCountryOpen(false); }}
                                  >
                                    <span className="mr-2">{c.flag_emoji}</span>
                                    <span className="flex-1 truncate">{c.name}</span>
                                    <span className="text-muted-foreground text-xs">{c.phone_code}</span>
                                    {selectedCountry?.id === c.id && <Check className="ml-2 h-4 w-4" />}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <Input
                        type="tel"
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="712345678"
                        required
                        className="flex-1 bg-secondary border-border"
                      />
                    </div>
                    {selectedCountry && (
                      <p className="mt-1 text-xs text-muted-foreground">Country: {selectedCountry.flag_emoji} {selectedCountry.name}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="signup-password">Password</Label>
                    <Input id="signup-password" type="password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} placeholder="Min 6 characters" required minLength={6} className="mt-1.5 bg-secondary border-border" />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-gold font-semibold" disabled={isLoading}>
                    {isLoading ? 'Creating account...' : 'Create Applicant Account'}
                  </Button>
                </form>
              </TabsContent>

              {showAdminLogin && (
                <TabsContent value="admin" className="mt-0">
                  <CardTitle className="mb-1 font-display text-xl">Admin Access</CardTitle>
                  <CardDescription className="mb-6">Restricted administrative login</CardDescription>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label>Email</Label>
                      <Input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="admin@tega.org" required className="mt-1.5 bg-secondary border-border" />
                    </div>
                    <div>
                      <Label>Password</Label>
                      <Input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" required className="mt-1.5 bg-secondary border-border" />
                    </div>
                    <Button type="submit" className="w-full bg-gradient-gold font-semibold" disabled={isLoading}>
                      {isLoading ? 'Signing in...' : 'Admin Sign In'}
                    </Button>
                  </form>
                </TabsContent>
              )}
            </CardContent>
          </Tabs>
        </Card>

        <p className="mt-6 max-w-sm px-4 text-center text-xs text-muted-foreground">
          By creating an account, you agree to the TEGA Awards{' '}
          <Link to="/terms" className="underline text-primary hover:text-primary/80">Terms and Conditions</Link> and{' '}
          <Link to="/privacy" className="underline text-primary hover:text-primary/80">Privacy Policy</Link>.
        </p>
      </div>

      {/* Hidden 5-tap trigger for admin login */}
      <div
        className="absolute bottom-4 right-4 opacity-10 cursor-default select-none"
        onClick={handleSecretTap}
      >
        <img src={tegaLogo} alt="" className="h-8 w-auto max-w-[80px] object-contain" />
      </div>
    </div>
  );
}
