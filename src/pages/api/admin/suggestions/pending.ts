import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { Topic } from '@/types';
import { DUMMY_TOPICS } from '@/lib/dummy-data'; // For fallback
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]'; // Import authOptions

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || (session.user as any)?.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized: Admin access required.' });
  }

  try {
    const query = datastore.createQuery('Topic').filter('status', '=', 'pending');
    const [entities] = await datastore.runQuery(query);

    if (entities.length > 0) {
      const pendingTopics: Topic[] = entities.map(entity => fromDatastore<Topic>(entity));
      res.status(200).json({ pendingTopics });
    } else {
      console.log('No pending topics in Datastore, falling back to dummy data.');
      const dummyPendingTopics = DUMMY_TOPICS.filter(topic => topic.status === 'pending');
      res.status(200).json({ pendingTopics: dummyPendingTopics });
    }
  } catch (error: any) {
    console.error('Error fetching pending topics:', error);
    const dummyPendingTopics = DUMMY_TOPICS.filter(topic => topic.status === 'pending');
    res.status(500).json({ message: 'Failed to fetch pending topics.', error: error.message, pendingTopics: dummyPendingTopics });
  }
}