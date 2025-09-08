import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer'; // Import datastore and fromDatastore
import { checkAndAwardBadges, saveUserToDatastore } from '@/lib/badgeService'; // Import badge service
import { Topic, User } from '@/types'; // Import Topic and User types
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]'; // Import authOptions

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user || !session.user.id) {
      return res.status(401).json({ message: 'Unauthorized: User not authenticated.' });
    }

    const userId = session.user.id; // Get userId from session
    const { solutionId, topicId } = req.body; // userId is now derived from session

    console.log(`Upvote attempt - userId: ${userId}, type: ${typeof userId}, solutionId: ${solutionId}, topicId: ${topicId}`);

    if (!topicId) {
      return res.status(400).json({ message: 'Missing topicId.' });
    }

    try {
      // Fetch user from Datastore - try both string and numeric keys
      let fetchedUser = null;
      let userKey = datastore.key(['User', userId]);
      [fetchedUser] = await datastore.get(userKey);
      
      // If not found with string key, try numeric key
      if (!fetchedUser && !isNaN(Number(userId))) {
        userKey = datastore.key(['User', parseInt(userId, 10)]);
        [fetchedUser] = await datastore.get(userKey);
      }
      
      if (!fetchedUser) {
        console.error(`User not found in datastore. Tried userId: ${userId} (string) and ${parseInt(userId, 10)} (numeric)`);
        return res.status(404).json({ message: 'User not found.' });
      }
      let user = fromDatastore<User>(fetchedUser);

      // Check if user has completed onboarding (profile completion)
      if (user.zipCode === undefined || user.city === undefined || user.state === undefined || user.politicalAlignment === undefined) {
        return res.status(403).json({ message: 'User profile incomplete. Please complete your profile (location and political alignment) to vote.' });
      }
      
      // Check if user is verified (separate check for voting)
      if (!user.isVerified) {
        return res.status(403).json({ message: 'Email verification required. Please check your email and verify your account to vote.' });
      }

      // Fetch topic from Datastore - try both string and numeric keys for topicId
      let fetchedTopic = null;
      let topicKey = datastore.key(['Topic', topicId]);
      [fetchedTopic] = await datastore.get(topicKey);

      // If not found with string key, try numeric key
      if (!fetchedTopic && !isNaN(Number(topicId))) {
        topicKey = datastore.key(['Topic', parseInt(topicId, 10)]);
        [fetchedTopic] = await datastore.get(topicKey);
      }

      if (!fetchedTopic) {
        console.error(`Topic not found in datastore. Tried topicId: ${topicId} (string) and ${parseInt(topicId, 10)} (numeric)`);
        return res.status(404).json({ message: 'Topic not found.' });
      }
      const topic = fromDatastore<Topic>(fetchedTopic);
      console.log(`upvote-solution: Found topic ${topic.title}, ID: ${topic.id}`);


      // Check if user has already voted on this topic
      if (user.votedSolutions?.some(v => v.topicId === topic.id)) { // Use topic.id from fetched topic
        return res.status(409).json({ message: 'User has already voted on this topic.' });
      }

      // Update solution votes if a specific solution was chosen
      if (solutionId !== null) {
        const solution = topic.solutions?.find(s => s.id === solutionId);
        if (solution) {
          solution.votes = (solution.votes || 0) + 1;
          console.log(`Solution ${solutionId} upvoted by user ${userId}. New count: ${solution.votes}`);
        } else {
          return res.status(404).json({ message: 'Solution not found within topic.' });
        }
      } else {
        console.log(`User ${userId} chose 'no support' for topic ${topic.id}.`);
      }

      // Record the user's vote for this topic
      user.votedSolutions = user.votedSolutions || [];
      user.votedSolutions.push({ topicId: topic.id, solutionId }); // Use topic.id from fetched topic
      user.votesCast = (user.votesCast || 0) + 1; // Increment total votes cast
      if (solutionId !== null) {
        user.totalSolutionVotes = (user.totalSolutionVotes || 0) + 1; // Increment total solution votes
      }

      // Increment topic type specific vote counts
      if (topic.changeType === 'law') {
        user.votedLawTopics = (user.votedLawTopics || 0) + 1;
      } else if (topic.changeType === 'amendment') {
        user.votedAmendmentTopics = (user.votedAmendmentTopics || 0) + 1;
      } else if (topic.changeType === 'rule') {
        user.votedRuleTopics = (user.votedRuleTopics || 0) + 1;
      }

      // Save the updated topic and user back to Datastore
      await datastore.save({ key: topicKey, data: { ...topic, id: undefined } });
      console.log(`Topic ${topic.title} updated in Datastore.`);

      // Check and award badges
      user = checkAndAwardBadges(user);
      await saveUserToDatastore(user);

      res.status(200).json({ message: `Vote recorded for topic ${topic.id}.`, newUpvotes: solutionId ? topic.solutions?.find(s => s.id === solutionId)?.votes : undefined });
    } catch (saveError: any) {
      console.error('Error saving updated topic or user to Datastore:', saveError);
      res.status(500).json({ message: 'Failed to record vote due to database error.', error: saveError.message });
    }

  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}