import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, ChevronDown, Check, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { COUNTRY_CODES, flagEmoji, toE164, isValidE164 } from '@/lib/country-codes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { lovable } from '@/integrations/lovable/index';
import { supabase } from '@/integrations/supabase/client';

type MedianGoogleLoginResponse = {
  idToken?: string;
  error?: string;
  type?: 'google' | string;
};

declare global {
  interface Window {
    median?: {
      socialLogin?: {
        google?: {
          login?: (options: { callback: (response: MedianGoogleLoginResponse) => void }) => void;
        };
      };
    };
  }
}

// Use the app's web origin as the OAuth redirect. Lovable's OAuth broker only
// allows redirect URIs on the project's lovable.app domains and configured
// custom domains — custom URL schemes (e.g. `toffeecal://`) are rejected with
// "redirect_uri is not allowed". Native wrappers (Median, Capacitor) must use
// Universal Links / App Links configured at the wrapper level to bounce the
// HTTPS callback back into the native app.
function getOAuthRedirectUri(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

function isMedianApp(): boolean {
  if (typeof window === 'undefined') return false;
  return /median|gonative/i.test(window.navigator.userAgent) || Boolean(window.median);
}

function canUseMedianNativeGoogleLogin(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof window.median?.socialLogin?.google?.login === 'function';
}

async function signInWithMedianNativeGoogle(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const login = window.median?.socialLogin?.google?.login;

    if (typeof login !== 'function') {
      reject(new Error('Native Google sign-in is not available in this app build.'));
      return;
    }

    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('Google sign-in timed out. Please try again.'));
    }, 120000);

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      fn();
    };

    try {
      login({
        callback: (response) => {
          if (response.error) {
            settle(() => reject(new Error(response.error)));
            return;
          }

          if (!response.idToken) {
            settle(() => reject(new Error('No Google ID token was returned.')));
            return;
          }

          supabase.auth
            .signInWithIdToken({ provider: 'google', token: response.idToken })
            .then(({ error }) => {
              settle(() => {
                if (error) reject(error);
                else resolve();
              });
            })
            .catch((error) => {
              settle(() => reject(error instanceof Error ? error : new Error(String(error))));
            });
        },
      });
    } catch (error) {
      settle(() => reject(error instanceof Error ? error : new Error(String(error))));
    }
  });
}

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  // Phone OTP state
  const [phone, setPhone] = useState('');
  const [countryIso, setCountryIso] = useState('IN'); // default India per project locale
  const [countryOpen, setCountryOpen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isPhoneLoading, setIsPhoneLoading] = useState(false);

  const { signIn, signUp, resetPassword } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = isLogin
      ? await signIn(email, password)
      : await signUp(email, password);

    setIsLoading(false);

    if (error) {
      const invalidCredentials = isLogin && /invalid login credentials/i.test(error.message);
      toast({
        title: isLogin ? "Sign in failed" : "Sign up failed",
        description: invalidCredentials
          ? 'Incorrect password. If you created this account with Google, use Continue with Google instead.'
          : error.message,
        variant: "destructive",
      });
    } else if (!isLogin) {
      toast({
        title: "Check your email",
        description: "We've sent you a verification link to complete signup.",
      });
    } else {
      onOpenChange(false);
    }
  };

  // Resolve currently selected country (fallback to first entry).
  const selectedCountry =
    COUNTRY_CODES.find((c) => c.code === countryIso) ?? COUNTRY_CODES[0];

  // Build the E.164 number from the selected dial code + local input.
  const e164Phone = toE164(selectedCountry.dial, phone);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidE164(e164Phone)) {
      toast({
        title: 'Invalid phone number',
        description: 'Please enter a valid number for the selected country.',
        variant: 'destructive',
      });
      return;
    }
    setIsPhoneLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone: e164Phone,
    });
    setIsPhoneLoading(false);
    if (error) {
      toast({ title: 'Could not send code', description: error.message, variant: 'destructive' });
    } else {
      setOtpSent(true);
      toast({ title: 'Code sent', description: 'Check your phone for the 6-digit code.' });
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPhoneLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: e164Phone,
      token: otpCode,
      type: 'sms',
    });
    setIsPhoneLoading(false);
    if (error) {
      toast({ title: 'Verification failed', description: error.message, variant: 'destructive' });
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden rounded-2xl">
        <div className="p-6">
          <DialogHeader className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <img src="/images/toffeecal-logo.webp" alt="ToffeeCal" className="w-14 h-14 rounded-2xl" width="56" height="56" />
            </div>
            <DialogTitle className="text-xl font-bold text-foreground">
              Welcome to toffeecal
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Sign in to track your nutrition journey
            </DialogDescription>
          </DialogHeader>

          {/* Method switcher: email vs phone */}
          <div className="flex bg-muted rounded-full p-1 mb-4">
            <button
              type="button"
              onClick={() => { setAuthMethod('email'); setOtpSent(false); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-full transition-all ${
                authMethod === 'email' ? 'bg-card text-foreground shadow-sm' : 'text-foreground/60'
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => setAuthMethod('phone')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-full transition-all ${
                authMethod === 'phone' ? 'bg-card text-foreground shadow-sm' : 'text-foreground/60'
              }`}
            >
              Phone
            </button>
          </div>

          {authMethod === 'email' && (
          <>
          <div className="flex bg-muted rounded-full p-1 mb-6">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-full transition-all ${
                isLogin
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-foreground/60'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-full transition-all ${
                !isLogin
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-foreground/60'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 rounded-xl"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-12 rounded-xl"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground p-1"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {isLogin && (
              <div className="flex justify-end -mt-2">
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-xs"
                  onClick={async () => {
                    if (!email.trim()) {
                      toast({ title: 'Enter your email first', description: 'Then tap Forgot password again.' });
                      return;
                    }
                    const { error } = await resetPassword(email.trim());
                    toast(error
                      ? { title: 'Could not send reset link', description: error.message, variant: 'destructive' }
                      : { title: 'Check your email', description: 'We sent you a password reset link.' });
                  }}
                >
                  Forgot password?
                </Button>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </Button>
          </form>
          </>
          )}

          {authMethod === 'phone' && (
            <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
              {/* Country selector + local number. Combined into one rounded group. */}
              <div className="flex gap-2">
                <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={countryOpen}
                      disabled={otpSent}
                      className="h-12 rounded-xl px-3 gap-1.5 shrink-0"
                    >
                      <span className="text-lg leading-none">{flagEmoji(selectedCountry.code)}</span>
                      <span className="text-sm font-medium">{selectedCountry.dial}</span>
                      <ChevronDown className="h-4 w-4 opacity-60" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search country…" />
                      <CommandList>
                        <CommandEmpty>No country found.</CommandEmpty>
                        <CommandGroup>
                          {COUNTRY_CODES.map((c) => (
                            <CommandItem
                              key={`${c.code}-${c.dial}`}
                              value={`${c.name} ${c.dial} ${c.code}`}
                              onSelect={() => {
                                setCountryIso(c.code);
                                setCountryOpen(false);
                              }}
                              className="gap-2"
                            >
                              <span className="text-lg leading-none">{flagEmoji(c.code)}</span>
                              <span className="flex-1 truncate">{c.name}</span>
                              <span className="text-xs text-muted-foreground">{c.dial}</span>
                              <Check
                                className={cn(
                                  'h-4 w-4',
                                  countryIso === c.code ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <Input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder={selectedCountry.example}
                  value={phone}
                  // Allow only digits + common separators while typing; we strip on submit.
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d\s\-()]/g, ''))}
                  className="flex-1 h-12 rounded-xl"
                  required
                  disabled={otpSent}
                />
              </div>
              {phone && !otpSent && (
                <p className="text-[11px] text-muted-foreground -mt-2 pl-1">
                  Will send to <span className="font-mono">{e164Phone}</span>
                </p>
              )}

              {otpSent && (
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold"
                disabled={isPhoneLoading || (otpSent && otpCode.length < 6)}
              >
                {isPhoneLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : otpSent ? 'Verify Code' : 'Send Code'}
              </Button>

              {otpSent && (
                <button
                  type="button"
                  onClick={() => { setOtpSent(false); setOtpCode(''); }}
                  className="w-full text-xs text-muted-foreground"
                >
                  Use a different number
                </button>
              )}
            </form>
          )}

          {authMethod === 'email' && (
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-xl font-semibold gap-2 mt-4"
              onClick={() => { setAuthMethod('phone'); setOtpSent(false); }}
            >
              <Phone className="h-5 w-5" />
              Continue with Phone Number
            </Button>
          )}

          <div className="flex items-center gap-3 my-4">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground font-medium">OR</span>
            <Separator className="flex-1" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-12 rounded-xl font-semibold gap-2"
            disabled={isGoogleLoading}
            onClick={async () => {
              setIsGoogleLoading(true);
              try {
                if (canUseMedianNativeGoogleLogin()) {
                  await signInWithMedianNativeGoogle();
                  onOpenChange(false);
                  return;
                }

                if (isMedianApp()) {
                  toast({
                    title: "Google sign in needs app update",
                    description: "Rebuild the Median app with the Social Login plugin enabled, then try again.",
                    variant: "destructive",
                  });
                  return;
                }

                const result = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: getOAuthRedirectUri(),
                });
                if (result.error) {
                  toast({
                    title: "Google sign in failed",
                    description: result.error.message,
                    variant: "destructive",
                  });
                } else if (result.redirected) {
                  return; // browser will redirect
                } else {
                  // Preview runs inside an iframe and receives OAuth tokens via
                  // postMessage. Persist and validate that session explicitly;
                  // the full-page published flow hydrates it during redirect.
                  const { error: sessionError } = await supabase.auth.setSession(result.tokens);
                  if (sessionError) {
                    toast({
                      title: "Google sign in failed",
                      description: sessionError.message,
                      variant: "destructive",
                    });
                    return;
                  }

                  const { data: userData, error: userError } = await supabase.auth.getUser();
                  if (userError || !userData.user) {
                    toast({
                      title: "Google sign in failed",
                      description: userError?.message ?? "The preview could not restore your session. Please try again.",
                      variant: "destructive",
                    });
                    return;
                  }
                  onOpenChange(false);
                }
              } catch {
                toast({
                  title: "Google sign in failed",
                  description: "An unexpected error occurred.",
                  variant: "destructive",
                });
              } finally {
                setIsGoogleLoading(false);
              }
            }}
          >
            {isGoogleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-4">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
