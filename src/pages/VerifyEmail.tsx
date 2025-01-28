import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/store';
import { CheckCircle2, XCircle } from 'lucide-react';
import { supabase, refreshSession } from '@/lib/supabase';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setUser } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const token = searchParams.get('token_hash');
        const type = searchParams.get('type');
        const email = searchParams.get('email');

        if (!token || !type || !email) {
          setVerificationStatus('error');
          return;
        }

        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: type as any,
          email: email,
        });

        if (error) {
          throw error;
        }
        
        setVerificationStatus('success');
        toast({
          title: "Email Verified",
          description: "Your email has been successfully verified. Please sign in to continue.",
        });
        
        // Clear any existing user state
        setUser(null);
        
      } catch (error) {
        console.error('Verification error:', error);
        setVerificationStatus('error');
        toast({
          title: "Verification Failed",
          description: error instanceof Error ? error.message : "Failed to verify email",
          variant: "destructive",
        });
      }
    };

    verifyEmail();
  }, [searchParams, toast, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                {verificationStatus === 'success' ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : verificationStatus === 'error' ? (
                  <XCircle className="h-6 w-6 text-red-500" />
                ) : (
                  <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            </div>
            <CardTitle className="text-2xl text-center">
              {verificationStatus === 'success'
                ? 'Email Verified'
                : verificationStatus === 'error'
                ? 'Verification Failed'
                : 'Verifying Email'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              {verificationStatus === 'success'
                ? 'Your email has been successfully verified. Please sign in to continue.'
                : verificationStatus === 'error'
                ? 'We were unable to verify your email. Please try clicking the link from your email again or request a new verification email.'
                : 'Please wait while we verify your email...'}
            </p>
            {verificationStatus !== 'loading' && (
              <Button
                onClick={() => navigate('/signin')}
                className="w-full"
              >
                Continue to Sign In
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}