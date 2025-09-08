import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { Notification } from '@/types/common-ground';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'You must be logged in.' });
  }
  const userId = session.user.id;

  try {
    const query = datastore
      .createQuery('Notification')
      .filter('recipientUserId', '=', userId)
      .order('createdAt', { descending: true })
      .limit(20);

    const [entities] = await datastore.runQuery(query);
    const notifications: Notification[] = entities.map(entity => fromDatastore<Notification>(entity));

    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Failed to fetch notifications.' });
  }
}