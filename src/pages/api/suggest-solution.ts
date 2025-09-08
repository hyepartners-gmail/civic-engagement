import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { Topic, Solution } from '@/types';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]'; // Import authOptions

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user || !session.user.id) {
    return res.status(401).json({ message: 'Unauthorized: User not authenticated.' });
  }

  const userId = session.user.id; // Get userId from session
  const { topicId, title, description } = req.body; // userId is now derived from session

  if (!topicId || !title || !description) {
    return res.status(400).json({ message: 'Missing required fields: topicId, title, or description.' });
  }

  try {
    const topicKind = 'Topic';
    const topicKey = datastore.key([topicKind, topicId]);

    const [topicEntity] = await datastore.get(topicKey);

    if (!topicEntity) {
      return res.status(404).json({ message: 'Topic not found.' });
    }

    const topic = fromDatastore<Topic>(topicEntity);

    // Create a new solution object
    const newSolution: Solution = {
      id: `sol-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, // Generate a unique ID
      title,
      description,
      status: 'pending', // New solutions start as pending for moderation
      votes: 0,
      suggesterId: userId, // Store the ID of the user who suggested it
    };

    // Add the new solution to the topic's solutions array
    topic.solutions = topic.solutions || [];
    topic.solutions.push(newSolution);

    // Save the updated topic back to Datastore
    await datastore.save({
      key: topicKey,
      data: { ...topic, id: undefined }, // Remove ID from data before saving
    });

    console.log(`New solution for topic ${topicId} submitted by user ${userId}:`, newSolution);

    res.status(200).json({ message: 'Solution submitted for review.', solution: newSolution });
  } catch (error: any) {
    console.error('Error submitting solution:', error);
    res.status(500).json({ message: 'Failed to submit solution.', error: error.message });
  }
}