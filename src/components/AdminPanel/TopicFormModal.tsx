"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FormField from '@/components/FormField';
import { useToast } from '@/hooks/use-toast';
import { Topic } from '@/types';
import { motion } from 'framer-motion'; // Import motion
import ConfettiOverlay from '@/components/ConfettiOverlay'; // Import ConfettiOverlay

interface TopicFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // Callback to refresh topic list after save
  editingTopic?: Topic | null; // If provided, modal is in edit mode
}

const TopicFormModal: React.FC<TopicFormModalProps> = ({ isOpen, onClose, onSave, editingTopic }) => {
  const [title, setTitle] = useState('');
  const [preview, setPreview] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [region, setRegion] = useState<'local' | 'state' | 'national' | 'global'>('local');
  const [videoUrl, setVideoUrl] = useState('');
  const [changeType, setChangeType] = useState<'law' | 'amendment' | 'rule'>('law'); // New state for changeType
  const [amendmentText, setAmendmentText] = useState(''); // New state for amendmentText
  const [amendmentNumber, setAmendmentNumber] = useState<number | ''>(''); // New state for amendmentNumber
  const [solutions, setSolutions] = useState<Array<{id?: string, title: string, description: string, status: 'pending' | 'approved' | 'rejected', votes?: number}>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Feedback states
  const [showSuccessPulse, setShowSuccessPulse] = useState(false);
  const [showErrorFlicker, setShowErrorFlicker] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setTitle('');
      setPreview('');
      setProblemStatement('');
      setRegion('local');
      setVideoUrl('');
      setChangeType('law');
      setAmendmentText('');
      setAmendmentNumber('');
      setSolutions([]);
      // Reset feedback states
      setShowSuccessPulse(false);
      setShowErrorFlicker(false);
      setShowConfetti(false);
    } else if (editingTopic) {
      // Populate form when editing
      setTitle(editingTopic.title);
      setPreview(editingTopic.preview);
      setProblemStatement(editingTopic.problemStatement || '');
      setRegion(editingTopic.region);
      setVideoUrl(editingTopic.videoUrl || '');
      setChangeType(editingTopic.changeType || 'law');
      // Combine amendmentText and amendmentTextContinued for editing
      const fullAmendmentText = (editingTopic.amendmentText || '') + (editingTopic.amendmentTextContinued || '');
      setAmendmentText(fullAmendmentText);
      setAmendmentNumber(editingTopic.amendmentNumber || '');
      setSolutions(editingTopic.solutions || []);
    }
  }, [isOpen, editingTopic]);

  const addSolution = () => {
    setSolutions([...solutions, { title: '', description: '', status: 'approved' }]);
  };

  const removeSolution = (index: number) => {
    setSolutions(solutions.filter((_, i) => i !== index));
  };

  const updateSolution = (index: number, field: string, value: string) => {
    const updatedSolutions = [...solutions];
    (updatedSolutions[index] as any)[field] = value;
    setSolutions(updatedSolutions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !preview.trim() || !problemStatement.trim()) {
      toast({
        variant: 'destructive',
        title: 'Input Error',
        description: 'Please fill in all required fields.',
      });
      setShowErrorFlicker(true);
      return;
    }

    // Basic video URL validation
    if (videoUrl.trim() && !/^https?:\/\/.+\..+/.test(videoUrl.trim())) {
      toast({
        variant: 'destructive',
        title: 'Input Error',
        description: 'Please enter a valid video URL (must start with http:// or https://).',
      });
      setShowErrorFlicker(true);
      return;
    }

    // Amendment-specific validation
    if (changeType === 'amendment') {
      if (!amendmentText.trim()) {
        toast({
          variant: 'destructive',
          title: 'Input Error',
          description: 'Amendment topics require proposed amendment text.',
        });
        setShowErrorFlicker(true);
        return;
      }
      if (amendmentNumber === '' || isNaN(Number(amendmentNumber)) || Number(amendmentNumber) <= 0) {
        toast({
          variant: 'destructive',
          title: 'Input Error',
          description: 'Amendment topics require a valid positive amendment number.',
        });
        setShowErrorFlicker(true);
        return;
      }
    }

    setIsSubmitting(true);
    setShowErrorFlicker(false);
    // isAdmin is now derived from session on the API side

    const topicData = {
      title,
      preview,
      problemStatement,
      region,
      videoUrl: videoUrl.trim() || undefined,
      changeType, // Include changeType
      amendmentText: changeType === 'amendment' ? amendmentText.trim() : undefined, // Include amendmentText conditionally
      amendmentNumber: changeType === 'amendment' && typeof amendmentNumber === 'number' ? amendmentNumber : undefined, // Include amendmentNumber conditionally
      solutions: solutions.filter(sol => sol.title.trim() && sol.description.trim()), // Only include solutions with content
    };

    try {
      const method = editingTopic ? 'PUT' : 'POST';
      const url = editingTopic ? `/api/admin/topics/update` : `/api/admin/topics/create`;
      const body = editingTopic ? JSON.stringify({ id: editingTopic.id, ...topicData }) : JSON.stringify(topicData);

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (response.ok) {
        toast({
          title: editingTopic ? 'Topic Updated!' : 'Topic Created!',
          description: editingTopic ? 'The topic has been successfully updated.' : 'A new topic has been created and approved.',
        });
        onSave(); // Trigger refresh of topic list
        setShowSuccessPulse(true);
        setShowConfetti(true);
      } else {
        const data = await response.json();
        throw new Error(data.message || `Failed to ${editingTopic ? 'update' : 'create'} topic.`);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      setShowErrorFlicker(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-platform-background text-platform-text border-platform-contrast font-sans p-0 max-w-2xl h-[90vh] flex flex-col overflow-hidden">
        <motion.div
          className="relative flex flex-col h-full"
          initial={false}
          animate={showSuccessPulse ? { boxShadow: ["0 0 0px rgba(162, 89, 255, 0)", "0 0 15px rgba(162, 89, 255, 0.8)", "0 0 0px rgba(162, 89, 255, 0)"] } : showErrorFlicker ? { boxShadow: ["0 0 0px rgba(255, 0, 0, 0)", "0 0 10px rgba(255, 0, 0, 0.8)", "0 0 0px rgba(255, 0, 0, 0)"] } : {}}
          transition={showSuccessPulse ? { duration: 0.5, ease: "easeOut" } : showErrorFlicker ? { duration: 0.3, ease: "easeOut" } : {}}
          onAnimationComplete={() => {
            if (showSuccessPulse) {
              setShowSuccessPulse(false);
              // If no confetti, close the modal immediately after success pulse
              if (!showConfetti) {
                onClose();
              }
            }
            if (showErrorFlicker) {
              setShowErrorFlicker(false);
              // Don't close modal on error, allow user to correct
            }
          }}
        >
          {/* Fixed Header */}
          <div className="flex-shrink-0 p-6 sm:p-8 border-b border-platform-contrast">
            <DialogHeader>
              <DialogTitle className="text-platform-text text-xl sm:text-2xl font-thin">
                {editingTopic ? 'Edit Topic' : 'Create New Topic'}
              </DialogTitle>
              <DialogDescription className="text-platform-text/70 font-normal text-sm sm:text-base">
                {editingTopic ? 'Modify the details of this topic and its solutions.' : 'Add a new topic with solutions directly to the platform.'}
              </DialogDescription>
            </DialogHeader>
          </div>
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6"> {/* Increased space-y */}
            <FormField htmlFor="title" label="Topic Title">
              <Input
                id="title"
                type="text"
                placeholder="e.g., Improve Public Transportation"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="bg-platform-contrast border-platform-accent text-platform-text placeholder:text-platform-text/70 font-normal"
                disabled={isSubmitting}
              />
            </FormField>
            <FormField htmlFor="preview" label="Short Preview">
              <Input
                id="preview"
                type="text"
                placeholder="A brief summary for topic cards"
                value={preview}
                onChange={(e) => setPreview(e.target.value)}
                required
                className="bg-platform-contrast border-platform-accent text-platform-text placeholder:text-platform-text/70 font-normal"
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
            </FormField>
            <FormField htmlFor="region" label="Target Region">
              <Select value={region} onValueChange={(value) => setRegion(value as 'local' | 'state' | 'national' | 'global')}>
                <SelectTrigger className="w-full border-2">
                  <SelectValue placeholder="Select a region" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="local" className="hover:bg-purple-600/20 focus:bg-purple-600/20 cursor-pointer">Local</SelectItem>
                  <SelectItem value="state" className="hover:bg-purple-600/20 focus:bg-purple-600/20 cursor-pointer">State</SelectItem>
                  <SelectItem value="national" className="hover:bg-purple-600/20 focus:bg-purple-600/20 cursor-pointer">National</SelectItem>
                  <SelectItem value="global" className="hover:bg-purple-600/20 focus:bg-purple-600/20 cursor-pointer">Global</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField htmlFor="videoUrl" label="Adam's Video Opinion URL (Optional)">
              <Input
                id="videoUrl"
                type="url"
                placeholder="https://example.com/video.mp4"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="bg-platform-contrast border-platform-accent text-platform-text placeholder:text-platform-text/70 font-normal"
                disabled={isSubmitting}
              />
            </FormField>
            {/* New fields for Phase 5 */}
            <FormField htmlFor="changeType" label="Change Type">
              <Select value={changeType} onValueChange={(value) => setChangeType(value as 'law' | 'amendment' | 'rule')}>
                <SelectTrigger className="w-full border-2">
                  <SelectValue placeholder="Select change type" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="law" className="hover:bg-purple-600/20 focus:bg-purple-600/20 cursor-pointer">Law</SelectItem>
                  <SelectItem value="amendment" className="hover:bg-purple-600/20 focus:bg-purple-600/20 cursor-pointer">Amendment</SelectItem>
                  <SelectItem value="rule" className="hover:bg-purple-600/20 focus:bg-purple-600/20 cursor-pointer">Rule</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            {changeType === 'amendment' && (
              <>
                <FormField htmlFor="amendmentNumber" label="Amendment Number">
                  <Input
                    id="amendmentNumber"
                    type="number"
                    placeholder="e.g., 28"
                    value={amendmentNumber}
                    onChange={(e) => setAmendmentNumber(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    className="bg-platform-contrast border-platform-accent text-platform-text placeholder:text-platform-text/70 font-normal"
                    disabled={isSubmitting}
                  />
                </FormField>
                <FormField htmlFor="amendmentText" label="Proposed Amendment Text">
                  <Textarea
                    id="amendmentText"
                    placeholder="Enter the full proposed text of the amendment..."
                    value={amendmentText}
                    onChange={(e) => setAmendmentText(e.target.value)}
                    required
                    className="bg-platform-contrast border-platform-accent text-platform-text placeholder:text-platform-text/70 font-normal min-h-[150px]"
                    disabled={isSubmitting}
                  />
                </FormField>
              </>
            )}

            {/* Solutions Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-platform-accent">Solutions</h3>
                <Button
                  type="button"
                  variant="platform-secondary"
                  size="sm"
                  onClick={addSolution}
                  disabled={isSubmitting}
                >
                  Add Solution
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
                      Remove
                    </Button>
                  </div>
                  
                  <FormField htmlFor={`solution-title-${index}`} label="Solution Title">
                    <Input
                      id={`solution-title-${index}`}
                      type="text"
                      placeholder="e.g., Increase Public Transit Funding"
                      value={solution.title}
                      onChange={(e) => updateSolution(index, 'title', e.target.value)}
                      className="bg-platform-contrast border-platform-accent text-platform-text placeholder:text-platform-text/70 font-normal"
                      disabled={isSubmitting}
                    />
                  </FormField>
                  
                  <FormField htmlFor={`solution-description-${index}`} label="Solution Description">
                    <Textarea
                      id={`solution-description-${index}`}
                      placeholder="Describe this solution in detail..."
                      value={solution.description}
                      onChange={(e) => updateSolution(index, 'description', e.target.value)}
                      className="bg-platform-contrast border-platform-accent text-platform-text placeholder:text-platform-text/70 font-normal min-h-[80px]"
                      disabled={isSubmitting}
                    />
                  </FormField>
                  
                  <FormField htmlFor={`solution-status-${index}`} label="Status">
                    <Select 
                      value={solution.status} 
                      onValueChange={(value) => updateSolution(index, 'status', value as 'pending' | 'approved' | 'rejected')}
                    >
                      <SelectTrigger className="w-full border-2">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="z-50">
                        <SelectItem value="pending" className="hover:bg-purple-600/20 focus:bg-purple-600/20 cursor-pointer">Pending</SelectItem>
                        <SelectItem value="approved" className="hover:bg-purple-600/20 focus:bg-purple-600/20 cursor-pointer">Approved</SelectItem>
                        <SelectItem value="rejected" className="hover:bg-purple-600/20 focus:bg-purple-600/20 cursor-pointer">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>
              ))}
            </div>
            </form>
            </div>
          </div>
          
          {/* Fixed Footer */}
          <div className="flex-shrink-0 p-6 sm:p-8 border-t border-platform-contrast">
            <Button 
              type="submit" 
              variant="platform-primary" 
              className="w-full px-6 py-3 text-sm sm:text-base" 
              disabled={isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? 'Saving...' : editingTopic ? 'Save Changes' : 'Create Topic'}
            </Button>
          </div>
          <ConfettiOverlay isOpen={showConfetti} onComplete={() => { setShowConfetti(false); onClose(); }} />
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default TopicFormModal;