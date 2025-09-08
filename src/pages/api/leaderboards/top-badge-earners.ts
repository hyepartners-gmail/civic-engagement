import type { NextApiRequest, NextApiResponse } from 'next';
import { DUMMY_USERS } from '../../../lib/dummy-users';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const topBadgeEarners = [...DUMMY_USERS]
        .sort((a, b) => (b.badges?.length || 0) - (a.badges?.length || 0))
        .slice(0, 10);

      res.status(200).json(topBadgeEarners);
    } catch (error: any) {
      console.error('Error fetching top badge earners:', error);
      res.status(500).json({ message: 'Failed to fetch top badge earners.', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}