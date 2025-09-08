"use client";

import React from 'react';
import { Button } from './ui/button';
import { Flag } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface FlagButtonProps {
  contentId: string;
  contentType: 'topic' | 'solution' | 'comment';
  size?: 'sm' | 'default';
}

const FlagButton: React.FC<FlagButtonProps> = ({ contentId, contentType, size = 'sm' }) => {
  const { toast } = useToast();

  const handleFlag = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent parent onClick events
    // userId is now derived from session on the API side

    try {
      const response = await fetch('/api/flag-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, contentType }), // Removed userId
      });

      if (response.ok) {
        toast({
          title: 'Content Flagged',
          description: 'Thank you for your feedback. A moderator will review this item.',
        });
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to flag content.');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  };

  return (
    <Button
      variant="platform-ghost" // Using new platform variant
      size={size}
      className="flex items-center gap-2 hover:text-red-400"
      onClick={handleFlag}
    >
      <Flag className="h-4 w-4" />
      {size === 'default' && <span>Flag for Review</span>}
    </Button>
  );
};

export default FlagButton;