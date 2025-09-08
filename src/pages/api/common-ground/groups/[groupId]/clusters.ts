import type { NextApiRequest, NextApiResponse } from 'next';
import { ClusterSnapshot, CategoryVector, SurveyFile, GroupMember, TopicScoreUser, UserSurveyResponse, Topic } from '@/types/common-ground';
import { nowIso } from '@/lib/common-ground/time';
import { PCA } from 'ml-pca';
import skmeans from 'skmeans';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import path from 'path';
import { promises as fs } from 'fs';

// Helper to read survey data directly from the filesystem
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
    return res.status(400).json({ message: 'Invalid request parameters.' });
  }

  try {
    // Convert the string ID from the URL to a number for the Datastore key
    const numericGroupId = parseInt(groupId, 10);
    if (isNaN(numericGroupId)) {
      return res.status(400).json({ message: 'Group ID must be a valid number.' });
    }
    // Generate category vectors directly instead of fetching from another API
    const survey = await getSurveyData(version as string);
    if (!survey) {
      return res.status(404).json({ message: `Survey version ${version} not found.` });
    }
    const topicToCategoryMap = new Map((survey.topics || []).map(t => [t.id, t.categoryId]));

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
    const memberScores = await Promise.all(memberScorePromises);

    const vectors: CategoryVector[] = memberScores
      .filter(ms => ms.scores.length > 0)
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
          return 0;
        });

        return {
          id: `${version}:${userId}`,
          version: version as string,
          userId,
          scores: vector,
          updatedAt: nowIso(),
        };
      });

    if (vectors.length === 0) {
      return res.status(200).json({ pca2d: [], clusters: [], updatedAt: nowIso() });
    }

    const userIds = vectors.map(v => v.userId);
    const dataMatrix = vectors.map(v => v.scores);

    // PCA
    const pca = new PCA(dataMatrix);
    const pca2d = pca.predict(dataMatrix, { nComponents: 2 }).to2DArray().map((row, i) => ({
      userId: userIds[i],
      x: row[0],
      y: row[1],
    }));

    // K-Means Clustering
    let k = 1;
    if (vectors.length >= 5) {
      k = Math.min(3, vectors.length);
    }
    
    const result = skmeans(dataMatrix, k, 'kmpp');
    const clusters = Array.from({ length: k }, (_, i) => ({
      id: `cluster${i + 1}`,
      centroid: result.centroids[i],
      members: [] as string[],
    }));

    result.idxs.forEach((clusterIndex: number, i: number) => {
      clusters[clusterIndex].members.push(userIds[i]);
    });

    const snapshot: ClusterSnapshot = {
      id: `snapshot-${Date.now()}`,
      version: version as string,
      pca2d,
      clusters,
      updatedAt: nowIso(),
    };

    res.status(200).json(snapshot);
  } catch (error) {
    console.error('Error generating clusters:', error);
    res.status(500).json({ message: 'Failed to generate clusters.' });
  }
}