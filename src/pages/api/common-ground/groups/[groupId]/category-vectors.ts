import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { CategoryVector, SurveyFile, GroupMember, TopicScoreUser, UserSurveyResponse, Topic, Score } from '@/types/common-ground';
import { nowIso } from '@/lib/common-ground/time';
import path from 'path';
import { promises as fs } from 'fs';

async function getSurveyData(version: string): Promise<SurveyFile | null> {
  try {
    const jsonDirectory = path.join(process.cwd(), 'public', 'surveys');
    const filePath = path.join(jsonDirectory, `commonGround_survey_${version}.json`);
    const fileContents = await fs.readFile(filePath, 'utf8');
    const surveyData: SurveyFile = JSON.parse(fileContents);
    return surveyData;
  } catch (error) {
    console.error(`Filesystem error reading survey ${version}:`, error);
    return null;
  }
}

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
    const survey = await getSurveyData(version);
    if (!survey) {
      return res.status(404).json({ message: `Survey version ${version} not found.` });
    }

    // --- DATA TRANSFORMATION (Mirrors the useSurvey hook) ---
    const questionsByCategory: Record<number, any[]> = {};
    survey.questions.forEach(q => {
      if (!questionsByCategory[q.category_id]) {
        questionsByCategory[q.category_id] = [];
      }
      questionsByCategory[q.category_id].push(q);
    });

    const transformedTopics: Topic[] = Object.entries(questionsByCategory).map(([catIdStr, questions]) => {
      const categoryId = parseInt(catIdStr, 10);
      const categoryName = survey.meta.categories[categoryId] || `Category ${categoryId}`;
      
      return {
        id: `cat-${categoryId}`,
        name: categoryName,
        categoryId: categoryId,
        version: survey.version,
        questions: questions.map((q: any) => ({
          id: q.id,
          topicId: `cat-${categoryId}`,
          prompt: q.prompt,
          version: survey.version,
          options: q.options.map((opt: { label: string; score: Score }, index: number) => ({
            id: `${q.id}-${index}`,
            questionId: q.id,
            label: opt.label,
            score: opt.score,
            version: survey.version,
          })),
        })),
      };
    });
    // --- END TRANSFORMATION ---

    const topicToCategoryMap = new Map(transformedTopics.map(t => [t.id, t.categoryId]));

    const membersQuery = datastore.createQuery('GroupMember').hasAncestor(datastore.key(['Group', numericGroupId]));
    const [memberEntities] = await datastore.runQuery(membersQuery);
    const members = memberEntities.map(e => fromDatastore<GroupMember>(e));

    const memberScorePromises = members.map(async (member) => {
      // Try new consolidated format first
      const surveyResponseKey = datastore.key(['User', member.id, 'SurveyResponse', `${member.id}-${version}`]);
      const [surveyResponseEntity] = await datastore.get(surveyResponseKey);
      
      if (surveyResponseEntity) {
        const surveyResponse = fromDatastore<UserSurveyResponse>(surveyResponseEntity);
        // Convert consolidated topic scores to old format for compatibility
        const scores: TopicScoreUser[] = Object.entries(surveyResponse.topicScores).map(([topicId, scoreData]) => ({
          id: `${version}:${topicId}`,
          version,
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
    const memberScores = await Promise.all(memberScorePromises);

    const categoryVectors: CategoryVector[] = memberScores
      .filter(ms => ms.scores.length > 0) // Exclude members with no responses
      .map(({ userId, scores }) => {
        const scoresByCategory: { [catId: number]: number[] } = {};
        scores.forEach(score => {
          const categoryId = topicToCategoryMap.get(score.topicId);
          if (categoryId) {
            if (!scoresByCategory[categoryId]) {
              scoresByCategory[categoryId] = [];
            }
            scoresByCategory[categoryId].push(score.meanScore);
          }
        });

        const vector = Array.from({ length: 13 }, (_, i) => {
          const catId = i + 1;
          const catScores = scoresByCategory[catId];
          if (catScores && catScores.length > 0) {
            return catScores.reduce((a, b) => a + b, 0) / catScores.length;
          }
          return 0; // Default to 0 if no score for a category
        });

        return {
          id: `${version}:${userId}`,
          version,
          userId,
          scores: vector,
          updatedAt: nowIso(),
        };
      });

    res.status(200).json(categoryVectors);
  } catch (error) {
    console.error('Error calculating category vectors:', error);
    res.status(500).json({ message: 'Failed to calculate category vectors.' });
  }
}