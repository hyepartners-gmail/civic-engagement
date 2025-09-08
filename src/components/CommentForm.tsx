"use client";

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useToast } from '../hooks/use-toast';
import { Comment } from '../types';

interface CommentFormProps {
  onCommentPosted?: (newComment: Comment) => void;
}

const CommentForm: React.FC<CommentFormProps> = ({ onCommentPosted }) => {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      return; // Don't submit empty comments
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/user-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actionType: 'comment',
          payload: { commentText: comment },
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        // The API should ideally return the created comment.
        // For now, we construct it on the client for immediate feedback.
        const newComment: Comment = {
          id: responseData.comment?.id || `mock-comment-${Date.now()}`,
          text: comment,
          author: {
            id: responseData.user?.id || 'unknown-user',
            displayName: responseData.user?.displayName || 'You',
            badges: responseData.user?.badges || [],
          },
          timestamp: new Date().toISOString(),
          parentId: null,
          upvotes: 0,
          flags: 0,
          status: 'pending',
        };
        
        setComment('');
        toast({
          title: 'Comment Posted!',
          description: 'Your comment has been submitted for moderation.',
        });
        onCommentPosted?.(newComment);
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to post comment.');
      }
    } catch (error: any) {
      console.error('Error submitting comment:', error);
      toast({
        variant: 'destructive',
        title: 'Error Posting Comment',
        description: error.message,
      });
      // Do not clear comment on error, so user can retry
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <Textarea
        id="comment-textarea"
        data-testid="comment-textarea"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add your comment..."
        className="bg-platform-contrast border-platform-accent text-platform-text placeholder:text-platform-text/70"
        disabled={isSubmitting}
      />
      <Button 
        type="submit" 
        variant="platform-primary"
        className="mt-2" 
        size="sm"
        data-testid="post-comment-button"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Posting...' : 'Post Comment'}
      </Button>
    </form>
  );
};

export default CommentForm;