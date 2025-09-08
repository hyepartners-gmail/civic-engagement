import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import AuthModal from '../components/AuthModal';
import { useToast } from '../hooks/use-toast'; // Import useToast
import { Button } from '../components/ui/button'; // Import Button

const AuthPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status, update } = useSession(); // Get update function
  const [isModalOpen, setIsModalOpen] = useState(true); // Control modal visibility
  const { toast } = useToast(); // Initialize toast

  // State to control the initial mode of the AuthModal
  const [initialAuthMode, setInitialAuthMode] = useState<'auth' | 'forgot-password' | 'reset-password'>('auth');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  
  // Check if user came from Common Ground invite
  const [isCommonGroundInvite, setIsCommonGroundInvite] = useState(false);
  
  useEffect(() => {
    // Check URL parameter first
    if (router.query.commonGround === 'true') {
      setIsCommonGroundInvite(true);
      // Store in localStorage to persist across auth redirects
      localStorage.setItem('commonGroundInvite', 'true');
    } else {
      // Check localStorage if URL parameter is not present
      const stored = localStorage.getItem('commonGroundInvite');
      if (stored === 'true') {
        setIsCommonGroundInvite(true);
      }
    }
  }, [router.query.commonGround]);


  useEffect(() => {
    if (status === 'loading') return; // Do nothing while session is loading

    // Check for all required profile fields, including new location data
    const userHasCompleteProfile = (session?.user as any)?.zipCode && 
                                   (session?.user as any)?.city && 
                                   (session?.user as any)?.state && 
                                   (session?.user as any)?.politicalAlignment;

    if (status === 'authenticated' && userHasCompleteProfile) {
      setIsModalOpen(false); // Close modal if authenticated and profile complete
      console.log('User authenticated with complete profile');
      console.log('isCommonGroundInvite:', isCommonGroundInvite);
      console.log('router.query:', router.query);
      
      if ((session?.user as any)?.role === 'admin') {
        router.push('/admin'); // Redirect admin to admin dashboard
      } else if (isCommonGroundInvite) {
        // For Common Ground invites, go directly to the survey
        console.log('Redirecting Common Ground invite to survey...');
        // Don't clear the flag yet - we need it after survey completion
        router.push('/common-ground/you?fromInvite=true');
      } else {
        // Check if there's a callbackUrl that's NOT a Common Ground invite
        const callbackUrl = router.query.callbackUrl as string;
        if (callbackUrl && !callbackUrl.includes('commonGround=true')) {
          console.log('Redirecting to callbackUrl:', callbackUrl);
          router.push(callbackUrl);
        } else {
          console.log('Redirecting to home page');
          router.push('/'); // Redirect regular user to home page
        }
      }
    } else if (status === 'authenticated' && !userHasCompleteProfile) {
      // User is authenticated but profile incomplete, ensure modal is open for onboarding
      setIsModalOpen(true);
      // AuthModal's useEffect will then detect incomplete profile and set step 2
    } else if (status === 'unauthenticated') {
      setIsModalOpen(true); // Ensure modal is open if unauthenticated
    }
  }, [status, session, router]); // Depend on status, session, and router for re-evaluation

  // Handle Google auth completion
  useEffect(() => {
    const googleAuthComplete = router.query.googleAuth === 'complete';
    const pendingGoogleAuth = localStorage.getItem('pendingGoogleAuth') === 'true';
    
    if (googleAuthComplete && pendingGoogleAuth) {
      console.log('Google auth completed on auth page, checking profile completion...');
      localStorage.removeItem('pendingGoogleAuth');
      const returnUrl = localStorage.getItem('returnUrl') || '/';
      localStorage.removeItem('returnUrl');
      
      // Clear the URL parameter
      router.replace('/auth', undefined, { shallow: true });
      
      // If profile is complete, redirect to return URL
      if (status === 'authenticated' && session?.user?.id) {
        const userHasCompleteProfile = (session?.user as any)?.zipCode && 
                                       (session?.user as any)?.city && 
                                       (session?.user as any)?.state && 
                                       (session?.user as any)?.politicalAlignment;
        
        if (userHasCompleteProfile) {
          // Check if this was a Common Ground invite
          if (isCommonGroundInvite) {
            console.log('Google auth Common Ground user redirecting to survey...');
            // Don't clear the flag yet - we need it after survey completion
            router.push('/common-ground/you?fromInvite=true');
          } else {
            console.log('Google auth user has complete profile, redirecting to:', returnUrl);
            router.push(returnUrl);
          }
          return;
        } else {
          console.log('Google auth user needs profile completion, keeping modal open...');
          setIsModalOpen(true);
        }
      }
    }
  }, [router.query.googleAuth, status, session, router]);

  // Handle verification and reset password messages from query params
  useEffect(() => {
    const { verified, status: verificationStatus, mode, token, userId, refetch: refetchParam } = router.query;

    if (verified === 'true') {
      if (verificationStatus === 'success') {
        toast({
          title: 'Email Verified!',
          description: 'Your account has been successfully verified. You can now fully participate!',
        });
      } else if (verificationStatus === 'already') {
        toast({
          title: 'Already Verified',
          description: 'Your email was already verified.',
        });
      }
      // If refetch parameter is present, trigger session update
      if (refetchParam === 'true') {
        console.log('Triggering session update after email verification...');
        update(); // Update the session to get updated isVerified status
        
        // Also force a more aggressive refresh by updating the session
        setTimeout(() => {
          console.log('Secondary session update after verification...');
          update();
        }, 1000); // Wait 1 second and try again
      }
      // Clear query params after showing toast and refetching
      router.replace('/auth', undefined, { shallow: true });
    } else if (verified === 'false' && verificationStatus === 'error') {
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: 'There was an error verifying your email. Please try again or contact support.',
      });
      router.replace('/auth', undefined, { shallow: true });
    }

    // Handle reset password mode
    if (mode === 'reset-password' && typeof token === 'string' && typeof userId === 'string') {
      setInitialAuthMode('reset-password');
      setResetToken(token);
      setResetUserId(userId);
      setIsModalOpen(true); // Ensure modal is open for reset password
      router.replace('/auth', undefined, { shallow: true }); // Clean URL
    } else if (mode === 'forgot-password') {
      setInitialAuthMode('forgot-password');
      setIsModalOpen(true);
      router.replace('/auth', undefined, { shallow: true }); // Clean URL
    }
  }, [router.query, router, toast, update]); // Add update to dependencies

  // If already authenticated, don't render anything until redirection
  // Now also check for city and state in addition to zipCode and politicalAlignment
  if (status === 'loading' || (status === 'authenticated' && (session?.user as any)?.zipCode && (session?.user as any)?.city && (session?.user as any)?.state && (session?.user as any)?.politicalAlignment)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-platform-background text-platform-text">
        <p className="text-xl text-platform-text/70 font-normal">Loading authentication...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-platform-background text-platform-text font-sans">
      <AuthModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialMode={initialAuthMode} // Pass initial mode
        resetToken={resetToken} // Pass token
        resetUserId={resetUserId} // Pass userId
        isCommonGroundInvite={isCommonGroundInvite} // Pass Common Ground status
        onAuthSuccess={(userId) => {
          console.log(`Auth/Onboarding successful for user: ${userId}`);
          console.log('onAuthSuccess - isCommonGroundInvite:', isCommonGroundInvite);
          console.log('onAuthSuccess - router.query:', router.query);
          setIsModalOpen(false);
          // For Common Ground invites, redirect to survey after successful auth
          if (isCommonGroundInvite) {
            console.log('onAuthSuccess - redirecting Common Ground invite to survey...');
            // Don't clear the flag yet - we need it after survey completion
            router.push('/common-ground/you?fromInvite=true');
          } else {
            // Check for regular callbackUrl
            const callbackUrl = router.query.callbackUrl as string;
            if (callbackUrl && !callbackUrl.includes('commonGround=true')) {
              console.log('onAuthSuccess - redirecting to callbackUrl:', callbackUrl);
              router.push(callbackUrl);
            } else {
              console.log('onAuthSuccess - no redirect needed');
            }
          }
        }}
      />
      {/* Display message for unverified but authenticated users */}
      {status === 'authenticated' && session?.user && !(session.user as any).isVerified && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-platform-contrast p-6 rounded-lg shadow-lg text-center max-w-md"> {/* Increased padding */}
          <h2 className="text-xl font-thin text-platform-accent mb-3">Account Not Verified</h2>
          <p className="text-platform-text/80 font-normal mb-4">
            Please check your email ({session.user.email}) for a verification link. You need to verify your email to fully participate.
          </p>
          <Button 
            onClick={() => {
              // Simulate re-sending verification email
              fetch('/api/send-verification-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: session.user.email, userId: (session.user as any).id }),
              });
              toast({ title: 'Verification Email Sent', description: 'Please check your inbox (and spam folder) for the verification link.' });
            }}
            variant="platform-primary" // Using new platform variant
            className="px-6 py-3 text-sm sm:text-base" // Standardized padding
          >
            Resend Verification Email
          </Button>
        </div>
      )}
    </div>
  );
};

export default AuthPage;