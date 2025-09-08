import React from 'react';
import { Avatar, AvatarFallback } from './ui/avatar';
import BadgeDisplay from './BadgeDisplay';
import { User } from '../types';
import OnboardingTooltip from './OnboardingTooltip';
import { motion } from 'framer-motion';
import PlatformCard from './PlatformCard'; // Import PlatformCard
import RollingCounter from './RollingCounter'; // Import RollingCounter
import { colors } from '../lib/theme'; // Import centralized colors

interface LeaderboardCardProps {
  user: Pick<User, 'id' | 'displayName' | 'badges' | 'approvedSuggestions' | 'totalUpvotes'>;
  rank: number;
  metric: string; // This will now be the raw number, not formatted string
}

const LeaderboardCard: React.FC<LeaderboardCardProps> = ({ user, rank, metric }) => {
  // Determine the actual numeric value and label based on the metric string
  let metricValue: number = 0;
  let metricLabel: string = '';

  if (metric.includes('Badges')) {
    metricValue = user.badges?.length || 0;
    metricLabel = 'Badges';
  } else if (metric.includes('Approved')) {
    metricValue = user.approvedSuggestions || 0;
    metricLabel = 'Approved';
  } else if (metric.includes('Upvotes')) {
    metricValue = user.totalUpvotes || 0;
    metricLabel = 'Upvotes';
  }

  return (
    <motion.div
      className="group"
      whileHover={{ scale: 1.01, boxShadow: "0 5px 10px rgba(0, 0, 0, 0.2)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <PlatformCard className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4">
        <div className="text-xl sm:text-2xl font-bold text-platform-accent">{rank}.</div>
        <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
          <AvatarFallback className="text-sm sm:text-base">{user.displayName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold text-base sm:text-lg text-platform-text">{user.displayName}</p>
          {user.badges && user.badges.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {user.badges.map((badge) => (
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
        </div>
        <div className="text-base sm:text-lg font-medium text-platform-text"> {/* Changed to text-platform-text */}
          <RollingCounter value={metricValue} /> {metricLabel}
        </div>
      </PlatformCard>
    </motion.div>
  );
};

export default LeaderboardCard;