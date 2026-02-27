import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import tegaLogo from '@/assets/tega-logo.png';

export default function Auth() {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupCountry, setSignupCountry] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Hidden admin login: 5 taps on bottom-right logo
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [showAdminLogin, setShowAdminLogin] = useState(false);

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
    if (!signupCountry.trim()) {
      toast({ title: 'Country required', description: 'Please enter your country.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName, signupCountry);
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
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-dark p-4 pb-24">
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
                    <Label htmlFor="signup-country">Country</Label>
                    <Input id="signup-country" value={signupCountry} onChange={e => setSignupCountry(e.target.value)} placeholder="e.g. Kenya" required className="mt-1.5 bg-secondary border-border" />
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
      </div>

      <p className="mt-4 max-w-sm px-4 text-center text-xs text-muted-foreground">
        Terms and conditions apply. By signing in or creating an account, you agree to the TEGA Awards{' '}
        <span className="cursor-pointer underline text-primary">Terms and Conditions</span> and{' '}
        <span className="cursor-pointer underline text-primary">Privacy Policy</span>.
      </p>

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
