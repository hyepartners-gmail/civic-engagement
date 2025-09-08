export * from './common';
export * from './budget';
export * from './tax';

// Amendment types for admin panel
export interface Amendment {
  id: string;
  amendmentNumber: number;
  title: string;
  amendmentText: string;
  originalAmendmentText?: string;
  isOverridden: boolean;
  totalVotes: number;
  basedOnTopic: string;
  winningSolution: {
    title: string;
    description: string;
  };
  status: 'active' | 'proposed' | 'ratified';
  overriddenBy?: string;
  overriddenAt?: string;
}

export interface Topic {
  id: string;
  title: string;
  preview: string;
  region: 'local' | 'state' | 'national' | 'global';
  problemStatement?: string;
  solutions?: Solution[];
  status?: 'pending' | 'approved' | 'rejected';
  upvotes?: number;
  suggesterId?: string;
  flags?: number;
  videoUrl?: string;
  changeType?: 'law' | 'amendment' | 'rule';
  amendmentText?: string;
  amendmentTextContinued?: string; // For text 1500-3000 characters
  amendmentTextContinued2?: string; // For text 3000-4500 characters
  amendmentNumber?: number;
  createdAt?: string;
  order?: number; // Add order field for drag & drop sorting
}

export interface Solution {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  votes?: number;
  suggesterId?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string; // Optional, displayName is primary
  displayName: string;
  avatar?: string;
  role?: 'user' | 'admin';
  isMuted: boolean;
  isVerified: boolean;
  
  // Profile
  zipCode?: string;
  city?: string;
  state?: string;
  metroArea?: string;
  congressionalDistrict?: string;
  birthYear?: string;
  politicalAlignment?: 'Left' | 'Center' | 'Right';
  partyPreference?: string;

  // Stats
  votesCast: number;
  totalComments: number;
  totalSolutionVotes: number;
  approvedSuggestions?: number;
  totalUpvotes?: number;
  
  // Gamification
  badges?: Badge[];
  badgeProgress?: BadgeProgress[];
  lastActivityDate?: string; // ISO string
  currentStreak?: number;
  
  // Tracking
  votedSolutions?: { topicId: string; solutionId: string | null }[];
  votedLawTopics?: number;
  votedAmendmentTopics?: number;
  votedRuleTopics?: number;
  viewedCivicPage?: boolean;
  viewedRedistrictingMap?: boolean;
  viewedAllRedistrictingOverlays?: boolean;
  exploredDistricts?: string[];
  districtsExploredCount?: number;
  approvedCommunityPosts?: number;
  viewedAmendmentsPage?: boolean;

  // Auth/Internal
  resetToken?: string;
  resetTokenExpiry?: string;
  lastReminderSent?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon?: string;
  color?: string;
  earnedAt?: string;
  criteria?: {
    type: 'totalComments' | 'totalVotes' | 'totalSolutionVotes' | 'approvedSuggestions' | 'commentUpvotes' | 'manual' | 'streak' | 'viewAmendmentsPage' | 'votedLaw' | 'votedAmendment' | 'votedRule' | 'viewCivicPage' | 'viewRedistrictingMap' | 'viewAllRedistrictingOverlays' | 'exploreDistrict' | 'approvedCommunityPosts';
    threshold?: number;
  };
}

export interface BadgeProgress {
  badgeId: string;
  currentCount: number;
  threshold: number;
}

export interface Comment {
  id: string;
  text: string;
  author: Pick<User, 'id' | 'displayName' | 'badges'>;
  timestamp: string; // ISO string
  parentId: string | null; // For replies
  topicId?: string; // To associate comment with a topic
  upvotes?: number;
  flags?: number;
  status?: 'pending' | 'approved' | 'rejected';
}