import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import { Topic, Comment } from '@/types';

interface UserPost {
  id: string;
  type: 'comment' | 'topic' | 'solution';
  title: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
  moderatedAt?: string;
  moderationReason?: string;
  relatedTopic?: {
    id: string;
    title: string;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user || !session.user.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const userId = session.user.id;

  try {
    const userPosts: UserPost[] = [];

    // Fetch user's comments
    try {
      const commentQuery = datastore.createQuery('Comment')
        .filter('authorId', '=', userId)
        .order('timestamp', { descending: true });
      const [commentEntities] = await datastore.runQuery(commentQuery);

      for (const entity of commentEntities) {
        const comment = fromDatastore<Comment>(entity);
        
        // Get related topic info if available
        let relatedTopic = undefined;
        if (comment.topicId || comment.parentId) {
          const topicId = comment.topicId || comment.parentId;
          try {
            const topicKey = datastore.key(['Topic', topicId!]);
            const [topicEntity] = await datastore.get(topicKey);
            if (topicEntity) {
              const topic = fromDatastore<Topic>(topicEntity);
              relatedTopic = {
                id: topic.id,
                title: topic.title
              };
            }
          } catch (error) {
            console.warn('Could not fetch related topic for comment:', comment.id);
          }
        }

        userPosts.push({
          id: comment.id,
          type: 'comment',
          title: `Comment on "${relatedTopic?.title || 'Unknown Topic'}"`,
          content: comment.text,
          status: comment.status || 'approved',
          timestamp: comment.timestamp,
          moderatedAt: (comment as any).moderatedAt,
          moderationReason: (comment as any).moderationReason,
          relatedTopic
        });
      }
    } catch (error) {
      console.warn('Error fetching user comments:', error);
    }

    // Fetch user's topic suggestions
    try {
      const topicQuery = datastore.createQuery('Topic')
        .filter('suggesterId', '=', userId)
        .order('createdAt', { descending: true });
      const [topicEntities] = await datastore.runQuery(topicQuery);

      for (const entity of topicEntities) {
        const topic = fromDatastore<Topic>(entity);
        
        userPosts.push({
          id: topic.id,
          type: 'topic',
          title: topic.title,
          content: topic.preview || topic.problemStatement || 'No description provided',
          status: topic.status || 'pending',
          timestamp: topic.createdAt || new Date().toISOString(),
          moderatedAt: (topic as any).moderatedAt,
          moderationReason: (topic as any).moderationReason
        });
      }
    } catch (error) {
      console.warn('Error fetching user topics:', error);
    }

    // Fetch user's solution suggestions
    try {
      // First get all topics to find solutions by this user
      const allTopicsQuery = datastore.createQuery('Topic');
      const [allTopicEntities] = await datastore.runQuery(allTopicsQuery);

      for (const topicEntity of allTopicEntities) {
        const topic = fromDatastore<Topic>(topicEntity);
        if (topic.solutions) {
          for (const solution of topic.solutions) {
            if (solution.suggesterId === userId) {
              userPosts.push({
                id: solution.id,
                type: 'solution',
                title: `Solution for "${topic.title}"`,
                content: `${solution.title}: ${solution.description}`,
                status: solution.status,
                timestamp: (solution as any).createdAt || new Date().toISOString(),
                moderatedAt: (solution as any).moderatedAt,
                moderationReason: (solution as any).moderationReason,
                relatedTopic: {
                  id: topic.id,
                  title: topic.title
                }
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error fetching user solutions:', error);
    }

    // Sort all posts by timestamp (newest first)
    userPosts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Check if user has any rejected posts
    const hasRejectedPosts = userPosts.some(post => post.status === 'rejected');

    res.status(200).json({
      posts: userPosts,
      hasRejectedPosts,
      totalPosts: userPosts.length,
      approvedCount: userPosts.filter(p => p.status === 'approved').length,
      rejectedCount: userPosts.filter(p => p.status === 'rejected').length,
      pendingCount: userPosts.filter(p => p.status === 'pending').length
    });
  } catch (error: any) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ message: 'Failed to fetch user posts', error: error.message });
  }
}