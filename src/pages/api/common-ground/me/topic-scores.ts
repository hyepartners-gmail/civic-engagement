import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { UserSurveyResponse, TopicScoreUser } from '@/types/common-ground';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'You must be logged in.' });
  }
  const userId = session.user.id;

  const { version = 'v1' } = req.query;

  try {
    // Try to get from new consolidated format first
    const surveyResponseKey = datastore.key(['User', userId, 'SurveyResponse', `${userId}-${version}`]);
    const [surveyResponseEntity] = await datastore.get(surveyResponseKey);

    if (surveyResponseEntity) {
      const surveyResponse = fromDatastore<UserSurveyResponse>(surveyResponseEntity);
      
      // Convert consolidated topic scores to the expected format
      const topicScores: TopicScoreUser[] = Object.entries(surveyResponse.topicScores).map(([topicId, scores]) => ({
        id: `${version}:${topicId}`,
        version: version as string,
        topicId,
        meanScore: scores.meanScore,
        answeredCount: scores.answeredCount,
        updatedAt: surveyResponse.updatedAt,
      }));

      return res.status(200).json(topicScores);
    }

    // Fallback to old format for existing users
    const query = datastore
      .createQuery('TopicScoreUser')
      .hasAncestor(datastore.key(['User', userId]))
      .filter('version', '=', version);

    const [entities] = await datastore.runQuery(query);
    const topicScores = entities.map(e => fromDatastore<TopicScoreUser>(e));

    res.status(200).json(topicScores);
  } catch (error) {
    console.error(`Error fetching topic scores for user ${userId}:`, error);
    res.status(500).json({ message: 'Failed to fetch topic scores.' });
  }
}