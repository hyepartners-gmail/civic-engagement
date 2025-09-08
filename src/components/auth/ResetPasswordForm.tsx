"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DialogDescription } from '@/components/ui/dialog';
import FormField from '@/components/FormField';
import { isValidPassword } from '@/utils/validation';
import { useToast } from '@/hooks/use-toast';

interface ResetPasswordFormProps {
  newPassword: string;
  setNewPassword: (password: string) => void;
  confirmPassword: string;
  setConfirmPassword: (password: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  error: string;
  isSubmitting: boolean;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  onSubmit,
  error,
  isSubmitting,
}) => {
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || !confirmPassword.trim()) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please enter and confirm your new password.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Passwords do not match.' });
      return;
    }
    if (!isValidPassword(newPassword)) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Password must be at least 8 characters long and contain a number and a special character.' });
      return;
    }
    await onSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4"> {/* Increased space-y */}
      <DialogDescription className="text-platform-text/70 font-normal text-sm sm:text-base mb-4">
        Enter your new password below.
      </DialogDescription>
      <FormField htmlFor="new-password" label="New Password">
        <Input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          className="bg-platform-contrast border-platform-accent text-platform-text font-normal"
          disabled={isSubmitting}
        />
      </FormField>
      <FormField htmlFor="confirm-password" label="Confirm New Password">
        <Input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="bg-platform-contrast border-platform-accent text-platform-text font-normal"
          disabled={isSubmitting}
        />
      </FormField>
      {error && <p className="text-sm text-red-500 font-normal">{error}</p>}
      <Button type="submit" variant="platform-primary" className="w-full px-6 py-3 text-sm sm:text-base" disabled={isSubmitting}>
        {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
      </Button>
    </form>
  );
};

export default ResetPasswordForm;