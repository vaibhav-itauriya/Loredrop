import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EmailVerificationPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<'email' | 'verify' | 'password'>('email');
  const [iitEmail, setIitEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);

  // Handle resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const normalizeEmail = (email: string) => email.trim().toLowerCase();
  const validateIITEmail = (email: string) => {
    return normalizeEmail(email).endsWith('@iitk.ac.in');
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailToUse = normalizeEmail(iitEmail);

    if (!emailToUse) {
      setError('Please enter your IITK email');
      return;
    }

    if (!validateIITEmail(emailToUse)) {
      setError('Please use a valid IITK email address (ending with @iitk.ac.in)');
      return;
    }

    setIsLoading(true);
    try {
      // Send verification code
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/send-verification-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToUse }),
      });

      if (!response.ok) {
        const error = await response.json();
        setError(error.error || 'Failed to send verification code');
        return;
      }

      const data = await response.json();
      setIitEmail(emailToUse);
      setFirebaseUid(data.firebaseUid || null); // Store UID if returned
      setSuccess('✓ Verification code sent to your email!');
      toast.success('Check your email for the verification code');
      
      setTimeout(() => {
        setStep('verify');
        setSuccess(null);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!verificationCode) {
        setError('Please enter the verification code');
        return;
      }

      // Verify the code with backend
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizeEmail(iitEmail),
          code: verificationCode,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setError(error.error || 'Failed to verify code');
        return;
      }

      const data = await response.json();
      
      // Check if user needs to set password
      if (data.needsPassword) {
        setSuccess('✓ Email verified! Please set your password.');
        toast.success('Email verified! Now set your password.');
        setTimeout(() => {
          setStep('password');
          setSuccess(null);
        }, 1000);
        return;
      }
      
      // Store auth token and user data
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      
      setSuccess('✓ Email verified successfully!');
      toast.success('Sign-in successful!');
      
      // Reload the page to load user data from localStorage
      setTimeout(() => {
        window.location.href = '/feed';
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to verify code');
      console.error('Verification error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setIsLoading(true);
    setResendCooldown(60);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/send-verification-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizeEmail(iitEmail) }),
      });

      if (!response.ok) {
        const error = await response.json();
        setError(error.error || 'Failed to send code');
        return;
      }

      toast.success('Verification code sent to your email!');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizeEmail(iitEmail),
          password: password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setError(error.error || 'Failed to set password');
        return;
      }

      const data = await response.json();
      
      // Store auth token and user data
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      
      setSuccess('✓ Password set successfully!');
      toast.success('Account created successfully!');
      
      // Redirect to feed
      setTimeout(() => {
        window.location.href = '/feed';
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to set password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">IITK Email Verification</CardTitle>
          <CardDescription>
            {step === 'email' && 'Enter your IITK email address'}
            {step === 'verify' && 'Enter the verification code'}
            {step === 'password' && 'Create your password'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Email Input */}
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">IITK Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.name@iitk.ac.in"
                  value={iitEmail}
                  onChange={(e) => {
                    setIitEmail(e.target.value);
                    setError(null);
                  }}
                  disabled={isLoading}
                  className="text-base"
                />
                <p className="text-xs text-muted-foreground">
                  Must be a valid IITK email address ending with @iitk.ac.in
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={isLoading || !iitEmail} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  'Continue with Email'
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/auth/login')}
                className="w-full"
              >
                Already have an account? Login
              </Button>
            </form>
          )}

          {/* Step 2: Code Verification */}
          {step === 'verify' && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <Mail className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  <strong>Email:</strong> {iitEmail}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code we sent to {iitEmail}
                </p>
                <Input
                  id="code"
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => {
                    setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setError(null);
                  }}
                  maxLength={6}
                  disabled={isLoading}
                  className="text-center text-2xl tracking-widest font-mono"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={isLoading || verificationCode.length !== 6} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Code'
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleResendCode}
                disabled={isLoading || resendCooldown > 0}
                className="w-full"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep('email');
                  setVerificationCode('');
                  setError(null);
                  setSuccess(null);
                }}
                className="w-full"
              >
                Change Email
              </Button>
            </form>
          )}

          {/* Step 3: Password Setup */}
          {step === 'password' && (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <Mail className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  <strong>Email:</strong> {iitEmail}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password (min 6 characters)"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  disabled={isLoading}
                  className="text-base"
                />
                <p className="text-xs text-muted-foreground">
                  Password must be at least 6 characters long
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError(null);
                  }}
                  disabled={isLoading}
                  className="text-base"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={isLoading || !password || !confirmPassword} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting Password...
                  </>
                ) : (
                  'Set Password'
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Info Footer */}
      <div className="fixed bottom-4 left-4 right-4 text-center text-xs text-muted-foreground max-w-md mx-auto">
        <p>This ensures only IITK community members can access the platform</p>
      </div>
    </div>
  );
}
