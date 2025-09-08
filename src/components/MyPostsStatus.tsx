import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import PlatformCard from './PlatformCard';
import { Button } from './ui/button';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  MessageSquare, 
  FileText, 
  Lightbulb,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface UserPost {
  id: string;
  type: 'comment' | 'topic' | 'solution';
  title: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
  moderatedAt?: string;
  moderationReason?: string;
  relatedTopic?: {
    id: string;
    title: string;
  };
}

interface MyPostsData {
  posts: UserPost[];
  hasRejectedPosts: boolean;
  totalPosts: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
}

const MyPostsStatus: React.FC = () => {
  const { data: session } = useSession();
  const [postsData, setPostsData] = useState<MyPostsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      fetchMyPosts();
    } else {
      setLoading(false);
    }
  }, [session?.user?.id]);

  const fetchMyPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/my-posts');
      if (response.ok) {
        const data = await response.json();
        setPostsData(data);
      } else if (response.status === 401) {
        // User not authenticated - this is expected
        setPostsData(null);
      } else {
        throw new Error('Failed to fetch posts');
      }
    } catch (error) {
      console.error('Error fetching my posts:', error);
      setError('Failed to load post history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return <MessageSquare className="h-4 w-4" />;
      case 'topic':
        return <FileText className="h-4 w-4" />;
      case 'solution':
        return <Lightbulb className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Don't render if user is not authenticated, still loading, or has no rejected posts
  if (!session?.user?.id || loading || !postsData || !postsData.hasRejectedPosts) {
    return null;
  }

  if (error) {
    return (
      <section className="mb-8">
        <PlatformCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h3 className="text-lg font-semibold text-platform-text">My Posts Status</h3>
          </div>
          <p className="text-sm text-red-600">{error}</p>
        </PlatformCard>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <PlatformCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-platform-accent" />
            <h3 className="text-lg font-semibold text-platform-text">My Posts Status</h3>
          </div>
          <Button
            variant="platform-ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                Hide Details
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                View Details
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-platform-contrast/20 rounded-md">
            <div className="text-lg font-semibold text-platform-text">{postsData.totalPosts}</div>
            <div className="text-xs text-platform-text/60">Total Posts</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-md">
            <div className="text-lg font-semibold text-green-700">{postsData.approvedCount}</div>
            <div className="text-xs text-green-600">Approved</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-md">
            <div className="text-lg font-semibold text-red-700">{postsData.rejectedCount}</div>
            <div className="text-xs text-red-600">Rejected</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-md">
            <div className="text-lg font-semibold text-yellow-700">{postsData.pendingCount}</div>
            <div className="text-xs text-yellow-600">Pending</div>
          </div>
        </div>

        {/* Detailed Post List */}
        {isExpanded && (
          <div className="space-y-3">
            <div className="border-t border-platform-contrast/30 pt-4">
              <h4 className="font-medium text-platform-text mb-3">Post History</h4>
              {postsData.posts.length === 0 ? (
                <p className="text-sm text-platform-text/60 text-center py-4">
                  No posts found
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {postsData.posts.map((post) => (
                    <div key={post.id} className="border border-platform-contrast/30 rounded-md p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(post.type)}
                          <span className="font-medium text-platform-text text-sm">
                            {post.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getStatusColor(post.status)}`}>
                            {getStatusIcon(post.status)}
                            {post.status}
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-platform-text/70 mb-2 line-clamp-2">
                        {post.content}
                      </p>

                      <div className="flex items-center justify-between text-xs text-platform-text/50">
                        <span>
                          {formatDistanceToNow(new Date(post.timestamp), { addSuffix: true })}
                        </span>
                        {post.relatedTopic && (
                          <span className="text-platform-accent">
                            Topic: {post.relatedTopic.title}
                          </span>
                        )}
                      </div>

                      {post.status === 'rejected' && post.moderationReason && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                          <div className="font-medium text-red-800 mb-1">Rejection Reason:</div>
                          <div className="text-red-700">{post.moderationReason}</div>
                          {post.moderatedAt && (
                            <div className="text-red-600 mt-1">
                              Moderated {formatDistanceToNow(new Date(post.moderatedAt), { addSuffix: true })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {postsData.rejectedCount > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Review rejected posts to understand community guidelines. 
              Consider revising and resubmitting content that follows our standards.
            </p>
          </div>
        )}
      </PlatformCard>
    </section>
  );
};

export default MyPostsStatus;