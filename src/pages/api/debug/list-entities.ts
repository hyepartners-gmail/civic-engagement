import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // List all Groups
    const groupsQuery = datastore.createQuery('Group');
    const [groupEntities] = await datastore.runQuery(groupsQuery);
    const groups = groupEntities.map(e => fromDatastore(e));

    // List all GroupMembers
    const membersQuery = datastore.createQuery('GroupMember');
    const [memberEntities] = await datastore.runQuery(membersQuery);
    const members = memberEntities.map(e => fromDatastore(e));

    // List all SurveyResponses
    const surveyQuery = datastore.createQuery('SurveyResponse');
    const [surveyEntities] = await datastore.runQuery(surveyQuery);
    const surveys = surveyEntities.map(e => fromDatastore(e));

    res.status(200).json({
      groups: {
        count: groups.length,
        entities: groups
      },
      groupMembers: {
        count: members.length,
        entities: members
      },
      surveyResponses: {
        count: surveys.length,
        entities: surveys
      }
    });
  } catch (error) {
    console.error('Error listing entities:', error);
    res.status(500).json({ message: 'Failed to list entities.' });
  }
}