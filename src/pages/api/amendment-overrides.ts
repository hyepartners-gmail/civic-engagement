import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';

interface AmendmentOverride {
  id: string; // amendment ID (amendment-{topicId})
  topicId: string;
  overriddenText: string;
  overriddenTitle?: string;
  overriddenBy: string;
  overriddenAt: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  // Check if user is admin
  if (!session || !session.user || (session.user as any).role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  if (req.method === 'GET') {
    try {
      // Fetch all amendment overrides
      const query = datastore.createQuery('AmendmentOverride');
      const [entities] = await datastore.runQuery(query);
      
      const overrides: AmendmentOverride[] = entities.map(entity => fromDatastore<AmendmentOverride>(entity));
      res.status(200).json(overrides);
    } catch (error: any) {
      console.error('Error fetching amendment overrides:', error);
      res.status(500).json({ message: 'Failed to fetch overrides', error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { amendmentId, topicId, overriddenText, overriddenTitle } = req.body;

      if (!amendmentId || !topicId || !overriddenText) {
        return res.status(400).json({ message: 'Amendment ID, topic ID, and overridden text are required' });
      }

      const overrideData: Omit<AmendmentOverride, 'id'> = {
        topicId,
        overriddenText,
        overriddenTitle,
        overriddenBy: session.user.id!,
        overriddenAt: new Date().toISOString()
      };

      // Use amendmentId as the key to ensure one override per amendment
      const overrideKey = datastore.key(['AmendmentOverride', amendmentId]);
      await datastore.save({ key: overrideKey, data: overrideData });

      const savedOverride: AmendmentOverride = {
        id: amendmentId,
        ...overrideData
      };

      res.status(200).json(savedOverride);
    } catch (error: any) {
      console.error('Error saving amendment override:', error);
      res.status(500).json({ message: 'Failed to save override', error: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { amendmentId } = req.body;

      if (!amendmentId) {
        return res.status(400).json({ message: 'Amendment ID is required' });
      }

      const overrideKey = datastore.key(['AmendmentOverride', amendmentId]);
      await datastore.delete(overrideKey);

      res.status(200).json({ message: 'Override removed successfully' });
    } catch (error: any) {
      console.error('Error removing amendment override:', error);
      res.status(500).json({ message: 'Failed to remove override', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}