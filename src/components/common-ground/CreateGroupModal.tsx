'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (nickname: string) => Promise<void>;
  isSaving: boolean;
}

export default function CreateGroupModal({ isOpen, onClose, onSave, isSaving }: CreateGroupModalProps) {
  const [nickname, setNickname] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      toast({
        variant: 'destructive',
        title: 'Name Required',
        description: 'Please enter a name for your group.',
      });
      return;
    }
    onSave(nickname);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-platform-background text-platform-text border-platform-contrast">
        <DialogHeader>
          <DialogTitle className="text-platform-text">Create a New Group</DialogTitle>
          <DialogDescription>
            Give your group a name to get started.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <Label htmlFor="group-nickname">Group Name</Label>
            <Input
              id="group-nickname"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="e.g., My Book Club"
              className="bg-platform-contrast border-platform-accent"
              autoFocus
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}