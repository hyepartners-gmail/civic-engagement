import type { NextApiRequest, NextApiResponse } from 'next';
import { DUMMY_COMMENTS } from '../../../lib/dummy-data';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]'; // Import authOptions

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const session = await getServerSession(req, res, authOptions);

    if (!session || (session.user as any)?.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized: Admin access required.' });
    }

    try {
      const flaggedComments = DUMMY_COMMENTS
        .filter(comment => (comment.flags || 0) > 0)
        .sort((a, b) => (b.flags || 0) - (a.flags || 0));
      
      // In a real app, you would also fetch flagged suggestions
      const flaggedSuggestions: any[] = []; // This will now only contain suggestions, not solutions

      res.status(200).json({ flaggedComments, flaggedSuggestions });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to fetch moderation summary.', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}