"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Topic } from '../types';
import TopicCard from './TopicCard';
import SuggestAmendmentCard from './SuggestAmendmentCard'; // Import the SuggestAmendmentCard

interface TopicGridProps {
  topics: Topic[];
  isUserAuthenticated: boolean;
  isUserVerified: boolean;
  onTopicSelect: (topicId: string) => void;
  votedTopicIds: Set<string>;
}

const TopicGrid: React.FC<TopicGridProps> = ({
  topics,
  isUserAuthenticated,
  isUserVerified,
  onTopicSelect,
  votedTopicIds,
}) => {
  const getRandomSpan = () => {
    const spans = ['col-span-4', 'col-span-8'];
    return spans[Math.floor(Math.random() * spans.length)];
  };

  return (
    <div className="w-full max-w-6xl mb-12 px-2 grid gap-4 justify-center grid-cols-16 grid-flow-row-dense">
      {topics.length > 0 ? (
        topics.map((topic) => {
          if (topic.id === 'suggest-amendment-card') {
            return (
              <SuggestAmendmentCard 
                key="suggest-amendment-card" 
                onClick={() => onTopicSelect(topic.id)} // Pass a dummy function for now
                canSuggest={isUserAuthenticated && isUserVerified} // Adjust based on actual criteria
              />
            );
          }
          return (
            <motion.div
              layoutId={topic.id}
              onClick={() => onTopicSelect(topic.id)}
              key={topic.id}
              className={`cursor-pointer group ${getRandomSpan()}`}
              data-testid={`topic-card-${topic.id}-list`}
            >
              <TopicCard
                topic={topic}
                isUserAuthenticated={isUserAuthenticated}
                isUserVerified={isUserVerified}
                hasVoted={votedTopicIds.has(topic.id)}
              />
            </motion.div>
          );
        })
      ) : (
        <div className="col-span-full text-center">
          <p className="text-platform-text/70 font-normal">No topics available for display.</p>
        </div>
      )}
    </div>
  );
};

export default TopicGrid;