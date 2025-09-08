"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DialogDescription } from '@/components/ui/dialog';
import FormField from '@/components/FormField';
import { isValidEmail } from '@/utils/validation';
import { useToast } from '@/hooks/use-toast';

interface ForgotPasswordFormProps {
  email: string;
  setEmail: (email: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onBackToSignIn: () => void;
  error: string;
  isSubmitting: boolean;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  email,
  setEmail,
  onSubmit,
  onBackToSignIn,
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
    await onSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4"> {/* Increased space-y */}
      <DialogDescription className="text-platform-text/70 font-normal text-sm sm:text-base mb-4">
        Enter your email address and we'll send you a link to reset your password.
      </DialogDescription>
      <FormField htmlFor="forgot-email" label="Email">
        <Input
          id="forgot-email"
          type="email"
          placeholder="m@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-platform-contrast border-platform-accent text-platform-text placeholder:text-platform-text/70 font-normal"
          disabled={isSubmitting}
        />
      </FormField>
      {error && <p className="text-sm text-red-500 font-normal">{error}</p>}
      <Button type="submit" variant="platform-primary" className="w-full px-6 py-3 text-sm sm:text-base" disabled={isSubmitting}>
        {isSubmitting ? 'Sending Link...' : 'Send Reset Link'}
      </Button>
      <Button 
        variant="platform-link" // Using new platform variant
        className="w-full mt-4" // Increased mt
        onClick={onBackToSignIn}
        disabled={isSubmitting}
      >
        Back to Sign In
      </Button>
    </form>
  );
};

export default ForgotPasswordForm;