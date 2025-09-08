import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import LeaderboardCard from '../components/LeaderboardCard';
import ModeratorPanel from '../components/ModeratorPanel';
import RecentDiscussions from '../components/RecentDiscussions';
import MyPostsStatus from '../components/MyPostsStatus';
import { User } from '../types';
import MainLayout from '../components/MainLayout';

const CommunityPage: React.FC = () => {
  const { data: session } = useSession();
  const [topBadgeEarners, setTopBadgeEarners] = useState<User[]>([]);
  const [topSuggestionEarners, setTopSuggestionEarners] = useState<User[]>([]);
  const [topCommenters, setTopCommenters] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if current user has moderator badge or is admin
  const userHasModeratorBadge = currentUser?.badges?.some(badge => badge.id === 'badge-community-moderator') || false;
  const isAdmin = (session?.user as any)?.role === 'admin';
  const canModerate = userHasModeratorBadge || isAdmin;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const promises = [
          fetch('/api/leaderboards/top-badge-earners'),
          fetch('/api/leaderboards/top-suggestion-earners'),
          fetch('/api/leaderboards/top-commenters'),
        ];

        // If user is authenticated, also fetch their profile
        if (session?.user?.id) {
          promises.push(fetch('/api/user-profile'));
        }

        const responses = await Promise.all(promises);
        
        // Check leaderboard responses
        if (!responses[0].ok || !responses[1].ok || !responses[2].ok) {
          console.error('Leaderboard API errors:', {
            badgeEarners: responses[0].status,
            suggestionEarners: responses[1].status,
            commenters: responses[2].status
          });
          throw new Error(`Failed to fetch leaderboard data`);
        }

        const badgeData: User[] = await responses[0].json();
        const suggestionData: User[] = await responses[1].json();
        const commenterData: User[] = await responses[2].json();

        setTopBadgeEarners(badgeData);
        setTopSuggestionEarners(suggestionData);
        setTopCommenters(commenterData);

        // Set current user data if available (this is optional)
        if (responses[3]) {
          if (responses[3].ok) {
            const userData: User = await responses[3].json();
            setCurrentUser(userData);
          } else {
            console.warn('Failed to fetch user profile:', responses[3].status);
            // Don't throw error for user profile failure, just log it
          }
        }

      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session?.user?.id]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-xl font-normal">Loading leaderboards...</p>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-xl text-red-500 font-normal">{error}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <h1 className="text-2xl sm:text-3xl font-thin mb-8 sm:mb-10 text-platform-text">Community Leaderboards</h1>

      {/* Recent Discussions - visible to everyone */}
      <section className="mb-8 sm:mb-12">
        <RecentDiscussions />
      </section>

      {/* Moderator Panel - visible to users with moderator badge or admins */}
      <ModeratorPanel userHasModeratorBadge={canModerate} />

      <section className="mb-8 sm:mb-12">
        <h2 className="text-xl sm:text-2xl font-thin mb-6 text-platform-text">Top Badge Earners</h2>
        <div className="space-y-6">
          {topBadgeEarners.length > 0 ? (
            topBadgeEarners.map((user, index) => (
              <LeaderboardCard 
                key={user.id} 
                user={user} 
                rank={index + 1} 
                metric={`${user.badges?.length || 0} Badges`}
              />
            ))
          ) : (
            <p className="text-platform-text/70 font-normal">No top badge earners to display yet.</p>
          )}
        </div>
      </section>

      <section className="mb-8 sm:mb-12">
        <h2 className="text-xl sm:text-2xl font-thin mb-6 text-platform-text">Most Approved Suggestions</h2>
        <div className="space-y-6">
          {topSuggestionEarners.length > 0 ? (
            topSuggestionEarners.map((user, index) => (
              <LeaderboardCard 
                key={user.id} 
                user={user} 
                rank={index + 1} 
                metric={`${user.approvedSuggestions || 0} Approved`}
              />
            ))
          ) : (
            <p className="text-platform-text/70 font-normal">No top suggestion earners to display yet.</p>
          )}
        </div>
      </section>

      <section className="mb-8 sm:mb-12">
        <h2 className="text-xl sm:text-2xl font-thin mb-6 text-platform-text">Most Upvoted Comments</h2>
        <div className="space-y-6">
          {topCommenters.length > 0 ? (
            topCommenters.map((user, index) => (
              <LeaderboardCard 
                key={user.id} 
                user={user} 
                rank={index + 1} 
                metric={`${user.totalUpvotes || 0} Upvotes`}
              />
            ))
          ) : (
            <p className="text-platform-text/70 font-normal">No top commenters to display yet.</p>
          )}
        </div>
      </section>

      {/* My Posts Status - only visible to users with rejected posts */}
      <MyPostsStatus />
    </MainLayout>
  );
};

export default CommunityPage;