"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import FormField from './FormField';
import { useToast } from '../hooks/use-toast';
import { motion } from 'framer-motion'; // Import motion
import ConfettiOverlay from './ConfettiOverlay'; // Import ConfettiOverlay
import { Zap } from 'lucide-react'; // Import Zap icon

interface SuggestSolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicId: string; // The ID of the topic this solution belongs to
  onSolutionSuggested: () => void; // Callback to refresh topic data or show success
}

const SuggestSolutionModal: React.FC<SuggestSolutionModalProps> = ({ isOpen, onClose, topicId, onSolutionSuggested }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Feedback states
  const [showSuccessPulse, setShowSuccessPulse] = useState(false);
  const [showErrorFlicker, setShowErrorFlicker] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast({
        variant: 'destructive',
        title: 'Input Error',
        description: 'Please fill in both the solution title and description.',
      });
      setShowErrorFlicker(true);
      return;
    }

    setIsSubmitting(true);
    setShowErrorFlicker(false);
    // userId is now derived from session on the API side

    try {
      const response = await fetch('/api/suggest-solution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topicId, title, description }), // Removed userId
      });

      if (response.ok) {
        toast({
          title: 'Solution Suggested!',
          description: 'Your solution has been submitted for review.',
        });
        onSolutionSuggested(); // Trigger parent to refresh data
        setShowSuccessPulse(true);
        setShowConfetti(true);
        setTitle('');
        setDescription('');
      } else {
        const data = await response.json();
        toast({
          variant: 'destructive',
          title: 'Submission Error',
          description: data.message || 'Failed to submit solution.',
        });
        setShowErrorFlicker(true);
      }
    } catch (rawError: unknown) {
      const errorMessage = rawError instanceof Error ? rawError.message : String(rawError);
      toast({
        variant: 'destructive',
        title: 'Submission Error',
        description: errorMessage || 'An unexpected error occurred.',
      });
      setShowErrorFlicker(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="fixed left-[50%] top-[5vh] z-50 grid w-full max-w-lg translate-x-[-50%] !translate-y-0 gap-4 border bg-background p-6 shadow-lg duration-200 
          !data-[state=open]:slide-in-from-top-[5vh] !data-[state=closed]:slide-out-to-top-[5vh] 
          sm:rounded-lg md:w-full bg-platform-background text-platform-text border-platform-contrast font-sans max-w-md sm:max-w-lg flex flex-col max-h-[90vh] overflow-y-auto" // Added overflow-y-auto here
      >
        <motion.div
          initial={false}
          animate={showSuccessPulse ? { boxShadow: ["0 0 0px rgba(162, 89, 255, 0)", "0 0 15px rgba(162, 89, 255, 0.8)", "0 0 0px rgba(162, 89, 255, 0)"] } : showErrorFlicker ? { boxShadow: ["0 0 0px rgba(255, 0, 0, 0)", "0 0 10px rgba(255, 0, 0, 0.8)", "0 0 0px rgba(255, 0, 0, 0)"] } : {}}
          transition={showSuccessPulse ? { duration: 0.5, ease: "easeOut" } : showErrorFlicker ? { duration: 0.3, ease: "easeOut" } : {}}
          onAnimationComplete={() => {
            if (showSuccessPulse) setShowSuccessPulse(false);
            if (showErrorFlicker) setShowErrorFlicker(false);
            if (showConfetti) {
              // Confetti will call onComplete, which will then call onClose
            } else {
              if (showSuccessPulse || showErrorFlicker) onClose();
            }
          }}
          className="flex flex-col h-full p-6 sm:p-8" // Apply padding here
        >
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-platform-text text-xl sm:text-2xl font-thin">Suggest a Solution</DialogTitle>
            <DialogDescription className="text-platform-text/70 font-normal text-sm sm:text-base">
              Propose a solution for the current topic. It will be reviewed by moderators.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex-1" data-testid="suggest-solution-form"> {/* Removed overflow-y-auto from here */}
            <div className="space-y-6 py-4"> {/* Added wrapper div for padding */}
              <FormField htmlFor="solution-title" label="Solution Title">
                <Input
                  id="solution-title"
                  type="text"
                  placeholder="e.g., Implement a new bus route"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="bg-platform-contrast border-platform-accent text-platform-text placeholder:text-platform-text/70 font-normal"
                />
              </FormField>
              <FormField htmlFor="solution-description" label="Solution Description">
                <Textarea
                  id="solution-description"
                  placeholder="Describe your solution in detail..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="bg-platform-contrast border-platform-accent text-platform-text placeholder:text-platform-text/70 font-normal min-h-[100px]"
                />
              </FormField>
            </div>
            <DialogFooter className="flex-shrink-0 mt-4">
              <Button type="submit" variant="platform-primary" className="w-full px-6 py-3 text-sm sm:text-base" disabled={isSubmitting} onClick={handleSubmit}>
                {isSubmitting ? 'Submitting...' : 'Submit Solution'}
              </Button>
            </DialogFooter>
          </form>
          <ConfettiOverlay isOpen={showConfetti} onComplete={() => { setShowConfetti(false); onClose(); }} />
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default SuggestSolutionModal;