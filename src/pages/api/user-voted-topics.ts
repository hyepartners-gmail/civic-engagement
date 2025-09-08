import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '../../lib/datastoreServer';
import { Topic, User } from '../../types';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]'; // Import authOptions

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user || !session.user.id) {
      return res.status(401).json({ message: 'Unauthorized: User not authenticated.' });
    }

    const userId = session.user.id; // Get userId from session
    console.log(`user-voted-topics: Looking for user with ID: ${userId} (type: ${typeof userId})`);

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
        console.error(`User not found in datastore for user-voted-topics. Tried userId: ${userId} (string) and ${parseInt(userId, 10)} (numeric)`);
        return res.status(404).json({ message: 'User not found.' });
      }
      const user = fromDatastore<User>(fetchedUser);
      console.log(`user-voted-topics: Found user ${user.email}, votedSolutions count: ${(user.votedSolutions || []).length}`);

      // Fetch all topics from Datastore
      const query = datastore.createQuery('Topic');
      const [topicEntities] = await datastore.runQuery(query);
      const allTopics = topicEntities.map(entity => fromDatastore<Topic>(entity));

      const userVotedTopics: Topic[] = [];

      user.votedSolutions?.forEach(voted => {
        const topic = allTopics.find(t => t.id === voted.topicId);
        if (topic) {
          const topicCopy: Topic = { ...topic };
          const leadingSolution = topicCopy.solutions?.sort((a, b) => (b.votes || 0) - (a.votes || 0))[0];
          
          let userAlignment: string = "Not Voted on Solution";
          if (voted.solutionId) {
            if (leadingSolution && voted.solutionId === leadingSolution.id) {
              userAlignment = "Aligned with Leading Solution";
            } else {
              const userSolution = topicCopy.solutions?.find(s => s.id === voted.solutionId);
              userAlignment = userSolution ? `Voted for: ${userSolution.title}` : "Voted for unknown solution";
            }
          } else if (voted.solutionId === null) {
            userAlignment = "Skipped Solution Voting";
          }

          (topicCopy as any).userAlignment = userAlignment; 
          (topicCopy as any).userVotedSolutionId = voted.solutionId;

          userVotedTopics.push(topicCopy);
        }
      });

      res.status(200).json(userVotedTopics);
    } catch (error: any) {
      console.error('Error fetching data from Datastore:', error);
      res.status(500).json({ message: 'Failed to fetch user voted topics.', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}