import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import PlatformCard from './PlatformCard';
import { Button } from './ui/button';
import { MessageCircle, Clock, ThumbsUp, MapPin, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RecentDiscussion {
  id: string;
  title: string;
  preview: string;
  region: string;
  lastActivity: string;
  commentCount: number;
  upvotes: number;
  lastComment?: {
    author: string;
    timestamp: string;
    preview: string;
  };
}

const RecentDiscussions: React.FC = () => {
  const [discussions, setDiscussions] = useState<RecentDiscussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentDiscussions();
  }, []);

  const fetchRecentDiscussions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/recent-discussions');
      if (response.ok) {
        const data = await response.json();
        setDiscussions(data);
      } else {
        throw new Error('Failed to fetch recent discussions');
      }
    } catch (error) {
      console.error('Error fetching recent discussions:', error);
      setError('Failed to load recent discussions');
    } finally {
      setLoading(false);
    }
  };

  const getRegionColor = (region: string) => {
    switch (region) {
      case 'local': return 'bg-blue-100 text-blue-800';
      case 'state': return 'bg-green-100 text-green-800';
      case 'national': return 'bg-purple-100 text-purple-800';
      case 'global': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <PlatformCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <MessageCircle className="h-5 w-5 text-platform-accent" />
          <h3 className="text-lg font-semibold text-platform-text">Recent Discussions</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-platform-contrast/30 rounded mb-2"></div>
              <div className="h-3 bg-platform-contrast/20 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </PlatformCard>
    );
  }

  if (error) {
    return (
      <PlatformCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <MessageCircle className="h-5 w-5 text-platform-accent" />
          <h3 className="text-lg font-semibold text-platform-text">Recent Discussions</h3>
        </div>
        <p className="text-sm text-platform-text/60">{error}</p>
      </PlatformCard>
    );
  }

  return (
    <PlatformCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-5 w-5 text-platform-accent" />
          <h3 className="text-lg font-semibold text-platform-text">Recent Discussions</h3>
        </div>
        <Link href="/Community" passHref>
          <Button variant="platform-ghost" size="sm" className="text-xs">
            View All
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </div>

      {discussions.length === 0 ? (
        <p className="text-sm text-platform-text/60 text-center py-4">
          No recent discussions found
        </p>
      ) : (
        <div className="space-y-4">
          {discussions.map((discussion, index) => (
            <div key={discussion.id} className={`${index < discussions.length - 1 ? 'border-b border-platform-contrast/30 pb-4' : ''}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <Link href={`/topic/${discussion.id}`} className="hover:text-platform-accent transition-colors">
                    <h4 className="font-medium text-platform-text text-sm leading-tight mb-1">
                      {discussion.title}
                    </h4>
                  </Link>
                  <p className="text-xs text-platform-text/60 line-clamp-2 mb-2">
                    {discussion.preview}
                  </p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ml-2 flex-shrink-0 ${getRegionColor(discussion.region)}`}>
                  <MapPin className="h-3 w-3 inline mr-1" />
                  {discussion.region}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-platform-text/50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    <span>{discussion.commentCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" />
                    <span>{discussion.upvotes}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatDistanceToNow(new Date(discussion.lastActivity), { addSuffix: true })}</span>
                </div>
              </div>

              {discussion.lastComment && (
                <div className="mt-2 p-2 bg-platform-contrast/20 rounded text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-platform-text">{discussion.lastComment.author}</span>
                    <span className="text-platform-text/50">
                      {formatDistanceToNow(new Date(discussion.lastComment.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-platform-text/70 italic">"{discussion.lastComment.preview}"</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PlatformCard>
  );
};

export default RecentDiscussions;