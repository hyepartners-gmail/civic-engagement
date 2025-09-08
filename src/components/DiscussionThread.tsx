import React, { useState, useEffect, useCallback } from 'react';
import CommentItem from './CommentItem';
import CommentForm from './CommentForm';
import PlatformCard from './PlatformCard';
import { Comment } from '../types'; // Import Comment type
import { colors } from '../lib/theme'; // Import centralized colors

interface DiscussionThreadProps {
  hasVotedOnCurrentTopic: boolean;
  topicId: string; // Add topicId to fetch comments for a specific topic
  isInteractionBlocked?: boolean; // New prop to block interaction
}

const DiscussionThread: React.FC<DiscussionThreadProps> = ({ hasVotedOnCurrentTopic, topicId, isInteractionBlocked = false }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // In a real app, this would be /api/topics/${topicId}/comments
      // For now, fetching all comments and filtering, or using dummy data
      const response = await fetch('/api/comments'); // Assuming this fetches all comments
      if (!response.ok) {
        throw new Error('Failed to fetch comments.');
      }
      const fetchedComments: Comment[] = await response.json();
      // Filter comments relevant to this topic if a topic-specific API existed
      // For now, just use all comments from the dummy data or API
      setComments(fetchedComments);
    } catch (err: any) {
      console.error("Error fetching comments:", err);
      setError(err.message || "Failed to load comments.");
    } finally {
      setLoading(false);
    }
  }, [topicId]); // Depend on topicId if comments were topic-specific

  useEffect(() => {
    if (hasVotedOnCurrentTopic) {
      fetchComments();
    }
  }, [hasVotedOnCurrentTopic, fetchComments]);

  const handleCommentPosted = useCallback((newComment: Comment) => {
    setComments(prevComments => [newComment, ...prevComments]); // Add new comment to the top
  }, []);

  const topLevelComments = comments.filter(comment => !comment.parentId);
  const getReplies = (commentId: string) => {
    return comments.filter(comment => comment.parentId === commentId);
  }

  if (!hasVotedOnCurrentTopic) {
    return (
      <PlatformCard className="p-6 text-center" data-testid="discussion-thread"> {/* Increased padding */}
        <p className="font-normal text-platform-text/70">Vote on a solution to unlock the discussion!</p>
      </PlatformCard>
    );
  }

  if (loading) {
    return (
      <PlatformCard className="p-6 text-center" data-testid="discussion-thread"> {/* Increased padding */}
        <p className="font-normal text-platform-text/70">Loading discussion...</p>
      </PlatformCard>
    );
  }

  if (error) {
    return (
      <PlatformCard className="p-6 text-center" data-testid="discussion-thread"> {/* Increased padding */}
        <p className="font-normal text-red-400">Error: {error}</p>
      </PlatformCard>
    );
  }

  return (
    <PlatformCard className={`p-6 sm:p-8 ${isInteractionBlocked ? 'opacity-50 pointer-events-none' : ''}`} data-testid="discussion-thread"> {/* Increased padding */}
      <h3 className="text-lg sm:text-xl font-semibold mb-6 text-platform-text">Discussion</h3> {/* Changed to text-platform-text */}
      <div className="max-h-96 overflow-y-auto pr-2 space-y-6"> {/* Increased space-y */}
        {topLevelComments.length > 0 ? (
          topLevelComments.map(comment => (
            <div key={comment.id}>
              <CommentItem comment={comment} />
              <div className="pl-6 sm:pl-8 mt-4 space-y-4"> {/* Increased mt and space-y */}
                {getReplies(comment.id).map(reply => (
                  <CommentItem key={reply.id} comment={reply} />
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="font-normal text-platform-text/70">No comments yet. Be the first to share your thoughts!</p>
        )}
      </div>
      <CommentForm onCommentPosted={handleCommentPosted} />
    </PlatformCard>
  );
};

export default DiscussionThread;