'use client';

import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, Send } from 'lucide-react';
import PlatformCard from '../PlatformCard';

interface SurveyInviteStepProps {
  onInvitesSent: () => void;
  onSkip: () => void;
}

export default function SurveyInviteStep({ onInvitesSent, onSkip }: SurveyInviteStepProps) {
  const [emails, setEmails] = useState(['']);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const handleAddEmail = () => {
    setEmails([...emails, '']);
  };

  const handleSendInvites = async () => {
    const validEmails = emails.filter(email => email.trim() !== '');
    if (validEmails.length === 0) {
      // If no emails are entered, just skip to the results.
      onSkip();
      return;
    }

    setIsSending(true);
    try {
      // This is a placeholder for the actual API call
      console.log('Sending invites to:', validEmails);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

      toast({
        title: 'Invites Sent!',
        description: 'Your friends have been invited to find common ground.',
      });
      onInvitesSent();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not send invites. Please try again.',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <PlatformCard className="p-8 md:p-12 text-center">
      <h3 className="text-4xl md:text-5xl font-thin mb-4">Find Common Ground</h3>
      <p className="text-platform-text/80 mb-8">
        Invite friends to take the survey and see how your views compare.
      </p>
      
      <div className="space-y-4 max-w-md mx-auto mb-8">
        {emails.map((email, index) => (
          <Input
            key={index}
            type="email"
            placeholder="friend@example.com"
            value={email}
            onChange={(e) => handleEmailChange(index, e.target.value)}
            className="bg-platform-contrast border-platform-accent text-center"
          />
        ))}
        <Button variant="link" onClick={handleAddEmail} className="text-platform-accent">
          + Add another
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
        <Button onClick={handleSendInvites} disabled={isSending} size="lg">
          <Send className="mr-2 h-4 w-4" />
          {isSending ? 'Sending...' : 'Send Invites & See Results'}
        </Button>
        <Button onClick={onSkip} variant="ghost" className="text-platform-text/70">
          Skip for now <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </PlatformCard>
  );
}