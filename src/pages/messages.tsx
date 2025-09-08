import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Heart, ThumbsUp, ThumbsDown, X, Activity, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useVoteBuffer } from '@/hooks/useVoteBuffer';
import { Message, VoteChoiceNumber } from '@/lib/messaging-schemas';
import MainLayout from '@/components/MainLayout';

// ========== TYPES ==========

interface VoteOption {
  choice: VoteChoiceNumber;
  label: string;
  icon: React.ReactNode;
  color: string;
}

// ========== CONSTANTS ==========

const VOTE_OPTIONS: VoteOption[] = [
  {
    choice: 1,
    label: 'Love',
    icon: <Heart className="w-6 h-6" />,
    color: 'text-platform-text hover:bg-platform-text/10',
  },
  {
    choice: 2,
    label: 'Like',
    icon: <ThumbsUp className="w-6 h-6" />,
    color: 'text-platform-text hover:bg-platform-text/10',
  },
  {
    choice: 3,
    label: 'Dislike',
    icon: <ThumbsDown className="w-6 h-6" />,
    color: 'text-platform-text hover:bg-platform-text/10',
  },
  {
    choice: 4,
    label: 'Hate',
    icon: <X className="w-6 h-6" />,
    color: 'text-platform-text hover:bg-platform-text/10',
  },
];

// ========== MOTION VARIANTS ==========

const cardVariants: Variants = {
  enter: {
    x: 300,
    opacity: 0,
    scale: 0.8,
    rotateY: -15,
  },
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    rotateY: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
      scale: { type: 'spring', damping: 20, stiffness: 300 },
    },
  },
  exit: {
    x: -300,
    opacity: 0,
    scale: 0.8,
    rotateY: 15,
    transition: {
      duration: 0.4,
      ease: 'easeIn',
    },
  },
};

const buttonVariants: Variants = {
  initial: { scale: 1, y: 0 },
  hover: { 
    scale: 1.05, 
    y: -2,
    transition: { type: 'spring', stiffness: 400, damping: 10 }
  },
  tap: { 
    scale: 0.95,
    y: 0,
    transition: { duration: 0.1 }
  },
  voted: {
    scale: [1, 1.2, 1],
    rotate: [0, -5, 5, 0],
    transition: { duration: 0.5, ease: 'easeOut' }
  }
};

