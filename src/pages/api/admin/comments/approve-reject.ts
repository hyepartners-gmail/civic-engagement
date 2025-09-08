import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { Comment } from '@/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]'; // Import authOptions

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || (session.user as any)?.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized: Admin access required.' });
  }

  const { commentId, status } = req.body; // isAdmin is now derived from session

  if (!commentId || !status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Missing commentId or invalid status.' });
  }

  try {
    const kind = 'Comment';
    const commentKey = datastore.key([kind, commentId]);

    const [commentEntity] = await datastore.get(commentKey);

    if (!commentEntity) {
      return res.status(404).json({ message: 'Comment not found.' });
    }

    const comment = fromDatastore<Comment>(commentEntity);

    // Update comment status and clear flags
    comment.status = status;
    comment.flags = 0; // Clear flags once moderated

    await datastore.save({
      key: commentKey,
      data: { ...comment, id: undefined },
    });

    res.status(200).json({ message: `Comment ${commentId} ${status}.`, comment });
  } catch (error: any) {
    console.error(`Error ${status} comment:`, error);
    res.status(500).json({ message: `Failed to ${status} comment.`, error: error.message });
  }
}