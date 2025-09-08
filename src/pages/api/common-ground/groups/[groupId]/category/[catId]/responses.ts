import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { GroupMember, Response, SurveyFile } from '@/types/common-ground';
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
  const { groupId, catId, version } = req.query;
  if (typeof groupId !== 'string' || typeof catId !== 'string' || typeof version !== 'string') {
    return res.status(400).json({ message: 'Invalid request parameters.' });
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

    const questionsInCategory = (survey.topics || [])
      .filter(t => t.categoryId === parseInt(catId, 10))
      .flatMap(t => t.questions);
    const questionIds = questionsInCategory.map(q => q.id);

    const membersQuery = datastore.createQuery('GroupMember').hasAncestor(datastore.key(['Group', numericGroupId]));
    const [memberEntities] = await datastore.runQuery(membersQuery);
    const members = memberEntities.map(e => fromDatastore<GroupMember>(e));

    const responsePromises = members.map(member => {
      const query = datastore.createQuery('Response')
        .hasAncestor(datastore.key(['User', member.id]))
        .filter('version', '=', version);
      return datastore.runQuery(query).then(([entities]) => entities);
    });
    const memberResponsesNested = await Promise.all(responsePromises);
    const allResponses = memberResponsesNested.flat().map(e => fromDatastore<Response>(e));

    const questionDistributions = questionsInCategory.map(question => {
      const responsesForQuestion = allResponses.filter(r => r.questionId === question.id);
      const counts = question.options.map(option => ({
        optionId: option.id,
        label: option.label,
        count: responsesForQuestion.filter(r => r.optionId === option.id).length,
      }));
      return {
        questionId: question.id,
        prompt: question.prompt,
        counts,
      };
    });

    res.status(200).json(questionDistributions);
  } catch (error) {
    console.error('Error fetching question distributions:', error);
    res.status(500).json({ message: 'Failed to fetch data.' });
  }
}