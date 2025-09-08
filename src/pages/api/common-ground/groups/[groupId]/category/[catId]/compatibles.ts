import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { GroupMember, TopicScoreUser, UserSurveyResponse } from '@/types/common-ground';

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

    console.log(`[Compatibles API] Looking for group ${numericGroupId}, category ${catId}, version ${version}`);

    // First, check if the group exists
    const groupKey = datastore.key(['Group', numericGroupId]);
    const [groupEntity] = await datastore.get(groupKey);
    console.log(`[Compatibles API] Group ${numericGroupId} exists:`, !!groupEntity);
    
    if (!groupEntity) {
      console.log(`[Compatibles API] Group ${numericGroupId} not found in database`);
      return res.status(404).json({ message: 'Group not found.' });
    }

    // Get group members
    const membersQuery = datastore.createQuery('GroupMember').hasAncestor(datastore.key(['Group', numericGroupId]));
    const [memberEntities] = await datastore.runQuery(membersQuery);
    const members = memberEntities.map(e => fromDatastore<GroupMember>(e));

    console.log(`[Compatibles API] Found ${members.length} members:`, members.map(m => ({ id: m.id, alias: m.alias })));

    // Get topic scores for each member for the specific category
    const topicId = `cat-${catId}`;
    const memberScorePromises = members.map(async (member) => {
      // Try new consolidated format first
      const surveyResponseKey = datastore.key(['User', member.id, 'SurveyResponse', `${member.id}-${version}`]);
      const [surveyResponseEntity] = await datastore.get(surveyResponseKey);
      
      if (surveyResponseEntity) {
        const surveyResponse = fromDatastore<UserSurveyResponse>(surveyResponseEntity);
        const categoryScore = surveyResponse.topicScores[topicId];
        return {
          userId: member.id,
          score: categoryScore ? categoryScore.meanScore : null,
        };
      }
      
      // Fallback to old format
      const query = datastore.createQuery('TopicScoreUser')
        .hasAncestor(datastore.key(['User', member.id]))
        .filter('version', '=', version)
        .filter('topicId', '=', topicId);
      const [entities] = await datastore.runQuery(query);
      
      if (entities.length > 0) {
        const topicScore = fromDatastore<TopicScoreUser>(entities[0]);
        return {
          userId: member.id,
          score: topicScore.meanScore,
        };
      }
      
      return {
        userId: member.id,
        score: null,
      };
    });

    const memberScores = await Promise.all(memberScorePromises);
    
    console.log(`[Compatibles API] Member scores for topic ${topicId}:`, memberScores);
    
    // Filter out members without scores for this category
    const validScores = memberScores.filter(ms => ms.score !== null);
    
    console.log(`[Compatibles API] Valid scores: ${validScores.length}/${memberScores.length}`);
    
    if (validScores.length === 0) {
      console.log(`[Compatibles API] No valid scores found, returning 0`);
      return res.status(200).json({ compatibleUserIds: [], size: 0 });
    }

    // Find the largest compatible subset (within 25 points of each other)
    const COMPATIBILITY_THRESHOLD = 25;
    let bestSubset: string[] = [];
    
    for (const member of validScores) {
      const currentSubset = [member.userId];
      const others = validScores.filter(m => m.userId !== member.userId);
      
      for (const other of others) {
        if (Math.abs(member.score! - other.score!) <= COMPATIBILITY_THRESHOLD) {
          currentSubset.push(other.userId);
        }
      }
      
      if (currentSubset.length > bestSubset.length) {
        bestSubset = currentSubset;
      }
    }

    console.log(`[Compatibles API] Best compatible subset: ${bestSubset.length} users out of ${validScores.length} total`);
    
    res.status(200).json({ 
      compatibleUserIds: bestSubset, 
      size: bestSubset.length,
      totalMembers: validScores.length 
    });
  } catch (error) {
    console.error('Error finding compatibles:', error);
    res.status(500).json({ message: 'Failed to find compatibles.' });
  }
}