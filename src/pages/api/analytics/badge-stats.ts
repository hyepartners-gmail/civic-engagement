import type { NextApiRequest, NextApiResponse } from 'next';
import { DUMMY_USERS } from '../../../lib/dummy-users';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const badgeCounts = DUMMY_USERS.flatMap(user => user.badges || []).reduce((acc, badge) => {
        if (!acc[badge.name]) {
          acc[badge.name] = { name: badge.name, count: 0 };
        }
        acc[badge.name].count += 1;
        return acc;
      }, {} as Record<string, { name: string; count: number }>);

      res.status(200).json(Object.values(badgeCounts));
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to fetch badge stats.', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}