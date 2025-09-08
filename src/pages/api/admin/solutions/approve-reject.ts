import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { Topic, Solution } from '@/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]'; // Import authOptions

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || (session.user as any)?.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized: Admin access required.' });
  }

  const { topicId, solutionId, status } = req.body; // isAdmin is now derived from session

  if (!topicId || !solutionId || !status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Missing topicId, solutionId, or invalid status.' });
  }

  try {
    const topicKind = 'Topic';
    const topicKey = datastore.key([topicKind, topicId]);

    const [topicEntity] = await datastore.get(topicKey);

    if (!topicEntity) {
      return res.status(404).json({ message: 'Topic not found.' });
    }

    const topic = fromDatastore<Topic>(topicEntity);

    const solutionIndex = topic.solutions?.findIndex(s => s.id === solutionId);

    if (solutionIndex === undefined || solutionIndex === -1 || !topic.solutions) {
      // Corrected: Return 404 for solution not found within topic
      return res.status(404).json({ message: 'Solution not found within topic.' });
    }

    // Update solution status
    topic.solutions[solutionIndex].status = status;

    // Create a copy of the topic to return, ensuring the ID is present for the client
    const updatedTopic: Topic = {
      ...topic,
      id: topic.id, // Ensure ID is explicitly kept for the response
    };

    await datastore.save({
      key: topicKey,
      data: { ...topic, id: undefined }, // Remove ID from data before saving to Datastore
    });

    // Corrected: Dynamic message and always return 200 for successful approve/reject
    res.status(200).json({ message: `Solution ${solutionId} for topic ${topicId} ${status}.`, topic: updatedTopic });
  } catch (error: any) {
    console.error(`Error ${status} solution:`, error);
    res.status(500).json({ message: `Failed to ${status} solution.`, error: error.message });
  }
}