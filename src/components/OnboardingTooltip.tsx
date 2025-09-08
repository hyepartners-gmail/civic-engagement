"use client";

import React, { useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface OnboardingTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  storageKey: string; // Unique key to store seen status in localStorage
  delayDuration?: number;
}

const OnboardingTooltip: React.FC<OnboardingTooltipProps> = ({
  children,
  content,
  storageKey,
  delayDuration = 0, // Show immediately by default
}) => {
  const [hasBeenShown, setHasBeenShown] = useState(true); // Assume true to hide by default
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const key = `onboardingTooltip:${storageKey}`;
    const seen = localStorage.getItem(key);
    if (!seen) {
      setHasBeenShown(false); // If not seen, prepare to show
      setOpen(true); // Open the tooltip
      localStorage.setItem(key, 'true'); // Mark as seen
    }
  }, [storageKey]);

  if (hasBeenShown) {
    return <>{children}</>; // Don't render tooltip if already shown
  }

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent className="bg-platform-contrast text-platform-text border-platform-accent max-w-xs p-3 rounded-md shadow-lg font-normal">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default OnboardingTooltip;