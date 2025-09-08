"use client";

import { useState } from 'react';
import { InfoIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

interface Source {
  name: string;
  url: string;
}

interface StoryHeaderProps {
  title: string;
  description?: string;
  sources?: Source[];
}

export default function StoryHeader({ title, description, sources = [] }: StoryHeaderProps) {
  const [open, setOpen] = useState(false);
  
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    
    if (isOpen) {
      // Log the event when sources dialog is opened
      logger.event('story_sources_view', {
        story_title: title,
        sources_count: sources.length
      });
    }
  };
  
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        
        {sources.length > 0 && (
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-1">
                <InfoIcon className="h-4 w-4" />
                <span>Sources</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Data Sources</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  This visualization uses data from the following sources:
                </p>
                <ul className="space-y-2">
                  {sources.map((source, index) => (
                    <li key={index} className="text-sm">
                      <a 
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {source.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      {description && (
        <p className="text-gray-600 mt-1">{description}</p>
      )}
    </div>
  );
}