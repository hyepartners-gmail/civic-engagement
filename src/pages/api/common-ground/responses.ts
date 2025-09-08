import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { datastore } from '@/lib/datastoreServer';
import { Response, TopicScoreUser, SurveyFile, Topic, Question, Option, Score } from '@/types/common-ground';
import { nowIso } from '@/lib/common-ground/time';
import path from 'path';
import { promises as fs } from 'fs';

// This now reads directly from the filesystem
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

  // --- DATA TRANSFORMATION (Mirrors the useSurvey hook) ---
  const questionsByCategory: Record<number, SurveyFile['questions'][number][]> = {};
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
  // --- END TRANSFORMATION ---

  // Create a map for quick lookups from the transformed data
  const questionMap = new Map<string, Question>();
  transformedTopics.forEach(topic => {
    topic.questions.forEach(q => questionMap.set(q.id, q));
  });

  const transaction = datastore.transaction();
  try {
    await transaction.run();

    const responsesToSave: any[] = [];
    const topicScores: { [topicId: string]: { scores: number[], count: number } } = {};

    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);
      const option = question?.options.find(o => o.id === answer.optionId);

      if (!question || !option) {
        console.warn(`Invalid answer skipped:`, answer);
        continue;
      }

      const response: Omit<Response, 'id'> = {
        version,
        questionId: question.id,
        optionId: option.id,
        score: option.score,
        answeredAt: nowIso(),
      };

      const responseKey = datastore.key(['User', userId, 'Response', `${version}:${question.id}`]);
      responsesToSave.push({ key: responseKey, data: response });

      // Aggregate scores by topic
      const topicId = question.topicId;
      if (!topicScores[topicId]) {
        topicScores[topicId] = { scores: [], count: 0 };
      }
      topicScores[topicId].scores.push(option.score);
      topicScores[topicId].count++;
    }

    const topicScoresToSave: any[] = [];
    for (const [topicId, data] of Object.entries(topicScores)) {
      const meanScore = data.scores.reduce((a, b) => a + b, 0) / data.count;
      const topicScore: Omit<TopicScoreUser, 'id'> = {
        version,
        topicId,
        meanScore,
        answeredCount: data.count,
        updatedAt: nowIso(),
      };
      const topicScoreKey = datastore.key(['User', userId, 'TopicScoreUser', `${version}:${topicId}`]);
      topicScoresToSave.push({ key: topicScoreKey, data: topicScore });
    }

    transaction.save(responsesToSave);
    transaction.save(topicScoresToSave);

    await transaction.commit();
    
    res.status(200).json({ message: 'Responses saved successfully.' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error saving responses:', error);
    res.status(500).json({ message: 'Failed to save responses.' });
  }
}