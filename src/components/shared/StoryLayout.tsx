import React from 'react';
import ControlsBar from './ControlsBar';
import { Share2 } from 'lucide-react';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import MainLayout from '../MainLayout'; // Import MainLayout

interface StoryLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
  // Props for ControlsBar
  showCity?: boolean;
  showBasePeriod?: boolean;
  showFiscalYear?: boolean;
  defaultCity?: string;
}

export default function StoryLayout({ title, description, children, ...controlBarProps }: StoryLayoutProps) {
  const { toast } = useToast();
  const showControls = controlBarProps.showCity || controlBarProps.showBasePeriod || controlBarProps.showFiscalYear;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: 'Link Copied!', description: 'Current view URL copied to clipboard.' });
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto -mt-6"> {/* Adjust margin to connect with header */}
        <div className="p-4 md:p-6 border-b border-platform-contrast bg-platform-background/80">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl md:text-3xl font-thin text-platform-text">{title}</h1>
              <p className="text-sm md:text-base text-platform-text/80 mt-1">{description}</p>
            </div>
            <Button variant="platform-primary" size="sm" onClick={handleShare} className="ml-4 flex-shrink-0">
              <Share2 className="h-4 w-4 mr-2" />
              Share View
            </Button>
          </div>
          {showControls && (
            <div className="mt-4">
              <ControlsBar {...controlBarProps} />
            </div>
          )}
        </div>
        <div className="p-4 md:p-6">
          {children}
        </div>
      </div>
    </MainLayout>
  );
}