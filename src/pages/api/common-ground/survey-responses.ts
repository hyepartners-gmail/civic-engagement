import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { datastore } from '@/lib/datastoreServer';
import { TopicScoreUser, SurveyFile } from '@/types/common-ground';
import { nowIso } from '@/lib/common-ground/time';
import path from 'path';
import { promises as fs } from 'fs';

// New efficient data structure - single entity per user per survey
interface UserSurveyResponse {
  userId: string;
  surveyVersion: string;
  responses: { [questionId: string]: number }; // questionId -> score
  topicScores: { [topicId: string]: { meanScore: number; answeredCount: number } }; // consolidated topic scores
  completedAt: string;
  updatedAt: string;
}

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
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'You must be logged in.' });
  }
  const userId = session.user.id;

  const { version, answers } = req.body;
  if (!version || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ message: 'Invalid request body.' });
  }

  const survey = await getSurveyData(version);
  if (!survey) {
    return res.status(404).json({ message: `Survey version ${version} not found.` });
  }

  // Transform survey data (same as before)
  const questionsByCategory: Record<number, SurveyFile['questions'][number][]> = {};
  survey.questions.forEach(q => {
    if (!questionsByCategory[q.category_id]) {
      questionsByCategory[q.category_id] = [];
    }
    questionsByCategory[q.category_id].push(q);
  });

  const transformedTopics = Object.entries(questionsByCategory).map(([catIdStr, questions]) => {
    const categoryId = parseInt(catIdStr, 10);
    const categoryName = survey.meta.categories[categoryId] || `Category ${categoryId}`;
    
    return {
      id: `cat-${categoryId}`,
      name: categoryName,
      categoryId: categoryId,
      version: survey.version,
      questions: questions.map((q) => ({
        id: q.id,
        topicId: `cat-${categoryId}`,
        prompt: q.prompt,
        version: survey.version,
        options: q.options.map((opt, index) => ({
          id: `${q.id}-${index}`,
          questionId: q.id,
          label: opt.label,
          score: opt.score,
          version: survey.version,
        })),
      })),
    };
  });

  // Create lookup maps
  const questionMap = new Map();
  const optionMap = new Map();
  transformedTopics.forEach(topic => {
    topic.questions.forEach(q => {
      questionMap.set(q.id, q);
      q.options.forEach(opt => optionMap.set(opt.id, opt));
    });
  });

  const transaction = datastore.transaction();
  try {
    await transaction.run();

    // Build responses object and calculate topic scores
    const responses: { [questionId: string]: number } = {};
    const topicScoreAggregates: { [topicId: string]: { scores: number[], count: number } } = {};

    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);
      const option = optionMap.get(answer.optionId);

      if (!question || !option) {
        console.warn(`Invalid answer skipped:`, answer);
        continue;
      }

      // Store response as questionId -> score
      responses[question.id] = option.score;

      // Aggregate scores by topic
      const topicId = question.topicId;
      if (!topicScoreAggregates[topicId]) {
        topicScoreAggregates[topicId] = { scores: [], count: 0 };
      }
      topicScoreAggregates[topicId].scores.push(option.score);
      topicScoreAggregates[topicId].count++;
    }

    // Calculate final topic scores
    const topicScores: { [topicId: string]: { meanScore: number; answeredCount: number } } = {};
    for (const [topicId, data] of Object.entries(topicScoreAggregates)) {
      const meanScore = data.scores.reduce((a, b) => a + b, 0) / data.count;
      topicScores[topicId] = {
        meanScore,
        answeredCount: data.count,
      };
    }

    // Save single consolidated survey response entity
    const surveyResponse: UserSurveyResponse = {
      userId,
      surveyVersion: version,
      responses,
      topicScores,
      completedAt: nowIso(),
      updatedAt: nowIso(),
    };

    const surveyResponseKey = datastore.key(['User', userId, 'SurveyResponse', `${userId}-${version}`]);
    transaction.save({ key: surveyResponseKey, data: surveyResponse });
    await transaction.commit();
    
    res.status(200).json({ 
      message: 'Survey completed successfully.',
      responseCount: Object.keys(responses).length,
      topicCount: Object.keys(topicScores).length
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error saving survey response:', error);
    res.status(500).json({ message: 'Failed to save survey response.' });
  }
}