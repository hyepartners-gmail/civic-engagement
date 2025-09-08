import type { NextApiRequest, NextApiResponse } from 'next';
import { DUMMY_USERS } from '../../../lib/dummy-users';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const topSuggestionEarners = [...DUMMY_USERS]
        .sort((a, b) => (b.approvedSuggestions || 0) - (a.approvedSuggestions || 0))
        .slice(0, 10);

      res.status(200).json(topSuggestionEarners);
    } catch (error: any) {
      console.error('Error fetching top suggestion earners:', error);
      res.status(500).json({ message: 'Failed to fetch top suggestion earners.', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}