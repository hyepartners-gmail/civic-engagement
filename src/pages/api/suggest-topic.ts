import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore } from '@/lib/datastoreServer';
import { Topic, Solution } from '@/types';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]'; // Import authOptions

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user || !session.user.id) {
      return res.status(401).json({ message: 'Unauthorized: User not authenticated.' });
    }

    const userId = session.user.id;
    const { title, problemStatement, region, solutions } = req.body; // Added solutions

    if (!title || !problemStatement || !region || !Array.isArray(solutions) || solutions.length === 0) {
      return res.status(400).json({ message: 'Missing required fields: title, problemStatement, region, or solutions.' });
    }

    // Validate solutions structure
    const validSolutions: Solution[] = solutions.map((sol: any) => {
      if (!sol.title || !sol.description) {
        throw new Error('Each solution must have a title and description.');
      }
      return {
        id: `sol-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, // Generate unique ID
        title: sol.title,
        description: sol.description,
        status: 'pending', // User-suggested solutions are always pending
        votes: 0,
        suggesterId: userId,
      };
    });

    try {
      const kind = 'Topic';
      const topicKey = datastore.key(kind);

      // Get the current topics to determine the next order value
      const query = datastore.createQuery('Topic');
      const [entities] = await datastore.runQuery(query);
      
      let maxOrder = -1;
      entities.forEach(entity => {
        if (entity.order !== undefined && entity.order > maxOrder) {
          maxOrder = entity.order;
        }
      });
      
      const newOrder = maxOrder + 1;

      const newTopic: Topic = {
        id: '', // ID will be set by Datastore
        title,
        preview: problemStatement ? problemStatement.substring(0, 100) + '...' : '',
        region,
        problemStatement,
        status: 'pending', // User-suggested topics are pending for moderation
        upvotes: 0,
        solutions: validSolutions, // Include the validated solutions
        flags: 0,
        suggesterId: userId,
        order: newOrder,
        createdAt: new Date().toISOString(),
      };

      await datastore.save({
        key: topicKey,
        data: newTopic,
      });

      if (topicKey.id) {
        newTopic.id = String(topicKey.id);
      }

      console.log(`New topic suggestion from user ${userId} saved to Datastore:`, newTopic);

      res.status(201).json({ message: `Topic '${title}' submitted for review.`, topic: newTopic });
    } catch (error: any) {
      console.error('Error creating topic:', error);
      res.status(500).json({ message: 'Failed to create topic.', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}