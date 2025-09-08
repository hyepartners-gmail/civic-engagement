"use client";

import React from 'react';
import { Topic } from '../types';
import { Button } from './ui/button';
import { ThumbsUp, PlayCircle, Trophy } from 'lucide-react'; // Import PlayCircle icon
import { motion } from 'framer-motion';
import PlatformCard from './PlatformCard'; // Import PlatformCard
import TopicTypeBadge from './TopicTypeBadge'; // Import TopicTypeBadge
import RollingCounter from './RollingCounter'; // Import RollingCounter

interface TopicCardProps {
  topic: Topic;
  isDetailView?: boolean;
  isUserAuthenticated: boolean; // New prop
  isUserVerified: boolean; // New prop
  hasVotedOnCurrentTopic?: boolean; // New prop for conditional display
  onShowVideo?: (videoUrl: string) => void; // New prop to show video overlay
  hasVoted?: boolean;
}

const TopicCard: React.FC<TopicCardProps> = ({ topic, isDetailView = false, isUserAuthenticated, isUserVerified, hasVotedOnCurrentTopic = false, onShowVideo, hasVoted = false }) => {
  const canUpvote = isUserAuthenticated && isUserVerified;

  const handleUpvote = async (topicId: string) => {
    console.log(`TopicCard: Upvote button clicked for topic ${topicId}.`); // Debugging log
    if (!canUpvote) {
      console.log("Cannot upvote: User not authenticated or not verified.");
      return;
    }
    // userId is now derived from session on the API side

    try {
      const response = await fetch('/api/upvote-topic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicId,
        }), // Removed userId
      });

      if (response.ok) {
        console.log(`Upvoted topic ${topicId}`);
        // TODO: Show a success toast notification
        // In a real app, you'd likely re-fetch topics or update local state
        // to reflect the new upvote count. For this dummy data, it's handled
        // by the API route directly modifying DUMMY_TOPICS.
      } else {
        console.error('Failed to upvote topic:', response.statusText);
        // TODO: Show an error toast notification
      }
    } catch (error) {
      console.error('Error upvoting topic:', error);
      // TODO: Show an error toast notification
    }
  };

  return (
    <motion.div
      className={`${!isDetailView ? 'group' : ''}`} 
      whileHover={!isDetailView ? { scale: 1.02, boxShadow: "0 10px 15px rgba(0, 0, 0, 0.3)" } : {}}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <PlatformCard 
        variant="background" 
        className={`p-6 sm:p-8 relative`} // Increased padding
      >
        {!isDetailView && hasVoted && (
          <Trophy className="h-5 w-5 text-yellow-400 absolute top-4 right-4" data-testid={`trophy-icon-${topic.id}`} />
        )}
        <div>
          <div className="flex justify-between items-start">
            <motion.h3
              initial={isDetailView ? { opacity: 0, y: 20 } : false}
              animate={isDetailView ? { opacity: 1, y: 0 } : false}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-xl sm:text-3xl font-thin text-platform-text mb-2 pr-8" 
            >
              {topic.title}
            </motion.h3>
            {isDetailView && topic.videoUrl && (
              <Button
                variant="platform-secondary" // Using new platform variant
                size="sm"
                className="flex items-center gap-1 ml-4 flex-shrink-0 px-4 py-2 text-xs sm:text-sm" // Standardized padding
                onClick={(e) => {
                  e.stopPropagation(); // Prevent closing detail view
                  onShowVideo?.(topic.videoUrl!);
                }}
              >
                <PlayCircle className="h-4 w-4" />
                Adam's Opinion
              </Button>
            )}
          </div>
          {topic.changeType && (
            <div className="flex justify-center sm:justify-start mt-2 mb-4">
              <TopicTypeBadge changeType={topic.changeType} />
            </div>
          )}
          {/* Removed topic.preview as per request */}
          {isDetailView && topic.problemStatement && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-6 pt-4 border-t border-platform-text/20" /* Increased mt */
            >
              <h4 className="font-thin mb-2 text-platform-text text-base sm:text-lg">The Problem</h4>
              <p className="text-sm text-platform-text whitespace-pre-wrap font-normal">{topic.problemStatement}</p>
            </motion.div>
          )}
        </div>
        {/* Only show upvote button for approved topics in detail view AND after user has voted on current topic */}
        {isDetailView && topic.status === 'approved' && hasVotedOnCurrentTopic && ( 
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-6 flex items-center justify-end gap-4" /* Increased mt */
          >
            <Button 
              variant="platform-ghost" // Using new platform variant
              size="sm" 
              className={`flex items-center gap-2 ${canUpvote ? 'hover:text-green-400' : 'opacity-50 cursor-not-allowed'}`}
              onClick={() => handleUpvote(topic.id)}
              disabled={!canUpvote}
            >
              <ThumbsUp className="h-4 w-4" />
              <span><RollingCounter value={topic.upvotes || 0} /> Upvotes</span>
            </Button>
          </motion.div>
        )}
      </PlatformCard>
    </motion.div>
  );
};

export default TopicCard;