import { FormEvent, useEffect, useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRecovery, setIsRecovery] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    setIsRecovery(hash.get('type') === 'recovery');

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: 'Password update failed', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Password updated', description: 'You can now continue to ToffeeCal.' });
    navigate('/dashboard', { replace: true });
  };

  return (
    <main className="min-h-screen bg-background px-5 py-12 flex items-center justify-center">
      <section className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <img src="/images/toffeecal-logo.webp" alt="ToffeeCal" className="w-14 h-14 rounded-2xl mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Set a new password</h1>
          <p className="text-sm text-muted-foreground">Choose a secure password for your account.</p>
        </div>

        {isRecovery ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" minLength={6} required className="h-12 pl-10 rounded-xl" />
            </div>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" minLength={6} required className="h-12 rounded-xl" />
            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Update Password'}
            </Button>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">This reset link is invalid or has expired. Request a new link from the sign-in screen.</p>
            <Button variant="outline" className="w-full h-12 rounded-xl" onClick={() => navigate('/dashboard')}>Back to sign in</Button>
          </div>
        )}
      </section>
    </main>
  );
}