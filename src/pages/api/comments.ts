import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { Comment } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const query = datastore.createQuery('Comment');
      const [entities] = await datastore.runQuery(query);
      
      let comments: Comment[] = entities.map(entity => fromDatastore<Comment>(entity));
      // Filter for approved comments, or comments without a status (implicitly approved)
      comments = comments.filter(comment => comment.status === 'approved' || comment.status === undefined);
      console.log('Fetched and filtered comments from Datastore.');
      res.status(200).json(comments);

    } catch (error: any) {
      console.error('Error fetching comments from Datastore:', error);
      res.status(500).json({ message: 'Failed to fetch comments.', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}