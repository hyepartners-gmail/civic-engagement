import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import PlatformCard from './PlatformCard';
import { Button } from './ui/button';
import { Shield, Eye, CheckCircle, XCircle, Flag, MessageSquare } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface PendingPost {
  id: string;
  content: string;
  author: {
    id: string;
    displayName: string;
  };
  timestamp: string;
  type: 'comment' | 'suggestion' | 'topic';
  flags?: number;
}

interface ModeratorPanelProps {
  userHasModeratorBadge: boolean; // This now includes both moderator badge holders and admins
}

const ModeratorPanel: React.FC<ModeratorPanelProps> = ({ userHasModeratorBadge }) => {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [pendingPosts, setPendingPosts] = useState<PendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  
  const isAdmin = (session?.user as any)?.role === 'admin';

  useEffect(() => {
    if (userHasModeratorBadge) {
      fetchPendingPosts();
    }
  }, [userHasModeratorBadge]);

  const fetchPendingPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/moderation/pending-posts');
      if (response.ok) {
        const data = await response.json();
        setPendingPosts(data);
      } else if (response.status === 403) {
        // User doesn't have permission - this is expected for non-moderators
        console.log('User does not have moderation permissions');
        setPendingPosts([]);
      } else {
        console.error('Failed to fetch pending posts:', response.status, response.statusText);
        throw new Error(`Failed to fetch pending posts: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching pending posts:', error);
      toast({
        title: "Error",
        description: "Failed to load pending posts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const moderatePost = async (postId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      setModeratingId(postId);
      const response = await fetch('/api/moderation/moderate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          action,
          reason,
          moderatorId: session?.user?.id
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Post ${action}d successfully`,
        });
        // Remove the moderated post from the list
        setPendingPosts(prev => prev.filter(post => post.id !== postId));
      } else {
        throw new Error(`Failed to ${action} post`);
      }
    } catch (error) {
      console.error(`Error ${action}ing post:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} post`,
        variant: "destructive",
      });
    } finally {
      setModeratingId(null);
    }
  };

  if (!userHasModeratorBadge) {
    return null; // Don't render anything if user doesn't have moderator badge or admin role
  }

  return (
    <section className="mb-8 sm:mb-12">
      <PlatformCard variant="background" className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-6 w-6 text-platform-accent" />
          <h2 className="text-xl sm:text-2xl font-thin text-platform-text">Community Moderation</h2>
          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
            isAdmin 
              ? 'bg-red-500 text-white' 
              : 'bg-platform-accent text-platform-background'
          }`}>
            {isAdmin ? 'Admin' : 'Moderator'}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-platform-text/70">Loading pending posts...</p>
          </div>
        ) : pendingPosts.length === 0 ? (
          <div className="text-center py-8">
            <Eye className="h-12 w-12 text-platform-text/30 mx-auto mb-4" />
            <p className="text-platform-text/70">No posts pending moderation</p>
            <p className="text-sm text-platform-text/50 mt-2">Great job keeping the community clean!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-platform-text/70">
                {pendingPosts.length} post{pendingPosts.length !== 1 ? 's' : ''} awaiting review
              </p>
              <Button
                size="sm"
                variant="platform-ghost"
                onClick={fetchPendingPosts}
              >
                Refresh
              </Button>
            </div>

            {pendingPosts.map((post) => (
              <PlatformCard key={post.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-platform-text/60" />
                    <span className="font-medium text-platform-text">{post.author.displayName}</span>
                    <span className="text-sm text-platform-text/60">
                      {new Date(post.timestamp).toLocaleDateString()}
                    </span>
                    {post.flags && post.flags > 0 && (
                      <div className="flex items-center gap-1 bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                        <Flag className="h-3 w-3" />
                        {post.flags} flag{post.flags !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                  <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium capitalize">
                    {post.type}
                  </div>
                </div>

                <div className="bg-platform-contrast/30 p-3 rounded-md mb-4">
                  <p className="text-sm text-platform-text whitespace-pre-wrap">
                    {post.content}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="platform-primary"
                    onClick={() => moderatePost(post.id, 'approve')}
                    disabled={moderatingId === post.id}
                    className="flex items-center gap-1"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => moderatePost(post.id, 'reject')}
                    disabled={moderatingId === post.id}
                    className="flex items-center gap-1"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </PlatformCard>
            ))}
          </div>
        )}
      </PlatformCard>
    </section>
  );
};

export default ModeratorPanel;