const progressVariants: Variants = {
  hidden: { width: 0 },
  visible: (progress: number) => ({
    width: `${progress * 100}%`,
    transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const floatingVariants: Variants = {
  animate: {
    y: [-10, 10, -10],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const sparkleVariants: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: { 
    scale: [0, 1, 0], 
    opacity: [0, 1, 0],
    transition: { duration: 1.5, repeat: Infinity }
  }
};

// ========== MAIN COMPONENT ==========

export default function MessagesPage() {
  const router = useRouter();
  const { addVote, stats: bufferStats } = useVoteBuffer();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [votedMessageIds, setVotedMessageIds] = useState<Set<string>>(new Set());
  const [initialVotedCheckComplete, setInitialVotedCheckComplete] = useState(false);
  const [showStats, setShowStats] = useState(false);
  
  // Fetch messages
  const { data: messages, isLoading, error, refetch } = useQuery<Message[]>({
    queryKey: ['messages'],
    queryFn: async () => {
      const response = await fetch('/api/messages');
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      return response.json();
    },
    staleTime: 30000, // 30 seconds
  });

  // Check which messages the user has already voted on
  const { data: votedMessagesData, isLoading: isLoadingVotedCheck } = useQuery<{
    votedMessageIds: string[];
  }>({
    queryKey: ['voted-messages', messages?.map(m => m.id)],
    queryFn: async () => {
      if (!messages || messages.length === 0) {
        return { votedMessageIds: [] };
      }
      
      const messageIds = messages.map(m => m.id).join(',');
      const response = await fetch(`/api/messages/voted?messageIds=${messageIds}`);
      if (!response.ok) {
        throw new Error('Failed to check voted messages');
      }
      return response.json();
    },
    enabled: !!messages && messages.length > 0,
    staleTime: 0, // Always fetch fresh data
  });

  // Update voted message IDs when we get the check results
  useEffect(() => {
    if (votedMessagesData) {
      setVotedMessageIds(new Set(votedMessagesData.votedMessageIds));
      setInitialVotedCheckComplete(true);
    }
  }, [votedMessagesData]);

  // Filter out already voted messages
  const availableMessages = useMemo(() => {
    if (!messages || !initialVotedCheckComplete) return [];
    return messages.filter(message => !votedMessageIds.has(message.id));
  }, [messages, votedMessageIds, initialVotedCheckComplete]);

  const currentMessage = availableMessages?.[currentIndex];
  const progress = availableMessages ? (currentIndex + 1) / availableMessages.length : 0;
  const isCompleted = availableMessages && availableMessages.length > 0 && currentIndex >= availableMessages.length;
  
  // Check if user has already voted on all messages
  const hasVotedOnAllMessages = useMemo(() => {
    if (!messages) return false;
    // Check if all messages have been voted on by comparing with the filtered available messages
    return messages.length > 0 && availableMessages.length === 0;
  }, [messages, availableMessages]);

  // Immediately redirect to the completion page if the user has already voted on all messages
  useEffect(() => {
    if (!isLoading && hasVotedOnAllMessages) {
      setCurrentIndex(0);
    }
  }, [hasVotedOnAllMessages, isLoading]);
  
  // Keyboard handlers
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!currentMessage) return;
      
      const key = event.key;
      if (['1', '2', '3', '4'].includes(key)) {
        event.preventDefault();
        const choice = parseInt(key, 10) as VoteChoiceNumber;
        handleVote(choice);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentMessage]);

  // Vote handler
  const handleVote = useCallback((choice: VoteChoiceNumber) => {
    if (!currentMessage) return;
    
    // Add vote to buffer
    addVote(currentMessage.id, choice);
    
    // Track voted message locally
    setVotedMessageIds(prev => new Set([...Array.from(prev), currentMessage.id]));
    
    // Move to next message
    setCurrentIndex(prev => prev + 1);
  }, [currentMessage, addVote]);

  // Restart handler - now just clears the voted messages
  const handleRestart = useCallback(() => {
    setVotedMessageIds(new Set());
    setCurrentIndex(0);
  }, []);

  // Loading state
  if (isLoading || isLoadingVotedCheck || !initialVotedCheckComplete) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
            />
            <p className="text-lg text-gray-600">Loading messages...</p>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Messages</h2>
              <p className="text-gray-600 mb-4">
                We couldn't load the messages. Please try again.
              </p>
              <Button onClick={() => refetch()} className="w-full">
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Empty state
  if (!messages || messages.length === 0) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-6 h-6 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No Messages Available</h2>
              <p className="text-gray-600">
                There are no active messages to vote on right now.
              </p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Already voted on all messages
  if (hasVotedOnAllMessages) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md w-full"
          >
            <Card>
              <CardContent className="p-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <Heart className="w-8 h-8 text-green-600" />
                </motion.div>
                
                <h1 className="text-2xl font-bold mb-4">Thank You!</h1>
                <p className="text-gray-600 mb-6">
                  You have voted on all messaging slogans. Your opinions help shape the conversation.
                </p>
                
                {bufferStats.pendingCount > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-center gap-2 text-blue-700">
                      <Activity className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {bufferStats.pendingCount} votes pending sync
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="space-y-3">
                  <Button
                    onClick={() => router.push('/')}
                    className="w-full"
                  >
                    Explore More Topics
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => router.push('/climate')}
                    className="w-full"
                  >
                    View Climate Issues
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  // Completion state (when user has voted on all available messages in current session)
  if (isCompleted) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md w-full"
          >
            <Card>
              <CardContent className="p-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <Heart className="w-8 h-8 text-green-600" />
                </motion.div>
                
                <h1 className="text-2xl font-bold mb-4">Thank You!</h1>
                <p className="text-gray-600 mb-6">
                  You have voted on all messaging slogans. Your opinions help shape the conversation.
                </p>
                
                {bufferStats.pendingCount > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-center gap-2 text-blue-700">
                      <Activity className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {bufferStats.pendingCount} votes pending sync
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="space-y-3">
                  <Button
                    onClick={() => router.push('/')}
                    className="w-full"
                  >
                    Explore More Topics
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => router.push('/climate')}
                    className="w-full"
                  >
                    View Climate Issues
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  // Main voting interface
  return (
    <MainLayout>
      <div className="min-h-screen bg-platform-background p-4 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              variants={floatingVariants}
              animate="animate"
              style={{
                position: 'absolute',
                left: `${20 + i * 15}%`,
                top: `${10 + i * 12}%`,
                width: '4px',
                height: '4px',
                background: 'rgba(99, 102, 241, 0.3)',
                borderRadius: '50%',
              }}
              transition={{ delay: i * 0.5 }}
            />
          ))}
          
          {/* Sparkle effects */}
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={`sparkle-${i}`}
              variants={sparkleVariants}
              animate="animate"
              style={{
                position: 'absolute',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: '2px',
                height: '2px',
                background: 'rgba(236, 72, 153, 0.5)',
                borderRadius: '50%',
              }}
              transition={{ delay: Math.random() * 2 }}
            />
          ))}
        </div>
      {/* Header with progress */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="max-w-2xl mx-auto mb-8 relative z-10"
      >
        <motion.div 
          className="flex items-center justify-between mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <motion.h1 
            className="text-3xl font-bold text-platform-text"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.5 }}
          >
            Political Messages
          </motion.h1>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStats(!showStats)}
              className="hover:bg-platform-text/10 text-platform-text"
            >
              <motion.div
                animate={{ rotate: showStats ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <Activity className="w-4 h-4 mr-2 text-platform-text" />
              </motion.div>
              Stats
            </Button>
          </motion.div>
        </motion.div>
        
        <motion.div 
          className="space-y-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex justify-between text-sm text-gray-600">
            <span>Progress</span>
            <motion.span
              key={currentIndex}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-medium"
            >
              {currentIndex + 1} of {availableMessages.length}
            </motion.span>
          </div>
          <div className="w-full bg-white/50 backdrop-blur-sm rounded-full h-3 overflow-hidden shadow-inner">
            <motion.div
              variants={progressVariants}
              initial="hidden"
              animate="visible"
              custom={progress}
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full shadow-lg"
            />
          </div>
        </motion.div>
        {/* Stats panel */}
        <AnimatePresence>
          {showStats && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="mt-4 p-4 bg-platform-card-background/80 backdrop-blur-sm rounded-xl border border-platform-contrast/30 shadow-lg"
            >
              <div className="text-sm space-y-2 text-platform-text">
                <motion.div 
                  className="flex justify-between items-center"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <span>Pending votes:</span>
                  <motion.div
                    animate={bufferStats.pendingCount > 0 ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    <Badge variant={bufferStats.pendingCount > 0 ? 'default' : 'secondary'}>
                      {bufferStats.pendingCount}
                    </Badge>
                  </motion.div>
                </motion.div>
                <motion.div 
                  className="flex justify-between items-center"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <span>Connection:</span>
                  <motion.div
                    animate={bufferStats.isOnline ? { } : { x: [0, -2, 2, 0] }}
                    transition={{ duration: 0.5, repeat: bufferStats.isOnline ? 0 : Infinity }}
                  >
                    <Badge variant={bufferStats.isOnline ? 'secondary' : 'destructive'}>
                      {bufferStats.isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Message card */}
      <div className="max-w-2xl mx-auto mb-8 relative z-10">
        <AnimatePresence mode="wait">
          {currentMessage && (
            <motion.div
              key={currentMessage.id}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="bg-purple-100/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 text-center border border-white/50 relative overflow-hidden"
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />
              
              <motion.div 
                className="space-y-6 relative z-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <div>
                  <motion.h2 
                    className="text-4xl sm:text-5xl font-extrabold text-center leading-tight bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4, type: 'spring', stiffness: 100 }}
                  >
                    {currentMessage.slogan}
                  </motion.h2>
                  {currentMessage.subline && (
                    <motion.p 
                      className="mt-4 text-lg sm:text-xl text-center text-gray-600 leading-relaxed"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      {currentMessage.subline}
                    </motion.p>
                  )}
                </div>
                
                {/* All voting buttons underneath slogan */}
                <motion.div 
                  className="flex justify-between items-center gap-4 mt-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  {/* Hate button - far left */}
                  <motion.button
                    type="button"
                    onClick={() => handleVote(4)}
                    className="p-4 rounded-xl transition-colors text-gray-800 hover:bg-gray-800/10 border border-gray-8800/20 backdrop-blur-sm bg-gray-800/5"
                    variants={buttonVariants}
                    initial="initial"
                    whileHover="hover"
                    whileTap="tap"
                    disabled={!currentMessage}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <X className="w-6 h-6" />
                      <span className="text-sm font-medium">Hate</span>
                      <span className="text-xs opacity-75">Press 4</span>
                    </div>
                  </motion.button>
                  
                  {/* Dislike button */}
                  <motion.button
                    type="button"
                    onClick={() => handleVote(3)}
                    className="p-4 rounded-xl transition-colors text-gray-800 hover:bg-gray-800/10 border border-gray-800/20 backdrop-blur-sm bg-gray-800/5"
                    variants={buttonVariants}
                    initial="initial"
                    whileHover="hover"
                    whileTap="tap"
                    disabled={!currentMessage}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <ThumbsDown className="w-6 h-6" />
                      <span className="text-sm font-medium">Dislike</span>
                      <span className="text-xs opacity-75">Press 3</span>
                    </div>
                  </motion.button>
                  
                  {/* Like button */}
                  <motion.button
                    type="button"
                    onClick={() => handleVote(2)}
                    className="p-4 rounded-xl transition-colors text-gray-800 hover:bg-gray-800/10 border border-gray-800/20 backdrop-blur-sm bg-gray-800/5"
                    variants={buttonVariants}
                    initial="initial"
                    whileHover="hover"
                    whileTap="tap"
                    disabled={!currentMessage}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <ThumbsUp className="w-6 h-6" />
                      <span className="text-sm font-medium">Like</span>
                      <span className="text-xs opacity-75">Press 2</span>
                    </div>
                  </motion.button>
                  
                  {/* Love button - far right */}
                  <motion.button
                    type="button"
                    onClick={() => handleVote(1)}
                    className="p-4 rounded-xl transition-colors text-gray-800 hover:bg-gray-800/10 border border-gray-800/20 backdrop-blur-sm bg-gray-800/5"
                    variants={buttonVariants}
                    initial="initial"
                    whileHover="hover"
                    whileTap="tap"
                    disabled={!currentMessage}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Heart className="w-6 h-6" />
                      <span className="text-sm font-medium">Love</span>
                      <span className="text-xs opacity-75">Press 1</span>
                    </div>
                  </motion.button>
                </motion.div>
                
                <motion.hr 
                  className="my-8 border-gray-200"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                />
                
                <motion.div 
                  className="text-sm text-gray-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  How do you feel about this message?
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>


      </div>
    </MainLayout>
  );
}
