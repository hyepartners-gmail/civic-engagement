import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore } from '@/lib/datastoreServer';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]'; // Import authOptions

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || (session.user as any)?.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized: Admin access required.' });
  }

  const { id } = req.body; // isAdmin is now derived from session

  if (!id) {
    return res.status(400).json({ message: 'Missing topic ID for deletion.' });
  }

  try {
    const kind = 'Topic';
    // Handle both string and numeric IDs properly
    const topicId = !isNaN(Number(id)) ? Number(id) : id;
    const topicKey = datastore.key([kind, topicId]);

    await datastore.delete(topicKey);

    res.status(200).json({ message: 'Topic deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting topic:', error);
    res.status(500).json({ message: 'Failed to delete topic.', error: error.message });
  }
}