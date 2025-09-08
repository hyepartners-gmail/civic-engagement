"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Topic } from "../types";
import { LayoutGroup } from "framer-motion";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic"; // Import dynamic

// Import new modular components
import TopicGrid from "../components/TopicGrid";
import MainLayout from "../components/MainLayout"; // Import MainLayout
import { useUi } from "../contexts/UiContext";
import { Button } from "../components/ui/button"; // Import Button for "Suggest Topic"
import SuggestAmendmentCard from "../components/SuggestAmendmentCard"; // Import the new component

// Dynamically import modals and TopicDetailOverlay
const TopicDetailOverlay = dynamic(() => import("../components/TopicDetailOverlay"), { ssr: false });
const SuggestTopicModal = dynamic(() => import("../components/SuggestTopicModal"), { ssr: false });
const SuggestSolutionModal = dynamic(() => import("../components/SuggestSolutionModal"), { ssr: false });
const AuthModal = dynamic(() => import("../components/AuthModal"), { ssr: false });


const Index = () => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSuggestTopicModalOpen, setIsSuggestTopicModalOpen] = useState(false);
  const [isSuggestSolutionModalOpen, setIsSuggestSolutionModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [userVotedTopicsCount, setUserVotedTopicsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasVotedOnCurrentTopic, setHasVotedOnCurrentTopic] = useState(false);
  const [selectedSolutionId, setSelectedSolutionId] = useState<string | null>(null);
  const [showPostVoteActions, setShowPostVoteActions] = useState(false);
  const [hasVotedOnAllTopics, setHasVotedOnAllTopics] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Add refresh trigger
  const [votedTopicIds, setVotedTopicIds] = useState<Set<string>>(new Set());
  const [currentUserBadges, setCurrentUserBadges] = useState<any[] | undefined>(undefined); // New state for user badges
  const [isSubmittingVote, setIsSubmittingVote] = useState(false); // New state for vote submission status

  // Use a Set to track which topics the user has interacted with Adam's video
  const [hasInteractedWithVideo, setHasInteractedWithVideo] = useState<Set<string>>(new Set());

  const { data: session, status } = useSession();
  const { isSidebarOpen } = useUi();
  const isUserAuthenticated = status === 'authenticated';
  
  const userIsVerifiedFromSession = (session?.user as any)?.isVerified;
  const userZipCodeFromSession = (session?.user as any)?.zipCode;
  const userPoliticalAlignmentFromSession = (session?.user as any)?.politicalAlignment;
  const userIdFromSession = session?.user?.id;

  const userCityFromSession = (session?.user as any)?.city;
  const userStateFromSession = (session?.user as any)?.state;
  
  const isUserVerified = isUserAuthenticated && 
                         userIsVerifiedFromSession === true &&
                         !!userZipCodeFromSession &&
                         !!userCityFromSession &&
                         !!userStateFromSession &&
                         !!userPoliticalAlignmentFromSession;
  
  const isAdmin = (session?.user as any)?.role === 'admin';

  const currentUserId = userIdFromSession;

  // Check for Google auth completion and handle profile completion
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const googleAuthComplete = urlParams.get('googleAuth') === 'complete';
    
    if (googleAuthComplete) {
      console.log('🔍 Google auth completion detected!');
      console.log('  status:', status);
      console.log('  session exists:', !!session);
      console.log('  user ID:', session?.user?.id);
      
      // Clear the URL parameter immediately
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Clean up localStorage regardless
      localStorage.removeItem('pendingGoogleAuth');
      localStorage.removeItem('returnUrl');
      
      // Wait for session to be fully loaded before opening modal
      if (status === 'loading') {
        console.log('  ⏳ Session still loading, will retry...');
        return;
      }
      
      // For Google auth completion, always try to open the modal
      // The AuthModal will handle the profile completion check
      console.log('🚀 Opening AuthModal for Google auth user...');
      setIsAuthModalOpen(true);
      
      // Also force a session update to ensure we have the latest data
      if (status === 'authenticated') {
        console.log('🔄 Forcing session update...');
        // We can't call update() here since it's not available, but the AuthModal will handle it
      }
    }
  }, [status, session]);

  // --- DEBUGGING LOGS ---
  console.log('Index Page Render:');
  console.log(`  Session Status: ${status}`);
  console.log(`  isUserAuthenticated: ${isUserAuthenticated}`);
  console.log(`  isUserVerified (from session): ${isUserVerified}`);
  console.log(`  Selected Topic ID: ${selectedId}`);
  console.log(`  hasVotedOnCurrentTopic (state): ${hasVotedOnCurrentTopic}`);
  console.log(`  isAuthModalOpen (state): ${isAuthModalOpen}`);
  console.log(`  Full session object:`, session);
  console.log(`  Session user:`, session?.user);
  console.log(`  Session user ID:`, session?.user?.id);
  // --- END DEBUGGING LOGS ---

  // Effect to fetch all topics once on component mount
  useEffect(() => {
    const fetchAllTopics = async () => {
      setLoading(true);
      setError(null);
      try {
        const allApprovedTopicsResponse = await fetch(`/api/topics?region=all`);
        if (!allApprovedTopicsResponse.ok) {
          throw new Error(`Failed to fetch all topics: ${allApprovedTopicsResponse.statusText}`);
        }
        const allApprovedTopics: Topic[] = (await allApprovedTopicsResponse.json()).filter((t: Topic) => t.status === 'approved');
        setTopics(allApprovedTopics);
      } catch (err) {
        console.error('Error fetching all topics:', err);
        setError('Failed to load topics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchAllTopics();
  }, []); // Empty dependency array means this runs once on mount

  // Effect to fetch user-specific data and update vote status for selected topic
  // This combines previous `fetchUserSpecificData` and `checkUserVoteStatus` logic
  useEffect(() => {
    const fetchUserAndTopicVoteStatus = async () => {
      if (isUserAuthenticated && currentUserId) {
        try {
          // Fetch user's full profile to get badges
          const userProfileRes = await fetch('/api/user-profile');
          if (userProfileRes.ok) {
            const userProfileData = await userProfileRes.json();
            setCurrentUserBadges(userProfileData.badges);
          } else {
            console.warn('Failed to fetch user profile for badges.');
            setCurrentUserBadges(undefined);
          }

          const userVotedTopicsRes = await fetch('/api/user-voted-topics');
          if (userVotedTopicsRes.ok) {
            const userVotedTopicsData: Topic[] = await userVotedTopicsRes.json();
            setUserVotedTopicsCount(userVotedTopicsData.length);
            setHasVotedOnAllTopics(topics.length > 0 && userVotedTopicsData.length === topics.length);
            setVotedTopicIds(new Set(userVotedTopicsData.map(t => t.id)));

            if (selectedTopic) {
              const votedEntry = userVotedTopicsData.find(t => t.id === selectedTopic.id);
              setHasVotedOnCurrentTopic(!!votedEntry);
              setSelectedSolutionId((votedEntry as any)?.userVotedSolutionId || null);
              setShowPostVoteActions(!!votedEntry);
            } else {
              setHasVotedOnCurrentTopic(false);
              setSelectedSolutionId(null);
              setShowPostVoteActions(false);
            }
          } else {
            console.warn('Failed to fetch user voted topics for current user.');
            setUserVotedTopicsCount(0);
            setHasVotedOnAllTopics(false);
            setHasVotedOnCurrentTopic(false);
            setSelectedSolutionId(null);
            setShowPostVoteActions(false);
          }
        } catch (err) {
          console.error('Error fetching user-specific data or vote status:', err);
          setError('Failed to load user data. Please try again later.');
          setUserVotedTopicsCount(0);
          setHasVotedOnAllTopics(false);
          setHasVotedOnCurrentTopic(false);
          setSelectedSolutionId(null);
          setShowPostVoteActions(false);
        }
      } else {
        // Reset user-specific states if not authenticated
        setUserVotedTopicsCount(0);
        setHasVotedOnAllTopics(false);
        setHasVotedOnCurrentTopic(false);
        setSelectedSolutionId(null);
        setShowPostVoteActions(false);
        setCurrentUserBadges(undefined); // Clear badges
      }
    };
    fetchUserAndTopicVoteStatus();
  }, [isUserAuthenticated, currentUserId, selectedId, topics.length, refreshTrigger]); // Re-run when auth status, selected topic, or total topics change, or when refreshTrigger changes

  const selectedTopic = selectedId ? topics.find(t => t.id === selectedId) : null;

  const sortedTopics = useMemo(() => {
    return [...topics].sort((a, b) => {
      const aVoted = votedTopicIds.has(a.id);
      const bVoted = votedTopicIds.has(b.id);
      if (aVoted === bVoted) {
        return 0; // Keep original relative order
      }
      return aVoted ? 1 : -1; // Voted topics go to the end
    });
  }, [topics, votedTopicIds]);

  // Define unvotedTopics and votedTopics here
  const unvotedTopics = useMemo(() => sortedTopics.filter(topic => !votedTopicIds.has(topic.id)), [sortedTopics, votedTopicIds]);
  const votedTopics = useMemo(() => sortedTopics.filter(topic => votedTopicIds.has(topic.id)), [sortedTopics, votedTopicIds]);

  // Combine all topics (unvoted and voted) into a single array
  const allTopicsInGrid = useMemo(() => {
    const combined = [...unvotedTopics]; // Start with unvoted topics
    // Insert the SuggestAmendmentCard after all unvoted topics
    const insertIndex = unvotedTopics.length; // This is the key change
    combined.splice(insertIndex, 0, { id: 'suggest-amendment-card' } as Topic); // Placeholder for the card
    
    // Add voted topics after the amendment card
    combined.push(...votedTopics);
    return combined;
  }, [unvotedTopics, votedTopics]); // Dependencies for allTopicsInGrid

  const handleTopicSelect = useCallback((id: string) => {
    if (id === 'suggest-amendment-card') {
      setIsSuggestTopicModalOpen(true);
    } else {
      setSelectedId(id);
    }
  }, []);

  const handleSolutionVoted = useCallback(async (topicId: string, solutionId: string | null) => {
    console.log("Index: handleSolutionVoted called.");
    console.log("Index: isUserAuthenticated =", isUserAuthenticated);
    console.log("Index: isUserVerified =", isUserVerified);
    if (!isUserAuthenticated || !isUserVerified) {
      console.log("Index: Auth/Verification required in handleSolutionVoted. Setting isAuthModalOpen to true.");
      setIsAuthModalOpen(true);
      return;
    }

    setIsSubmittingVote(true); // Set submitting state
    try {
      const response = await fetch('/api/upvote-solution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solutionId: solutionId,
          topicId: topicId
        }),
      });

      if (response.ok) {
        console.log(`User ${currentUserId} voted on topic ${topicId} for solution ${solutionId}.`);
        // Optimistically update voted status
        setVotedTopicIds(prev => new Set(prev).add(topicId));
        setHasVotedOnCurrentTopic(true);
        setSelectedSolutionId(solutionId);
        setShowPostVoteActions(true);
        console.log("setShowPostVoteActions set to true after vote.");
        // Trigger a refresh of user data to update counts and badges
        setRefreshTrigger(prev => prev + 1);
      } else {
        console.error('Failed to record vote action:', response.statusText);
      }
    } catch (err) {
      console.error('Error recording vote:', err);
    } finally {
      setIsSubmittingVote(false); // Reset submitting state
    }
  }, [isUserAuthenticated, isUserVerified, currentUserId, topics.length]);

  const handleSkip = useCallback(async (topicId: string) => {
    console.log("Index: handleSkip called.");
    console.log("Index: isUserAuthenticated =", isUserAuthenticated);
    console.log("Index: isUserVerified =", isUserVerified);
    if (!isUserAuthenticated || !isUserVerified) {
      console.log("Index: Auth/Verification required in handleSkip. Setting isAuthModalOpen to true.");
      setIsAuthModalOpen(true);
      return;
    }

    setIsSubmittingVote(true); // Set submitting state
    try {
      const response = await fetch('/api/user-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType: 'skip_topic', payload: { topicId, solutionId: null } }),
      });

      if (response.ok) {
        console.log(`Topic ${topicId} skipped and action recorded.`);
        // Optimistically update voted status
        setVotedTopicIds(prev => new Set(prev).add(topicId));
        setHasVotedOnCurrentTopic(true);
        setSelectedSolutionId(null);
        setShowPostVoteActions(true);
        console.log("setShowPostVoteActions set to true after skip.");
        // Trigger a refresh of user data to update counts and badges
        setRefreshTrigger(prev => prev + 1);
      } else {
        console.error('Failed to record skip action:', response.statusText);
      }
    } catch (err) {
      console.error('Error skipping topic:', err);
    } finally {
      setIsSubmittingVote(false); // Reset submitting state
    }
  }, [isUserAuthenticated, isUserVerified, currentUserId, topics.length]);

  const handleNextTopic = useCallback(() => {
    console.log("handleNextTopic called.");
    if (!selectedTopic) return;

    const currentIndex = topics.findIndex((t) => t.id === selectedTopic.id);
    if (currentIndex === -1) {
      setSelectedId(null);
      return;
    }
    if (topics.length > 1) {
      const nextIndex = (currentIndex + 1) % topics.length;
      setSelectedId(topics[nextIndex].id);
    } else {
      setSelectedId(null);
    }
    setShowPostVoteActions(false);
  }, [selectedTopic, topics]);

  const handleCloseDetailView = useCallback(() => {
    console.log("handleCloseDetailView called.");
    setSelectedId(null);
    setShowPostVoteActions(false);
  }, []);

  const handleShowVideo = useCallback(async (videoUrl: string) => {
    if (!isUserAuthenticated || !isUserVerified) {
      setIsAuthModalOpen(true);
      return;
    }
    // This state is now managed within TopicDetailOverlay, but we still track interaction here
    if (selectedTopic) {
      setHasInteractedWithVideo(prev => new Set(prev).add(selectedTopic.id));
      // Also, trigger a user action for viewing video to potentially award badges
      try {
        await fetch('/api/user-actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actionType: 'view_video', payload: { topicId: selectedTopic.id, videoUrl } }),
        });
        console.log(`User ${currentUserId} viewed video for topic ${selectedTopic.id}.`);
      } catch (err) {
        console.error('Error recording video view action:', err);
      }
    }
  }, [isUserAuthenticated, isUserVerified, selectedTopic, currentUserId]);

  const isVotingAndDiscussionEnabled = hasVotedOnCurrentTopic || (selectedTopic && hasInteractedWithVideo.has(selectedTopic.id));

  const totalVotesAcrossAllSolutions = selectedTopic?.solutions?.reduce((sum, sol) => sum + (sol.votes || 0), 0) || 0;

  // Determine if the user can suggest topics based on badges
  const canSuggestTopics = useMemo(() => {
    if (!currentUserBadges) return false;
    const hasVoterEnthusiast = currentUserBadges.some(b => b.id === 'badge-voter-enthusiast');
    const hasSolutionSeeker = currentUserBadges.some(b => b.id === 'badge-solution-seeker');
    return hasVoterEnthusiast || hasSolutionSeeker;
  }, [currentUserBadges]);

  return (
    <LayoutGroup>
      <MainLayout>
        <div className="flex flex-col items-start">
          {!isSidebarOpen && (
            <h1 className="text-2xl font-thin text-platform-accent mb-8 self-center">
              Citizen Forum
            </h1>
          )}
          
          {/* Combined Topic Grid */}
          <div className="w-full max-w-6xl mb-12 px-2">
            <TopicGrid
              topics={allTopicsInGrid} // Use the combined array
              isUserAuthenticated={isUserAuthenticated}
              isUserVerified={isUserVerified}
              onTopicSelect={handleTopicSelect} // Use the new handler
              votedTopicIds={votedTopicIds}
            />
          </div>

          {/* Temporary refresh button for debugging */}
          {selectedTopic && isUserAuthenticated && (
            <div className="fixed top-4 right-4 z-50">
              <Button
                onClick={() => setRefreshTrigger(prev => prev + 1)}
                className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
              >
                Refresh Vote Status
              </Button>
            </div>
          )}

          <TopicDetailOverlay
            isOpen={!!selectedTopic}
            topic={selectedTopic || null}
            onClose={handleCloseDetailView}
            isUserAuthenticated={isUserAuthenticated}
            isUserVerified={isUserVerified}
            hasVotedOnCurrentTopic={hasVotedOnCurrentTopic}
            selectedSolutionId={selectedSolutionId}
            onSolutionVoted={handleSolutionVoted}
            onAuthRequired={() => setIsAuthModalOpen(true)}
            totalVotesAcrossAllSolutions={totalVotesAcrossAllSolutions}
            userVotedTopicsCount={userVotedTopicsCount}
            onSkipTopic={handleSkip}
            onSuggestSolution={() => setIsSuggestSolutionModalOpen(true)}
            onShowVideo={handleShowVideo}
            isVotingAndDiscussionEnabled={!!isVotingAndDiscussionEnabled}
            showPostVoteActions={showPostVoteActions}
            onNextTopic={handleNextTopic}
            isSubmittingVote={isSubmittingVote} // Pass submitting state
          />

          <SuggestTopicModal
            isOpen={isSuggestTopicModalOpen}
            onClose={() => setIsSuggestTopicModalOpen(false)}
            userBadges={currentUserBadges} // Pass user badges
          />
          {selectedTopic && (
            <SuggestSolutionModal
              isOpen={isSuggestSolutionModalOpen}
              onClose={() => setIsSuggestSolutionModalOpen(false)}
              topicId={selectedTopic.id}
              onSolutionSuggested={() => { /* Logic to refresh data if needed */ }}
            />
          )}
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onAuthSuccess={(userId) => {
              console.log(`Auth/Onboarding successful for user: ${userId}`);
              setIsAuthModalOpen(false);
            }}
          />

          <footer className="mt-12 text-center px-6 w-full">
            <p className="text-base sm:text-xl text-platform-text/90 max-w-2xl mx-auto font-normal">
              Your voice, your community, your future. Engage in anonymous voting, discussions, and shape local, state, and national policies.
            </p>
          </footer>
        </div>
      </MainLayout>
    </LayoutGroup>
  );
};

export default Index;