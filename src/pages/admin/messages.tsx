import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, Reorder, Variants, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  GripVertical, 
  Eye, 
  EyeOff, 
  Save, 
  X, 
  AlertCircle,
  BarChart3,
  Activity,
  Sparkles,
  Zap,
  FlaskConical,
  Target,
  TrendingUp,
  CheckCircle,
  Users,
  Trophy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Message, 
  MessageCreateRequest, 
  MessagePatchRequest, 
  MessageReorderRequest,
  MessageStatus,
  ABPair,
  ABPairCreateRequest,
  ABPairStatus
} from '@/lib/messaging-schemas';
import MainLayout from '@/components/MainLayout';

// ========== ANIMATION VARIANTS ==========

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15
    }
  }
};

const cardVariants: Variants = {
  initial: { opacity: 0, y: 30, rotateX: -15 },
  animate: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: {
      type: 'spring',
      stiffness: 120,
      damping: 20
    }
  },
  hover: {
    y: -5,
    scale: 1.02,
    rotateX: 5,
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25
    }
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 }
  }
};

const statsVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8, rotateY: -45 },
  visible: {
    opacity: 1,
    scale: 1,
    rotateY: 0,
    transition: {
      type: 'spring',
      stiffness: 150,
      damping: 20
    }
  }
};

const buttonVariants: Variants = {
  idle: { scale: 1, rotate: 0 },
  hover: {
    scale: 1.05,
    rotate: 2,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 10
    }
  },
  tap: {
    scale: 0.95,
    rotate: -1,
    transition: { duration: 0.1 }
  }
};

