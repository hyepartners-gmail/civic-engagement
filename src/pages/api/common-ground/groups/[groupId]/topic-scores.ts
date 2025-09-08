import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { GroupMember, TopicScoreUser, TopicScoreGroup, UserSurveyResponse } from '@/types/common-ground';
import { classifyTopic } from '@/lib/common-ground/scoring';
import { median } from 'd3-array';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { groupId, version } = req.query;
  if (typeof groupId !== 'string' || typeof version !== 'string') {
    return res.status(400).json({ message: 'Invalid group ID or version.' });
  }

  try {
    // Convert the string ID from the URL to a number for the Datastore key
    const numericGroupId = parseInt(groupId, 10);
    if (isNaN(numericGroupId)) {
      return res.status(400).json({ message: 'Group ID must be a valid number.' });
    }

    // 1. Get all members of the group
    const membersQuery = datastore.createQuery('GroupMember').hasAncestor(datastore.key(['Group', numericGroupId]));
    const [memberEntities] = await datastore.runQuery(membersQuery);
    const members = memberEntities.map(e => fromDatastore<GroupMember>(e));

    // 2. Fetch TopicScoreUser for each member for the given version, keeping userId context
    const memberScorePromises = members.map(async (member) => {
      // Try new consolidated format first
      const surveyResponseKey = datastore.key(['User', member.id, 'SurveyResponse', `${member.id}-${version}`]);
      const [surveyResponseEntity] = await datastore.get(surveyResponseKey);
      
      if (surveyResponseEntity) {
        const surveyResponse = fromDatastore<UserSurveyResponse>(surveyResponseEntity);
        // Convert consolidated topic scores to old format for compatibility
        const scores: TopicScoreUser[] = Object.entries(surveyResponse.topicScores).map(([topicId, scoreData]) => ({
          id: `${version}:${topicId}`,
          version: version as string,
          topicId,
          meanScore: scoreData.meanScore,
          answeredCount: scoreData.answeredCount,
          updatedAt: surveyResponse.updatedAt,
        }));
        return { userId: member.id, scores };
      }
      
      // Fallback to old format
      const query = datastore.createQuery('TopicScoreUser')
        .hasAncestor(datastore.key(['User', member.id]))
        .filter('version', '=', version);
      const [entities] = await datastore.runQuery(query);
      return {
        userId: member.id,
        scores: entities.map(e => fromDatastore<TopicScoreUser>(e)),
      };
    });
    const memberScoresWithUser = await Promise.all(memberScorePromises);

    // 3. Aggregate scores by topic
    const scoresByTopic = new Map<string, { userId: string; score: number }[]>();
    memberScoresWithUser.forEach(({ userId, scores }) => {
      scores.forEach(score => {
        if (!scoresByTopic.has(score.topicId)) {
          scoresByTopic.set(score.topicId, []);
        }
        scoresByTopic.get(score.topicId)!.push({ userId: userId, score: score.meanScore });
      });
    });

    // 4. Compute group scores for each topic
    const groupScores: TopicScoreGroup[] = [];
    scoresByTopic.forEach((values, topicId) => {
      const scores = values.map(v => v.score);
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      const range = max - min;
      const groupMedian = median(scores) || 0;
      const agreedCount = scores.filter(s => Math.abs(s - groupMedian) <= 25).length;
      
      groupScores.push({
        id: `${version}:${topicId}`,
        version,
        topicId,
        values,
        min,
        max,
        range,
        label: classifyTopic(scores),
        agreementPct: values.length > 0 ? agreedCount / values.length : 0,
        updatedAt: new Date().toISOString(),
      });
    });

    res.status(200).json(groupScores);
  } catch (error) {
    console.error('Error calculating group topic scores:', error);
    res.status(500).json({ message: 'Failed to calculate group scores.' });
  }
}