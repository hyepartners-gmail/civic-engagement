import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { Topic } from '@/types';
import { checkAndAwardBadges, saveUserToDatastore } from '@/lib/badgeService';
import { DUMMY_USERS } from '@/lib/dummy-users'; // For fallback
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

  const { topicId, status } = req.body; // isAdmin is now derived from session

  if (!topicId || !status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Missing topicId or invalid status.' });
  }

  try {
    const kind = 'Topic';
    const topicKey = datastore.key([kind, topicId]);

    const [topicEntity] = await datastore.get(topicKey);

    if (!topicEntity) {
      return res.status(404).json({ message: 'Topic not found.' });
    }

    const topic = fromDatastore<Topic>(topicEntity);

    // Update topic status
    topic.status = status;

    await datastore.save({
      key: topicKey,
      data: { ...topic, id: undefined },
    });

    // If approved, award badge to suggester
    if (status === 'approved' && topic.suggesterId) {
      let user: any;
      // Removed datastore.int() as Datastore.key can handle string IDs directly
      const userKey = datastore.key(['User', topic.suggesterId]);
      const [fetchedUser] = await datastore.get(userKey);

      if (fetchedUser) {
        user = fromDatastore(fetchedUser);
      } else {
        // Fallback to dummy user if not found in Datastore
        user = DUMMY_USERS.find(u => u.id === topic.suggesterId);
        if (!user) {
          console.warn(`Suggester user ${topic.suggesterId} not found for badge award.`);
        }
      }

      if (user) {
        user.approvedSuggestions = (user.approvedSuggestions || 0) + 1;
        const updatedUser = checkAndAwardBadges(user);
        await saveUserToDatastore(updatedUser);
        console.log(`User ${user.displayName} approved suggestions count updated and badges checked.`);
      }
    }

    res.status(200).json({ message: `Topic ${topicId} ${status}.`, topic });
  } catch (error: any) {
    console.error(`Error ${status} topic:`, error);
    res.status(500).json({ message: `Failed to ${status} topic.`, error: error.message });
  }
}