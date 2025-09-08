import { User } from '../types';

export const DUMMY_USERS: User[] = [
  {
    id: 'user-1',
    email: 'civic.champion@example.com',
    displayName: 'CivicChampion',
    partyPreference: undefined, // Changed to undefined
    zipCode: undefined, // Changed to undefined
    city: undefined, // New: Explicitly undefined
    state: undefined, // New: Explicitly undefined
    metroArea: undefined, // New: Explicitly undefined
    congressionalDistrict: undefined, // New: Explicitly undefined
    isVerified: true,
    votesCast: 0, // Reset to 0 for fresh start
    totalComments: 0, // New field
    totalSolutionVotes: 0, // New field
    isMuted: false,
    badges: [], // Clear for dynamic assignment
    badgeProgress: [], // Clear for dynamic assignment
    approvedSuggestions: 0,
    totalUpvotes: 0,
    votedSolutions: [], // IMPORTANT: Cleared this array to allow voting
    lastActivityDate: new Date().toISOString(), // Initialize with current date
    currentStreak: 0, // Initialize streak
    role: 'user', // Default role for regular users
  },
  {
    id: 'user-2',
    email: 'safety.first@example.com',
    displayName: 'SafetyFirstMom',
    partyPreference: undefined, // Changed to undefined
    zipCode: undefined, // Changed to undefined
    city: undefined, // New: Explicitly undefined
    state: undefined, // New: Explicitly undefined
    metroArea: undefined, // New: Explicitly undefined
    congressionalDistrict: undefined, // New: Explicitly undefined
    isVerified: true,
    votesCast: 0,
    totalComments: 0,
    totalSolutionVotes: 0,
    isMuted: false,
    badges: [],
    badgeProgress: [],
    approvedSuggestions: 0,
    totalUpvotes: 0,
    votedSolutions: [],
    lastActivityDate: new Date().toISOString(),
    currentStreak: 0,
    role: 'user', // Default role for regular users
  },
  {
    id: 'user-3',
    email: 'park.watcher@example.com',
    displayName: 'ParkWatcher',
    partyPreference: undefined, // Changed to undefined
    zipCode: undefined, // Changed to undefined
    city: undefined, // New: Explicitly undefined
    state: undefined, // New: Explicitly undefined
    metroArea: undefined, // New: Explicitly undefined
    congressionalDistrict: undefined, // New: Explicitly undefined
    isVerified: false,
    votesCast: 0,
    totalComments: 0,
    totalSolutionVotes: 0,
    isMuted: true,
    badges: [],
    badgeProgress: [],
    approvedSuggestions: 0,
    totalUpvotes: 0,
    votedSolutions: [],
    lastActivityDate: new Date().toISOString(),
    currentStreak: 0,
    role: 'user', // Default role for regular users
  },
  {
    id: 'admin-1', // Added an explicit admin user
    email: 'admin@civic.com',
    displayName: 'Admin User',
    partyPreference: undefined, // Changed to undefined
    zipCode: undefined, // Changed to undefined
    city: undefined, // New: Explicitly undefined
    state: undefined, // New: Explicitly undefined
    metroArea: undefined, // New: Explicitly undefined
    congressionalDistrict: undefined, // New: Explicitly undefined
    isVerified: true,
    votesCast: 0,
    totalComments: 0,
    totalSolutionVotes: 0,
    isMuted: false,
    badges: [],
    badgeProgress: [],
    approvedSuggestions: 0,
    totalUpvotes: 0,
    votedSolutions: [],
    lastActivityDate: new Date().toISOString(),
    currentStreak: 0,
    role: 'admin', // Explicitly set admin role
  },
];