import type { NextApiRequest, NextApiResponse } from 'next';
import { DUMMY_TOPICS } from '../../../lib/dummy-data';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const regionalData = DUMMY_TOPICS.reduce((acc, topic) => {
        const region = topic.region || 'unknown';
        if (!acc[region]) {
          acc[region] = { name: region.charAt(0).toUpperCase() + region.slice(1), count: 0 };
        }
        acc[region].count += 1;
        return acc;
      }, {} as Record<string, { name: string; count: number }>);

      res.status(200).json(Object.values(regionalData));
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to fetch regional vote data.', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}