const floatingVariants: Variants = {
  animate: {
    y: [0, -20, 0],
    rotate: [0, 5, -5, 0],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

const sparkleVariants: Variants = {
  animate: {
    scale: [0, 1, 0],
    rotate: [0, 180, 360],
    opacity: [0, 1, 0],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

// ========== TYPES ==========

interface EditMessageFormData {
  slogan: string;
  subline: string;
  status: MessageStatus;
}

interface MessageWithOrder extends Message {
  order: number;
}

interface ABPairFormData {
  a: string;
  b: string;
  status: ABPairStatus;
}

interface ABPairMetrics {
  totalVotes: number;
  aVotes: number;
  bVotes: number;
  aWinRate: number;
  bWinRate: number;
  confidence: number;
  isSignificant: boolean;
  recommendedWinner?: 'a' | 'b' | null;
}

// ========== MAIN COMPONENT ==========

export default function AdminMessagesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<Message | null>(null);
  const [reorderedMessages, setReorderedMessages] = useState<MessageWithOrder[]>([]);
  
  // A/B Testing states
  const [activeTab, setActiveTab] = useState<'messages' | 'abtest'>('messages');
  const [showCreateABTestDialog, setShowCreateABTestDialog] = useState(false);
  const [editingPair, setEditingPair] = useState<ABPair | null>(null);
  const [deletePair, setDeletePair] = useState<ABPair | null>(null);

  // Auth check
  if (!session?.user || (session.user as any).role !== 'admin') {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="w-full max-w-md bg-platform-card-background border-platform-contrast">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-platform-text">Access Denied</h2>
              <p className="text-platform-text/70 mb-4">
                You need admin privileges to access this page.
              </p>
              <Button 
                onClick={() => router.push('/')}
                className="bg-platform-accent text-platform-text hover:bg-platform-accent/90"
              >
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Fetch messages
  const { data: messages, isLoading: messagesLoading, error: messagesError } = useQuery<Message[]>({
    queryKey: ['admin-messages'],
    queryFn: async () => {
      const response = await fetch('/api/messages?status=all');
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch messages:', response.status, errorText);
        throw new Error(`Failed to fetch messages: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Successfully fetched messages:', data);
      return data;
    },
    staleTime: 30000,
  });

  // Fetch A/B pairs
  const { data: pairs, isLoading: pairsLoading, error: pairsError } = useQuery<ABPair[]>({
    queryKey: ['admin-abtest-pairs'],
    queryFn: async () => {
      const response = await fetch('/api/admin/messages/abtest/pairs?status=all');
      if (!response.ok) throw new Error('Failed to fetch A/B pairs');
      return response.json();
    },
    staleTime: 30000,
  });

  // Update reordered messages when messages data changes
  React.useEffect(() => {
    if (messages) {
      const withOrder = messages.map((msg, index) => ({
        ...msg,
        order: index,
      }));
      setReorderedMessages(withOrder);
    }
  }, [messages]);

  // Calculate metrics for pairs (mock implementation)
  const pairMetrics = useMemo<Record<string, ABPairMetrics>>(() => {
    if (!pairs) return {};
    
    return pairs.reduce((acc, pair) => {
      const totalVotes = Math.floor(Math.random() * 1000) + 100;
      const aVotes = Math.floor(totalVotes * (0.3 + Math.random() * 0.4));
      const bVotes = totalVotes - aVotes;
      const aWinRate = aVotes / totalVotes;
      const bWinRate = bVotes / totalVotes;
      const confidence = Math.min(0.99, Math.max(0.5, Math.sqrt(totalVotes / 1000)));
      const isSignificant = totalVotes > 100 && Math.abs(aWinRate - bWinRate) > 0.1;
      
      let recommendedWinner: 'a' | 'b' | null = null;
      if (isSignificant) {
        recommendedWinner = aWinRate > bWinRate ? 'a' : 'b';
      }

      acc[pair.id] = {
        totalVotes, aVotes, bVotes, aWinRate, bWinRate,
        confidence, isSignificant, recommendedWinner,
      };
      
      return acc;
    }, {} as Record<string, ABPairMetrics>);
  }, [pairs]);

  // Create message mutation
  const createMessageMutation = useMutation({
    mutationFn: async (data: MessageCreateRequest) => {
      const response = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to create message');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
      setShowCreateDialog(false);
    },
  });

  // Update message mutation
  const updateMessageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: MessagePatchRequest }) => {
      const response = await fetch(`/api/admin/messages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update message');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
      setEditingMessage(null);
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/messages/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete message');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
      setDeleteMessage(null);
    },
  });

  // Reorder messages mutation
  const reorderMessageMutation = useMutation({
    mutationFn: async (reorderData: MessageReorderRequest) => {
      const response = await fetch('/api/admin/messages/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reorderData),
      });
      if (!response.ok) {
        throw new Error('Failed to reorder messages');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
    },
  });

  // A/B Testing mutations
  const createABTestMutation = useMutation({
    mutationFn: async (data: ABPairCreateRequest) => {
      const response = await fetch('/api/admin/messages/abtest/pairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create A/B pair');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-abtest-pairs'] });
      setShowCreateABTestDialog(false);
    },
  });

  const updateABTestMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ABPair> }) => {
      const response = await fetch(`/api/admin/messages/abtest/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update A/B pair');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-abtest-pairs'] });
      setEditingPair(null);
    },
  });

  const deleteABTestMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/messages/abtest/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete A/B pair');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-abtest-pairs'] });
      setDeletePair(null);
    },
  });

  // Handle reorder
  const handleReorder = useCallback((newOrder: MessageWithOrder[]) => {
    setReorderedMessages(newOrder);
    
    // Find the message that moved
    if (messages && newOrder.length === messages.length) {
      for (let i = 0; i < newOrder.length; i++) {
        const currentMsg = newOrder[i];
        const originalIndex = messages.findIndex(m => m.id === currentMsg.id);
        
        if (originalIndex !== i) {
          // This message moved
          const beforeId = i > 0 ? newOrder[i - 1].id : undefined;
          const afterId = i < newOrder.length - 1 ? newOrder[i + 1].id : undefined;
          
          reorderMessageMutation.mutate({
            id: currentMsg.id,
            beforeId,
            afterId,
          });
          break;
        }
      }
    }
  }, [messages, reorderMessageMutation]);

  // Handle status toggle for messages
  const handleMessageStatusToggle = useCallback((message: Message) => {
    const newStatus: MessageStatus = message.status === 'active' ? 'inactive' : 'active';
    updateMessageMutation.mutate({
      id: message.id,
      data: { status: newStatus },
    });
  }, [updateMessageMutation]);

  // Handle status toggle for A/B pairs
  const handleABTestStatusToggle = useCallback((pair: ABPair) => {
    const newStatus: ABPairStatus = pair.status === 'active' ? 'inactive' : 'active';
    updateABTestMutation.mutate({ id: pair.id, data: { status: newStatus } });
  }, [updateABTestMutation]);

  // Get message by ID for A/B testing
  const getMessageById = useCallback((id: string) => {
    return messages?.find(m => m.id === id);
  }, [messages]);

  // Loading states
  if (messagesLoading || pairsLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-platform-background flex items-center justify-center">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
            />
            <p className="text-lg text-platform-text">Loading...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Error states
  if (messagesError || pairsError) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-platform-background flex items-center justify-center">
          <Card className="w-full max-w-md bg-platform-card-background border-platform-contrast">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-platform-text">Error Loading Data</h2>
              <p className="text-platform-text/70 mb-4">
                {messagesError instanceof Error ? messagesError.message : 'Failed to load data. Please try again.'}
              </p>
              <Button 
                onClick={() => window.location.reload()}
                className="bg-platform-accent text-platform-text hover:bg-platform-accent/90"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-platform-background p-6 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            variants={floatingVariants}
            animate="animate"
            style={{
              position: 'absolute',
              left: `${15 + i * 12}%`,
              top: `${5 + i * 15}%`,
              width: '6px',
              height: '6px',
              background: 'rgba(99, 102, 241, 0.4)',
              borderRadius: '50%',
            }}
            transition={{ delay: i * 0.7 }}
          />
        ))}
        
        {/* Sparkle effects */}
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={`sparkle-${i}`}
            variants={sparkleVariants}
            animate="animate"
            style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: '3px',
              height: '3px',
              background: 'rgba(236, 72, 153, 0.6)',
              borderRadius: '50%',
            }}
            transition={{ delay: Math.random() * 3 }}
          />
        ))}
      </div>
      
      <motion.div 
        className="max-w-6xl mx-auto relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between mb-8"
          variants={itemVariants}
        >
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <motion.h1 
              className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.5 }}
            >
              Message Management
              <motion.span
                className="inline-block ml-2"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
              >
                ✨
              </motion.span>
            </motion.h1>
            <motion.p 
              className="text-platform-text/70 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              Manage political messages and A/B tests
            </motion.p>
          </motion.div>
          
          <motion.div 
            className="flex items-center gap-3"
            variants={itemVariants}
          >
            <motion.button
              type="button"
              onClick={() => router.push('/admin/messages/results')}
              className="p-3 hover:bg-platform-text/10 rounded transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <BarChart3 className="w-5 h-5 text-platform-text" />
            </motion.button>
            
            {activeTab === 'messages' ? (
              <motion.button
                type="button"
                onClick={() => setShowCreateDialog(true)}
                className="p-3 hover:bg-platform-text/10 rounded transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Plus className="w-5 h-5 text-platform-text" />
              </motion.button>
            ) : (
              <motion.button
                type="button"
                onClick={() => setShowCreateABTestDialog(true)}
                className="p-3 hover:bg-platform-text/10 rounded transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Plus className="w-5 h-5 text-platform-text" />
              </motion.button>
            )}
          </motion.div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div 
          className="flex mb-8 border-b border-platform-contrast/30"
          variants={itemVariants}
        >
          <button
            className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
              activeTab === 'messages'
                ? 'text-platform-text border-b-2 border-platform-accent bg-platform-contrast/20'
                : 'text-platform-text/70 hover:text-platform-text'
            }`}
            onClick={() => setActiveTab('messages')}
          >
            Messages
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors flex items-center gap-2 ${
              activeTab === 'abtest'
                ? 'text-platform-text border-b-2 border-platform-accent bg-platform-contrast/20'
                : 'text-platform-text/70 hover:text-platform-text'
            }`}
            onClick={() => setActiveTab('abtest')}
          >
            <FlaskConical className="w-4 h-4" />
            A/B Tests
          </button>
        </motion.div>

        {/* Tab Content */}
        {activeTab === 'messages' ? (
          // ... existing messages content ...
          <>
            {/* Stats */}
            {messages && (
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.div variants={statsVariants}>
                  <Card className="backdrop-blur-sm bg-platform-card-background/80 hover:bg-platform-card-background/90 border-platform-contrast/30 shadow-xl transition-all duration-300">
                    <CardContent className="p-6">
                      <motion.div 
                        className="flex items-center"
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <motion.div
                          animate={{ rotate: [0, 5, -5, 0] }}
                          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <Activity className="w-8 h-8 text-platform-text" />
                        </motion.div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-platform-text/70">Total Messages</p>
                          <motion.p 
                            className="text-2xl font-bold text-platform-text"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200, delay: 0.8 }}
                          >
                            {messages.length}
                          </motion.p>
                        </div>
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>
                
                <motion.div variants={statsVariants}>
                  <Card className="backdrop-blur-sm bg-platform-card-background/80 hover:bg-platform-card-background/90 border-platform-contrast/30 shadow-xl transition-all duration-300">
                    <CardContent className="p-6">
                      <motion.div 
                        className="flex items-center"
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <Eye className="w-8 h-8 text-platform-text" />
                        </motion.div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-platform-text/70">Active</p>
                          <motion.p 
                            className="text-2xl font-bold text-platform-text"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200, delay: 1.0 }}
                          >
                            {messages.filter(m => m.status === 'active').length}
                          </motion.p>
                        </div>
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>
                
                <motion.div variants={statsVariants}>
                  <Card className="backdrop-blur-sm bg-platform-card-background/80 hover:bg-platform-card-background/90 border-platform-contrast/30 shadow-xl transition-all duration-300">
                    <CardContent className="p-6">
                      <motion.div 
                        className="flex items-center"
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <motion.div
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <EyeOff className="w-8 h-8 text-platform-text" />
                        </motion.div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-platform-text/70">Inactive</p>
                          <motion.p 
                            className="text-2xl font-bold text-platform-text"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200, delay: 1.2 }}
                          >
                            {messages.filter(m => m.status === 'inactive').length}
                          </motion.p>
                        </div>
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            )}

            {/* Messages List */}
            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate="visible"
            >
              <Card className="backdrop-blur-sm bg-platform-card-background/80 border-platform-contrast/30 shadow-xl">
                <CardHeader className="border-b border-platform-contrast/20">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.4 }}
                  >
                    <CardTitle className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                      >
                        <Sparkles className="w-5 h-5 text-platform-text" />
                      </motion.div>
                      Messages
                    </CardTitle>
                  </motion.div>
                </CardHeader>
                <CardContent className="p-6">
                  {reorderedMessages.length === 0 ? (
                    <motion.div 
                      className="text-center py-12"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.5, type: 'spring', stiffness: 100 }}
                    >
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Activity className="w-12 h-12 text-platform-text/70 mx-auto mb-4" />
                      </motion.div>
                      <h3 className="text-lg font-medium text-platform-text mb-2">No messages yet</h3>
                      <p className="text-platform-text/70 mb-4">
                        Create your first political message to get started.
                      </p>
                      <motion.div
                        variants={buttonVariants}
                        initial="idle"
                        whileHover="hover"
                        whileTap="tap"
                      >
                        <Button 
                          onClick={() => setShowCreateDialog(true)}
                          className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Message
                        </Button>
                      </motion.div>
                    </motion.div>
                  ) : (
                    <Reorder.Group 
                      values={reorderedMessages} 
                      onReorder={handleReorder}
                      className="space-y-3"
                    >
                      <AnimatePresence mode="popLayout">
                        {reorderedMessages.map((message, index) => (
                          <Reorder.Item key={message.id} value={message}>
                            <motion.div
                              variants={cardVariants}
                              initial="initial"
                              animate="animate"
                              whileHover="hover"
                              whileTap="tap"
                              transition={{ delay: index * 0.1 }}
                              className="p-4 backdrop-blur-sm bg-platform-contrast/90 border border-platform-contrast/40 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 relative overflow-hidden"
                            >
                              
                              <div className="flex items-center gap-4 relative z-10">
                                <motion.div 
                                  className="cursor-grab active:cursor-grabbing"
                                  whileHover={{ scale: 1.2, rotate: 5 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <GripVertical className="w-5 h-5 text-platform-text/70" />
                                </motion.div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <motion.h3 
                                      className="text-lg font-semibold text-platform-text truncate"
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.1 + 0.2 }}
                                    >
                                      {message.slogan}
                                    </motion.h3>
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ delay: index * 0.1 + 0.3, type: 'spring', stiffness: 200 }}
                                    >
                                      <Badge 
                                        variant={message.status === 'active' ? 'default' : 'secondary'}
                                        className={message.status === 'active' 
                                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                                          : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                                        }
                                      >
                                        {message.status}
                                      </Badge>
                                    </motion.div>
                                  </div>
                                  
                                  {message.subline && (
                                    <motion.p 
                                      className="text-platform-text/70 truncate"
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ delay: index * 0.1 + 0.4 }}
                                    >
                                      {message.subline}
                                    </motion.p>
                                  )}
                                  
                                  <motion.div 
                                    className="flex items-center gap-4 mt-2 text-sm text-platform-text/50"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 + 0.5 }}
                                  >
                                    <span>Created: {new Date(message.createdAt).toLocaleDateString()}</span>
                                    <span>Updated: {new Date(message.updatedAt).toLocaleDateString()}</span>
                                  </motion.div>
                                </div>
                                
                                <motion.div 
                                  className="flex items-center gap-1"
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.1 + 0.6 }}
                                >
                                  <motion.button
                                    type="button"
                                    onClick={() => handleMessageStatusToggle(message)}
                                    className="p-2 hover:bg-platform-text/10 rounded transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    {message.status === 'active' ? (
                                      <EyeOff className="w-4 h-4 text-platform-text" />
                                    ) : (
                                      <Eye className="w-4 h-4 text-platform-text" />
                                    )}
                                  </motion.button>
                                  
                                  <motion.button
                                    type="button"
                                    onClick={() => setEditingMessage(message)}
                                    className="p-2 hover:bg-platform-text/10 rounded transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Edit3 className="w-4 h-4 text-platform-text" />
                                  </motion.button>
                                  
                                  <motion.button
                                    type="button"
                                    onClick={() => setDeleteMessage(message)}
                                    className="p-2 hover:bg-platform-text/10 rounded transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Trash2 className="w-4 h-4 text-platform-text" />
                                  </motion.button>
                                  
                                  <motion.div
                                    className="p-2 cursor-grab hover:bg-platform-text/10 rounded transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <GripVertical className="w-4 h-4 text-platform-text/70" />
                                  </motion.div>
                                </motion.div>
                              </div>
                            </motion.div>
                          </Reorder.Item>
                        ))}
                      </AnimatePresence>
                    </Reorder.Group>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </>
        ) : (
          // A/B Testing Content
          <>
            {/* A/B Testing Stats */}
            {pairs && (
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.div variants={statsVariants}>
                  <Card className="bg-platform-card-background border-platform-contrast">
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <Target className="w-8 h-8 text-platform-accent" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-platform-text/70">Total Tests</p>
                          <p className="text-2xl font-bold text-platform-text">{pairs.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
                
                <motion.div variants={statsVariants}>
                  <Card className="bg-platform-card-background border-platform-contrast">
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <Activity className="w-8 h-8 text-green-500" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-platform-text/70">Active</p>
                          <p className="text-2xl font-bold text-platform-text">
                            {pairs.filter(p => p.status === 'active').length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
                
                <motion.div variants={statsVariants}>
                  <Card className="bg-platform-card-background border-platform-contrast">
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <CheckCircle className="w-8 h-8 text-purple-500" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-platform-text/70">Significant</p>
                          <p className="text-2xl font-bold text-platform-text">
                            {Object.values(pairMetrics).filter(m => m.isSignificant).length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
                
                <motion.div variants={statsVariants}>
                  <Card className="bg-platform-card-background border-platform-contrast">
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <Users className="w-8 h-8 text-orange-500" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-platform-text/70">Total Votes</p>
                          <p className="text-2xl font-bold text-platform-text">
                            {Object.values(pairMetrics).reduce((sum, m) => sum + m.totalVotes, 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            )}

            {/* A/B Tests List */}
            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate="visible"
            >
              <Card className="bg-platform-card-background border-platform-contrast">
                <CardHeader className="border-b border-platform-contrast/20">
                  <CardTitle className="text-xl font-bold text-platform-text flex items-center gap-2">
                    <FlaskConical className="w-5 h-5" />
                    A/B Tests
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {!pairs || pairs.length === 0 ? (
                    <div className="text-center py-12">
                      <Target className="w-12 h-12 text-platform-text/50 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-platform-text mb-2">No A/B tests yet</h3>
                      <p className="text-platform-text/70 mb-4">
                        Create your first A/B test to compare message performance.
                      </p>
                      <Button 
                        className="bg-platform-accent text-platform-text hover:bg-platform-accent/90"
                        onClick={() => setShowCreateABTestDialog(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create A/B Test
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pairs.map((pair) => {
                        const metrics = pairMetrics[pair.id];
                        const messageA = getMessageById(pair.a);
                        const messageB = getMessageById(pair.b);
                        
                        return (
                          <motion.div
                            key={pair.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-6 bg-platform-card-background border border-platform-contrast rounded-lg shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start gap-4">
                              <div className="flex-1 min-w-0">
                                {/* Header */}
                                <div className="flex items-center gap-2 mb-4">
                                  <h3 className="text-lg font-semibold text-platform-text">
                                    A/B Test #{pair.id.slice(-8)}
                                  </h3>
                                  <Badge variant={pair.status === 'active' ? 'default' : 'secondary'}>
                                    {pair.status}
                                  </Badge>
                                  {metrics?.isSignificant && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Significant
                                    </Badge>
                                  )}
                                  {metrics?.recommendedWinner && (
                                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                      <Trophy className="w-3 h-3 mr-1" />
                                      Winner: {metrics.recommendedWinner.toUpperCase()}
                                    </Badge>
                                  )}
                                </div>

                                {/* Messages Comparison */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                                  {/* Message A */}
                                  <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="font-semibold text-platform-text">Message A</h4>
                                      {metrics?.recommendedWinner === 'a' && (
                                        <Trophy className="w-4 h-4 text-yellow-500" />
                                      )}
                                    </div>
                                    <p className="text-platform-text font-medium mb-1">
                                      {messageA?.slogan || 'Message not found'}
                                    </p>
                                    {messageA?.subline && (
                                      <p className="text-platform-text/70 text-sm">{messageA.subline}</p>
                                    )}
                                    {metrics && (
                                      <div className="mt-3 space-y-1">
                                        <div className="flex justify-between text-sm">
                                          <span className="text-platform-text/70">Votes:</span>
                                          <span className="font-medium text-platform-text">{metrics.aVotes}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                          <span className="text-platform-text/70">Win Rate:</span>
                                          <span className="font-medium text-platform-text">{(metrics.aWinRate * 100).toFixed(1)}%</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Message B */}
                                  <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="font-semibold text-platform-text">Message B</h4>
                                      {metrics?.recommendedWinner === 'b' && (
                                        <Trophy className="w-4 h-4 text-yellow-500" />
                                      )}
                                    </div>
                                    <p className="text-platform-text font-medium mb-1">
                                      {messageB?.slogan || 'Message not found'}
                                    </p>
                                    {messageB?.subline && (
                                      <p className="text-platform-text/70 text-sm">{messageB.subline}</p>
                                    )}
                                    {metrics && (
                                      <div className="mt-3 space-y-1">
                                        <div className="flex justify-between text-sm">
                                          <span className="text-platform-text/70">Votes:</span>
                                          <span className="font-medium text-platform-text">{metrics.bVotes}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                          <span className="text-platform-text/70">Win Rate:</span>
                                          <span className="font-medium text-platform-text">{(metrics.bWinRate * 100).toFixed(1)}%</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Metrics Summary */}
                                {metrics && (
                                  <div className="flex flex-wrap items-center gap-4 text-sm text-platform-text/70 mb-3">
                                    <div className="flex items-center gap-1">
                                      <Users className="w-4 h-4" />
                                      <span>{metrics.totalVotes} total votes</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <TrendingUp className="w-4 h-4" />
                                      <span>{(metrics.confidence * 100).toFixed(1)}% confidence</span>
                                    </div>
                                  </div>
                                )}

                                {/* Timestamps */}
                                <div className="flex items-center gap-4 text-sm text-platform-text/50">
                                  <span>Created: {new Date(pair.createdAt).toLocaleDateString()}</span>
                                  <span>Updated: {new Date(pair.updatedAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                              
                              {/* Actions */}
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleABTestStatusToggle(pair)}
                                  className="text-platform-text hover:bg-platform-contrast"
                                >
                                  {pair.status === 'active' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                                
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => setEditingPair(pair)}
                                  className="text-platform-text hover:bg-platform-contrast"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </Button>
                                
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => setDeletePair(pair)}
                                  className="text-platform-text hover:bg-platform-contrast"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </motion.div>

      {/* Create Message Dialog */}
      <CreateMessageDialog 
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={(data) => createMessageMutation.mutate(data)}
        isLoading={createMessageMutation.isPending}
      />

      {/* Edit Message Dialog */}
      {editingMessage && (
        <EditMessageDialog 
          message={editingMessage}
          open={!!editingMessage}
          onOpenChange={() => setEditingMessage(null)}
          onSubmit={(data) => updateMessageMutation.mutate({ id: editingMessage.id, data })}
          isLoading={updateMessageMutation.isPending}
        />
      )}

      {/* Delete Message Dialog */}
      {deleteMessage && (
        <DeleteMessageDialog 
          message={deleteMessage}
          open={!!deleteMessage}
          onOpenChange={() => setDeleteMessage(null)}
          onConfirm={() => deleteMessageMutation.mutate(deleteMessage.id)}
          isLoading={deleteMessageMutation.isPending}
        />
      )}

      {/* Create A/B Test Dialog */}
      <CreateABTestDialog 
        open={showCreateABTestDialog}
        onOpenChange={setShowCreateABTestDialog}
        onSubmit={(data) => createABTestMutation.mutate(data)}
        isLoading={createABTestMutation.isPending}
        messages={messages || []}
      />

      {/* Edit A/B Test Dialog */}
      {editingPair && (
        <EditABTestDialog 
          pair={editingPair}
          open={!!editingPair}
          onOpenChange={() => setEditingPair(null)}
          onSubmit={(data) => updateABTestMutation.mutate({ id: editingPair.id, data })}
          isLoading={updateABTestMutation.isPending}
          messages={messages || []}
        />
      )}

      {/* Delete A/B Test Dialog */}
      {deletePair && (
        <DeleteABTestDialog 
          pair={deletePair}
          open={!!deletePair}
          onOpenChange={() => setDeletePair(null)}
          onConfirm={() => deleteABTestMutation.mutate(deletePair.id)}
          isLoading={deleteABTestMutation.isPending}
          messageA={getMessageById(deletePair.a)}
          messageB={getMessageById(deletePair.b)}
        />
      )}
      </div>
    </MainLayout>
  );
}

// ========== CREATE MESSAGE DIALOG ==========

interface CreateMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: MessageCreateRequest) => void;
  isLoading: boolean;
}

function CreateMessageDialog({ open, onOpenChange, onSubmit, isLoading }: CreateMessageDialogProps) {
  const [formData, setFormData] = useState<EditMessageFormData>({
    slogan: '',
    subline: '',
    status: 'active',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.slogan.trim()) {
      onSubmit({
        slogan: formData.slogan.trim(),
        subline: formData.subline.trim() || undefined,
        status: formData.status,
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isLoading) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setFormData({ slogan: '', subline: '', status: 'active' });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md backdrop-blur-sm bg-platform-card-background border-platform-contrast">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <DialogHeader>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <DialogTitle className="text-xl font-bold text-platform-text flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  ✨
                </motion.div>
                Create New Message
              </DialogTitle>
              <DialogDescription className="text-platform-text/70">
                Add a new political message to the system.
              </DialogDescription>
            </motion.div>
          </DialogHeader>
          
          <motion.form 
            onSubmit={handleSubmit} 
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Label htmlFor="slogan" className="text-sm font-medium text-platform-text">Slogan *</Label>
              <motion.div
                whileFocus={{ scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Input
                  id="slogan"
                  value={formData.slogan}
                  onChange={(e) => setFormData(prev => ({ ...prev, slogan: e.target.value }))}
                  placeholder="Enter message slogan"
                  maxLength={240}
                  required
                  className="mt-1 bg-platform-background border-platform-contrast text-platform-text focus:border-platform-accent focus:ring focus:ring-platform-accent/20 transition-all"
                />
              </motion.div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Label htmlFor="subline" className="text-sm font-medium text-platform-text">Subline</Label>
              <motion.div
                whileFocus={{ scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Input
                  id="subline"
                  value={formData.subline}
                  onChange={(e) => setFormData(prev => ({ ...prev, subline: e.target.value }))}
                  placeholder="Enter optional subline"
                  maxLength={240}
                  className="mt-1 bg-platform-background border-platform-contrast text-platform-text focus:border-platform-accent focus:ring focus:ring-platform-accent/20 transition-all"
                />
              </motion.div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Label htmlFor="status" className="text-sm font-medium text-platform-text">Status</Label>
              <motion.select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as MessageStatus }))}
                className="w-full p-2 mt-1 bg-platform-background border border-platform-contrast rounded-md text-platform-text focus:border-platform-accent focus:ring focus:ring-platform-accent/20 transition-all"
                whileFocus={{ scale: 1.02 }}
              >
                <option value="active" className="bg-platform-background text-platform-text">Active</option>
                <option value="inactive" className="bg-platform-background text-platform-text">Inactive</option>
              </motion.select>
            </motion.div>
          </motion.form>
          
          <DialogFooter className="mt-6">
            <motion.div
              className="flex gap-3 w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => handleOpenChange(false)}
                  className="flex-1 border-platform-contrast text-platform-text hover:bg-platform-contrast"
                >
                  Cancel
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  type="submit" 
                  onClick={handleSubmit} 
                  disabled={!formData.slogan.trim() || isLoading}
                  className="flex-1 bg-platform-accent text-platform-text hover:bg-platform-accent/90 disabled:from-gray-400 disabled:to-gray-500"
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                    />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  {isLoading ? 'Creating...' : 'Create Message'}
                </Button>
              </motion.div>
            </motion.div>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

// ========== EDIT MESSAGE DIALOG ==========

interface EditMessageDialogProps {
  message: Message;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: MessagePatchRequest) => void;
  isLoading: boolean;
}

function EditMessageDialog({ message, open, onOpenChange, onSubmit, isLoading }: EditMessageDialogProps) {
  const [formData, setFormData] = useState<EditMessageFormData>({
    slogan: message.slogan,
    subline: message.subline || '',
    status: message.status,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.slogan.trim()) {
      onSubmit({
        slogan: formData.slogan.trim(),
        subline: formData.subline.trim() || undefined,
        status: formData.status,
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isLoading) {
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-platform-card-background border-platform-contrast">
        <DialogHeader>
          <DialogTitle className="text-platform-text">Edit Message</DialogTitle>
          <DialogDescription className="text-platform-text/70">
            Update the message details.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-slogan" className="text-platform-text">Slogan *</Label>
            <Input
              id="edit-slogan"
              value={formData.slogan}
              onChange={(e) => setFormData(prev => ({ ...prev, slogan: e.target.value }))}
              placeholder="Enter message slogan"
              maxLength={240}
              required
              className="bg-platform-background border-platform-contrast text-platform-text"
            />
          </div>
          
          <div>
            <Label htmlFor="edit-subline" className="text-platform-text">Subline</Label>
            <Input
              id="edit-subline"
              value={formData.subline}
              onChange={(e) => setFormData(prev => ({ ...prev, subline: e.target.value }))}
              placeholder="Enter optional subline"
              maxLength={240}
              className="bg-platform-background border-platform-contrast text-platform-text"
            />
          </div>
          
          <div>
            <Label htmlFor="edit-status" className="text-platform-text">Status</Label>
            <select
              id="edit-status"
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as MessageStatus }))}
              className="w-full p-2 border border-platform-contrast rounded-md bg-platform-background text-platform-text"
            >
              <option value="active" className="bg-platform-background text-platform-text">Active</option>
              <option value="inactive" className="bg-platform-background text-platform-text">Inactive</option>
            </select>
          </div>
        </form>
        
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => handleOpenChange(false)}
            className="border-platform-contrast text-platform-text hover:bg-platform-contrast"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit} 
            disabled={!formData.slogan.trim() || isLoading}
            className="bg-platform-accent text-platform-text hover:bg-platform-accent/90"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========== DELETE MESSAGE DIALOG ==========

interface DeleteMessageDialogProps {
  message: Message;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
}

function DeleteMessageDialog({ message, open, onOpenChange, onConfirm, isLoading }: DeleteMessageDialogProps) {
  const handleOpenChange = (newOpen: boolean) => {
    if (!isLoading) {
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-platform-card-background border-platform-contrast">
        <DialogHeader>
          <DialogTitle className="text-platform-text">Delete Message</DialogTitle>
          <DialogDescription className="text-platform-text/70">
            Are you sure you want to delete this message? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-4 bg-platform-contrast rounded-lg">
          <h4 className="font-semibold text-platform-text">{message.slogan}</h4>
          {message.subline && (
            <p className="text-platform-text/70 mt-1">{message.subline}</p>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => handleOpenChange(false)}
            className="border-platform-contrast text-platform-text hover:bg-platform-contrast"
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={onConfirm} 
            disabled={isLoading}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {isLoading ? 'Deleting...' : 'Delete Message'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========== CREATE A/B TEST DIALOG ==========

function CreateABTestDialog({ open, onOpenChange, onSubmit, isLoading, messages }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ABPairCreateRequest) => void;
  isLoading: boolean;
  messages: Message[];
}) {
  const [formData, setFormData] = useState<ABPairFormData>({ a: '', b: '', status: 'active' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.a && formData.b && formData.a !== formData.b) {
      onSubmit({ a: formData.a, b: formData.b, status: formData.status });
    }
  };

  const availableMessages = messages.filter(m => m.status === 'active');
  const isValid = formData.a && formData.b && formData.a !== formData.b;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-platform-card-background border-platform-contrast">
        <DialogHeader>
          <DialogTitle className="text-platform-text">Create A/B Test</DialogTitle>
          <DialogDescription className="text-platform-text/70">Select two messages to compare in an A/B test.</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-platform-text">Message A</Label>
            <Select value={formData.a} onValueChange={(value) => setFormData(prev => ({ ...prev, a: value }))}>
              <SelectTrigger className="bg-platform-background border-platform-contrast text-platform-text">
                <SelectValue placeholder="Select message A" />
              </SelectTrigger>
              <SelectContent className="bg-platform-card-background border-platform-contrast text-platform-text">
                {availableMessages.filter(m => m.id !== formData.b).map((message) => (
                  <SelectItem key={message.id} value={message.id} className="hover:bg-platform-contrast">
                    <span className="font-medium">{message.slogan}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-platform-text">Message B</Label>
            <Select value={formData.b} onValueChange={(value) => setFormData(prev => ({ ...prev, b: value }))}>
              <SelectTrigger className="bg-platform-background border-platform-contrast text-platform-text">
                <SelectValue placeholder="Select message B" />
              </SelectTrigger>
              <SelectContent className="bg-platform-card-background border-platform-contrast text-platform-text">
                {availableMessages.filter(m => m.id !== formData.a).map((message) => (
                  <SelectItem key={message.id} value={message.id} className="hover:bg-platform-contrast">
                    <span className="font-medium">{message.slogan}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-platform-text">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as ABPairStatus }))}>
              <SelectTrigger className="bg-platform-background border-platform-contrast text-platform-text">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-platform-card-background border-platform-contrast text-platform-text">
                <SelectItem value="active" className="hover:bg-platform-contrast">Active</SelectItem>
                <SelectItem value="inactive" className="hover:bg-platform-contrast">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>
        
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="border-platform-contrast text-platform-text hover:bg-platform-contrast"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit} 
            disabled={!isValid || isLoading}
            className="bg-platform-accent text-platform-text hover:bg-platform-accent/90"
          >
            {isLoading ? 'Creating...' : 'Create A/B Test'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========== EDIT A/B TEST DIALOG ==========

function EditABTestDialog({ pair, open, onOpenChange, onSubmit, isLoading, messages }: {
  pair: ABPair;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<ABPair>) => void;
  isLoading: boolean;
  messages: Message[];
}) {
  const [formData, setFormData] = useState<ABPairFormData>({
    a: pair.a, b: pair.b, status: pair.status,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.a && formData.b && formData.a !== formData.b) {
      onSubmit({ a: formData.a, b: formData.b, status: formData.status });
    }
  };

  const availableMessages = messages.filter(m => m.status === 'active');
  const isValid = formData.a && formData.b && formData.a !== formData.b;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-platform-card-background border-platform-contrast">
        <DialogHeader>
          <DialogTitle className="text-platform-text">Edit A/B Test</DialogTitle>
          <DialogDescription className="text-platform-text/70">Update the A/B test configuration.</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-platform-text">Message A</Label>
            <Select value={formData.a} onValueChange={(value) => setFormData(prev => ({ ...prev, a: value }))}>
              <SelectTrigger className="bg-platform-background border-platform-contrast text-platform-text">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-platform-card-background border-platform-contrast text-platform-text">
                {availableMessages.filter(m => m.id !== formData.b).map((message) => (
                  <SelectItem key={message.id} value={message.id} className="hover:bg-platform-contrast">
                    <span className="font-medium">{message.slogan}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-platform-text">Message B</Label>
            <Select value={formData.b} onValueChange={(value) => setFormData(prev => ({ ...prev, b: value }))}>
              <SelectTrigger className="bg-platform-background border-platform-contrast text-platform-text">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-platform-card-background border-platform-contrast text-platform-text">
                {availableMessages.filter(m => m.id !== formData.a).map((message) => (
                  <SelectItem key={message.id} value={message.id} className="hover:bg-platform-contrast">
                    <span className="font-medium">{message.slogan}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-platform-text">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as ABPairStatus }))}>
              <SelectTrigger className="bg-platform-background border-platform-contrast text-platform-text">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-platform-card-background border-platform-contrast text-platform-text">
                <SelectItem value="active" className="hover:bg-platform-contrast">Active</SelectItem>
                <SelectItem value="inactive" className="hover:bg-platform-contrast">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>
        
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="border-platform-contrast text-platform-text hover:bg-platform-contrast"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit} 
            disabled={!isValid || isLoading}
            className="bg-platform-accent text-platform-text hover:bg-platform-accent/90"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========== DELETE A/B TEST DIALOG ==========

function DeleteABTestDialog({ pair, open, onOpenChange, onConfirm, isLoading, messageA, messageB }: {
  pair: ABPair;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
  messageA?: Message;
  messageB?: Message;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-platform-card-background border-platform-contrast">
        <DialogHeader>
          <DialogTitle className="text-platform-text">Delete A/B Test</DialogTitle>
          <DialogDescription className="text-platform-text/70">
            Are you sure you want to delete this A/B test? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-4 bg-platform-contrast rounded-lg space-y-2">
          <h4 className="font-semibold text-platform-text">A/B Test #{pair.id.slice(-8)}</h4>
          <div className="text-sm text-platform-text">
            <p><span className="font-medium">Message A:</span> {messageA?.slogan || 'Unknown'}</p>
            <p><span className="font-medium">Message B:</span> {messageB?.slogan || 'Unknown'}</p>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="border-platform-contrast text-platform-text hover:bg-platform-contrast"
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={onConfirm} 
            disabled={isLoading}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {isLoading ? 'Deleting...' : 'Delete A/B Test'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}