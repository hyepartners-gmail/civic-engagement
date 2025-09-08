import React, { useState, useEffect, useCallback } from 'react';
import { Topic, Solution, User } from '../types'; // Import Solution and User types
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Share2, Trophy } from 'lucide-react'; // Import Trophy icon
import { Button } from './ui/button'; 
import PlatformCard from './PlatformCard'; // Import PlatformCard
import BadgeDisplay from './BadgeDisplay'; // Import BadgeDisplay
import OnboardingTooltip from './OnboardingTooltip'; // Import OnboardingTooltip
import { colors } from '../lib/theme'; // Import centralized colors

const HighlightsReel: React.FC = () => {
  const [allTopics, setAllTopics] = useState<Topic[]>([]); // All approved topics
  const [userVotedTopics, setUserVotedTopics] = useState<Topic[]>([]); // Topics the user has voted on
  const [currentUser, setCurrentUser] = useState<User | null>(null); // Current user's full profile
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all approved topics
        const allTopicsRes = await fetch('/api/topics?region=all'); // Fetch all topics regardless of region
        if (!allTopicsRes.ok) {
          throw new Error(`Failed to fetch all topics: ${allTopicsRes.statusText}`);
        }
        const fetchedAllTopics: Topic[] = await allTopicsRes.json();
        const approvedAllTopics = fetchedAllTopics.filter(t => t.status === 'approved');
        setAllTopics(approvedAllTopics);

        // Fetch user's voted topics (which also includes user's profile data)
        const userVotedTopicsRes = await fetch('/api/user-voted-topics');
        if (!userVotedTopicsRes.ok) {
          throw new Error(`Failed to fetch user voted topics: ${userVotedTopicsRes.statusText}`);
        }
        const fetchedUserVotedTopics: Topic[] = await userVotedTopicsRes.json();
        setUserVotedTopics(fetchedUserVotedTopics);

        // Fetch current user's full profile to get badges (no userId param needed - uses session)
        const userRes = await fetch('/api/user-profile');
        if (!userRes.ok) {
          throw new Error(`Failed to fetch user profile: ${userRes.statusText}`);
        }
        const fetchedUser: User = await userRes.json();
        setCurrentUser(fetchedUser);

      } catch (err: any) {
        console.error("Error fetching highlights data:", err);
        setError(err.message || "Failed to load highlights.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Re-add the useEffect for automatic topic advancement
  useEffect(() => {
    if (userVotedTopics.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % userVotedTopics.length);
      }, 5000); // Change topic every 5 seconds
      return () => clearInterval(interval); // Cleanup on unmount
    }
  }, [userVotedTopics]);

  const handleShare = () => {
    console.log("Share Highlights Reel clicked!");
    alert("Share functionality coming soon!");
  };

  if (loading) {
    return <div className="text-center p-6 text-platform-text font-normal">Loading Highlights...</div>;
  }

  if (error) {
    return (
      <PlatformCard className="p-6 text-center">
        <h3 className="text-lg font-thin mb-4">Error Loading Highlights</h3>
        <p className="text-red-400 font-normal">{error}</p>
      </PlatformCard>
    );
  }

  const hasVotedOnAllTopics = allTopics.length > 0 && userVotedTopics.length === allTopics.length;

  if (!hasVotedOnAllTopics) {
    return (
      <PlatformCard className="p-6 text-center">
        <h3 className="text-lg font-thin mb-4">Highlights Reel</h3>
        <p className="font-normal text-platform-text/70">
          Vote on all available topics to unlock your personalized Civic Highlights!
        </p>
        <p className="text-sm text-platform-text/50 mt-4">
          You have voted on {userVotedTopics.length} out of {allTopics.length} topics.
        </p>
      </PlatformCard>
    );
  }

  if (userVotedTopics.length === 0) {
    return (
      <PlatformCard className="p-6 text-center">
        <h3 className="text-lg font-thin mb-4">Highlights Reel</h3>
        <p className="font-normal text-platform-text/70">
          No topics to highlight yet. Vote on more topics to see your highlights!
        </p>
      </PlatformCard>
    );
  }

  const currentTopic = userVotedTopics[currentIndex];
  const topSolution: Solution | undefined = currentTopic.solutions?.sort((a, b) => (b.votes || 0) - (a.votes || 0))[0];
  
  const userAlignment = (currentTopic as any).userAlignment || "Not available";
  const userVotedSolutionId = (currentTopic as any).userVotedSolutionId;

  return (
    <PlatformCard className="p-6 sm:p-8 relative overflow-hidden">
      <div className="flex justify-between items-center mb-6"> {/* Increased mb */}
        <h3 className="text-xl sm:text-2xl font-thin text-platform-text">Your Highlights</h3> {/* Changed to text-platform-text */}
        <Button 
          variant="platform-ghost" // Using new platform variant
          size="sm" 
          className="flex items-center gap-1 font-normal"
          onClick={handleShare}
          aria-label="Share Highlights Reel"
        >
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </div>

      {/* Display User's Badges */}
      {currentUser && currentUser.badges && currentUser.badges.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2 justify-center items-center"> {/* Increased mb */}
          <Trophy className="h-5 w-5 text-platform-accent" />
          <span className="font-semibold text-platform-text mr-1">Your Badges:</span>
          {currentUser.badges.map((badge) => (
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

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <motion.h4
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="text-lg sm:text-xl font-thin"
          >{currentTopic.title}</motion.h4>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-platform-text/80 mt-2 mb-6 font-normal text-sm sm:text-base" /* Increased mt and mb */
          >{currentTopic.preview}</motion.p>
          
          {topSolution && (
            <PlatformCard variant="background" className="p-4 sm:p-6 mb-6"> {/* Increased padding and mb */}
              <div className="flex items-center justify-center gap-2 font-semibold text-platform-text text-base sm:text-lg"> {/* Changed to text-platform-text */}
                <Award className="h-4 w-4 sm:h-5 sm:w-5 text-platform-accent" />
                <span>Top Solution</span>
              </div>
              <p className="text-base sm:text-lg mt-2 font-normal">{topSolution.title}</p>
              <p className="text-xs sm:text-sm text-platform-text/70 mt-1 font-normal">{topSolution.description}</p>
            </PlatformCard>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="text-xs sm:text-sm text-platform-text/70 mt-6 font-normal" /* Increased mt */
          >
            Your Alignment: <span className="font-medium text-platform-accent">{userAlignment}</span>
            {userVotedSolutionId && topSolution && userVotedSolutionId !== topSolution.id && (
              <p className="text-xs mt-1 font-normal">
                You voted for: {currentTopic.solutions?.find(s => s.id === userVotedSolutionId)?.title || 'an unknown solution'}
              </p>
            )}
          </motion.div>

        </motion.div>
      </AnimatePresence>
    </PlatformCard>
  );
};

export default HighlightsReel;