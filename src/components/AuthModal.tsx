"use client";

import React, { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { motion } from 'framer-motion'; // Import motion

// Import new modular components
import AuthForm from './auth/AuthForm';
import ForgotPasswordForm from './auth/ForgotPasswordForm';
import ResetPasswordForm from './auth/ResetPasswordForm';
import OnboardingForm from './auth/OnboardingForm';
import ConfettiOverlay from './ConfettiOverlay'; // Import ConfettiOverlay

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: (userId: string) => void;
  initialMode?: 'auth' | 'forgot-password' | 'reset-password';
  resetToken?: string | null;
  resetUserId?: string | null;
  isCommonGroundInvite?: boolean;
}

const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  onAuthSuccess, 
  initialMode = 'auth',
  resetToken: propResetToken,
  resetUserId: propResetUserId,
  isCommonGroundInvite = false,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [politicalAlignmentChoice, setPoliticalAlignmentChoice] = useState<'Left' | 'Center' | 'Right' | undefined>(undefined); // Changed to undefined
  const [specificPartyPreference, setSpecificPartyPreference] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [mode, setMode] = useState<'auth' | 'forgot-password' | 'reset-password'>(initialMode);
  const [resetToken, setResetToken] = useState<string | null>(propResetToken || null);
  const [resetUserId, setResetUserId] = useState<string | null>(propResetUserId || null);

  // New state for location data
  const [city, setCity] = useState<string | undefined>(undefined);
  const [state, setState] = useState<string | undefined>(undefined);
  const [metroArea, setMetroArea] = useState<string | undefined>(undefined);
  const [congressionalDistrict, setCongressionalDistrict] = useState<string | undefined>(undefined);
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false);
  const [isLookingUpUser, setIsLookingUpUser] = useState(false);

  // Feedback states
  const [showSuccessPulse, setShowSuccessPulse] = useState(false);
  const [showErrorFlicker, setShowErrorFlicker] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);


  const { toast } = useToast();
  const { data: session, status, update } = useSession();
  
  // Add a periodic session refresh for unverified users
  useEffect(() => {
    if (
      isOpen &&
      status === 'authenticated' &&
      (session?.user as any)?.id &&
      !(session.user as any).isVerified
    ) {
      console.log('Setting up periodic session refresh for unverified user...');
      const interval = setInterval(() => {
        console.log('Periodic session refresh for verification check...');
        update();
      }, 60000); // Check every 60 seconds for verification updates
      
      return () => clearInterval(interval);
    }
  }, [isOpen, status, (session?.user as any)?.id, (session?.user as any)?.isVerified, update]);



  const resetForm = () => {
    setCurrentStep(1);
    setIsSignUp(true);
    setEmail('');
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setUsername('');
    setZipCode('');
    setBirthYear('');
    setPoliticalAlignmentChoice(undefined); // Changed to undefined
    setSpecificPartyPreference('');
    setError('');
    setIsSubmitting(false);
    setMode('auth');
    setResetToken(null);
    setResetUserId(null);
    // Reset new location states
    setCity(undefined);
    setState(undefined);
    setMetroArea(undefined);
    setCongressionalDistrict(undefined);
    setHasCheckedProfile(false);
    setIsLookingUpUser(false);
    setShowSuccessPulse(false);
    setShowErrorFlicker(false);
    setShowConfetti(false);
    console.log('AuthModal: Form reset.');
  };

  // Effect to set initial mode from props
  useEffect(() => {
    setMode(initialMode);
    setResetToken(propResetToken || null);
    setResetUserId(propResetUserId || null);
    if (initialMode === 'reset-password' && propResetToken && propResetUserId) {
      setCurrentStep(1); 
    }
  }, [initialMode, propResetToken, propResetUserId]);

  // Effect to handle session changes and profile completion
  useEffect(() => {
    // Only run this effect if the modal is actually open
    if (!isOpen) {
      return;
    }

    console.log('🔍 AuthModal useEffect triggered (modal is open)');
    console.log('  status:', status);
    console.log('  session exists:', !!session);
    console.log('  session object:', session);
    console.log('  session.user:', session?.user);
    console.log('  user ID:', (session?.user as any)?.id);
    
    // If still loading, wait a bit more
    if (status === 'loading') {
      console.log('  ⏳ Session still loading, waiting...');
      return;
    }

    // If authenticated but no user ID, try to fetch user by email
    if (status === 'authenticated' && !session?.user?.id && session?.user?.email && !isLookingUpUser) {
      console.log('  ⚠️ Authenticated but no user ID, trying to fetch by email...');
      setIsLookingUpUser(true);
      
      // Try to fetch user data directly by email
      const fetchUserByEmail = async () => {
        try {
          const response = await fetch('/api/user-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: session.user.email }),
          });
          
          if (response.ok) {
            const userData = await response.json();
            console.log('  ✅ Found user by email:', userData);
            
            // Manually set the session data
            (session.user as any).id = userData.id;
            (session.user as any).zipCode = userData.zipCode;
            (session.user as any).city = userData.city;
            (session.user as any).state = userData.state;
            (session.user as any).politicalAlignment = userData.politicalAlignment;
            (session.user as any).isVerified = userData.isVerified;
            
            // Force a re-render by updating the session
            await update();
          } else {
            console.error('  ❌ User not found by email');
          }
        } catch (error) {
          console.error('  ❌ Error fetching user by email:', error);
        } finally {
          setIsLookingUpUser(false);
        }
      };
      
      fetchUserByEmail();
      return;
    }

    // If authenticated and user object exists with an ID
    if (status === 'authenticated' && session?.user?.id && !hasCheckedProfile) {
      setHasCheckedProfile(true); // Mark that we've checked to prevent loops
      console.log('  ✅ User is authenticated, checking profile...');
      console.log('  zipCode:', (session.user as any)?.zipCode);
      console.log('  city:', (session.user as any)?.city);
      console.log('  state:', (session.user as any)?.state);
      console.log('  politicalAlignment:', (session.user as any)?.politicalAlignment);
      
      const userHasCompleteProfile = (session.user as any).zipCode !== undefined && 
                                     (session.user as any).birthYear !== undefined &&
                                     (session.user as any).city !== undefined &&
                                     (session.user as any).state !== undefined &&
                                     (session.user as any).politicalAlignment !== undefined;
      console.log('  userHasCompleteProfile:', userHasCompleteProfile);

      if (userHasCompleteProfile) {
        // Profile is complete, close modal and trigger success callback
        toast({ title: 'Welcome Back!', description: 'You are successfully signed in.' });
        onClose();
        onAuthSuccess?.(session.user.id);
        console.log('AuthModal: Profile complete, closing modal.');
      } else {
        // Profile is incomplete, move to onboarding step
        setCurrentStep(2);
        // Pre-fill onboarding form with existing session data if available
        if (session.user.name && !username) {
          setUsername(session.user.name);
        }
        if ((session.user as any).zipCode !== undefined) setZipCode((session.user as any).zipCode); // Check for undefined
        if ((session.user as any).birthYear !== undefined) setBirthYear((session.user as any).birthYear); // Check for undefined
        if ((session.user as any).politicalAlignment !== undefined) setPoliticalAlignmentChoice((session.user as any).politicalAlignment); // Check for undefined
        if ((session.user as any).partyPreference !== undefined) setSpecificPartyPreference((session.user as any).partyPreference); // Check for undefined
        // Pre-fill new location data if available in session
        if ((session.user as any).city !== undefined) setCity((session.user as any).city);
        if ((session.user as any).state !== undefined) setState((session.user as any).state);
        if ((session.user as any).metroArea !== undefined) setMetroArea((session.user as any).metroArea);
        if ((session.user as any).congressionalDistrict !== undefined) setCongressionalDistrict((session.user as any).congressionalDistrict);


        // Show appropriate toast based on verification status
        if (!(session.user as any).isVerified) {
          toast({ title: 'Sign Up Successful!', description: 'Please check your email to verify your account and complete your profile.' });
        } else {
          // User is verified (either Google or email-verified credentials user) but profile incomplete
          toast({ title: 'Welcome!', description: 'Please complete your profile to get started.' });
        }
        console.log('AuthModal: Profile incomplete, moving to step 2.');
      }
    } else if (status === 'unauthenticated') {
      // If unauthenticated, ensure we are on step 1 (auth/signup)
      setCurrentStep(1);
      setMode(initialMode); // Reset mode based on initial prop
      console.log('AuthModal: Unauthenticated, ensuring step 1.');
    }
  }, [
    isOpen, 
    status, 
    session, 
    onAuthSuccess, 
    username, 
    isSignUp, 
    toast, 
    onClose,
    initialMode,
    // Explicitly list all session properties used to avoid re-runs if only other session properties change
    session?.user?.id,
    (session?.user as any)?.zipCode,
    (session?.user as any)?.birthYear,
    (session?.user as any)?.politicalAlignment,
    (session?.user as any)?.isVerified,
    (session?.user as any)?.partyPreference,
    (session?.user as any)?.city,
    (session?.user as any)?.state,
    (session?.user as any)?.metroArea,
    (session?.user as any)?.congressionalDistrict,
    update, // Add update to dependencies
  ]);

  const handleInitialAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    setShowErrorFlicker(false);

    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    if (result?.error) {
      setError('Invalid email or password.');
      toast({ variant: 'destructive', title: 'Sign In Error', description: 'Invalid email or password.' });
      setShowErrorFlicker(true);
    } else {
      console.log('AuthModal: Initial authentication successful. Triggering session update.');
      // If it was a sign-up, show a toast immediately before the useEffect for onboarding kicks in
      if (isSignUp) {
        // The actual "Sign Up Successful!" toast for verification/onboarding is now handled in the useEffect
        // that reacts to the session status change to 'authenticated' and checks profile completeness.
        // This ensures the toast is shown only once the session is truly established.
      }
      await update(); // Force session update to reflect new user/auth status
    }
    setIsSubmitting(false);
  };

  const handleGoogleAuth = async () => {
    setIsSubmitting(true);
    setError(''); // Clear any previous errors
    setShowErrorFlicker(false);
    
    // Clear email/password fields to ensure no credentials leak to Google auth
    setEmail('');
    setPassword('');
    
    // Store that we're doing Google auth so we can reopen the modal after redirect
    localStorage.setItem('pendingGoogleAuth', 'true');
    localStorage.setItem('returnUrl', window.location.pathname);
    
    const result = await signIn('google', { 
      callbackUrl: window.location.origin + window.location.pathname + '?googleAuth=complete'
    });

    // Note: This code might not run if Google redirects the page
    if (result?.error) {
      setError('Google sign-in failed.');
      toast({ variant: 'destructive', title: 'Google Sign In Error', description: 'Failed to sign in with Google.' });
      localStorage.removeItem('pendingGoogleAuth');
      localStorage.removeItem('returnUrl');
      setShowErrorFlicker(true);
    }
    setIsSubmitting(false);
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    setShowErrorFlicker(false);

    console.log('Onboarding Submit Attempted with values:', {
      username,
      zipCode,
      birthYear,
      city,
      state,
      metroArea,
      congressionalDistrict,
      politicalAlignmentChoice,
      specificPartyPreference,
    });

    if (!session?.user?.id) {
      setError('User ID not found in session. Please try signing in again.');
      toast({ variant: 'destructive', title: 'Session Error', description: 'User ID not found. Please try again.' });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/user-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          displayName: username,
          zipCode,
          birthYear,
          city, // Pass new location data
          state, // Pass new location data
          metroArea, // Pass new location data
          congressionalDistrict, // Pass new location data
          politicalAlignment: politicalAlignmentChoice,
          partyPreference: specificPartyPreference,
        }),
      });

      if (response.ok) {
        await update(); // Force session update to reflect complete profile
        toast({ title: 'Profile Complete!', description: 'Welcome to the platform!' });
        setShowSuccessPulse(true);
        setShowConfetti(true);
        // ConfettiOverlay will call onComplete, which will then call onClose
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to complete profile. Please try again.');
        toast({ variant: 'destructive', title: 'Profile Error', description: data.message || 'Failed to complete profile.' });
        setShowErrorFlicker(true);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during onboarding.');
      toast({ variant: 'destructive', title: 'Onboarding Error', description: err.message || 'An unexpected error occurred.' });
      setShowErrorFlicker(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    setShowErrorFlicker(false);

    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      toast({ title: 'Password Reset', description: data.message });
      setShowSuccessPulse(true);
      setShowConfetti(true);
      // ConfettiOverlay will call onComplete, which will then call onClose
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to send reset link.' });
      setShowErrorFlicker(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    setShowErrorFlicker(false);

    if (!resetToken || !resetUserId) {
      setError('Missing reset token or user ID. Please use the full link from your email.');
      toast({ variant: 'destructive', title: 'Error', description: 'Missing reset token or user ID.' });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resetUserId, token: resetToken, newPassword }),
      });

      const data = await response.json();
      if (response.ok) {
        toast({ title: 'Password Reset Successful!', description: data.message });
        onClose();
      } else {
        setError(data.message || 'Failed to reset password.');
        toast({ variant: 'destructive', title: 'Error', description: data.message || 'Failed to reset password.' });
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'An unexpected error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    if (currentStep === 2) {
      return (
        <OnboardingForm
          userId={session?.user?.id} // Pass userId to OnboardingForm
          username={username}
          setUsername={setUsername}
          zipCode={zipCode}
          setZipCode={setZipCode}
          birthYear={birthYear}
          setBirthYear={setBirthYear}
          politicalAlignmentChoice={politicalAlignmentChoice}
          setPoliticalAlignmentChoice={setPoliticalAlignmentChoice}
          specificPartyPreference={specificPartyPreference}
          setSpecificPartyPreference={setSpecificPartyPreference}
          onSubmit={handleOnboardingSubmit}
          error={error}
          isSubmitting={isSubmitting}
          city={city}
          setCity={setCity}
          state={state}
          setState={setState}
          metroArea={metroArea}
          setMetroArea={setMetroArea}
          congressionalDistrict={congressionalDistrict}
          setCongressionalDistrict={setCongressionalDistrict}
        />
      );
    }
    switch (mode) {
      case 'auth':
        return (
          <AuthForm
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            isSignUp={isSignUp}
            onToggleSignUp={() => setIsSignUp(!isSignUp)}
            onSubmit={handleInitialAuth}
            onGoogleAuth={handleGoogleAuth}
            onForgotPasswordClick={() => setMode('forgot-password')}
            error={error}
            isSubmitting={isSubmitting}
          />
        );
      case 'forgot-password':
        return (
          <ForgotPasswordForm
            email={email}
            setEmail={setEmail}
            onSubmit={handleForgotPasswordRequest}
            onBackToSignIn={() => setMode('auth')}
            error={error}
            isSubmitting={isSubmitting}
          />
        );
      case 'reset-password':
        return (
          <ResetPasswordForm
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            onSubmit={handleResetPassword}
            error={error}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  const getDialogTitle = () => {
    if (currentStep === 2) return 'Complete Your Profile';
    switch (mode) {
      case 'auth':
        return isSignUp ? 'Sign Up' : 'Sign In';
      case 'forgot-password':
        return 'Forgot Password';
      case 'reset-password':
        return 'Reset Password';
      default:
        return 'Authentication';
    }
  };

  const getDialogDescription = () => {
    if (currentStep === 2) return 'Just a few more details to get started!';
    switch (mode) {
      case 'auth':
        return isSignUp ? 'Create your account to join the discussion.' : 'Join the discussion to make your voice heard.';
      case 'forgot-password':
        return 'Enter your email to receive a password reset link.';
      case 'reset-password':
        return 'Set a new password for your account.';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
        resetForm();
        console.log('AuthModal: Dialog closed, form reset.');
      }
    }}>
      <DialogContent 
        className="bg-platform-background text-platform-text border-platform-contrast font-sans max-w-sm sm:max-w-md auth-modal-position"
      >
          {/* Common Ground invite message */}
          {isCommonGroundInvite && (
            <div className="bg-platform-accent/10 border border-platform-accent/30 p-3 rounded-lg mb-4">
              <h3 className="text-platform-accent font-semibold text-sm mb-1">Welcome to Common Ground!</h3>
              <p className="text-platform-text/80 text-xs">
                You've been invited to join a group. Sign in to participate in the survey and discover shared perspectives, or create a new account to get started.
              </p>
            </div>
          )}
          
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-platform-text text-lg sm:text-xl font-thin">
              {getDialogTitle()}
            </DialogTitle>
            <DialogDescription className="text-platform-text/70 font-normal text-sm">
              {getDialogDescription()}
            </DialogDescription>
          </DialogHeader>
          {renderContent()}
          {mode !== 'reset-password' && (
            <div className="text-center mt-4">
              <Link href="/auth" className="text-platform-accent hover:underline text-sm font-normal" onClick={onClose}>
                Go to Sign In Page
              </Link>
            </div>
          )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;