import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { Response, TopicScoreUser } from '@/types/common-ground';
import { SAFE_TOLERANCE } from '@/lib/common-ground/constants';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'You must be logged in.' });
  }
  const currentUserId = session.user.id;

  const { otherUserId, version } = req.query;
  if (typeof otherUserId !== 'string' || typeof version !== 'string') {
    return res.status(400).json({ message: 'Invalid user ID or version.' });
  }

  try {
    // Fetch topic scores for both users
    const currentUserQuery = datastore.createQuery('TopicScoreUser').hasAncestor(datastore.key(['User', currentUserId])).filter('version', '=', version);
    const otherUserQuery = datastore.createQuery('TopicScoreUser').hasAncestor(datastore.key(['User', otherUserId])).filter('version', '=', version);

    const [[currentUserScores], [otherUserScores]] = await Promise.all([
      datastore.runQuery(currentUserQuery),
      datastore.runQuery(otherUserQuery),
    ]);

    const currentUserMap = new Map(currentUserScores.map(r => [r.topicId, r.meanScore]));
    const otherUserMap = new Map(otherUserScores.map(r => [r.topicId, r.meanScore]));

    let sharedTopics = 0;
    let agreedCount = 0;
    const safeTopics: string[] = [];
    const hotTopics: string[] = [];

    currentUserMap.forEach((currentUserScore, topicId) => {
      if (otherUserMap.has(topicId)) {
        sharedTopics++;
        const otherUserScore = otherUserMap.get(topicId)!;
        if (Math.abs(currentUserScore - otherUserScore) <= SAFE_TOLERANCE) {
          agreedCount++;
          safeTopics.push(topicId);
        } else {
          hotTopics.push(topicId);
        }
      }
    });

    const pairwisePct = sharedTopics > 0 ? agreedCount / sharedTopics : 0;

    res.status(200).json({ pairwisePct, sharedTopics, agreedCount, safeTopics, hotTopics });
  } catch (error) {
    console.error('Error calculating pairwise score:', error);
    res.status(500).json({ message: 'Failed to calculate pairwise score.' });
  }
}