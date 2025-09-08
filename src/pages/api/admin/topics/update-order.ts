import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { Topic } from '@/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || (session.user as any)?.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized: Admin access required.' });
  }

  const { topicOrders } = req.body; // Array of {id: string, order: number}

  if (!Array.isArray(topicOrders)) {
    return res.status(400).json({ message: 'Invalid topic orders data.' });
  }

  try {
    // Update each topic with its new order
    const updates = topicOrders.map(async ({ id, order }) => {
      const kind = 'Topic';
      // Handle both string and numeric IDs properly
      const topicId = !isNaN(Number(id)) ? Number(id) : id;
      const topicKey = datastore.key([kind, topicId]);

      // Get the existing topic
      const [topicEntity] = await datastore.get(topicKey);

      if (!topicEntity) {
        throw new Error(`Topic with ID ${id} not found.`);
      }

      // Preserve all existing data, just update the order
      await datastore.save({
        key: topicKey,
        data: { ...topicEntity, order },
      });

      return { id, order };
    });

    await Promise.all(updates);

    res.status(200).json({ 
      message: 'Topic orders updated successfully.',
      updated: topicOrders.length
    });
  } catch (error: any) {
    console.error('Error updating topic orders:', error);
    res.status(500).json({ message: 'Failed to update topic orders.', error: error.message });
  }
}