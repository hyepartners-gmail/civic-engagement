import React from 'react';
import { Comment } from '../types';
import { Avatar, AvatarFallback } from './ui/avatar';
import BadgeDisplay from './BadgeDisplay';
import OnboardingTooltip from './OnboardingTooltip';
import FlagButton from './FlagButton';
import { Button } from './ui/button'; // Import Button
import { ThumbsUp } from 'lucide-react'; // Import ThumbsUp icon
import { useToast } from '../hooks/use-toast'; // Import useToast

interface CommentItemProps {
  comment: Comment;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment }) => {
  const timeAgo = new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const { toast } = useToast();

  const handleUpvote = async (commentId: string) => {
    // userId is now derived from session on the API side

    try {
      const response = await fetch('/api/upvote-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId }), // Removed userId
      });

      if (response.ok) {
        toast({
          title: 'Comment Upvoted!',
          description: 'Thank you for your feedback.',
        });
        // In a real app, you'd re-fetch comments or update local state
        // For now, we'll rely on the API to update the dummy data.
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to upvote comment.');
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
    <div className="flex items-start space-x-3 sm:space-x-4">
      <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
        <AvatarFallback className="text-sm sm:text-base">{comment.author.displayName.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-2">
            <p className="font-semibold text-sm text-platform-text">{comment.author.displayName}</p>
            {comment.author.badges && comment.author.badges.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {comment.author.badges.map((badge) => (
                  <OnboardingTooltip
                    key={badge.id}
                    storageKey={`badgeTooltip-${badge.id}`}
                    content={`This is the '${badge.name}' badge, awarded for: ${badge.description}`}
                  >
                    <BadgeDisplay badge={badge} />
                  </OnboardingTooltip>
                ))}
              </div>
            )}
            <p className="text-xs text-platform-text/70 font-normal">{timeAgo}</p>
          </div>
          <div className="mt-1 sm:mt-0 flex items-center gap-2">
            <Button 
              variant="platform-ghost" // Using new platform variant
              size="sm" 
              className="flex items-center gap-1"
              onClick={() => handleUpvote(comment.id)}
            >
              <ThumbsUp className="h-4 w-4" />
              <span className="text-xs font-normal">{comment.upvotes || 0}</span>
            </Button>
            <FlagButton contentId={comment.id} contentType="comment" />
          </div>
        </div>
        <p className="text-sm text-platform-text/90 mt-1 font-normal">{comment.text}</p>
      </div>
    </div>
  );
};

export default CommentItem;