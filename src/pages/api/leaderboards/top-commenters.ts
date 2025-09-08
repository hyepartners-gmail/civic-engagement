import type { NextApiRequest, NextApiResponse } from 'next';
import { DUMMY_USERS } from '../../../lib/dummy-users';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const topCommenters = [...DUMMY_USERS]
        .sort((a, b) => (b.totalUpvotes || 0) - (a.totalUpvotes || 0))
        .slice(0, 10);

      res.status(200).json(topCommenters);
    } catch (error: any) {
      console.error('Error fetching top commenters:', error);
      res.status(500).json({ message: 'Failed to fetch top commenters.', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}