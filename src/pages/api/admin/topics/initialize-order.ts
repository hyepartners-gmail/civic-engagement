import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { Topic } from '@/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || (session.user as any)?.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized: Admin access required.' });
  }

  try {
    // Get all topics
    const query = datastore.createQuery('Topic');
    const [entities] = await datastore.runQuery(query);
    
    const topics: Topic[] = entities.map(entity => fromDatastore<Topic>(entity));
    
    // Update each topic with an order field based on its current position
    const updates = topics.map(async (topic, index) => {
      const kind = 'Topic';
      // Handle both string and numeric IDs properly
      const topicId = !isNaN(Number(topic.id)) ? Number(topic.id) : topic.id;
      const topicKey = datastore.key([kind, topicId]);
      
      // Update the topic with the order field
      const updatedTopic: Topic = {
        ...topic,
        order: index,
      };
      
      await datastore.save({
        key: topicKey,
        data: { ...updatedTopic, id: undefined }, // Remove ID from data before saving
      });
      
      return updatedTopic;
    });
    
    await Promise.all(updates);
    
    res.status(200).json({ message: `Successfully updated ${topics.length} topics with order fields.` });
  } catch (error: any) {
    console.error('Error updating topics:', error);
    res.status(500).json({ message: 'Failed to update topics.', error: error.message });
  }
}