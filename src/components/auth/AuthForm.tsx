"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FormField from '@/components/FormField';
import { isValidEmail, isValidPassword } from '@/utils/validation';
import { useToast } from '@/hooks/use-toast';

interface AuthFormProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  isSignUp: boolean;
  onToggleSignUp: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onGoogleAuth?: () => Promise<void>; // Made optional
  onForgotPasswordClick: () => void;
  error: string;
  isSubmitting: boolean;
}

const AuthForm: React.FC<AuthFormProps> = ({
  email,
  setEmail,
  password,
  setPassword,
  isSignUp,
  onToggleSignUp,
  onSubmit,
  onGoogleAuth,
  onForgotPasswordClick,
  error,
  isSubmitting,
}) => {
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please enter a valid email address.' });
      return;
    }
    if (!isValidPassword(password)) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Password must be at least 8 characters long and contain a number and a special character.' });
      return;
    }
    await onSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="auth-form"> {/* Increased space-y */}
      {onGoogleAuth && (
        <>
          <Button
            type="button"
            variant="platform-secondary" // Using new platform variant
            className="w-full px-6 py-3 text-sm sm:text-base" // Standardized padding
            onClick={onGoogleAuth}
            disabled={isSubmitting}
          >
            {isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-platform-contrast" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-platform-background px-2 text-platform-text/70 font-normal">
                Or {isSignUp ? 'sign up' : 'sign in'} with
              </span>
            </div>
          </div>
        </>
      )}

      <FormField htmlFor="email" label="Email">
        <Input
          id="email"
          type="email"
          placeholder="m@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-platform-contrast border-platform-accent text-platform-text placeholder:text-platform-text/70 font-normal"
          disabled={isSubmitting}
        />
      </FormField>
      <FormField htmlFor="password" label="Password">
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="bg-platform-contrast border-platform-accent text-platform-text font-normal"
          disabled={isSubmitting}
        />
      </FormField>
      {error && <p className="text-sm text-red-500 font-normal">{error}</p>}
      <Button type="submit" variant="platform-primary" className="w-full px-6 py-3 text-sm sm:text-base" data-testid="auth-submit-button" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : isSignUp ? 'Sign Up' : 'Sign In'}
      </Button>

      <Button
        variant="platform-link" // Using new platform variant
        className="w-full mt-4" // Increased mt
        onClick={onToggleSignUp}
        disabled={isSubmitting}
      >
        {isSignUp ? 'Already have an account? Sign In' : 'Don\'t have an account? Sign Up'}
      </Button>
      {!isSignUp && (
        <Button
          variant="platform-link" // Using new platform variant
          className="w-full mt-2"
          onClick={onForgotPasswordClick}
          disabled={isSubmitting}
        >
          Forgot Password?
        </Button>
      )}
    </form>
  );
};

export default AuthForm;