import { Badge } from '../types';

export const BADGE_DEFINITIONS: Badge[] = [
  {
    id: 'badge-first-commenter',
    name: 'First Commenter',
    description: 'Awarded for posting your very first comment.',
    icon: 'MessageSquare',
    color: 'blue',
    criteria: { type: 'totalComments', threshold: 1 }
  },
  {
    id: 'badge-voter-enthusiast',
    name: 'Voter Enthusiast',
    description: 'Awarded for casting 5 votes on topics or solutions.',
    icon: 'ThumbsUp',
    color: 'green',
    criteria: { type: 'totalVotes', threshold: 5 }
  },
  {
    id: 'badge-solution-seeker',
    name: 'Solution Seeker',
    description: 'Awarded for voting on 5 solutions.',
    icon: 'Lightbulb',
    color: 'yellow',
    criteria: { type: 'totalSolutionVotes', threshold: 5 }
  },
  {
    id: 'badge-community-contributor',
    name: 'Community Contributor',
    description: 'Awarded for having 3 approved topic suggestions.',
    icon: 'Users',
    color: 'purple',
    criteria: { type: 'approvedSuggestions', threshold: 3 }
  },
  {
    id: 'badge-discussion-starter',
    name: 'Discussion Starter',
    description: 'Awarded for having a comment receive 5 upvotes.',
    icon: 'MessageCircleMore',
    color: 'orange',
    criteria: { type: 'commentUpvotes', threshold: 5 }
  },
  {
    id: 'badge-civic-leader',
    name: 'Civic Leader',
    description: 'Awarded for having 10 approved topic suggestions.',
    icon: 'Crown',
    color: 'gold',
    criteria: { type: 'approvedSuggestions', threshold: 10 }
  },
  {
    id: 'badge-early-adopter',
    name: 'Early Adopter',
    description: 'Joined within the first 100 users.',
    icon: 'Star',
    color: 'silver',
    criteria: { type: 'manual' } // This badge is typically assigned manually or based on signup date
  },
  // New Gamification Badges
  {
    id: 'badge-daily-streaker',
    name: 'Daily Streaker',
    description: 'Awarded for maintaining a daily participation streak of 7 days.',
    icon: 'CalendarCheck',
    color: 'red',
    criteria: { type: 'streak', threshold: 7 }
  },
  {
    id: 'badge-weekly-streaker',
    name: 'Weekly Streaker',
    description: 'Awarded for maintaining a weekly participation streak of 4 weeks.',
    icon: 'CalendarDays',
    color: 'indigo',
    criteria: { type: 'streak', threshold: 28 } // 4 weeks * 7 days
  },
  {
    id: 'badge-first-topic-approved',
    name: 'First Topic Approved',
    description: 'Awarded for having your first topic suggestion approved by moderators.',
    icon: 'CheckCircle',
    color: 'teal',
    criteria: { type: 'approvedSuggestions', threshold: 1 }
  },
  {
    id: 'badge-top-contributor',
    name: 'Top Contributor',
    description: 'Awarded for having 5 or more approved topic suggestions, recognizing significant contributions.',
    icon: 'Trophy',
    color: 'amber',
    criteria: { type: 'approvedSuggestions', threshold: 5 }
  },
  // Phase 5: Constitutional Convention & Amendments Badges
  {
    id: 'badge-constitutional-delegate',
    name: 'Constitutional Delegate',
    description: 'Awarded for voting on all topics and unlocking the Amendments page.',
    icon: 'Gavel', // Using Gavel icon for legal/constitutional theme
    color: 'slate',
    criteria: { type: 'viewAmendmentsPage', threshold: 1 } // Awarded upon viewing the page
  },
  {
    id: 'badge-law-voter',
    name: 'Law Voter',
    description: 'Awarded for voting on 5 law-type topics.',
    icon: 'Scale', // Using Scale icon for law
    color: 'emerald',
    criteria: { type: 'votedLaw', threshold: 5 }
  },
  {
    id: 'badge-amendment-voter',
    name: 'Amendment Voter',
    description: 'Awarded for voting on 3 amendment-type topics.',
    icon: 'ScrollText', // Using ScrollText icon for amendments
    color: 'rose',
    criteria: { type: 'votedAmendment', threshold: 3 }
  },
  {
    id: 'badge-rule-voter',
    name: 'Rule Voter',
    description: 'Awarded for voting on 5 rule-type topics.',
    icon: 'ClipboardList', // Using ClipboardList for rules
    color: 'cyan',
    criteria: { type: 'votedRule', threshold: 5 }
  },
  // Phase 6: Civic Engagement Page Badge
  {
    id: 'badge-civic-explorer',
    name: 'Civic Explorer',
    description: 'Awarded for exploring your local civic information.',
    icon: 'Map', // Using Map icon for civic engagement
    color: 'lime',
    criteria: { type: 'viewCivicPage', threshold: 1 } // Awarded upon viewing the page
  },
  // Phase 7: Redistricting Badges
  {
    id: 'badge-redistrictor',
    name: 'Redistrictor',
    description: 'Awarded for exploring the Redistricting map for the first time.',
    icon: 'MapPin', // Using MapPin for location/mapping
    color: 'pink',
    criteria: { type: 'viewRedistrictingMap', threshold: 1 }
  },
  {
    id: 'badge-fair-mapper',
    name: 'Fair Mapper',
    description: 'Awarded for viewing all major map overlays (vote margin and compactness).',
    icon: 'BalanceScale', // Using BalanceScale for fairness
    color: 'violet',
    criteria: { type: 'viewAllRedistrictingOverlays', threshold: 1 }
  },
  {
    id: 'badge-gerrymander-slayer',
    name: 'Gerrymander Slayer',
    description: 'Awarded for exploring the details of 10 unique districts.',
    icon: 'Swords', // Using Swords for "slayer" theme
    color: 'red',
    criteria: { type: 'exploreDistrict', threshold: 10 }
  },
  // Community Moderation Badge
  {
    id: 'badge-community-moderator',
    name: 'Community Moderator',
    description: 'Awarded for having 5 approved community posts, granting moderation privileges.',
    icon: 'Shield', // Using Shield icon for moderation/protection
    color: 'gray',
    criteria: { type: 'approvedCommunityPosts', threshold: 5 }
  }
];