import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { Comment, Topic, Solution, User } from '@/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]'; // Import authOptions

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || (session.user as any)?.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized: Admin access required.' });
  }

  try {
    // Fetch flagged comments
    const commentsQuery = datastore.createQuery('Comment').filter('flags', '>', 0);
    const [commentEntities] = await datastore.runQuery(commentsQuery);
    let flaggedComments: Comment[] = commentEntities.map(entity => fromDatastore<Comment>(entity));
    flaggedComments.sort((a, b) => (b.flags || 0) - (a.flags || 0));

    // Fetch flagged topics
    const topicsQuery = datastore.createQuery('Topic').filter('flags', '>', 0);
    const [topicEntities] = await datastore.runQuery(topicsQuery);
    let flaggedTopics: Topic[] = topicEntities.map(entity => fromDatastore<Topic>(entity));
    flaggedTopics.sort((a, b) => (b.flags || 0) - (a.flags || 0));

    // Fetch flagged solutions
    const allTopicsQuery = datastore.createQuery('Topic');
    const [allTopicEntities] = await datastore.runQuery(allTopicsQuery);
    const allTopics: Topic[] = allTopicEntities.map(entity => fromDatastore<Topic>(entity));

    let flaggedSolutions: { topicId: string; topicTitle: string; solution: Solution }[] = [];
    allTopics.forEach(topic => {
      topic.solutions?.forEach(solution => {
        if ((solution as any).flags && (solution as any).flags > 0) {
          flaggedSolutions.push({
            topicId: topic.id,
            topicTitle: topic.title,
            solution: solution,
          });
        }
      });
    });
    flaggedSolutions.sort((a, b) => ((a.solution as any).flags || 0) - ((b.solution as any).flags || 0));

    // Fetch muted users
    const usersQuery = datastore.createQuery('User').filter('isMuted', '=', true);
    const [userEntities] = await datastore.runQuery(usersQuery);
    let flaggedUsers: { user: Pick<User, 'id' | 'displayName' | 'isMuted'>; flagCount: number }[] = userEntities.map(entity => {
      const user = fromDatastore<User>(entity);
      return { user: { id: user.id, displayName: user.displayName, isMuted: user.isMuted }, flagCount: 0 };
    });

    res.status(200).json({ flaggedComments, flaggedTopics, flaggedSolutions, flaggedUsers });

  } catch (error: any) {
    console.error('Error fetching moderation queue data:', error);
    res.status(500).json({
      message: 'Failed to fetch moderation queue data.',
      error: error.message,
      flaggedComments: [],
      flaggedTopics: [],
      flaggedSolutions: [],
      flaggedUsers: [],
    });
  }
}