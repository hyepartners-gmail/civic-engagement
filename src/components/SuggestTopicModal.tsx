"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import FormField from './FormField'; // Import FormField
import { useToast } from '../hooks/use-toast'; // Import useToast
import { motion } from 'framer-motion'; // Import motion
import ConfettiOverlay from './ConfettiOverlay'; // Import ConfettiOverlay
import { PlusCircle, Trash2, Zap } from 'lucide-react'; // Import icons for solutions

interface SuggestSolution {
  title: string;
  description: string;
  status: 'pending'; // Solutions suggested by users are always pending
}

interface SuggestTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  userBadges: any[] | undefined; // New prop for user badges
}

const SuggestTopicModal: React.FC<SuggestTopicModalProps> = ({ isOpen, onClose, userBadges }) => {
  const [title, setTitle] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [region, setRegion] = useState<'local' | 'state' | 'national' | 'global'>('local');
  const [solutions, setSolutions] = useState<SuggestSolution[]>([]); // New state for solutions
  const [isSubmitting, setIsSubmitting] = useState(false); // To disable button during submission
  // Feedback states
  const [showSuccessPulse, setShowSuccessPulse] = useState(false);
  const [showErrorFlicker, setShowErrorFlicker] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const { toast } = useToast();

  // Determine if the user has the required badges
  const hasVoterEnthusiast = userBadges?.some(b => b.id === 'badge-voter-enthusiast');
  const hasSolutionSeeker = userBadges?.some(b => b.id === 'badge-solution-seeker');
  const canSuggestTopic = hasVoterEnthusiast || hasSolutionSeeker;

  // Reset form when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setProblemStatement('');
      setRegion('local');
      setSolutions([]); // Reset solutions
      setShowSuccessPulse(false);
      setShowErrorFlicker(false);
      setShowConfetti(false);
    }
  }, [isOpen]);

  const addSolution = () => {
    setSolutions([...solutions, { title: '', description: '', status: 'pending' }]);
  };

  const removeSolution = (index: number) => {
    setSolutions(solutions.filter((_, i) => i !== index));
  };

  const updateSolution = (index: number, field: 'title' | 'description', value: string) => {
    const updatedSolutions = [...solutions];
    updatedSolutions[index] = { ...updatedSolutions[index], [field]: value };
    setSolutions(updatedSolutions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate inputs before proceeding
    if (!title.trim() || !problemStatement.trim()) {
      toast({
        variant: 'destructive',
        title: 'Input Error',
        description: 'Please fill in both the topic title and problem statement.',
      });
      setShowErrorFlicker(true);
      return;
    }

    // Validate that at least one solution is provided and has content
    const validSolutions = solutions.filter(sol => sol.title.trim() && sol.description.trim());
    if (validSolutions.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Input Error',
        description: 'Please add at least one solution with a title and description.',
      });
      setShowErrorFlicker(true);
      return;
    }

    setIsSubmitting(true);
    setShowErrorFlicker(false);
    // userId is now derived from session on the API side

    try {
      const response = await fetch('/api/suggest-topic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, problemStatement, region, solutions: validSolutions }), // Include solutions
      });

      if (response.ok) {
        toast({
          title: 'Topic Suggested!',
          description: 'Your topic has been submitted for review.',
        });
        setShowSuccessPulse(true);
        setShowConfetti(true);
        setTitle('');
        setProblemStatement('');
        setRegion('local');
        setSolutions([]); // Clear solutions after successful submission
      } else {
        const data = await response.json();
        if (response.status === 409) {
          toast({
            variant: 'destructive',
            title: 'Submission Error',
            description: "A similar topic already exists.",
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Submission Error',
            description: data.message || 'Failed to submit topic due to server error.',
          });
        }
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
            <DialogTitle className="text-platform-text text-xl sm:text-2xl font-thin">Suggest a New Topic</DialogTitle>
            <DialogDescription className="text-platform-text/70 font-normal text-sm sm:text-base">
              Share an issue important to your community for discussion.
            </DialogDescription>
          </DialogHeader>
          {!canSuggestTopic ? (
            <div className="text-center py-8 flex-1 flex flex-col justify-center">
              <p className="text-red-400 mb-4">
                You need to earn the "Voter Enthusiast" or "Solution Seeker" badge to suggest topics.
              </p>
              <p className="text-platform-text/70 text-sm">
                Keep participating by voting on topics and solutions to earn badges!
              </p>
              <Button onClick={onClose} className="mt-4">Close</Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="flex-1" data-testid="suggest-topic-form"> {/* Removed overflow-y-auto from here */}
                <div className="space-y-6 py-4"> {/* Removed pr-4, relying on parent padding */}
                  <FormField htmlFor="title" label="Topic Title">
                    <Input
                      id="title"
                      type="text"
                      placeholder="e.g., Improve Public Transportation"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className="bg-platform-contrast border-platform-accent text-platform-text placeholder:text-platform-text/70 font-normal"
                    />
                  </FormField>
                  <FormField htmlFor="problemStatement" label="Problem Statement">
                    <Textarea
                      id="problemStatement"
                      placeholder="Describe the problem in detail..."
                      value={problemStatement}
                      onChange={(e) => setProblemStatement(e.target.value)}
                      required
                      className="bg-platform-contrast border-platform-accent text-platform-text placeholder:text-platform-text/70 font-normal min-h-[100px]"
                    />
                  </FormField>
                  <FormField htmlFor="region" label="Target Region">
                    <Select value={region} onValueChange={(value) => setRegion(value as 'local' | 'state' | 'national' | 'global')}>
                      <SelectTrigger className="bg-platform-contrast text-platform-text border-platform-accent font-normal">
                        <SelectValue placeholder="Select a region" />
                      </SelectTrigger>
                      <SelectContent className="bg-platform-contrast text-platform-text border-platform-accent font-normal">
                        <SelectItem value="local">Local</SelectItem>
                        <SelectItem value="state">State</SelectItem>
                        <SelectItem value="national">National</SelectItem>
                        <SelectItem value="global">Global</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  {/* Solutions Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-platform-accent">Solutions (at least one required)</h3>
                      <Button
                        type="button"
                        variant="platform-secondary"
                        size="sm"
                        onClick={addSolution}
                        disabled={isSubmitting}
                      >
                        <PlusCircle className="h-4 w-4 mr-2" /> Add Solution
                      </Button>
                    </div>
                    
                    {solutions.length === 0 && (
                      <p className="text-platform-text/70 text-sm">No solutions added yet. Click "Add Solution" to create one.</p>
                    )}
                    
                    {solutions.map((solution, index) => (
                      <div key={index} className="border border-platform-contrast rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Solution {index + 1}</h4>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeSolution(index)}
                            disabled={isSubmitting}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Remove
                          </Button>
                        </div>
                        
                        <FormField htmlFor={`solution-title-${index}`} label="Solution Title">
                          <Input
                            id={`solution-title-${index}`}
                            type="text"
                            placeholder="e.g., Implement a new bus route"
                            value={solution.title}
                            onChange={(e) => updateSolution(index, 'title', e.target.value)}
                            required
                            className="bg-platform-contrast border-platform-accent text-platform-text placeholder:text-platform-text/70 font-normal"
                          />
                        </FormField>
                        
                        <FormField htmlFor={`solution-description-${index}`} label="Solution Description">
                          <Textarea
                            id={`solution-description-${index}`}
                            placeholder="Describe your solution in detail..."
                            value={solution.description}
                            onChange={(e) => updateSolution(index, 'description', e.target.value)}
                            required
                            className="bg-platform-contrast border-platform-accent text-platform-text placeholder:text-platform-text/70 font-normal min-h-[100px]"
                          />
                        </FormField>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </>
          )}
          <DialogFooter className="flex-shrink-0 mt-4">
            <Button type="submit" variant="platform-primary" className="w-full px-6 py-3 text-sm sm:text-base" disabled={isSubmitting} onClick={handleSubmit}>
              {isSubmitting ? 'Submitting...' : 'Submit Topic'}
            </Button>
          </DialogFooter>
          <ConfettiOverlay isOpen={showConfetti} onComplete={() => { setShowConfetti(false); onClose(); }} />
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default SuggestTopicModal;