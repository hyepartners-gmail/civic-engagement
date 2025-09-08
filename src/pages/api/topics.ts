import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { Topic } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { region } = req.query; // Get region from query parameters

    try {
      let query = datastore.createQuery('Topic');

      if (typeof region === 'string' && region !== 'all') {
        query = query.filter('region', '=', region);
        console.log(`Fetching topics for region: ${region}`);
      } else {
        console.log('Fetching all topics.');
      }
      
      const [entities] = await datastore.runQuery(query);
      
      const topics: Topic[] = entities.map(entity => fromDatastore<Topic>(entity));
      
      // Sort topics by order field if available
      const sortedTopics = [...topics].sort((a, b) => {
        // If both have order, sort by order
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        // If only a has order, it comes first
        if (a.order !== undefined) {
          return -1;
        }
        // If only b has order, it comes first
        if (b.order !== undefined) {
          return 1;
        }
        // If neither has order, sort by createdAt (if available)
        if (a.createdAt && b.createdAt) {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        // Default to 0 if no order or createdAt
        return 0;
      });
      
      console.log(`Fetched ${topics.length} topics from Datastore.`);
      res.status(200).json(sortedTopics);

    } catch (error: any) {
      console.error('Error fetching topics from Datastore:', error);
      res.status(500).json({ message: 'Failed to fetch topics.', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}