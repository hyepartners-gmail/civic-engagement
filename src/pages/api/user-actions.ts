import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer'; // Import datastore and fromDatastore
import { DUMMY_USERS } from '@/lib/dummy-users'; // Using dummy data for demonstration fallback
import { checkAndAwardBadges, saveUserToDatastore } from '@/lib/badgeService'; // Import badge service
import { DUMMY_COMMENTS } from '@/lib/dummy-data'; // Import DUMMY_COMMENTS for fallback
import { Comment, User } from '@/types'; // Import Comment and User type
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]'; // Import authOptions

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user || !session.user.id) {
      return res.status(401).json({ message: 'Unauthorized: User not authenticated.' });
    }

    const userId = session.user.id; // Get userId from session
    const { actionType, payload } = req.body; // userId is now derived from session

    let user: User | undefined;
    let userKey;

    try {
      // Try to fetch user from Datastore - try both string and numeric keys
      const userKeyString = datastore.key(['User', userId]);
      const userKeyNumeric = datastore.key(['User', parseInt(userId, 10)]);

      // Try string key first
      let [fetchedUser] = await datastore.get(userKeyString);

      // If not found with string key, try numeric key
      if (!fetchedUser) {
        [fetchedUser] = await datastore.get(userKeyNumeric);
        userKey = userKeyNumeric; // Use the numeric key for future operations
      } else {
        userKey = userKeyString; // Use the string key for future operations
      }

      if (fetchedUser) {
        user = fromDatastore<User>(fetchedUser);
      } else {
        // If user not found in Datastore, try dummy data (for initial setup/testing)
        user = DUMMY_USERS.find(u => u.id === userId);
        if (!user) {
          console.warn(`User ${userId} not found in Datastore or dummy data.`);
          return res.status(404).json({ message: `User ${userId} not found.` });
        }
        // If found in dummy, create a new Datastore entity for it
        // Removed datastore.int() as Datastore.key can handle string IDs directly
        userKey = datastore.key(['User', user.id]);
        await datastore.save({ key: userKey, data: { ...user, id: undefined } }); // Save to Datastore
        console.log(`User ${user.displayName} migrated from dummy data to Datastore.`);
      }
    } catch (error) {
      console.error('Error fetching user from Datastore, falling back to dummy:', error);
      user = DUMMY_USERS.find(u => u.id === userId);
      if (!user) {
        return res.status(404).json({ message: `User ${userId} not found (Datastore error fallback).` });
      }
    }

    // --- Verification and Profile Completion Check for actions requiring it ---
    // Only apply this check for actions that require full participation (e.g., commenting, voting, suggesting)
    // Viewing pages like amendments or redistricting might not require full profile, but voting/skipping does.
    const requiresFullProfile = ['comment', 'skip_topic', 'vote_topic', 'suggest_topic_approved'].includes(actionType);

    if (requiresFullProfile && (user.zipCode === undefined || user.city === undefined || user.state === undefined || user.politicalAlignment === undefined)) {
      return res.status(403).json({ message: 'User profile incomplete. Please complete your profile (location and political alignment) to perform this action.' });
    }

    if (requiresFullProfile && !user.isVerified) {
      return res.status(403).json({ message: 'Email verification required. Please check your email and verify your account to perform this action.' });
    }

    // --- Streak Logic ---
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    let lastActivityDate = user.lastActivityDate ? new Date(user.lastActivityDate) : null;
    if (lastActivityDate) {
      lastActivityDate.setHours(0, 0, 0, 0);
    }

    const oneDay = 24 * 60 * 60 * 1000; // milliseconds in a day
    const diffDays = lastActivityDate ? Math.round(Math.abs((today.getTime() - lastActivityDate.getTime()) / oneDay)) : null;

    if (diffDays === 1) { // Activity was yesterday, continue streak
      user.currentStreak = (user.currentStreak || 0) + 1;
      console.log(`User ${user.displayName} continued streak to ${user.currentStreak} days.`);
    } else if (diffDays === null || diffDays > 1) { // No previous activity or streak broken
      user.currentStreak = 1;
      console.log(`User ${user.displayName} started a new streak.`);
    }
    user.lastActivityDate = new Date().toISOString(); // Update last activity to now

    // --- Update user's stats based on actionType ---
    if (actionType === 'skip_topic') {
      user.votesCast = (user.votesCast || 0) + 1;
      user.votedSolutions = user.votedSolutions || [];
      user.votedSolutions.push({ topicId: payload.topicId, solutionId: null }); // Record skip as a vote
    } else if (actionType === 'vote_topic') { // This action is now handled by upvote-solution.ts
      user.votesCast = (user.votesCast || 0) + 1;
      user.totalSolutionVotes = (user.totalSolutionVotes || 0) + 1; // Increment solution votes
      user.votedSolutions = user.votedSolutions || [];
      user.votedSolutions.push({ topicId: payload.topicId, solutionId: payload.solutionId });
    } else if (actionType === 'comment') {
      user.totalComments = (user.totalComments || 0) + 1;
      // Save the new comment to Datastore
      const commentKind = 'Comment';
      const commentKey = datastore.key(commentKind);
      const newComment: Comment = {
        id: '', // ID will be set by Datastore
        text: payload.commentText,
        author: {
          id: user.id,
          displayName: user.displayName,
          badges: user.badges || [],
        },
        timestamp: new Date().toISOString(),
        parentId: null, // For now, all comments are top-level
        flags: 0,
        status: 'pending', // New comments start as pending for moderation
      };
      try {
        await datastore.save({ key: commentKey, data: { ...newComment, id: undefined } });
        newComment.id = String(commentKey.id!); // Set the ID after saving
        DUMMY_COMMENTS.push(newComment); // Also add to dummy for immediate client-side consistency
        console.log('New comment saved to Datastore:', newComment);
      } catch (commentError) {
        console.error('Error saving comment to Datastore, adding to dummy only:', commentError);
        DUMMY_COMMENTS.push(newComment); // Fallback to dummy data
      }
    } else if (actionType === 'suggest_topic_approved') { // This action would be triggered by an admin approval process
      user.approvedSuggestions = (user.approvedSuggestions || 0) + 1;
    } else if (actionType === 'view_amendments_page') {
      // This action is primarily for badge awarding. No direct user stat increment needed here,
      // as the badge criteria type 'viewAmendmentsPage' will handle it.
      console.log(`User ${user.displayName} viewed amendments page.`);
    } else if (actionType === 'view_civic_page') { // New action type for Civic Explorer badge
      user.viewedCivicPage = true;
      console.log(`User ${user.displayName} viewed civic page.`);
    } else if (actionType === 'view_redistricting_map') { // New action for Redistrictor badge
      user.viewedRedistrictingMap = true;
      console.log(`User ${user.displayName} viewed redistricting map.`);
    } else if (actionType === 'view_all_redistricting_overlays') { // New action for Fair Mapper badge
      user.viewedAllRedistrictingOverlays = true;
      console.log(`User ${user.displayName} viewed all redistricting overlays.`);
    } else if (actionType === 'explore_district') { // New action for Gerrymander Slayer badge
      user.districtsExploredCount = (user.districtsExploredCount || 0) + 1;
      user.exploredDistricts = user.exploredDistricts || [];
      if (!user.exploredDistricts.includes(payload.districtId)) {
        user.exploredDistricts.push(payload.districtId);
      }
      console.log(`User ${user.displayName} explored district ${payload.districtId}. Total explored: ${user.districtsExploredCount}`);
    }
    // Add other action types as needed for badge criteria

    // Check and award badges
    user = checkAndAwardBadges(user);

    // Save the updated user back to Datastore
    try {
      await saveUserToDatastore(user);
    } catch (saveError: any) {
      console.error('Error saving updated user to Datastore:', saveError);
      // Fallback to dummy data update if Datastore save fails
      const userIndex = DUMMY_USERS.findIndex(u => u.id === user?.id);
      if (userIndex !== -1) {
        DUMMY_USERS[userIndex] = user;
        console.warn(`User ${user?.displayName} updated in dummy data as Datastore save failed.`);
      } else {
        DUMMY_USERS.push(user); // Add new user to dummy data if not found
        console.warn(`New user ${user?.displayName} added to dummy data as Datastore save failed.`);
      }
    }

    console.log(`Received user action: ${actionType} for user ${userId}`, payload);

    // --- Email Notification for Streaks (Placeholder) ---
    if (user.currentStreak && (user.currentStreak === 7 || user.currentStreak === 28)) {
      const streakType = user.currentStreak === 7 ? 'Daily' : 'Weekly';
      await fetch(`${process.env.NEXTAUTH_URL}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user.email,
          subject: `🎉 Your Civic Engagement Streak!`,
          body: `Congratulations, ${user.displayName}! You've reached a ${user.currentStreak}-day ${streakType.toLowerCase()} streak on the Civic Platform. Keep up the great work!`,
        }),
      });
    }

    res.status(200).json({ message: `Action '${actionType}' processed.`, user: user });
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}