import type { NextApiRequest, NextApiResponse } from 'next';
import { DUMMY_TOPICS } from '../../../lib/dummy-data';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const topicVotes = DUMMY_TOPICS.map(topic => ({
        name: topic.title,
        upvotes: topic.upvotes || 0,
        solutions: topic.solutions?.length || 0,
        totalSolutionVotes: topic.solutions?.reduce((acc, sol) => acc + (sol.votes || 0), 0) || 0,
      }));
      res.status(200).json(topicVotes);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to fetch topic vote data.', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}