import { User, Badge, BadgeProgress } from '@/types';
import { BADGE_DEFINITIONS } from '@/lib/badgeDefinitions';
import { datastore, fromDatastore } from '@/lib/datastoreServer'; // Import datastore and fromDatastore

/**
 * Checks if a user qualifies for any new badges and awards them.
 * Updates badge progress for relevant badges.
 * @param user The user object to check and update.
 * @returns The updated user object with new badges and progress.
 */
export const checkAndAwardBadges = (user: User): User => {
  let updatedUser = { ...user };
  updatedUser.badges = updatedUser.badges || [];
  updatedUser.badgeProgress = updatedUser.badgeProgress || [];

  BADGE_DEFINITIONS.forEach(badgeDef => {
    // Skip if badge is manual or already awarded
    if (badgeDef.criteria?.type === 'manual' || updatedUser.badges?.some(b => b.id === badgeDef.id)) {
      return;
    }

    const criteriaType = badgeDef.criteria?.type;
    const threshold = badgeDef.criteria?.threshold;

    if (!criteriaType) { // Threshold can be 0 for some criteria, so check only criteriaType
      return; // Skip badges without clear criteria
    }

    let currentCount = 0;
    switch (criteriaType) {
      case 'totalComments':
        currentCount = updatedUser.totalComments || 0;
        break;
      case 'totalVotes':
        currentCount = (updatedUser.votesCast || 0) + (updatedUser.totalSolutionVotes || 0);
        break;
      case 'totalSolutionVotes':
        currentCount = updatedUser.totalSolutionVotes || 0;
        break;
      case 'approvedSuggestions':
        currentCount = updatedUser.approvedSuggestions || 0;
        break;
      case 'commentUpvotes':
        currentCount = updatedUser.totalUpvotes || 0; // Use totalUpvotes from user profile
        break;
      case 'streak':
        currentCount = updatedUser.currentStreak || 0;
        break;
      case 'viewAmendmentsPage':
        // This badge is awarded simply by triggering the action, threshold is 1
        currentCount = 1; 
        break;
      case 'votedLaw':
        currentCount = updatedUser.votedLawTopics || 0;
        break;
      case 'votedAmendment':
        currentCount = updatedUser.votedAmendmentTopics || 0;
        break;
      case 'votedRule':
        currentCount = updatedUser.votedRuleTopics || 0;
        break;
      case 'viewCivicPage': // New case for Civic Explorer badge
        currentCount = updatedUser.viewedCivicPage ? 1 : 0;
        break;
      case 'viewRedistrictingMap': // New case for Redistrictor badge
        currentCount = updatedUser.viewedRedistrictingMap ? 1 : 0;
        break;
      case 'viewAllRedistrictingOverlays': // New case for Fair Mapper badge
        currentCount = updatedUser.viewedAllRedistrictingOverlays ? 1 : 0;
        break;
      case 'exploreDistrict': // New case for Gerrymander Slayer badge
        currentCount = updatedUser.districtsExploredCount || 0;
        break;
      case 'approvedCommunityPosts': // New case for Community Moderator badge
        currentCount = updatedUser.approvedCommunityPosts || 0;
        break;
      default:
        return;
    }

    // Update badge progress (only for badges with a threshold)
    if (threshold !== undefined) {
      // Ensure badgeProgress array exists
      if (!updatedUser.badgeProgress) {
        updatedUser.badgeProgress = [];
      }
      
      let progress = updatedUser.badgeProgress.find(p => p.badgeId === badgeDef.id);
      if (!progress) {
        progress = { badgeId: badgeDef.id, currentCount: currentCount, threshold: threshold };
        updatedUser.badgeProgress.push(progress);
      } else {
        progress.currentCount = currentCount;
      }
    }

    // Check if badge is earned
    if (threshold === undefined || currentCount >= threshold) {
      // Ensure badges array exists
      if (!updatedUser.badges) {
        updatedUser.badges = [];
      }
      
      updatedUser.badges.push({
        id: badgeDef.id,
        name: badgeDef.name,
        description: badgeDef.description,
        icon: badgeDef.icon,
        color: badgeDef.color,
        earnedAt: new Date().toISOString(),
      });
      // Remove from progress once earned
      if (updatedUser.badgeProgress) {
        updatedUser.badgeProgress = updatedUser.badgeProgress.filter(p => p.badgeId !== badgeDef.id);
      }
      console.log(`User ${updatedUser.displayName} earned badge: ${badgeDef.name}`);
    }
  });

  return updatedUser;
};

/**
 * Saves the user to Google Cloud Datastore.
 * If the user does not exist, a new entity is created.
 * If the user exists, the existing entity is updated.
 * @param user The user object to save.
 */
export const saveUserToDatastore = async (user: User) => {
  const kind = 'User';
  let userKey;

  if (user.id) {
    // If user has an ID, assume it's an existing entity.
    // Try to parse as integer for numeric IDs, otherwise use as string.
    const numericId = parseInt(user.id, 10);
    if (!isNaN(numericId)) {
      userKey = datastore.key([kind, numericId]);
    } else {
      userKey = datastore.key([kind, user.id]);
    }
  } else {
    // If no ID, it's a new user, Datastore will generate an ID
    userKey = datastore.key(kind);
  }

  // Prepare data, excluding the 'id' property as it's part of the key
  const { id, ...dataToSave } = user;

  await datastore.save({
    key: userKey,
    data: dataToSave,
  });
  // If it was a new user, update the user object with the generated ID
  if (!user.id && userKey.id) {
    user.id = String(userKey.id);
  }
  console.log(`User ${user.displayName} saved/updated in Datastore.`);
};