import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore } from '../../lib/datastoreServer'; // Import the Datastore client
import { Topic } from '../../types'; // Import Topic interface
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]'; // Import authOptions

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user || !session.user.id) {
      return res.status(401).json({ message: 'Unauthorized: User not authenticated.' });
    }

    const userId = session.user.id; // Get userId from session
    const { topicId } = req.body; // userId is now derived from session

    if (!topicId) {
      return res.status(400).json({ message: 'Missing topicId.' });
    }

    try {
      // Datastore IDs are typically numbers, so convert topicId to an integer
      // Removed datastore.int as it was a mock-specific helper.
      // The real Datastore client's key method can handle string IDs directly.
      const topicKey = datastore.key(['Topic', topicId]); 

      // Fetch the topic from Datastore
      const [topic] = await datastore.get(topicKey);

      if (!topic) {
        return res.status(404).json({ message: 'Topic not found.' });
      }

      // Increment upvote count
      // In a real application, you would also track which users have upvoted
      // to prevent multiple upvotes from the same user. This would involve
      // another Datastore entity or an array within the Topic entity.
      topic.upvotes = (topic.upvotes || 0) + 1;

      // Save the updated topic back to Datastore
      await datastore.save({
        key: topicKey,
        data: topic,
      });

      console.log(`Topic ${topicId} upvoted by user ${userId}. New count: ${topic.upvotes}`);

      // Placeholder for upvote threshold notification
      const UPVOTE_THRESHOLD = 10;
      if (topic.status === 'pending' && topic.upvotes >= UPVOTE_THRESHOLD) {
        console.log(`ADMIN NOTIFICATION: Pending topic '${topic.title}' (ID: ${topicId}) reached ${UPVOTE_THRESHOLD} upvotes. Ready for review!`);
        // In a real app, this would trigger an actual notification (e.g., email, internal alert)
      }

      res.status(200).json({ message: `Topic ${topicId} upvoted.`, newUpvotes: topic.upvotes });
    } catch (error: any) {
      console.error('Error upvoting topic in Datastore:', error);
      res.status(500).json({ message: 'Failed to upvote topic.', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}