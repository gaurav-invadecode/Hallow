'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import type { FirebaseError } from 'firebase/app';
import { Eye, EyeOff } from 'lucide-react';
import { HallowLogo } from '@/components/icons/hallow';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = useCallback(async () => {
    if (isLoading) return; // guard double clicks
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/'); // no need to await
    } catch (err) {
      const e = err as FirebaseError;
      const code = e?.code ?? 'unknown';
      const message =
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential' ||
        code === 'auth/user-not-found'
          ? 'incorrect email or password. please try again.'
          : `an unexpected error occurred: ${e?.message || 'unknown error'}`;

      toast({ variant: 'destructive', title: 'authentication failed', description: message });
    } finally {
      setIsLoading(false);
    }
  }, [email, password, isLoading, router, toast]);

  // Synchronous event handler → call async function
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;
    void handleLogin(); // explicitly ignore the promise to avoid unhandledrejection
  };
  
  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        variant: 'destructive',
        title: 'email required',
        description: 'please enter your email address to reset your password.',
      });
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'password reset email sent',
        description: `if an account exists for ${email}, a password reset link has been sent.`,
      });
    } catch (err) {
      const e = err as FirebaseError;
      // We don't want to reveal if a user exists or not for security reasons.
      // So, we show a generic message even for errors like 'auth/user-not-found'.
      toast({
        title: 'password reset email sent',
        description: `if an account exists for ${email}, a password reset link has been sent.`,
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <main className="flex h-dvh w-full flex-col items-center justify-center bg-background p-8 font-body">
      <Card className="w-full max-w-sm animate-fade-in-up shadow-lg border-0 rounded-2xl bg-card">
        <CardHeader className="items-center text-center pt-10 pb-8 space-y-2">
          <HallowLogo className="size-[35.7px] text-primary" />
          <h1 className="text-lg font-normal text-foreground tracking-wider lowercase">hallow</h1>
          <p className="text-xs text-muted-foreground lowercase">by invadecode ai</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFormSubmit} className="space-y-6">
            <div className="space-y-2 text-left">
              <Label htmlFor="email" className="font-normal text-sm text-foreground lowercase">email</Label>
              <Input
                id="email"
                type="email"
                className="bg-muted border-0 focus-visible:ring-primary text-sm h-12 lowercase"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2 text-left">
               <div className="flex items-center justify-between">
                <Label htmlFor="password" className="font-normal text-sm text-foreground lowercase">password</Label>
                 <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-primary hover:underline disabled:opacity-50 lowercase"
                    disabled={isLoading}
                  >
                    forgot password?
                  </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={passwordVisible ? 'text' : 'password'}
                  className="bg-muted border-0 focus-visible:ring-primary text-sm h-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground"
                  aria-label={passwordVisible ? 'hide password' : 'show password'}
                  aria-pressed={passwordVisible}
                >
                  {passwordVisible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full !mt-8 h-12 rounded-xl font-normal text-base lowercase"
              disabled={isLoading}
            >
              {isLoading ? 'processing...' : 'hallow'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
